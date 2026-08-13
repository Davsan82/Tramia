import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL no está configurada.');
const sql = neon(databaseUrl);
const rows = await sql`
  select p.slug, p.title, pv.id as version_id, pv.version_number,
         pv.official_url, ps.id as step_id, ps.position,
         ps.title as step_title, ps.official_url as step_url
  from procedures p
  join procedure_versions pv on pv.procedure_id = p.id
  left join procedure_steps ps on ps.procedure_version_id = pv.id
  where pv.status in ('published', 'reviewed')
  order by p.slug, pv.version_number desc, ps.position
`;
const unique = new Map<string, { url: string; references: string[] }>();
for (const row of rows as any[]) {
  for (const [kind, url] of [['procedure', row.official_url], ['step', row.step_url]] as const) {
    if (!url) continue;
    const item = unique.get(url) || { url, references: [] };
    item.references.push(`${row.slug}:${kind}${kind === 'step' ? `:${row.position}` : ''}`);
    unique.set(url, item);
  }
}

const results = [];
for (const item of unique.values()) {
  const started = Date.now();
  try {
    const response = await fetch(item.url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'TramIA-Link-Audit/1.0' } });
    results.push({ ...item, status: response.status, ok: response.ok, finalUrl: response.url, contentType: response.headers.get('content-type'), elapsedMs: Date.now() - started });
  } catch (error) {
    results.push({ ...item, status: null, ok: false, finalUrl: null, error: error instanceof Error ? error.message : String(error), elapsedMs: Date.now() - started });
  }
}
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), procedures: new Set((rows as any[]).map((row) => row.slug)).size, databaseRows: rows.length, uniqueUrls: results.length, results }, null, 2));
