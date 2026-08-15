import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL no está configurada.');

const sql = neon(databaseUrl);
const rows = await sql`
  select
    p.id as procedure_id,
    p.slug,
    p.title as procedure_title,
    pv.id as version_id,
    pv.version_number,
    pv.status as version_status,
    ps.id as step_id,
    ps.position,
    ps.title as step_title,
    ps.description,
    ps.completion_mode,
    ps.step_type,
    ps.date_tracking_enabled,
    ps.date_tracking_type,
    ps.requires_user_presence,
    ps.can_be_delegated,
    ps.is_point_of_no_return,
    ps.is_optional,
    ps.action_config,
    count(psci.id)::int as checklist_items,
    coalesce(json_agg(json_build_object('position', psci.position, 'label', psci.label, 'required', psci.is_required) order by psci.position)
      filter (where psci.id is not null), '[]'::json) as checklist
  from procedures p
  join procedure_versions pv on pv.id = (
    select candidate.id
    from procedure_versions candidate
    where candidate.procedure_id = p.id
    order by candidate.version_number desc
    limit 1
  )
  left join procedure_steps ps on ps.procedure_version_id = pv.id
  left join procedure_step_checklist_items psci on psci.step_id = ps.id
  where p.is_active = true
  group by p.id, p.slug, p.title, pv.id, pv.version_number, pv.status, ps.id
  order by p.title, pv.version_number desc, ps.position
`;

const grouped = new Map<string, typeof rows>();
const slugArgument = process.argv.find((argument) => argument.startsWith('--slug='))?.slice('--slug='.length);
for (const row of rows) {
  if (slugArgument && row.slug !== slugArgument) continue;
  const key = String(row.version_id);
  grouped.set(key, [...(grouped.get(key) ?? []), row]);
}

for (const route of grouped.values()) {
  const first = route[0];
  console.log(`\n## ${first.procedure_title} [${first.slug}] · v${first.version_number}`);
  for (const step of route) {
    if (!step.step_id) continue;
    const config = (step.action_config ?? {}) as { fields?: unknown[] };
    const fieldCount = Array.isArray(config.fields) ? config.fields.length : 0;
    console.log([
      String(step.position).padStart(2, '0'),
      step.step_title,
      `modo=${step.completion_mode}`,
      `campos=${fieldCount}`,
      `checks=${step.checklist_items}`,
      step.date_tracking_enabled ? `fecha=${step.date_tracking_type ?? 'sí'}` : 'fecha=no',
      step.is_point_of_no_return ? 'NO_RETORNO' : '',
    ].filter(Boolean).join(' | '));
    if (process.argv.includes('--details')) {
      console.log(`   ${step.description}`);
      for (const item of (step.checklist as Array<{ position: number; label: string; required: boolean }>)) {
        console.log(`   - ${item.label}${item.required ? '' : ' (opcional)'}`);
      }
    }
  }
}

console.log(`\n${grouped.size} rutas activas auditadas.`);

const usage = await sql`
  select p.slug, p.title, pv.version_number,
    count(up.id)::int as total_instances,
    count(up.id) filter (where up.status not in ('completed', 'cancelled', 'rejected'))::int as open_instances
  from procedures p
  join procedure_versions pv on pv.procedure_id = p.id
  left join user_procedures up on up.procedure_version_id = pv.id
  group by p.slug, p.title, pv.version_number
  having count(up.id) > 0
  order by p.title, pv.version_number
`;
console.log('\n## Uso actual de versiones');
for (const item of usage) {
  console.log(`${item.title} · v${item.version_number}: ${item.total_instances} instancias (${item.open_instances} abiertas)`);
}
