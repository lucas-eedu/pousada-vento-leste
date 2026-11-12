import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { createServer } from './app.js';

// O healthcheck e a rota inexistente não consultam o banco; um pool fictício
// evita abrir conexões que manteriam o processo de teste vivo.
const database = {} as Pool;

test('responde ao healthcheck e devolve 404 para rotas inexistentes', async () => {
  const server = createServer(database);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor sem porta');
  try {
    const health = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const missing = await fetch(`http://127.0.0.1:${address.port}/api/rota-inexistente`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'Rota não encontrada' });
  } finally {
    server.close();
  }
});
