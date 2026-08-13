import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { getDrizzleDatabase } from '../server/db/client';
import { auditEvents, roles, userRoles, users } from '../server/db/schema';

const email = String(process.argv[2] || '').trim().toLowerCase();
const roleCode = String(process.argv[3] || 'administrator').trim();
if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Indica un correo válido. Ejemplo: npm run admin:assign -- correo@dominio.com');
const db = getDrizzleDatabase();
const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
const [role] = await db.select({ id: roles.id, code: roles.code }).from(roles).where(eq(roles.code, roleCode)).limit(1);
if (!user) throw new Error(`No existe una cuenta con el correo ${email}.`);
if (!role) throw new Error(`No existe el rol ${roleCode}. Ejecuta el seed de maestros primero.`);
await db.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing();
await db.insert(auditEvents).values({ actorUserId: user.id, eventName: 'role.assigned.via_script', eventData: { role: role.code, targetEmail: user.email } });
console.log(`Rol ${role.code} asignado a ${user.email}.`);
