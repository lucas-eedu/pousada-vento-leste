import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { handleReservationsRoutes } from './reservations/reservations.routes.js';
import { handleRoomsRoutes } from './rooms/rooms.routes.js';
import { getPathname, sendJson } from './utils/http.js';

export function createServer(database: Pool) {
  return createHttpServer(async (request: IncomingMessage, response: ServerResponse) => {
    const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === 'GET' && getPathname(request) === '/api/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    if (await handleReservationsRoutes(request, response, database)) {
      return;
    }
    if (await handleRoomsRoutes(request, response, database)) {
      return;
    }
    sendJson(response, 404, { error: 'Rota não encontrada' });
  });
}
