import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sqlClient: NeonQueryFunction<false, false> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDatabase(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurada.');
  }

  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}

export async function checkDatabaseConnection() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: 'DATABASE_URL no está configurada.',
    };
  }

  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        now() AS checked_at
    `;

    return {
      configured: true,
      connected: true,
      database: rows[0]?.database_name,
      checkedAt: rows[0]?.checked_at,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: error instanceof Error ? error.message : 'No se pudo conectar con PostgreSQL.',
    };
  }
}
