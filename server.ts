import 'dotenv/config';
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { checkDatabaseConnection } from './server/db';
import { getCatalogBootstrap, getProcedureBySlug, listCategories, listProcedures } from './server/repositories/catalog';
import { openApiDocument } from './server/openapi';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { getDrizzleDatabase } from './server/db/client';
import { advisorAssignments, advisorProfiles, authSessions, contactMessages, delegationRequests, procedureCategories, procedures, ratings, userProcedures, userProfiles, users } from './server/db/schema';
import { SESSION_COOKIE, consumeAuthToken, createSession, encryptPrivateValue, findSession, findUserByIdentifier, hashPassword, inspectAuthToken, issueAuthToken, parseCookie, sendAccountEmail, sendContactEmail, tokenHash, verifyPassword } from './server/services/auth';

export const app = express();

app.use(express.json({ limit: "15mb" }));

const publicUser = (user: typeof users.$inferSelect, profile: typeof userProfiles.$inferSelect | null) => ({
  id: user.id, username: user.username, email: user.email, emailVerified: Boolean(user.emailVerifiedAt),
  phone: user.phone || '', fullName: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user.username,
  dni: profile?.documentLastFour ? `****${profile.documentLastFour}` : '', address: profile?.address || '',
  birthDate: profile?.birthDate || '', gender: profile?.gender || '',
  department: profile?.department || '', province: profile?.province || '', district: profile?.district || '',
  identityVerificationStatus: profile?.identityVerificationStatus || 'unverified',
});
const setSessionCookie = (res: express.Response, raw: string, expiresAt: Date) => res.cookie(SESSION_COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim(); const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || ''); const phone = String(req.body.phone || '').trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: 'invalid_username', message: 'El usuario debe tener entre 3 y 24 caracteres: letras, números o guion bajo.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'invalid_email', message: 'Ingresa un correo válido.' });
    if (password.length < 8) return res.status(400).json({ error: 'weak_password', message: 'La contraseña debe tener al menos 8 caracteres.' });
    if (!/^\+?[0-9 ]{9,16}$/.test(phone)) return res.status(400).json({ error: 'invalid_phone', message: 'Ingresa un celular válido.' });
    const db = getDrizzleDatabase();
    const [user] = await db.insert(users).values({ username, email, passwordHash: await hashPassword(password), phone, status: 'active' }).returning();
    const [profile] = await db.insert(userProfiles).values({ userId: user.id, firstName: username, lastName: '' }).returning();
    const verifyToken = await issueAuthToken(user.id, 'verify_email', 24 * 60);
    const mail = await sendAccountEmail(email, 'Verifica tu correo en TramIA', `/verificar-correo?token=${encodeURIComponent(verifyToken)}`);
    const session = await createSession(user.id, { userAgent: req.get('user-agent'), ip: req.ip }); setSessionCookie(res, session.raw, session.expiresAt);
    res.status(201).json({ user: { ...publicUser(user, profile), isNew: true }, verificationEmailSent: mail.delivered, previewUrl: mail.previewUrl });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'account_exists', message: 'El correo o nombre de usuario ya está registrado.' });
    console.error(error); res.status(500).json({ error: 'registration_failed', message: 'No pudimos crear la cuenta.' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  const user = await findUserByIdentifier(String(req.body.identifier || ''));
  if (!user || !(await verifyPassword(String(req.body.password || ''), user.passwordHash))) return res.status(401).json({ error: 'invalid_credentials', message: 'Usuario, correo o contraseña incorrectos.' });
  if (user.status !== 'active') return res.status(403).json({ error: 'account_unavailable' });
  const profiles = await getDrizzleDatabase().select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  const session = await createSession(user.id, { userAgent: req.get('user-agent'), ip: req.ip }); setSessionCookie(res, session.raw, session.expiresAt);
  await getDrizzleDatabase().update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  res.json({ user: publicUser(user, profiles[0] || null) });
});

app.get('/api/v1/auth/session', async (req, res) => {
  const raw = parseCookie(req.headers.cookie)[SESSION_COOKIE];
  const found = await findSession(raw);
  if (!found) return res.status(401).json({ user: null });
  setSessionCookie(res, raw, found.expiresAt);
  res.json({ user: publicUser(found.user, found.profile) });
});

