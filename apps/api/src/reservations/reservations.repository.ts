import type { PoolClient } from 'pg';
import type { Queryable } from '../database.js';

export interface Reservation {
  id: number;
  room_id: number;
  guest_name: string;
  guest_count: number;
  /** Datas devolvidas como texto AAAA-MM-DD para não sofrer conversão de fuso horário. */
  check_in: string;
  check_out: string;
  notes: string;
  created_at: Date;
}

export interface ReservationInput {
  guest_name: string;
  guest_count: number;
  check_in: string;
  check_out: string;
  notes: string;
}

const COLUMNS = `id, room_id, guest_name, guest_count,
  to_char(check_in, 'YYYY-MM-DD') AS check_in,
  to_char(check_out, 'YYYY-MM-DD') AS check_out,
  notes, created_at`;

/** Maior número de hóspedes entre as reservas do quarto (0 se não houver reservas). */
export async function findLargestGuestCount(db: Queryable, roomId: number): Promise<number> {
  const result = await db.query<{ largest: number }>(
    'SELECT COALESCE(MAX(guest_count), 0)::integer AS largest FROM reservations WHERE room_id = $1',
    [roomId]
  );
  return result.rows[0]?.largest ?? 0;
}

export async function findReservationsByRoom(db: Queryable, roomId: number): Promise<Reservation[]> {
  const result = await db.query<Reservation>(
    `SELECT ${COLUMNS} FROM reservations WHERE room_id = $1 ORDER BY check_in, id`,
    [roomId]
  );
  return result.rows;
}

export async function findReservationById(db: Queryable, id: number): Promise<Reservation | undefined> {
  const result = await db.query<Reservation>(`SELECT ${COLUMNS} FROM reservations WHERE id = $1`, [id]);
  return result.rows[0];
}

/** Deve receber o client da transação aberta por withReservationAvailability. */
export async function insertReservation(client: PoolClient, roomId: number, input: ReservationInput): Promise<Reservation> {
  const result = await client.query<Reservation>(
    `INSERT INTO reservations (room_id, guest_name, guest_count, check_in, check_out, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [roomId, input.guest_name, input.guest_count, input.check_in, input.check_out, input.notes]
  );
  return result.rows[0]!;
}

/** Deve receber o client da transação aberta por withReservationAvailability. */
export async function updateReservation(client: PoolClient, id: number, input: ReservationInput): Promise<Reservation | undefined> {
  const result = await client.query<Reservation>(
    `UPDATE reservations
     SET guest_name = $1, guest_count = $2, check_in = $3, check_out = $4, notes = $5
     WHERE id = $6
     RETURNING ${COLUMNS}`,
    [input.guest_name, input.guest_count, input.check_in, input.check_out, input.notes, id]
  );
  return result.rows[0];
}

export async function deleteReservation(db: Queryable, id: number): Promise<boolean> {
  const result = await db.query('DELETE FROM reservations WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
