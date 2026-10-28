import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Pool } from 'pg';
import { initializeDatabase } from './database.js';

test('cria quartos e reservas com chave estrangeira ativa', { skip: !process.env.DATABASE_URL && 'Defina DATABASE_URL para o PostgreSQL de teste' }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await initializeDatabase(pool);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const number = `teste-${randomUUID()}`;
      const room = await client.query<{ id: number }>(
        'INSERT INTO rooms (number, capacity, daily_rate) VALUES ($1, $2, $3) RETURNING id',
        [number, 2, 180]
      );
      const roomId = room.rows[0].id;
      await client.query(
        'INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES ($1, $2, $3, $4, $5)',
        [roomId, 'Maria', 2, '2026-11-01', '2026-11-03']
      );
      const reservations = await client.query<{ guest_name: string }>('SELECT guest_name FROM reservations WHERE room_id = $1', [roomId]);
      assert.equal(reservations.rows[0].guest_name, 'Maria');
      await assert.rejects(client.query(
        'INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES ($1, $2, $3, $4, $5)',
        [-1, 'João', 1, '2026-11-01', '2026-11-03']
      ), { code: '23503' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  } finally {
    await pool.end();
  }
});