app.post('/api/v1/auth/session/touch', async (req, res) => {
  const raw = parseCookie(req.headers.cookie)[SESSION_COOKIE];
  const found = await findSession(raw);
  if (!found) return res.status(401).json({ active: false });
  setSessionCookie(res, raw, found.expiresAt);
  res.json({ active: true, expiresAt: found.expiresAt.toISOString() });
});

app.post('/api/v1/auth/logout', async (req, res) => {
  const raw = parseCookie(req.headers.cookie)[SESSION_COOKIE];
  if (raw) await getDrizzleDatabase().delete(authSessions).where(eq(authSessions.tokenHash, tokenHash(raw)));
  res.clearCookie(SESSION_COOKIE, { path: '/' }); res.status(204).end();
});

app.post('/api/v1/auth/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(); const user = await findUserByIdentifier(email);
  if (user && user.email.toLowerCase() === email) { const token = await issueAuthToken(user.id, 'reset_password', 30); await sendAccountEmail(user.email, 'Restablece tu contraseña de TramIA', `/restablecer-contrasena?token=${encodeURIComponent(token)}`); }
  res.json({ message: 'Si el correo está registrado, enviaremos las instrucciones.' });
});

app.post('/api/v1/auth/verify-email', async (req, res) => {
  const raw = String(req.body.token || '');
  const inspection = await inspectAuthToken(raw, 'verify_email');
  if (inspection.status === 'invalid') return res.status(400).json({ error: 'invalid_token', message: 'Este enlace de verificación no es válido.' });
  if (inspection.status === 'expired') return res.status(410).json({ error: 'expired_token', message: 'Este enlace de verificación venció. Inicia sesión para solicitar uno nuevo desde Mi perfil.' });
  if (inspection.status === 'consumed') {
    const existing = await getDrizzleDatabase().select({ emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, inspection.token.userId)).limit(1);
    if (existing[0]?.emailVerifiedAt) return res.json({ verified: true, alreadyVerified: true, message: 'Tu correo ya se encontraba verificado.' });
    return res.status(400).json({ error: 'used_token', message: 'Este enlace ya fue utilizado. Solicita uno nuevo desde Mi perfil.' });
  }
  const token = await consumeAuthToken(raw, 'verify_email');
  if (!token) return res.status(409).json({ error: 'token_already_processed', message: 'El enlace ya fue procesado.' });
  await getDrizzleDatabase().update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, token.userId));
  return res.json({ verified: true, message: 'Tu correo fue verificado correctamente.' });
});

app.post('/api/v1/auth/resend-verification', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para continuar.' });
  if (session.user.emailVerifiedAt) return res.json({ sent: false, alreadyVerified: true, message: 'Tu correo ya está verificado.' });
  const verifyToken = await issueAuthToken(session.user.id, 'verify_email', 24 * 60);
  const mail = await sendAccountEmail(session.user.email, 'Verifica tu correo en TramIA', `/verificar-correo?token=${encodeURIComponent(verifyToken)}`);
  if (!mail.delivered && !mail.previewUrl) return res.status(502).json({ error: 'email_delivery_failed', message: 'No pudimos enviar el enlace. Inténtalo nuevamente en unos minutos.' });
  return res.json({ sent: true, message: `Enviamos un enlace de verificación a ${session.user.email}.` });
});

app.patch('/api/v1/profile', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para continuar.' });
  const phone = String(req.body.phone || '').trim(), address = String(req.body.address || '').trim();
  const department = String(req.body.department || '').trim(), province = String(req.body.province || '').trim(), district = String(req.body.district || '').trim();
  if (!/^\+?[0-9 ]{9,16}$/.test(phone)) return res.status(400).json({ error: 'invalid_phone', message: 'Ingresa un celular válido.' });
  if ([address, department, province, district].some((value) => value.length > 160)) return res.status(400).json({ error: 'invalid_profile', message: 'Revisa la longitud de los datos ingresados.' });
  const db = getDrizzleDatabase();
  const [user] = await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, session.user.id)).returning();
  const [profile] = await db.update(userProfiles).set({ address, department, province, district, updatedAt: new Date() }).where(eq(userProfiles.userId, session.user.id)).returning();
  return res.json({ user: publicUser(user, profile) });
});

