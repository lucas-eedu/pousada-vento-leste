import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { createServer } from './app.js';

// As rotas testadas aqui não consultam o banco.
const database = {} as Pool;

/** Sobe a API servindo um build fictício da interface, criado em uma pasta temporária. */
async function withWebApp(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'pousada-web-'));
  const webDistDir = join(root, 'dist');
  await mkdir(join(webDistDir, 'assets'), { recursive: true });
  await writeFile(join(webDistDir, 'index.html'), '<!doctype html><title>Vento Leste</title>');
  await writeFile(join(webDistDir, 'assets', 'app.js'), 'console.log("ok");');
  await writeFile(join(root, 'segredo.txt'), 'fora da pasta pública');

  const server = createServer(database, { webDistDir });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await rm(root, { recursive: true, force: true });
  }
}

test('serve a página inicial da interface', async () => {
  await withWebApp(async baseUrl => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
    assert.match(await response.text(), /Vento Leste/);
  });
});

test('serve arquivos do build com o tipo correto', async () => {
  await withWebApp(async baseUrl => {
    const response = await fetch(`${baseUrl}/assets/app.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /^text\/javascript/);
  });
});

test('devolve a página inicial para caminhos da interface sem arquivo', async () => {
  await withWebApp(async baseUrl => {
    const response = await fetch(`${baseUrl}/quartos`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Vento Leste/);
  });
});

test('responde 404 para arquivo inexistente', async () => {
  await withWebApp(async baseUrl => {
    const response = await fetch(`${baseUrl}/assets/nao-existe.js`);
    assert.equal(response.status, 404);
  });
});

test('não expõe arquivos fora da pasta do build', async () => {
  await withWebApp(async baseUrl => {
    const response = await fetch(`${baseUrl}/..%2Fsegredo.txt`);
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /fora da pasta pública/);
  });
});

test('mantém as rotas da API separadas da interface', async () => {
  await withWebApp(async baseUrl => {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const missing = await fetch(`${baseUrl}/api/rota-inexistente`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'Rota não encontrada' });
  });
});
