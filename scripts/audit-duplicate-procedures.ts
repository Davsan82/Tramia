import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { closeDrizzleDatabase, getDrizzleDatabase } from '../server/db/client';

type ProcedureRow = {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  updated_at: string;
  versions: number;
  reviewed_versions: number;
  steps: number;
  requirements: number;
  sources: number;
  user_procedures: number;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const db = getDrizzleDatabase();
const applyChanges = process.argv.includes('--apply');

try {
  if (applyChanges) {
    const archived = await db.execute(sql`
      with ranked_reviewed_versions as (
        select
          id,
          row_number() over (
            partition by procedure_id
            order by version_number desc, updated_at desc, id desc
          ) as position
        from procedure_versions
        where status = 'reviewed'
      )
      update procedure_versions pv
      set status = 'archived', updated_at = now()
      from ranked_reviewed_versions ranked
      where pv.id = ranked.id
        and ranked.position > 1
      returning pv.id, pv.procedure_id, pv.version_number
    `);

    console.log(JSON.stringify({ archivedDuplicateVersions: archived.rows }, null, 2));
  }

  const result = await db.execute(sql`
    select
      p.id,
      p.slug,
      p.title,
      p.is_active,
      p.updated_at,
      count(distinct pv.id)::int as versions,
      count(distinct pv.id) filter (where pv.status = 'reviewed')::int as reviewed_versions,
      count(distinct ps.id)::int as steps,
      count(distinct pr.id)::int as requirements,
      count(distinct src.id)::int as sources,
      count(distinct up.id)::int as user_procedures
    from procedures p
    left join procedure_versions pv on pv.procedure_id = p.id
    left join procedure_steps ps on ps.procedure_version_id = pv.id
    left join procedure_requirements pr on pr.procedure_version_id = pv.id
    left join procedure_sources src on src.procedure_version_id = pv.id
    left join user_procedures up on up.procedure_id = p.id
    group by p.id
    order by p.title, p.updated_at desc
  `);

  const rows = result.rows as ProcedureRow[];
  const groups = new Map<string, ProcedureRow[]>();

  for (const row of rows) {
    const key = normalize(row.title);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const duplicates = [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([normalizedTitle, records]) => ({ normalizedTitle, records }));

  const proceduresWithMultipleReviewedVersions = rows.filter((row) => row.reviewed_versions > 1);
  const duplicateVersionDetails = proceduresWithMultipleReviewedVersions.length === 0
    ? []
    : (await db.execute(sql`
        select
          pv.id,
          pv.procedure_id,
          p.slug,
          p.title,
          pv.version_number,
          pv.status,
          pv.updated_at,
          count(distinct ps.id)::int as steps,
          count(distinct pr.id)::int as requirements,
          count(distinct src.id)::int as sources,
          count(distinct up.id)::int as user_procedures
        from procedure_versions pv
        join procedures p on p.id = pv.procedure_id
        left join procedure_steps ps on ps.procedure_version_id = pv.id
        left join procedure_requirements pr on pr.procedure_version_id = pv.id
        left join procedure_sources src on src.procedure_version_id = pv.id
        left join user_procedures up on up.procedure_version_id = pv.id
        where pv.procedure_id in (
          select procedure_id
          from procedure_versions
          where status = 'reviewed'
          group by procedure_id
          having count(*) > 1
        )
        group by pv.id, p.slug, p.title
        order by p.title, pv.version_number desc
      `)).rows;

  console.log(JSON.stringify({
    total: rows.length,
    duplicateGroups: duplicates.length,
    duplicates,
    proceduresWithMultipleReviewedVersions,
    duplicateVersionDetails,
    procedures: rows.map(({ id, slug, title, is_active, reviewed_versions }) => ({
      id,
      slug,
      title,
      isActive: is_active,
      reviewedVersions: reviewed_versions,
    })),
  }, null, 2));
} finally {
  await closeDrizzleDatabase();
}
