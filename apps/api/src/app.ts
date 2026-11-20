import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { handleReservationsRoutes } from './reservations/reservations.routes.js';
import { handleRoomsRoutes } from './rooms/rooms.routes.js';
import { getPathname, sendInternalError, sendJson } from './utils/http.js';
import { serveWebApp } from './webApp.js';

export interface ServerOptions {
  /** Pasta do build do React. Quando informada, a API também serve a interface (publicação). */
  webDistDir?: string;
}

export function createServer(database: Pool, options: ServerOptions = {}) {
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
    if (options.webDistDir) {
      try {
        if (await serveWebApp(request, response, options.webDistDir)) return;
      } catch (error) {
        sendInternalError(response, 'servir a interface', error);
        return;
      }
    }
    sendJson(response, 404, { error: 'Rota não encontrada' });
  });
}
