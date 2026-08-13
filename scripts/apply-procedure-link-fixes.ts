import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL no está configurada.');
const sql = neon(databaseUrl);
const checkedAt = new Date();
const nextReviewAt = new Date(checkedAt.getTime() + 90 * 86400000);
const fixes = [
  { slug: 'certificado-unico-laboral', oldUrl: 'https://www.gob.pe/470-obtener-tu-certificado-unico-laboral-cul', newUrl: 'https://www.gob.pe/47089-obtener-tu-certificado-unico-laboral-cul', reason: 'La ficha anterior responde 404; reemplazada por la ficha vigente del MTPE en Gob.pe.' },
  { slug: 'matrimonio-civil-municipal', oldUrl: 'https://www.munlima.gob.pe/tramites-y-servicios/matrimonio-civil/', newUrl: 'https://www.gob.pe/20411-contraer-matrimonio-civil?child=9621', reason: 'La web municipal no responde de forma confiable; se usa la ficha Gob.pe específica de la Municipalidad Metropolitana de Lima.' },
];
for (const fix of fixes) {
  const versions = await sql`update procedure_versions pv set official_url=${fix.newUrl},source_verified_at=${checkedAt},verification_notes=${fix.reason},updated_at=now() from procedures p where pv.procedure_id=p.id and p.slug=${fix.slug} and pv.status in ('published','reviewed') returning pv.id`;
  for (const version of versions as any[]) await sql`update procedure_sources set url=${fix.newUrl},last_checked_at=${checkedAt},status='active',next_review_at=${nextReviewAt} where procedure_version_id=${version.id} and (is_primary=true or url=${fix.oldUrl})`;
  console.log(`${fix.slug}: ${versions.length} versión/es actualizadas`);
}
