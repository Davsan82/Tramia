import { drizzle } from 'drizzle-orm/neon-http';

let database: ReturnType<typeof drizzle> | null = null;

export function getDrizzleDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada.');
  }

  if (!database) {
    database = drizzle(databaseUrl);
  }

  return database;
}
