import type { IncomingMessage, ServerResponse } from 'node:http';
import { getPathname, readJsonBodyOrReply, sendJson } from '../utils/http.js';
import type { AuthConfig } from './auth.config.js';
import { createSessionToken, safeEqual, SESSION_DURATION_MS, verifySessionToken } from './auth.session.js';

const SESSION_COOKIE = 'pousada_session';

/** Rotas abertas mesmo sem login: healthcheck, documentação e as próprias rotas de autenticação. */
const PUBLIC_API_PATHS = new Set(['/api/health', '/api/rooms/docs', '/api/rooms/openapi.json']);

export function requiresAuthentication(pathname: string): boolean {
  return pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') && !PUBLIC_API_PATHS.has(pathname);
}

function readCookie(request: IncomingMessage, name: string): string | undefined {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return undefined;
}

/** Na Railway o HTTPS termina no proxy, que informa o protocolo original neste cabeçalho. */
function isHttps(request: IncomingMessage): boolean {
  return request.headers['x-forwarded-proto'] === 'https';
}

function setSessionCookie(request: IncomingMessage, response: ServerResponse, value: string, maxAgeSeconds: number): void {
  const secure = isHttps(request) ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`);
}

/** Usuário da sessão atual, ou null se não houver login válido. */
export function getAuthenticatedUser(request: IncomingMessage, auth: AuthConfig): string | null {
  const token = readCookie(request, SESSION_COOKIE);
  return token ? verifySessionToken(token, auth.sessionSecret) : null;
}

async function login(request: IncomingMessage, response: ServerResponse, auth: AuthConfig): Promise<void> {
  const body = await readJsonBodyOrReply(request, response);
  if (!body) return;

  const { username, password } = (body.data ?? {}) as Record<string, unknown>;
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    sendJson(response, 400, { error: 'Informe o usuário e a senha.' });
    return;
  }

  // As duas comparações sempre rodam, para o tempo de resposta não indicar qual campo errou.
  const validUser = safeEqual(username.trim(), auth.username);
  const validPassword = safeEqual(password, auth.password);
  if (!validUser || !validPassword) {
    sendJson(response, 401, { error: 'Usuário ou senha incorretos.' });
    return;
  }

  setSessionCookie(request, response, createSessionToken(auth.username, auth.sessionSecret), SESSION_DURATION_MS / 1000);
  sendJson(response, 200, { username: auth.username });
}

function logout(request: IncomingMessage, response: ServerResponse): void {
  setSessionCookie(request, response, '', 0);
  sendJson(response, 200, { message: 'Sessão encerrada.' });
}

function sendSession(request: IncomingMessage, response: ServerResponse, auth: AuthConfig): void {
  const username = getAuthenticatedUser(request, auth);
  if (!username) {
    sendJson(response, 401, { error: 'Faça login para continuar.' });
    return;
  }
  sendJson(response, 200, { username });
}

/** Atende /api/auth/login, /api/auth/logout e /api/auth/session. Devolve false para outras rotas. */
export async function handleAuthRoutes(request: IncomingMessage, response: ServerResponse, auth: AuthConfig): Promise<boolean> {
  const pathname = getPathname(request);

  if (request.method === 'POST' && pathname === '/api/auth/login') {
    await login(request, response, auth);
    return true;
  }
  if (request.method === 'POST' && pathname === '/api/auth/logout') {
    logout(request, response);
    return true;
  }
  if (request.method === 'GET' && pathname === '/api/auth/session') {
    sendSession(request, response, auth);
    return true;
  }
  return false;
}
