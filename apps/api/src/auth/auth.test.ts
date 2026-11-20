import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { createServer } from '../app.js';
import { loadAuthConfig, type AuthConfig } from './auth.config.js';
import { createSessionToken, verifySessionToken } from './auth.session.js';

const auth: AuthConfig = { username: 'admin', password: 'senha-de-teste', sessionSecret: 'segredo-de-teste' };

// A listagem de quartos só precisa devolver linhas; o banco real não é necessário aqui.
const database = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;

type Response = { status: number; body: any; setCookie: string | null };

async function withApi(run: (send: (method: string, path: string, options?: { body?: unknown; cookie?: string }) => Promise<Response>) => Promise<void>) {
  const server = createServer(database, { auth });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(async (method, path, options = {}) => {
      const headers: Record<string, string> = {};
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      if (options.cookie) headers.Cookie = options.cookie;
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null, setCookie: response.headers.get('set-cookie') };
    });
  } finally {
    server.close();
  }
}

/** Faz login e devolve o par nome=valor do cookie de sessão. */
async function login(send: Parameters<Parameters<typeof withApi>[0]>[0]): Promise<string> {
  const response = await send('POST', '/api/auth/login', { body: { username: 'admin', password: 'senha-de-teste' } });
  assert.equal(response.status, 200);
  return response.setCookie!.split(';')[0];
}

test('bloqueia quartos e reservas sem login', async () => {
  await withApi(async send => {
    for (const path of ['/api/rooms', '/api/rooms/1/reservations']) {
      const response = await send('GET', path);
      assert.equal(response.status, 401);
      assert.equal(response.body.error, 'Faça login para continuar.');
    }
    assert.equal((await send('DELETE', '/api/reservations/1')).status, 401);
  });
});

test('mantém públicos o healthcheck e a documentação', async () => {
  await withApi(async send => {
    assert.equal((await send('GET', '/api/health')).status, 200);
    assert.equal((await send('GET', '/api/rooms/openapi.json')).status, 200);
  });
});

test('recusa usuário ou senha incorretos sem criar sessão', async () => {
  await withApi(async send => {
    const wrongPassword = await send('POST', '/api/auth/login', { body: { username: 'admin', password: 'errada' } });
    assert.equal(wrongPassword.status, 401);
    assert.equal(wrongPassword.body.error, 'Usuário ou senha incorretos.');
    assert.equal(wrongPassword.setCookie, null);

    const wrongUser = await send('POST', '/api/auth/login', { body: { username: 'outro', password: 'senha-de-teste' } });
    assert.equal(wrongUser.status, 401);
  });
});

test('exige usuário e senha no corpo do login', async () => {
  await withApi(async send => {
    const response = await send('POST', '/api/auth/login', { body: { username: 'admin' } });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Informe o usuário e a senha.');
  });
});

test('libera as rotas depois do login e informa a sessão', async () => {
  await withApi(async send => {
    const cookie = await login(send);

    assert.equal((await send('GET', '/api/rooms', { cookie })).status, 200);

    const session = await send('GET', '/api/auth/session', { cookie });
    assert.equal(session.status, 200);
    assert.deepEqual(session.body, { username: 'admin' });
  });
});

test('cria o cookie de sessão com HttpOnly e SameSite', async () => {
  await withApi(async send => {
    const response = await send('POST', '/api/auth/login', { body: { username: 'admin', password: 'senha-de-teste' } });
    assert.match(response.setCookie ?? '', /^pousada_session=[^;]+; /);
    assert.match(response.setCookie ?? '', /HttpOnly/);
    assert.match(response.setCookie ?? '', /SameSite=Strict/);
  });
});

test('encerra a sessão no logout', async () => {
  await withApi(async send => {
    await login(send);
    const response = await send('POST', '/api/auth/logout');
    assert.equal(response.status, 200);
    assert.match(response.setCookie ?? '', /Max-Age=0/);
    assert.equal((await send('GET', '/api/auth/session')).status, 401);
  });
});

test('recusa cookie adulterado', async () => {
  await withApi(async send => {
    const cookie = await login(send);
    const [name, value] = cookie.split('=');
    const tampered = `${name}=${value.replace(/^./, character => (character === 'a' ? 'b' : 'a'))}`;
    assert.equal((await send('GET', '/api/rooms', { cookie: tampered })).status, 401);
  });
});

test('o token de sessão expira e depende do segredo', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const token = createSessionToken('admin', 'segredo', now);

  assert.equal(verifySessionToken(token, 'segredo', now + 60_000), 'admin');
  assert.equal(verifySessionToken(token, 'outro-segredo', now + 60_000), null);
  assert.equal(verifySessionToken(token, 'segredo', now + 9 * 60 * 60 * 1000), null);
  assert.equal(verifySessionToken('lixo', 'segredo', now), null);
});

test('exige usuário e senha do administrador nas variáveis de ambiente', () => {
  assert.throws(() => loadAuthConfig({}), /ADMIN_USERNAME e ADMIN_PASSWORD/);
  assert.throws(() => loadAuthConfig({ ADMIN_USERNAME: 'admin' }), /ADMIN_USERNAME e ADMIN_PASSWORD/);

  const config = loadAuthConfig({ ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'senha' });
  assert.equal(config.username, 'admin');
  assert.ok(config.sessionSecret.length >= 32, 'sem SESSION_SECRET, gera um segredo aleatório');
  assert.equal(loadAuthConfig({ ADMIN_USERNAME: 'a', ADMIN_PASSWORD: 'b', SESSION_SECRET: 'fixo' }).sessionSecret, 'fixo');
});
