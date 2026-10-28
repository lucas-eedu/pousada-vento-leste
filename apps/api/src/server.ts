import { createServer } from './app.js';
import { Pool } from 'pg';
import { initializeDatabase } from './database.js';

const port = Number(process.env.PORT ?? 3000);
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL não definida. Inicie com docker compose up --build.');
const database = new Pool({ connectionString });
await initializeDatabase(database);
const server = createServer();

server.listen(port, () => console.log(`API disponível em http://localhost:${port}`));

function shutdown(): void {
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
