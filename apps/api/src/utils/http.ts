import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody } from './read-json-body.js';

export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function sendInternalError(response: ServerResponse, context: string, error: unknown): void {
  console.error(`Erro ao ${context}:`, error);
  sendJson(response, 500, { error: 'Erro interno do servidor.' });
}

/** Caminho da URL sem a query string, por exemplo "/api/rooms". */
export function getPathname(request: IncomingMessage): string {
  return new URL(request.url ?? '/', 'http://localhost').pathname;
}

/** Lê o corpo JSON. Se ele for inválido ou grande demais, já responde e devolve undefined. */
export async function readJsonBodyOrReply(request: IncomingMessage, response: ServerResponse): Promise<{ data: unknown } | undefined> {
  try {
    return { data: await readJsonBody(request) };
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'BODY_TOO_LARGE';
    sendJson(response, tooLarge ? 413 : 400, { error: tooLarge ? 'Corpo da requisição muito grande.' : 'JSON inválido.' });
    return undefined;
  }
}