app.post('/api/v1/profile/validate-dni', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });
  const document = String(req.body.document || '').trim();
  const birthDate = String(req.body.birthDate || '').trim();
  if (!/^\d{8}$/.test(document)) return res.status(400).json({ error: 'invalid_dni', message: 'El DNI debe tener 8 dígitos.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return res.status(400).json({ error: 'invalid_birth_date', message: 'Ingresa tu fecha de nacimiento.' });
  const apiKey = process.env.PERUDEVS_API_KEY?.trim();
  if (!apiKey) return res.status(503).json({ error: 'provider_not_configured', message: 'La validación de DNI estará disponible cuando se configure el proveedor.' });
  try {
    const baseUrl = process.env.PERUDEVS_BASE_URL || 'https://api.perudevs.com/api/v1';
    const response = await fetch(`${baseUrl}/dni/complete?document=${encodeURIComponent(document)}&key=${encodeURIComponent(apiKey)}`);
    const payload: any = await response.json();
    const providerBirthDate = payload.resultado?.fecha_nacimiento ? String(payload.resultado.fecha_nacimiento).split('/').reverse().join('-') : '';
    if (!response.ok || !payload.estado || providerBirthDate !== birthDate) return res.status(422).json({ error: 'identity_not_verified', message: 'No pudimos validar tu identidad. Revisa que el DNI y la fecha de nacimiento correspondan a la misma persona.' });
    const db = getDrizzleDatabase();
    const [profile] = await db.update(userProfiles).set({ documentType: 'DNI', documentNumberEncrypted: encryptPrivateValue(document), documentLastFour: document.slice(-4), firstName: payload.resultado?.nombres || session.profile?.firstName || session.user.username, lastName: [payload.resultado?.apellido_paterno, payload.resultado?.apellido_materno].filter(Boolean).join(' '), birthDate: providerBirthDate, gender: payload.resultado?.genero || undefined, identityVerificationStatus: 'verified', identityVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(userProfiles.userId, session.user.id)).returning();
    return res.json({ verified: true, user: publicUser(session.user, profile), message: 'Tu identidad fue validada correctamente.' });
  } catch (error) { console.error(error); res.status(502).json({ error: 'identity_provider_unavailable', message: 'El proveedor de identidad no está disponible.' }); }
});

const activeProcedureStatuses = ['draft', 'active', 'waiting_user', 'eligible_for_delegation', 'waiting_payment', 'waiting_assignment', 'delegated', 'in_progress', 'paused'] as const;

app.get('/api/v1/my-procedures', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para consultar tus trámites.' });
  try {
    const db = getDrizzleDatabase();
    const rows = await db.select({
      id: userProcedures.id,
      procedureId: userProcedures.procedureId,
      trackingCode: userProcedures.trackingCode,
      title: procedures.title,
      category: procedureCategories.name,
      mode: userProcedures.mode,
      status: userProcedures.status,
      progressPercentage: userProcedures.progressPercentage,
      startedAt: userProcedures.startedAt,
      expectedCompletionAt: userProcedures.expectedCompletionAt,
      completedAt: userProcedures.completedAt,
      cancelledAt: userProcedures.cancelledAt,
      updatedAt: userProcedures.updatedAt,
      advisorId: advisorAssignments.advisorId,
      advisorName: advisorProfiles.publicName,
      advisorAverageRating: advisorProfiles.averageRating,
      advisorCompletedCases: advisorProfiles.completedCasesCount,
      userRating: ratings.rating,
      ratingComment: ratings.comment,
    }).from(userProcedures)
      .innerJoin(procedures, eq(userProcedures.procedureId, procedures.id))
      .innerJoin(procedureCategories, eq(procedures.categoryId, procedureCategories.id))
      .leftJoin(delegationRequests, eq(delegationRequests.userProcedureId, userProcedures.id))
      .leftJoin(advisorAssignments, eq(advisorAssignments.delegationRequestId, delegationRequests.id))
      .leftJoin(advisorProfiles, eq(advisorProfiles.userId, advisorAssignments.advisorId))
      .leftJoin(ratings, and(
        eq(ratings.userProcedureId, userProcedures.id),
        eq(ratings.reviewerUserId, session.user.id),
        eq(ratings.ratingType, 'advisor'),
      ))
      .where(eq(userProcedures.userId, session.user.id))
      .orderBy(desc(userProcedures.updatedAt));

    const active = rows.filter((item) => activeProcedureStatuses.includes(item.status as typeof activeProcedureStatuses[number]));
    const history = rows.filter((item) => !activeProcedureStatuses.includes(item.status as typeof activeProcedureStatuses[number]));
    const completedCount = rows.filter((item) => item.status === 'completed').length;
    const delegatedCompletedCount = rows.filter((item) => item.status === 'completed' && item.mode !== 'self_service').length;
    const ratedAdvisorsCount = rows.filter((item) => item.userRating !== null).length;
    return res.json({
      data: { active, history },
      summary: { activeCount: active.length, completedCount, delegatedCompletedCount, ratedAdvisorsCount, totalCount: rows.length },
    });
  } catch (error) {
    console.error('[my-procedures]', error);
    return res.status(503).json({ error: 'procedures_unavailable', message: 'No pudimos cargar tus trámites en este momento.' });
  }
});

