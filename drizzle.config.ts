import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const runtimeUrl = process.env.DATABASE_URL || '';
const migrationUrl = process.env.DATABASE_DIRECT_URL
  || runtimeUrl.replace('-pooler.', '.');

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Netlify uses the pooled URL; schema tools prefer Neon's direct endpoint.
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});
