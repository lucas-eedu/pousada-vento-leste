import { handleSwaggerRoutes } from './rooms.swagger.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { createRoom, deleteRoom, findAllRooms, updateRoom } from './rooms.repository.js';
import { readJsonBody } from '../utils/read-json-body.js';
import { parseRoomId, validateRoomInput } from './rooms.validation.js';

export async function handlerRoomsRoutes(request: IncomingMessage, response: ServerResponse, database: Pool): Promise<boolean> {
        
        if (handleSwaggerRoutes(request, response)) { return true;}

        if (request.method === 'GET' && request.url === '/api/rooms') {
                try {
                        const rooms = await findAllRooms(database);
                        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        response.end(JSON.stringify(rooms));
                        return true;
                } catch (error) {
                        console.error('Erro ao buscar quartos:', error);
                        response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        response.end(JSON.stringify({ error: 'Erro interno do servidor.' }));
                        return true;
                }
        }


        if (request.method === 'POST' && request.url === '/api/rooms') {
                let data: unknown;
                try {
                        data = await readJsonBody(request);
                } catch (error) {
                        const message = error instanceof Error ? error.message : '';
                        const status = message === 'BODY_TOO_LARGE' ? 413 : 400;
                        response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                        response.end(JSON.stringify({ error: status === 413 ? 'Corpo da requisição muito grande.' : 'JSON inválido.' }));
                        return true;
                }

                if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                        const room = data as Record<string, unknown>;
                        if (room.description === undefined) { room.description = ''; }
                }

                if (!validateRoomInput(data)) {
                        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        response.end(JSON.stringify({ error: 'Dados inválidos para criação de quarto.' }));
                        return true;
                }

                const roomInput = { ...data, number: data.number.trim() };

                try {
                        const createdRoom = await createRoom(database, roomInput);
                        response.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                        response.end(JSON.stringify(createdRoom));
                        return true;
                } catch (error) {
                        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
                                response.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
                                response.end(JSON.stringify({ error: 'Número de quarto já existe.' }));
                                return true;
                        }
                        console.error('Erro ao criar quarto:', error);
                        response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        response.end(JSON.stringify({ error: 'Erro interno do servidor.' }));
                        return true;
                }
        }
        const matchId = request.url?.match(/^\/api\/rooms\/([^/]+)$/);

        if (request.method === 'PUT' && matchId) {
                const id = parseRoomId(matchId[1]);
                if (id === null) {response.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify({error: 'ID de quarto inválido.'}));
                        return true;
                }

                let data: unknown;
                try {
                        data = await readJsonBody(request);
                } catch (error) {
                        const message = error instanceof Error ? error.message : '';
                        const status = message === 'BODY_TOO_LARGE' ? 413 : 400;

                        response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify({error: status === 413 ? 'Corpo da requisição muito grande.' : 'JSON inválido.'}));
                        return true;
                }

                if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                        const room = data as Record<string, unknown>;
                        if (room.description === undefined) {
                                room.description = '';
                        }
                }

                if (!validateRoomInput(data)) {
                        response.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify({error: 'Dados inválidos para atualização de quarto.'}));
                        return true;
                }

                const roomInput = {...data, number: data.number.trim()};
                try {
                        const updatedRoom = await updateRoom(database, id, roomInput);
                        if (updatedRoom === undefined) {
                                response.writeHead(404, {'Content-Type': 'application/json; charset=utf-8'});
                                response.end(JSON.stringify({error: 'Quarto não encontrado.'}));
                                return true;
                        }

                        response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify(updatedRoom));
                        return true;
                } catch (error) {
                        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
                                response.writeHead(409, {'Content-Type': 'application/json; charset=utf-8'});
                                response.end(JSON.stringify({error: 'Número de quarto já existe.'}));
                                return true;
                        }
                        console.error('Erro ao atualizar quarto:', error);
                        response.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify({error: 'Erro interno do servidor.'}));
                        return true;
                }

        }

        if (request.method === 'DELETE' && matchId) {
                const id = parseRoomId(matchId[1]);
                if (id === null) { response.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify({error: 'ID de quarto inválido.'}));
                        return true;
                }

                try {
                        const deletedRoom = await deleteRoom(database, id);
                        if (!deletedRoom) { response.writeHead(404, {'Content-Type': 'application/json; charset=utf-8'});
                                response.end(JSON.stringify({error: 'Quarto não encontrado.'}));
                                return true;
                        }
                        response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify({message: 'Quarto excluído com sucesso.'}));
                        return true;
                } catch (error) {
                        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
                                response.writeHead(409, {'Content-Type': 'application/json; charset=utf-8'});
                                response.end(JSON.stringify({error: 'Não é possível excluir o quarto com reservas associadas.'}));
                                return true;
                        }
                        console.error('Erro ao excluir quarto:', error);
                        response.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                        response.end(JSON.stringify({error: 'Erro interno do servidor.'}));
                        return true;
                }
        }

        return false;

}
