import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDatabase } from './database.js';

test('cria as tabelas de quartos e reservas com relacionamento ativo', () => {
  const database = createDatabase(':memory:');

  database.prepare('INSERT INTO rooms (number, capacity, daily_rate) VALUES (?, ?, ?)').run('101', 2, 180);
  const room = database.prepare('SELECT id FROM rooms WHERE number = ?').get('101') as { id: number };
  database.prepare('INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES (?, ?, ?, ?, ?)').run(room.id, 'Maria', 2, '2026-11-01', '2026-11-03');

  const reservation = database.prepare('SELECT guest_name FROM reservations WHERE room_id = ?').get(room.id) as { guest_name: string };
  assert.equal(reservation.guest_name, 'Maria');
  assert.throws(() => database.prepare('INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out) VALUES (?, ?, ?, ?, ?)').run(999, 'João', 1, '2026-11-01', '2026-11-03'));
  database.close();
});
