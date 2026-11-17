import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { ReservationAvailabilityError, withReservationAvailability, type ReservationAvailabilityErrorCode } from '../reservationAvailability.js';
import { readJsonBody } from '../utils/read-json-body.js';
import {
  deleteReservation,
  findReservationById,
  findReservationsByRoom,
  insertReservation,
  roomExists,
  updateReservation
} from './reservations.repository.js';
import { parseId, validateReservationInput } from './reservations.validation.js';

const AVAILABILITY_STATUS: Record<ReservationAvailabilityErrorCode, number> = {
  ROOM_NOT_FOUND: 404,
  CAPACITY_EXCEEDED: 422,
  DATE_CONFLICT: 409
};

class ReservationNotFoundError extends Error {}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

/** Lê e valida o corpo. Em caso de erro, já responde e devolve undefined. */
async function readReservationBody(request: IncomingMessage, response: ServerResponse) {
  let data: unknown;
  try {
    data = await readJsonBody(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'BODY_TOO_LARGE';
    sendJson(response, tooLarge ? 413 : 400, { error: tooLarge ? 'Corpo da requisição muito grande.' : 'JSON inválido.' });
    return undefined;
  }
  const result = validateReservationInput(data);
  if (!result.ok) {
    sendJson(response, 400, { error: result.error });
    return undefined;
  }
  return result.input;
}

function handleError(response: ServerResponse, error: unknown, context: string): void {
  if (error instanceof ReservationAvailabilityError) {
    sendJson(response, AVAILABILITY_STATUS[error.code], { error: error.message });
    return;
  }
  if (error instanceof ReservationNotFoundError) {
    sendJson(response, 404, { error: 'Reserva não encontrada.' });
    return;
  }
  console.error(`Erro ao ${context}:`, error);
  sendJson(response, 500, { error: 'Erro interno do servidor.' });
}

export async function handleReservationsRoutes(request: IncomingMessage, response: ServerResponse, database: Pool): Promise<boolean> {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;

  const roomMatch = pathname.match(/^\/api\/rooms\/([^/]+)\/reservations$/);
  if (roomMatch && (request.method === 'GET' || request.method === 'POST')) {
    const roomId = parseId(roomMatch[1]);
    if (roomId === null) {
      sendJson(response, 400, { error: 'ID de quarto inválido.' });
      return true;
    }

    if (request.method === 'GET') {
      try {
        if (!(await roomExists(database, roomId))) {
          sendJson(response, 404, { error: 'Quarto não encontrado.' });
          return true;
        }
        sendJson(response, 200, await findReservationsByRoom(database, roomId));
      } catch (error) {
        handleError(response, error, 'listar reservas');
      }
      return true;
    }

    const input = await readReservationBody(request, response);
    if (!input) return true;
    try {
      const created = await withReservationAvailability(
        database,
        { roomId, guestCount: input.guest_count, checkIn: input.check_in, checkOut: input.check_out },
        client => insertReservation(client, roomId, input)
      );
      sendJson(response, 201, created);
    } catch (error) {
      handleError(response, error, 'criar reserva');
    }
    return true;
  }

  const reservationMatch = pathname.match(/^\/api\/reservations\/([^/]+)$/);
  if (reservationMatch && (request.method === 'PUT' || request.method === 'DELETE')) {
    const id = parseId(reservationMatch[1]);
    if (id === null) {
      sendJson(response, 400, { error: 'ID de reserva inválido.' });
      return true;
    }

    if (request.method === 'DELETE') {
      try {
        if (!(await deleteReservation(database, id))) {
          sendJson(response, 404, { error: 'Reserva não encontrada.' });
          return true;
        }
        sendJson(response, 200, { message: 'Reserva excluída com sucesso.' });
      } catch (error) {
        handleError(response, error, 'excluir reserva');
      }
      return true;
    }

    const input = await readReservationBody(request, response);
    if (!input) return true;
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
      handleError(response, error, 'atualizar reserva');
    }
    return true;
  }

  return false;
}
