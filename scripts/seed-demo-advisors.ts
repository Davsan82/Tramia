import 'dotenv/config';
import { eq, sql } from 'drizzle-orm';
import { closeDrizzleDatabase, getDrizzleDatabase } from '../server/db/client';
import { hashPassword } from '../server/services/auth';
import {
  advisorExpertise,
  advisorProfiles,
  auditEvents,
  expertiseAreas,
  roles,
  userProfiles,
  userRoles,
  users,
} from '../server/db/schema';

if (process.env.NODE_ENV === 'production') {
  throw new Error('La carga de asesores ficticios está bloqueada en producción.');
}

const demoAdvisors = [
  {
    legacyUsername: 'asesora_demo_maria',
    username: 'maria.salazar',
    email: 'maria.salazar@tramia.local',
    firstName: 'María Elena',
    lastName: 'Salazar',
    publicName: 'María Elena Salazar',
    bio: 'Especialista en trámites de identidad, familia y migraciones.',
    avatarUrl: '/assets/advisors/maria-salazar.png',
    rating: '4.92',
    completed: 86,
    fee: 7900,
    expertise: ['Identidad y registro civil', 'Viajes y migraciones'],
  },
  {
    legacyUsername: 'asesor_demo_carlos',
    username: 'carlos.mendoza',
    email: 'carlos.mendoza@tramia.local',
    firstName: 'Carlos Andrés',
    lastName: 'Mendoza',
    publicName: 'Carlos Andrés Mendoza',
    bio: 'Especialista en negocios, RUC y registros públicos.',
    avatarUrl: '/assets/advisors/carlos-mendoza.png',
    rating: '4.84',
    completed: 64,
    fee: 8900,
    expertise: ['Negocios y tributación', 'Registros públicos'],
  },
  {
    legacyUsername: 'asesora_demo_valeria',
    username: 'valeria.quispe',
    email: 'valeria.quispe@tramia.local',
    firstName: 'Valeria',
    lastName: 'Quispe',
    publicName: 'Valeria Quispe',
    bio: 'Especialista en transporte y gestiones municipales.',
    avatarUrl: '/assets/advisors/valeria-quispe.png',
    rating: '4.76',
    completed: 41,
    fee: 6900,
    expertise: ['Transporte', 'Gestiones municipales'],
  },
] as const;

const db = getDrizzleDatabase();

try {
  const [advisorRole] = await db.select().from(roles).where(eq(roles.code, 'advisor')).limit(1);
  if (!advisorRole) throw new Error('No existe el rol advisor. Ejecuta primero npm run db:seed.');

  const passwordHash = await hashPassword('Demo12345!');

  for (const demo of demoAdvisors) {
    let [user] = await db.select().from(users).where(sql`lower(${users.username}) in (${demo.username}, ${demo.legacyUsername})`).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({
        username: demo.username,
        email: demo.email,
        passwordHash,
        status: 'active',
        emailVerifiedAt: new Date(),
      }).returning();
    } else {
      [user] = await db.update(users).set({
        username: demo.username,
        email: demo.email,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id)).returning();
    }

    await db.insert(userProfiles).values({
      userId: user.id,
      firstName: demo.firstName,
      lastName: demo.lastName,
      avatarUrl: demo.avatarUrl,
      identityVerificationStatus: 'verified',
      identityVerifiedAt: new Date(),
    }).onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        firstName: demo.firstName,
        lastName: demo.lastName,
        avatarUrl: demo.avatarUrl,
        identityVerificationStatus: 'verified',
        identityVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await db.insert(userRoles).values({ userId: user.id, roleId: advisorRole.id }).onConflictDoNothing();
    await db.insert(advisorProfiles).values({
      userId: user.id,
      publicName: demo.publicName,
      bio: demo.bio,
      verificationStatus: 'verified',
      availabilityStatus: 'available',
      averageRating: demo.rating,
      completedCasesCount: demo.completed,
      maxActiveCases: 8,
      baseFeeMinor: demo.fee,
    }).onConflictDoUpdate({
      target: advisorProfiles.userId,
      set: {
        publicName: demo.publicName,
        bio: demo.bio,
        verificationStatus: 'verified',
        availabilityStatus: 'available',
        averageRating: demo.rating,
        completedCasesCount: demo.completed,
        maxActiveCases: 8,
        baseFeeMinor: demo.fee,
        updatedAt: new Date(),
      },
    });

    for (const name of demo.expertise) {
      const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const [expertise] = await db.insert(expertiseAreas).values({ slug, name }).onConflictDoUpdate({
        target: expertiseAreas.slug,
        set: { name },
      }).returning();
      await db.insert(advisorExpertise).values({
        advisorId: user.id,
        expertiseId: expertise.id,
        level: 'specialist',
        yearsExperience: 5,
        isVerified: true,
      }).onConflictDoNothing();
    }

    await db.insert(auditEvents).values({
      actorUserId: user.id,
      eventName: 'development.demo_advisor_seeded',
      eventData: { temporary: true, username: demo.username },
    });
  }

  console.log(`Se prepararon ${demoAdvisors.length} asesores ficticios. Uso exclusivo de desarrollo.`);
} finally {
  await closeDrizzleDatabase();
}
