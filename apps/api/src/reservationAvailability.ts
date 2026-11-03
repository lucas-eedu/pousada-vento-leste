import type { Pool, PoolClient } from 'pg';

export type ReservationAvailabilityInput = {
  roomId: number;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  excludeReservationId?: number;
};

export type ReservationAvailabilityErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'CAPACITY_EXCEEDED'
  | 'DATE_CONFLICT';

export class ReservationAvailabilityError extends Error {
  constructor(public readonly code: ReservationAvailabilityErrorCode, message: string) {
    super(message);
    this.name = 'ReservationAvailabilityError';
  }
}

/**
 * Executa a validação e a gravação na mesma transação. O bloqueio do quarto
 * serializa tentativas concorrentes de reserva para esse quarto.
 */
export async function withReservationAvailability<T>(
  pool: Pool,
  input: ReservationAvailabilityInput,
  save: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const room = await client.query<{ capacity: number }>(
      'SELECT capacity FROM rooms WHERE id = $1 FOR UPDATE',
      [input.roomId]
    );
    if (room.rowCount === 0) {
      throw new ReservationAvailabilityError('ROOM_NOT_FOUND', 'Quarto não encontrado.');
    }
    if (input.guestCount > room.rows[0].capacity) {
      throw new ReservationAvailabilityError('CAPACITY_EXCEEDED', 'O número de hóspedes excede a capacidade do quarto.');
    }

    const conflict = await client.query(
      `SELECT 1 FROM reservations
       WHERE room_id = $1
         AND check_in < $2::date
         AND check_out > $3::date
         AND ($4::integer IS NULL OR id <> $4)
       LIMIT 1`,
      [input.roomId, input.checkOut, input.checkIn, input.excludeReservationId ?? null]
    );
    if (conflict.rowCount !== 0) {
      throw new ReservationAvailabilityError('DATE_CONFLICT', 'Já existe uma reserva para esse quarto no período informado.');
    }

    const result = await save(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
