import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { ReservationAvailabilityError, withReservationAvailability, type ReservationAvailabilityErrorCode } from '../reservationAvailability.js';
import { findRoomById } from '../rooms/rooms.repository.js';
import { getPathname, readJsonBodyOrReply, sendInternalError, sendJson } from '../utils/http.js';
import { parseId } from '../utils/ids.js';
import {
  deleteReservation,
  findReservationById,
  findReservationsByRoom,
  insertReservation,
  updateReservation,
  type ReservationInput
} from './reservations.repository.js';
import { validateReservationInput } from './reservations.validation.js';

const AVAILABILITY_STATUS: Record<ReservationAvailabilityErrorCode, number> = {
  ROOM_NOT_FOUND: 404,
  CAPACITY_EXCEEDED: 422,
  DATE_CONFLICT: 409
};

class ReservationNotFoundError extends Error {}

/** Lê e valida o corpo. Em caso de erro, já responde e devolve undefined. */
async function readReservationBody(request: IncomingMessage, response: ServerResponse): Promise<ReservationInput | undefined> {
  const body = await readJsonBodyOrReply(request, response);
  if (!body) return undefined;

  const result = validateReservationInput(body.data);
  if (!result.ok) {
    sendJson(response, 400, { error: result.error });
    return undefined;
  }
  return result.input;
}

function handleReservationError(response: ServerResponse, error: unknown, context: string): void {
  if (error instanceof ReservationAvailabilityError) {
    sendJson(response, AVAILABILITY_STATUS[error.code], { error: error.message });
    return;
  }
  if (error instanceof ReservationNotFoundError) {
    sendJson(response, 404, { error: 'Reserva não encontrada.' });
    return;
  }
  sendInternalError(response, context, error);
}

async function listRoomReservations(response: ServerResponse, database: Pool, roomId: number): Promise<void> {
  try {
    if (!(await findRoomById(database, roomId))) {
      sendJson(response, 404, { error: 'Quarto não encontrado.' });
      return;
    }
    sendJson(response, 200, await findReservationsByRoom(database, roomId));
  } catch (error) {
    handleReservationError(response, error, 'listar reservas');
  }
}

async function createReservationFromRequest(request: IncomingMessage, response: ServerResponse, database: Pool, roomId: number): Promise<void> {
  const input = await readReservationBody(request, response);
  if (!input) return;

  try {
    const created = await withReservationAvailability(
      database,
      { roomId, guestCount: input.guest_count, checkIn: input.check_in, checkOut: input.check_out },
      client => insertReservation(client, roomId, input)
    );
    sendJson(response, 201, created);
  } catch (error) {
    handleReservationError(response, error, 'criar reserva');
  }
}

async function updateReservationFromRequest(request: IncomingMessage, response: ServerResponse, database: Pool, id: number): Promise<void> {
  const input = await readReservationBody(request, response);
  if (!input) return;

  try {
    // A reserva continua no mesmo quarto; o quarto vem do registro atual.
    const current = await findReservationById(database, id);
    if (!current) throw new ReservationNotFoundError();

    const updated = await withReservationAvailability(
      database,
      {
        roomId: current.room_id,
        guestCount: input.guest_count,
        checkIn: input.check_in,
        checkOut: input.check_out,
        excludeReservationId: id
      },
      async client => {
        const reservation = await updateReservation(client, id, input);
        if (!reservation) throw new ReservationNotFoundError();
        return reservation;
      }
    );
    sendJson(response, 200, updated);
  } catch (error) {
    handleReservationError(response, error, 'atualizar reserva');
  }
}

async function deleteReservationById(response: ServerResponse, database: Pool, id: number): Promise<void> {
  try {
    if (!(await deleteReservation(database, id))) {
      sendJson(response, 404, { error: 'Reserva não encontrada.' });
      return;
    }
    sendJson(response, 200, { message: 'Reserva excluída com sucesso.' });
  } catch (error) {
    handleReservationError(response, error, 'excluir reserva');
  }
}

/** Atende as rotas de reservas. Devolve false quando a requisição não pertence a este módulo. */
export async function handleReservationsRoutes(request: IncomingMessage, response: ServerResponse, database: Pool): Promise<boolean> {
  const pathname = getPathname(request);

  const roomMatch = pathname.match(/^\/api\/rooms\/([^/]+)\/reservations$/);
  if (roomMatch && (request.method === 'GET' || request.method === 'POST')) {
    const roomId = parseId(roomMatch[1]);
    if (roomId === null) {
      sendJson(response, 400, { error: 'ID de quarto inválido.' });
    } else if (request.method === 'GET') {
      await listRoomReservations(response, database, roomId);
    } else {
      await createReservationFromRequest(request, response, database, roomId);
    }
    return true;
  }

  const reservationMatch = pathname.match(/^\/api\/reservations\/([^/]+)$/);
  if (reservationMatch && (request.method === 'PUT' || request.method === 'DELETE')) {
    const id = parseId(reservationMatch[1]);
    if (id === null) {
      sendJson(response, 400, { error: 'ID de reserva inválido.' });
    } else if (request.method === 'PUT') {
      await updateReservationFromRequest(request, response, database, id);
    } else {
      await deleteReservationById(response, database, id);
    }
    return true;
  }

  return false;
}
