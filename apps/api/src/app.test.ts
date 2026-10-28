import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from './app.js';

test('responde ao healthcheck e informa rotas ainda não implementadas', async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor sem porta');
  try {
    const health = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const missing = await fetch(`http://127.0.0.1:${address.port}/api/rooms`);
    assert.equal(missing.status, 404);
  } finally {
    server.close();
  }
});
