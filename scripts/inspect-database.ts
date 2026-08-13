import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL no está configurada.');

const sql = neon(databaseUrl);
const tables = await sql`
  select table_schema, table_name
  from information_schema.tables
  where table_schema in ('public', 'drizzle')
  order by table_schema, table_name
`;

console.table(tables);
