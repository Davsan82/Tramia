import ws from 'ws';
import { drizzle } from 'drizzle-orm/neon-serverless';

let database: ReturnType<typeof drizzle> | null = null;

export function getDrizzleDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada.');
  }

  if (!database) {
    // El adaptador WebSocket permite las transacciones interactivas que usan
    // los flujos de trámites, delegaciones y administración.
    database = drizzle({ connection: databaseUrl, ws });
  }

  return database;
}

export async function closeDrizzleDatabase() {
  if (!database) return;
  const current = database;
  database = null;
  await current.$client.end();
}