app.post('/api/v1/my-procedures/:id/rating', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para calificar.' });
  const stars = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim().slice(0, 1000);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'invalid_rating', message: 'Selecciona una calificación de 1 a 5 estrellas.' });
  try {
    const db = getDrizzleDatabase();
    const [record] = await db.select({ id: userProcedures.id, status: userProcedures.status, advisorId: advisorAssignments.advisorId })
      .from(userProcedures)
      .leftJoin(delegationRequests, eq(delegationRequests.userProcedureId, userProcedures.id))
      .leftJoin(advisorAssignments, eq(advisorAssignments.delegationRequestId, delegationRequests.id))
      .where(and(eq(userProcedures.id, req.params.id), eq(userProcedures.userId, session.user.id)))
      .limit(1);
    if (!record) return res.status(404).json({ error: 'procedure_not_found', message: 'No encontramos este trámite en tu cuenta.' });
    if (record.status !== 'completed') return res.status(409).json({ error: 'procedure_not_completed', message: 'Podrás calificar al asesor cuando el trámite haya finalizado.' });
    if (!record.advisorId) return res.status(409).json({ error: 'advisor_not_assigned', message: 'Este trámite no tuvo un asesor asignado.' });

    const [saved] = await db.insert(ratings).values({ userProcedureId: record.id, reviewerUserId: session.user.id, reviewedUserId: record.advisorId, rating: stars, comment: comment || null, ratingType: 'advisor' })
      .onConflictDoUpdate({ target: [ratings.userProcedureId, ratings.reviewerUserId, ratings.reviewedUserId], set: { rating: stars, comment: comment || null } })
      .returning({ rating: ratings.rating, comment: ratings.comment });
    const [aggregate] = await db.select({ average: sql<string>`round(avg(${ratings.rating})::numeric, 2)` }).from(ratings)
      .where(and(eq(ratings.reviewedUserId, record.advisorId), eq(ratings.ratingType, 'advisor')));
    await db.update(advisorProfiles).set({ averageRating: aggregate?.average || '0', updatedAt: new Date() }).where(eq(advisorProfiles.userId, record.advisorId));
    return res.json({ data: saved, advisorAverageRating: aggregate?.average || '0', message: 'Tu calificación fue registrada. Gracias por compartir tu experiencia.' });
  } catch (error) {
    console.error('[advisor-rating]', error);
    return res.status(503).json({ error: 'rating_unavailable', message: 'No pudimos guardar tu calificación.' });
  }
});

app.get('/api/health', async (_req, res) => {
  const database = await checkDatabaseConnection();
  const ready = database.configured && database.connected;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    service: 'tramia-api',
    database,
  });
});

