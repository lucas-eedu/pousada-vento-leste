import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { Pool } from 'pg';
import { createServer } from '../app.js';
import { initializeDatabase } from '../database.js';
import { updateRoomKeepingReservationsValid } from '../rooms/rooms.service.js';
import { parseId } from '../utils/ids.js';
import { isIsoDate, validateReservationInput } from './reservations.validation.js';

const databaseRequired = { skip: !process.env.DATABASE_URL && 'Defina DATABASE_URL para o PostgreSQL de teste' };

type Api = {
  request: (method: string, path: string, body?: unknown) => Promise<{ status: number; body: any }>;
  roomId: number;
  pool: Pool;
};

/** Sobe a API real em porta aleatória com um quarto de capacidade 2 criado só para o teste. */
async function withApi(run: (api: Api) => Promise<void>): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const server = createServer(pool);
  const roomIds: number[] = [];
  try {
    await initializeDatabase(pool);
    const room = await pool.query<{ id: number }>(
      'INSERT INTO rooms (number, capacity, daily_rate) VALUES ($1, $2, $3) RETURNING id',
      [`teste-reservas-${Date.now()}-${Math.random()}`, 2, 200]
    );
    roomIds.push(room.rows[0].id);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    await run({
      roomId: room.rows[0].id,
      pool,
      async request(method, path, body) {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
        });
        return { status: response.status, body: await response.json() };
      }
    });
  } finally {
    server.close();
    for (const id of roomIds) {
      await pool.query('DELETE FROM reservations WHERE room_id = $1', [id]);
      await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
    }
    await pool.end();
  }
}

function reservationBody(overrides: Record<string, unknown> = {}) {
  return { guest_name: 'Hóspede Teste', guest_count: 2, check_in: '2026-12-10', check_out: '2026-12-12', notes: '', ...overrides };
}

test('valida o corpo da reserva antes de consultar o banco', () => {
  assert.equal(validateReservationInput(reservationBody()).ok, true);
  assert.deepEqual(validateReservationInput(reservationBody({ guest_name: '  ' })), { ok: false, error: 'Informe o nome do hóspede.' });
  assert.equal(validateReservationInput(reservationBody({ guest_count: 0 })).ok, false);
  assert.equal(validateReservationInput(reservationBody({ guest_count: 1.5 })).ok, false);
  assert.equal(validateReservationInput(reservationBody({ guest_count: '2' })).ok, false);
  assert.equal(validateReservationInput(reservationBody({ check_out: '2026-12-10' })).ok, false);
  assert.equal(validateReservationInput(reservationBody({ notes: 5 })).ok, false);
  assert.equal(validateReservationInput([]).ok, false);
  const withoutNotes = validateReservationInput({ guest_name: ' Ana ', guest_count: 1, check_in: '2026-12-01', check_out: '2026-12-02' });
  assert.deepEqual(withoutNotes, { ok: true, input: { guest_name: 'Ana', guest_count: 1, check_in: '2026-12-01', check_out: '2026-12-02', notes: '' } });
});

test('aceita apenas datas reais no formato AAAA-MM-DD e IDs positivos', () => {
  assert.equal(isIsoDate('2028-02-29'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('10/12/2026'), false);
  assert.equal(parseId('7'), 7);
  assert.equal(parseId('0'), null);
  assert.equal(parseId('abc'), null);
  assert.equal(parseId('99999999999'), null);
});

test('cria, lista, edita e exclui uma reserva', databaseRequired, async () => {
  await withApi(async ({ request, roomId }) => {
    const created = await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ notes: ' Chegada tarde ' }));
    assert.equal(created.status, 201);
    assert.equal(created.body.room_id, roomId);
    assert.equal(created.body.check_in, '2026-12-10');
    assert.equal(created.body.check_out, '2026-12-12');
    assert.equal(created.body.notes, 'Chegada tarde');

    const listed = await request('GET', `/api/rooms/${roomId}/reservations`);
    assert.equal(listed.status, 200);
    assert.deepEqual(listed.body.map((r: { id: number }) => r.id), [created.body.id]);

    // Editar a própria reserva com período sobreposto ao anterior não é conflito.
    const updated = await request('PUT', `/api/reservations/${created.body.id}`, reservationBody({ guest_count: 1, check_out: '2026-12-13' }));
    assert.equal(updated.status, 200);
    assert.equal(updated.body.guest_count, 1);
    assert.equal(updated.body.check_out, '2026-12-13');
    assert.equal(updated.body.room_id, roomId);

    const deleted = await request('DELETE', `/api/reservations/${created.body.id}`);
    assert.equal(deleted.status, 200);
    assert.equal((await request('GET', `/api/rooms/${roomId}/reservations`)).body.length, 0);
    assert.equal((await request('DELETE', `/api/reservations/${created.body.id}`)).status, 404);
  });
});

