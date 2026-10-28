import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';

function sendJson(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function createServer() {
  return createHttpServer((request: IncomingMessage, response: ServerResponse) => {
    const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === 'GET' && request.url === '/api/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    sendJson(response, 404, { error: 'Rota não encontrada' });
  });
}
