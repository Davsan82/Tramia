import 'dotenv/config';
import { eq, sql } from 'drizzle-orm';
import { getDrizzleDatabase } from '../server/db/client';
import { hashPassword } from '../server/services/auth';
import { auditEvents, roles, userProfiles, userRoles, users } from '../server/db/schema';

if (process.env.NODE_ENV === 'production') throw new Error('Este comando está bloqueado en producción.');
const db = getDrizzleDatabase(), username = 'admin', email = 'admin@tramia.local', passwordHash = await hashPassword('12345678');
let [user] = await db.select().from(users).where(sql`lower(${users.username}) = 'admin'`).limit(1);
if (!user) { [user] = await db.insert(users).values({ username, email, passwordHash, status: 'active', emailVerifiedAt: new Date() }).returning(); await db.insert(userProfiles).values({ userId: user.id, firstName: 'Administrador', lastName: 'Local' }); }
else [user] = await db.update(users).set({ passwordHash, status: 'active', updatedAt: new Date() }).where(eq(users.id, user.id)).returning();
const [role] = await db.select().from(roles).where(eq(roles.code, 'administrator')).limit(1);
if (!role) throw new Error('No existe el rol administrator. Ejecuta el seed de maestros.');
await db.insert(userRoles).values({ userId: user.id, roleId: role.id }).onConflictDoNothing();
await db.insert(auditEvents).values({ actorUserId: user.id, eventName: 'development.insecure_admin_created', eventData: { username, productionBlocked: true } });
console.log('Administrador temporal creado: admin / 12345678. BLOQUEADO EN PRODUCCIÓN.');