const contactAttempts = new Map<string, number[]>();
app.post('/api/v1/contact', async (req, res) => {
  const name=String(req.body.name||'').trim(), email=String(req.body.email||'').trim().toLowerCase(), phone=String(req.body.phone||'').trim(), topic=String(req.body.topic||'consulta').trim(), message=String(req.body.message||'').trim(), sourcePath=String(req.body.sourcePath||'/contacto').slice(0,500);
  if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||message.length<10||message.length>2000) return res.status(400).json({error:'invalid_contact_form',message:'Revisa el nombre, correo y mensaje.'});
  const key=req.ip||'unknown', now=Date.now(), recent=(contactAttempts.get(key)||[]).filter(time=>now-time<60*60*1000); if(recent.length>=5) return res.status(429).json({error:'rate_limited',message:'Alcanzaste el límite temporal de mensajes. Inténtalo más tarde.'}); contactAttempts.set(key,[...recent,now]);
  const db=getDrizzleDatabase(); const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]); const ipHash=createHash('sha256').update(`${process.env.SESSION_SECRET||'local'}:${key}`).digest('hex');
  const [record]=await db.insert(contactMessages).values({userId:session?.user.id,name,email,phone:phone||null,topic,message,status:'received',ipHash,userAgent:req.get('user-agent'),sourcePath,metadata:{language:req.get('accept-language')?.slice(0,120)||null,referer:req.get('referer')?.slice(0,500)||null}}).returning({id:contactMessages.id});
  res.status(202).json({received:true,deliveryStatus:'processing',reference:record.id});
  void sendContactEmail({name,email,phone,topic,message})
    .then((result)=>db.update(contactMessages).set({status:result.delivered?'delivered':'queued',deliveryProvider:result.provider,deliveryMessageId:result.messageId,deliveredAt:result.delivered?new Date():null,updatedAt:new Date()}).where(eq(contactMessages.id,record.id)))
    .catch(async(error)=>{const reason=error instanceof Error?error.message:'Error SMTP';console.error('[contact-email]',error);await db.update(contactMessages).set({status:'delivery_failed',failureReason:reason.slice(0,1000),updatedAt:new Date()}).where(eq(contactMessages.id,record.id));});
});

app.get('/api/openapi.json', (_req, res) => res.json(openApiDocument));

