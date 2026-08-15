import 'dotenv/config';
import { closeDrizzleDatabase, getDrizzleDatabase } from '../server/db/client';
import { advisorProfiles } from '../server/db/schema';
import { eq } from 'drizzle-orm';

const replacements: Array<[string, string]> = [
  ['acompa\uFFFD\uFFFDar', 'acompañar'],
  ['tr\uFFFDmites', 'trámites'],
  ['\u00C3\u00A1', 'á'], ['\u00C3\u00A9', 'é'], ['\u00C3\u00AD', 'í'], ['\u00C3\u00B3', 'ó'], ['\u00C3\u00BA', 'ú'], ['\u00C3\u00B1', 'ñ'],
  ['\u00C3\u0081', 'Á'], ['\u00C3\u0089', 'É'], ['\u00C3\u008D', 'Í'], ['\u00C3\u0093', 'Ó'], ['\u00C3\u009A', 'Ú'], ['\u00C3\u0091', 'Ñ'],
  ['\u00C2\u00B7', '·'], ['\u00C2\u00BF', '¿'], ['\u00C2\u00A1', '¡'], ['\u00E2\u20AC\u00A6', '…'],
];

const repair = (value: string) => {
  let repaired = value;
  for (const [broken, valid] of replacements) repaired = repaired.replaceAll(broken, valid);
  return repaired.normalize('NFC');
};

async function main() {
  const db = getDrizzleDatabase();
  const advisors = await db.select({ userId: advisorProfiles.userId, publicName: advisorProfiles.publicName, bio: advisorProfiles.bio }).from(advisorProfiles);
  let updated = 0;
  for (const advisor of advisors) {
    const publicName = repair(advisor.publicName);
    const repairedBio = repair(advisor.bio);
    const bio = publicName === 'David Asesor TramIA' && repairedBio.includes('\uFFFD')
      ? 'Especialista validado para acompañar trámites ciudadanos en la plataforma.'
      : repairedBio;
    if (publicName === advisor.publicName && bio === advisor.bio) continue;
    await db.update(advisorProfiles).set({ publicName, bio, updatedAt: new Date() }).where(eq(advisorProfiles.userId, advisor.userId));
    updated += 1;
    console.log(`Reparado: ${publicName}`);
  }
  const remaining = await db.select({ publicName: advisorProfiles.publicName, bio: advisorProfiles.bio }).from(advisorProfiles);
  const unresolved = remaining.filter((advisor) => /\uFFFD|\u00C3(?:\u00A1|\u00A9|\u00AD|\u00B3|\u00BA|\u00B1|\u0081|\u0089|\u008D|\u0093|\u009A|\u0091)|\u00C2(?:\u00B7|\u00BF|\u00A1)|\u00E2\u20AC/u.test(`${advisor.publicName} ${advisor.bio}`));
  console.log(`Perfiles actualizados: ${updated}. Perfiles con texto aún dañado: ${unresolved.length}.`);
  if (unresolved.length) {
    for (const advisor of unresolved) console.log(`Revisión manual pendiente: ${advisor.publicName}`);
    process.exitCode = 2;
  }
}

main().finally(() => closeDrizzleDatabase());
