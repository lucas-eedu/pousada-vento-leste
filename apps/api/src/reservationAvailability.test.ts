import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Pool, type PoolClient } from 'pg';
import { initializeDatabase } from './database.js';
import { ReservationAvailabilityError, withReservationAvailability } from './reservationAvailability.js';

const databaseRequired = { skip: !process.env.DATABASE_URL && 'Defina DATABASE_URL para o PostgreSQL de teste' };

async function withTestRoom(run: (pool: Pool, roomId: number) => Promise<void>): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let roomId: number | undefined;
  try {
    await initializeDatabase(pool);
    const room = await pool.query<{ id: number }>(
      'INSERT INTO rooms (number, capacity, daily_rate) VALUES ($1, $2, $3) RETURNING id',
      [`teste-${randomUUID()}`, 2, 180]
    );
    roomId = room.rows[0].id;
    await run(pool, roomId);
  } finally {
    if (roomId !== undefined) {
      await pool.query('DELETE FROM reservations WHERE room_id = $1', [roomId]);
      await pool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    }
    await pool.end();
  }
}

async function insertReservation(client: PoolClient, roomId: number, checkIn: string, checkOut: string): Promise<number> {
  const result = await client.query<{ id: number }>(
    'INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [roomId, 'Maria', 2, checkIn, checkOut]
  );
  return result.rows[0].id;
}

function expectRule(code: string) {
  return (error: unknown) => error instanceof ReservationAvailabilityError && error.code === code;
}

test('aceita reservas consecutivas no mesmo quarto', databaseRequired, async () => {
  await withTestRoom(async (pool, roomId) => {
    await pool.query(
      'INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES ($1, $2, $3, $4, $5)',
      [roomId, 'Ana', 2, '2026-11-01', '2026-11-03']
    );
    const id = await withReservationAvailability(
      pool,
      { roomId, guestCount: 2, checkIn: '2026-11-03', checkOut: '2026-11-05' },
      (client) => insertReservation(client, roomId, '2026-11-03', '2026-11-05')
    );
    assert.ok(id > 0);
  });
});

test('rejeita quantidade de hóspedes acima da capacidade', databaseRequired, async () => {
  await withTestRoom(async (pool, roomId) => {
    await assert.rejects(
      withReservationAvailability(
        pool,
        { roomId, guestCount: 3, checkIn: '2026-11-01', checkOut: '2026-11-03' },
        (client) => insertReservation(client, roomId, '2026-11-01', '2026-11-03')
      ),
      expectRule('CAPACITY_EXCEEDED')
    );
    const count = await pool.query<{ total: string }>('SELECT COUNT(*) AS total FROM reservations WHERE room_id = $1', [roomId]);
    assert.equal(Number(count.rows[0].total), 0);
  });
});

test('rejeita datas sobrepostas no mesmo quarto', databaseRequired, async () => {
  await withTestRoom(async (pool, roomId) => {
    await pool.query(
      'INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES ($1, $2, $3, $4, $5)',
      [roomId, 'Ana', 2, '2026-11-01', '2026-11-05']
    );
    await assert.rejects(
      withReservationAvailability(
        pool,
        { roomId, guestCount: 2, checkIn: '2026-11-03', checkOut: '2026-11-07' },
        (client) => insertReservation(client, roomId, '2026-11-03', '2026-11-07')
      ),
      expectRule('DATE_CONFLICT')
    );
  });
});

test('permite editar uma reserva sem considerar seu próprio período como conflito', databaseRequired, async () => {
  await withTestRoom(async (pool, roomId) => {
    const saved = await pool.query<{ id: number }>(
      'INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [roomId, 'Ana', 2, '2026-11-01', '2026-11-05']
    );
    const reservationId = saved.rows[0].id;
    await withReservationAvailability(
      pool,
      { roomId, guestCount: 2, checkIn: '2026-11-01', checkOut: '2026-11-06', excludeReservationId: reservationId },
      (client) => client.query('UPDATE reservations SET check_out = $1 WHERE id = $2', ['2026-11-06', reservationId])
    );
    const updated = await pool.query<{ check_out: string }>('SELECT check_out::text FROM reservations WHERE id = $1', [reservationId]);
    assert.equal(updated.rows[0].check_out, '2026-11-06');
  });
});

test('impede duas reservas simultâneas para o mesmo período', databaseRequired, async () => {
  await withTestRoom(async (pool, roomId) => {
    const input = { roomId, guestCount: 2, checkIn: '2026-11-01', checkOut: '2026-11-03' };
    const attempts = await Promise.allSettled([
      withReservationAvailability(pool, input, (client) => insertReservation(client, roomId, input.checkIn, input.checkOut)),
      withReservationAvailability(pool, input, (client) => insertReservation(client, roomId, input.checkIn, input.checkOut))
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
    assert.equal(attempts.filter((attempt) => attempt.status === 'rejected' && expectRule('DATE_CONFLICT')(attempt.reason)).length, 1);
  });
});