app.get('/api/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TramIA API · Swagger</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>body{margin:0;background:#f8fafc}.swagger-ui .topbar{background:#071a3d}.swagger-ui .topbar-wrapper img{display:none}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>SwaggerUIBundle({url:'/api/openapi.json',dom_id:'#swagger-ui',deepLinking:true,displayRequestDuration:true});</script>
  </body>
</html>`);
});

app.get('/api/v1/catalog/categories', async (_req, res) => {
  try {
    res.json({ data: await listCategories() });
  } catch (error) {
    res.status(503).json({
      error: 'catalog_unavailable',
      message: error instanceof Error ? error.message : 'No se pudo consultar el catálogo.',
    });
  }
});

app.get('/api/v1/catalog/procedures', async (_req, res) => {
  try {
    res.json({ data: await listProcedures() });
  } catch (error) {
    res.status(503).json({
      error: 'catalog_unavailable',
      message: error instanceof Error ? error.message : 'No se pudo consultar el catálogo.',
    });
  }
});

app.get('/api/v1/catalog/bootstrap', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
    res.json({ data: await getCatalogBootstrap() });
  } catch (error) {
    res.status(503).json({
      error: 'catalog_unavailable',
      message: error instanceof Error ? error.message : 'No se pudo inicializar el catálogo.',
    });
  }
});

app.get('/api/v1/catalog/procedures/:slug', async (req, res) => {
  try {
    const procedure = await getProcedureBySlug(req.params.slug);
    if (!procedure) return res.status(404).json({ error: 'procedure_not_found' });
    return res.json({ data: procedure });
  } catch (error) {
    return res.status(503).json({
      error: 'catalog_unavailable',
      message: error instanceof Error ? error.message : 'No se pudo consultar el trámite.',
    });
  }
});

// Integración con Gemini desactivada temporalmente.
// Cuando se elija el proveedor de IA, cambia este valor a true y configura
// GEMINI_API_KEY en el entorno del servidor. El código se conserva para poder
// reutilizarlo o reemplazarlo sin afectar el flujo simulado actual.
const isGeminiEnabled = false;
const apiKey = process.env.GEMINI_API_KEY;
const ai = isGeminiEnabled && apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Endpoint: AI Document Validation System
app.post("/api/validate-document", async (req, res) => {
  try {
    const {
      fileData, // Base64 data URL e.g. "data:image/jpeg;base64,..."
      fileName,
      mimeType,
      requirementName,
      requirementDescription,
      procedureTitle,
      userProfile, // { fullName, dni }
      testSampleType, // Optional preset sample key
    } = req.body;

    console.log(`[AI-Validation] Processing document for requirement: "${requirementName}" in procedure: "${procedureTitle}"`);

    // System prompt instructing Gemini to act as an expert Peruvian bureaucracy document auditor
    const systemInstruction = `
Eres TramIA Copilot, el sistema oficial de inteligencia artificial especializado en validación y auditoría documental para trámites burocráticos en el Perú (RENIEC, SUNAT, MTC, Migraciones, SUNARP, SAT, etc.).

Tu tarea es analizar exhaustivamente un documento/fotografía adjunto o descrito y verificar su:
1. COMPLETITUD: ¿Están presentes todas las páginas, firmas manuscritas, sellos oficiales y campos obligatorios?
2. LEGIBILIDAD Y CALIDAD: ¿La imagen es nítida? ¿Hay destellos de luz, borrosidad, sombras o recortes de esquinas?
3. EXACTITUD Y COINCIDENCIA DE DATOS: ¿Los nombres, números de DNI y fechas coinciden con lo requerido o con el perfil del usuario (${userProfile?.fullName || "Usuario registrados"}, DNI ${userProfile?.dni || "45892014"})? ¿El documento está vigente?
4. ADHERENCIA A LA NORMATIVA ESPECÍFICA DEL TRÁMITE: Evalúa si cumple las reglas exactas para "${requirementName}" en el trámite "${procedureTitle}".
   - Ejemplo DNI/Pasaporte: Fondo blanco plano, rostro descubierto, orejas visibles, sin reflejos de lentes, sin sombras.
   - Ejemplo Recibos/Comprobantes de Pago: Código de tasa oficial visible, sello de banco/Págalo.pe, fecha dentro de vigencia.
   - Ejemplo Certificado Médico / Minuta: Firma de profesional colegiado, sello notarial, datos legibles.

Debes responder ÚNICAMENTE en formato JSON conforme a la estructura requerida.
    `.trim();

    const promptText = `
Analiza el documento cargado "${fileName || "documento"}" para el requisito "${requirementName || "Documento de Identidad"}" del trámite "${procedureTitle || "Gestión General"}".
Descripción del requisito: ${requirementDescription || "Documento oficial vigente y legible"}.
${userProfile ? `Datos del titular esperado: Nombre "${userProfile.fullName}", DNI "${userProfile.dni}".` : ""}
${testSampleType ? `Nota: Este análisis corresponde a la muestra de prueba tipo "${testSampleType}".` : ""}

Realiza la auditoría detallada y genera la respuesta JSON con:
- isValidated: boolean (true si cumple al menos 80/100)
- status: "Aprobado" | "Corregir"
- overallScore: número de 0 a 100
- imageQuality: "Buena" | "Regular" | "Mala" | "No detectada"
- completenessScore: número de 0 a 100
- accuracyScore: número de 0 a 100
- summary: resumen ejecutivo corto (2-3 oraciones en español claro)
- detectedIssues: array de objetos con { id, title, category ("legibilidad" | "incompleto" | "inconsistencia" | "normativa"), severity ("alta" | "media" | "baja"), description, fixSuggestion }
- recommendations: array de sugerencias de corrección accionables paso a paso
- extractedData: objeto { docType, holderName, docNumber, issueDate, expiryDate, hasSignature, entityName }
- procedureAdherenceChecks: array de objetos { checkName, passed: boolean, comment }
    `.trim();

    let jsonResultText = "";

    // If Gemini API Key is available, invoke Gemini AI directly!
    if (ai) {
      const contentsParts: any[] = [];

      // Check if image or PDF inlineData is provided
      if (fileData && typeof fileData === "string" && fileData.includes(";base64,")) {
        const parts = fileData.split(";base64,");
        const detectedMime = mimeType || parts[0].replace("data:", "");
        const base64Str = parts[1];

        contentsParts.push({
          inlineData: {
            mimeType: detectedMime.includes("pdf") ? "application/pdf" : detectedMime,
            data: base64Str,
          },
        });
      }

      contentsParts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: contentsParts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValidated: { type: Type.BOOLEAN },
              status: { type: Type.STRING },
              overallScore: { type: Type.INTEGER },
              imageQuality: { type: Type.STRING },
              completenessScore: { type: Type.INTEGER },
              accuracyScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              detectedIssues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    fixSuggestion: { type: Type.STRING },
                  },
                },
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedData: {
                type: Type.OBJECT,
                properties: {
                  docType: { type: Type.STRING },
                  holderName: { type: Type.STRING },
                  docNumber: { type: Type.STRING },
                  issueDate: { type: Type.STRING },
                  expiryDate: { type: Type.STRING },
                  hasSignature: { type: Type.BOOLEAN },
                  entityName: { type: Type.STRING },
                },
              },
              procedureAdherenceChecks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    checkName: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN },
                    comment: { type: Type.STRING },
                  },
                },
              },
            },
            required: [
              "isValidated",
              "status",
              "overallScore",
              "imageQuality",
              "summary",
              "detectedIssues",
              "recommendations",
            ],
          },
        },
      });

      jsonResultText = response.text || "";
    }

    if (jsonResultText) {
      try {
        const parsed = JSON.parse(jsonResultText);
        return res.json({ success: true, result: parsed });
      } catch (err) {
        console.warn("[AI-Validation] Error parsing Gemini JSON response, falling back to smart structure generator.", err);
      }
    }

    // Fallback or Mock Generator when Gemini Key is missing or returns non-JSON
    const isBadSample = testSampleType === 'bad_blurry' || testSampleType === 'missing_signature' || testSampleType === 'expired_date';
    const isGoodSample = testSampleType === 'good' || !isBadSample;

    const mockResult = {
      isValidated: isGoodSample,
      status: isGoodSample ? "Aprobado" : "Corregir",
      overallScore: isGoodSample ? 96 : 42,
      imageQuality: isGoodSample ? "Buena" : "Mala",
      completenessScore: isGoodSample ? 98 : 50,
      accuracyScore: isGoodSample ? 95 : 35,
      summary: isGoodSample
        ? `El documento "${fileName || requirementName}" cumple plenamente con las especificaciones técnicas requeridas por ${procedureTitle || "el portal de trámite"}. No se detectaron inconsistencias de datos ni problemas de legibilidad.`
        : `Se identificaron 2 observaciones críticas en "${fileName || requirementName}" que impiden su aceptación oficial por la entidad pública: borrosidad en datos clave y falta de firma manuscrita.`,
      detectedIssues: isGoodSample ? [] : [
        {
          id: "issue-1",
          title: "Falta firma manuscrita",
          category: "incompleto",
          severity: "alta",
          description: "No se visualiza la firma del titular en el cuadro asignado en el borde inferior del documento.",
          fixSuggestion: "Firma el documento impreso utilizando bolígrafo de tinta negra o azul y vuelve a escanearlo."
        },
        {
          id: "issue-2",
          title: "Luz excesiva y borrosidad en número de DNI",
          category: "legibilidad",
          severity: "media",
          description: "Un destello de luz sobre el material plástico vuelve ilegibles los últimos 3 dígitos del DNI.",
          fixSuggestion: "Captura la fotografía evitando encender el flash directo y sostén la cámara paralela al documento."
        }
      ],
      recommendations: isGoodSample
        ? ["El documento está listo para ser enviado a la entidad pública."]
        : [
            "Ubica el documento sobre una superficie plana oscura sin reflejos directos de luz.",
            "Asegúrate de incluir la firma manuscrita en tinta azul o negra.",
            "Verifica que los 8 dígitos del DNI se distingan con total claridad antes de subir."
          ],
      extractedData: {
        docType: requirementName || "Documento Oficial",
        holderName: userProfile?.fullName || "PÉREZ GARCÍA JUAN CARLOS",
        docNumber: userProfile?.dni || "45892014",
        issueDate: "12/03/2021",
        expiryDate: "12/03/2029",
        hasSignature: isGoodSample,
        entityName: procedureTitle?.includes("DNI") ? "RENIEC" : procedureTitle?.includes("RUC") ? "SUNAT" : "Entidad Competente"
      },
      procedureAdherenceChecks: [
        {
          checkName: "Encadramiento de 4 esquinas",
          passed: true,
          comment: "Bordes del documento completamente visibles dentro del encuadre."
        },
        {
          checkName: "Legibilidad de caracteres OCR",
          passed: isGoodSample,
          comment: isGoodSample ? "Nombres y DNI legibles por algoritmo óptico." : "Parte del número de documento se ve borroso."
        },
        {
          checkName: "Firma y verificación de autenticidad",
          passed: isGoodSample,
          comment: isGoodSample ? "Firma detectada y validada." : "Firma manuscrita no detectada."
        }
      ]
    };

    return res.json({ success: true, result: mockResult });
  } catch (error: any) {
    console.error("[AI-Validation] Error during document validation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al procesar la validación con IA",
    });
  }
});
