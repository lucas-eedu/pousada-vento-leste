import { createServer } from './app.js';
import { createDatabase } from './database.js';

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? './data/pousada.sqlite';
const database = createDatabase(databasePath);
const server = createServer();

server.listen(port, () => console.log(`API disponível em http://localhost:${port}`));

function shutdown(): void {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