test('lista reservas em ordem de entrada e apenas do quarto informado', databaseRequired, async () => {
  await withApi(async ({ request, roomId }) => {
    await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ check_in: '2026-12-20', check_out: '2026-12-22' }));
    await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ check_in: '2026-12-01', check_out: '2026-12-03' }));
    const listed = await request('GET', `/api/rooms/${roomId}/reservations`);
    assert.deepEqual(listed.body.map((r: { check_in: string }) => r.check_in), ['2026-12-01', '2026-12-20']);
  });
});

test('responde 404 para quarto ou reserva inexistente', databaseRequired, async () => {
  await withApi(async ({ request }) => {
    const missingRoom = 2147483647;
    const list = await request('GET', `/api/rooms/${missingRoom}/reservations`);
    assert.deepEqual(list, { status: 404, body: { error: 'Quarto não encontrado.' } });

    const create = await request('POST', `/api/rooms/${missingRoom}/reservations`, reservationBody());
    assert.deepEqual(create, { status: 404, body: { error: 'Quarto não encontrado.' } });

    const update = await request('PUT', `/api/reservations/${missingRoom}`, reservationBody());
    assert.deepEqual(update, { status: 404, body: { error: 'Reserva não encontrada.' } });
  });
});

test('propaga os erros da regra de disponibilidade com o status HTTP correto', databaseRequired, async () => {
  await withApi(async ({ request, roomId }) => {
    const capacity = await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ guest_count: 3 }));
    assert.deepEqual(capacity, { status: 422, body: { error: 'O número de hóspedes excede a capacidade do quarto.' } });

    const first = await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody());
    assert.equal(first.status, 201);

    const conflict = await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ check_in: '2026-12-11', check_out: '2026-12-14' }));
    assert.deepEqual(conflict, { status: 409, body: { error: 'Já existe uma reserva para esse quarto no período informado.' } });

    const consecutive = await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ check_in: '2026-12-12', check_out: '2026-12-14' }));
    assert.equal(consecutive.status, 201);

    // Edição que invade outra reserva também é bloqueada, e a original não muda.
    const editConflict = await request('PUT', `/api/reservations/${consecutive.body.id}`, reservationBody({ check_in: '2026-12-11', check_out: '2026-12-14' }));
    assert.equal(editConflict.status, 409);
    const editCapacity = await request('PUT', `/api/reservations/${consecutive.body.id}`, reservationBody({ guest_count: 5, check_in: '2026-12-12', check_out: '2026-12-14' }));
    assert.equal(editCapacity.status, 422);

    const listed = await request('GET', `/api/rooms/${roomId}/reservations`);
    assert.deepEqual(listed.body.map((r: { check_in: string }) => r.check_in), ['2026-12-10', '2026-12-12']);
  });
});

test('rejeita entrada inválida com 400 e mensagem clara', databaseRequired, async () => {
  await withApi(async ({ request, roomId }) => {
    assert.deepEqual(await request('POST', `/api/rooms/${roomId}/reservations`, '{'), { status: 400, body: { error: 'JSON inválido.' } });
    assert.deepEqual(
      await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ check_out: '2026-12-09' })),
      { status: 400, body: { error: 'A data de saída deve ser posterior à data de entrada.' } }
    );
    assert.deepEqual(
      await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ guest_name: '' })),
      { status: 400, body: { error: 'Informe o nome do hóspede.' } }
    );
    assert.deepEqual(await request('GET', '/api/rooms/abc/reservations'), { status: 400, body: { error: 'ID de quarto inválido.' } });
    assert.deepEqual(await request('DELETE', '/api/reservations/abc'), { status: 400, body: { error: 'ID de reserva inválido.' } });
  });
});

test('impede reduzir a capacidade do quarto abaixo de uma reserva existente', databaseRequired, async () => {
  await withApi(async ({ request, roomId, pool }) => {
    assert.equal((await request('POST', `/api/rooms/${roomId}/reservations`, reservationBody({ guest_count: 2 }))).status, 201);
    const { rows: [room] } = await pool.query('SELECT number, daily_rate FROM rooms WHERE id = $1', [roomId]);
    const input = { number: room.number, capacity: 1, daily_rate: Number(room.daily_rate), description: '' };

    await assert.rejects(updateRoomKeepingReservationsValid(pool, roomId, input), /reduzir a capacidade para 1/);
    const { rows: [unchanged] } = await pool.query('SELECT capacity FROM rooms WHERE id = $1', [roomId]);
    assert.equal(unchanged.capacity, 2);

    const updated = await updateRoomKeepingReservationsValid(pool, roomId, { ...input, capacity: 2 });
    assert.equal(updated?.capacity, 2);
  });
});
