import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { getPathname, readJsonBodyOrReply, sendInternalError, sendJson } from '../utils/http.js';
import { parseId } from '../utils/ids.js';
import { FOREIGN_KEY_VIOLATION, hasPostgresCode, UNIQUE_VIOLATION } from '../utils/postgres-errors.js';
import { createRoom, deleteRoom, findAllRooms } from './rooms.repository.js';
import { RoomCapacityConflictError, updateRoomKeepingReservationsValid } from './rooms.service.js';
import { handleSwaggerRoutes } from './rooms.swagger.js';
import { parseRoomInput } from './rooms.validation.js';
import type { RoomInput } from './rooms.repository.js';

/** Lê e valida o corpo do quarto. Em caso de erro, já responde e devolve undefined. */
async function readRoomBody(request: IncomingMessage, response: ServerResponse): Promise<RoomInput | undefined> {
    const body = await readJsonBodyOrReply(request, response);
    if (!body) return undefined;

    const result = parseRoomInput(body.data);
    if (!result.ok) {
        sendJson(response, 400, { error: result.error });
        return undefined;
    }
    return result.input;
}

function handleRoomError(response: ServerResponse, error: unknown, context: string): void {
    if (hasPostgresCode(error, UNIQUE_VIOLATION)) {
        sendJson(response, 409, { error: 'Número de quarto já existe.' });
        return;
    }
    if (hasPostgresCode(error, FOREIGN_KEY_VIOLATION)) {
        sendJson(response, 409, { error: 'Não é possível excluir o quarto com reservas associadas.' });
        return;
    }
    if (error instanceof RoomCapacityConflictError) {
        sendJson(response, 409, { error: error.message });
        return;
    }
    sendInternalError(response, context, error);
}

async function listRooms(response: ServerResponse, database: Pool): Promise<void> {
    try {
        sendJson(response, 200, await findAllRooms(database));
    } catch (error) {
        handleRoomError(response, error, 'listar quartos');
    }
}

async function createRoomFromRequest(request: IncomingMessage, response: ServerResponse, database: Pool): Promise<void> {
    const input = await readRoomBody(request, response);
    if (!input) return;

    try {
        sendJson(response, 201, await createRoom(database, input));
    } catch (error) {
        handleRoomError(response, error, 'criar quarto');
    }
}

async function updateRoomFromRequest(request: IncomingMessage, response: ServerResponse, database: Pool, id: number): Promise<void> {
    const input = await readRoomBody(request, response);
    if (!input) return;

    try {
        const updatedRoom = await updateRoomKeepingReservationsValid(database, id, input);
        if (!updatedRoom) {
            sendJson(response, 404, { error: 'Quarto não encontrado.' });
            return;
        }
        sendJson(response, 200, updatedRoom);
    } catch (error) {
        handleRoomError(response, error, 'atualizar quarto');
    }
}

async function deleteRoomById(response: ServerResponse, database: Pool, id: number): Promise<void> {
    try {
        if (!(await deleteRoom(database, id))) {
            sendJson(response, 404, { error: 'Quarto não encontrado.' });
            return;
        }
        sendJson(response, 200, { message: 'Quarto excluído com sucesso.' });
    } catch (error) {
        handleRoomError(response, error, 'excluir quarto');
    }
}

/** Atende as rotas de quartos. Devolve false quando a requisição não pertence a este módulo. */
export async function handleRoomsRoutes(request: IncomingMessage, response: ServerResponse, database: Pool): Promise<boolean> {
    if (handleSwaggerRoutes(request, response)) return true;

    const pathname = getPathname(request);

    if (pathname === '/api/rooms') {
        if (request.method === 'GET') {
            await listRooms(response, database);
            return true;
        }
        if (request.method === 'POST') {
            await createRoomFromRequest(request, response, database);
            return true;
        }
        return false;
    }

    const idMatch = pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (!idMatch || (request.method !== 'PUT' && request.method !== 'DELETE')) return false;

    const id = parseId(idMatch[1]);
    if (id === null) {
        sendJson(response, 400, { error: 'ID de quarto inválido.' });
        return true;
    }

    if (request.method === 'PUT') {
        await updateRoomFromRequest(request, response, database, id);
    } else {
        await deleteRoomById(response, database, id);
    }
    return true;
}
