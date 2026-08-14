import 'dotenv/config';
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { checkDatabaseConnection } from './server/db';
import { getCatalogBootstrap, getProcedureBySlug, invalidateCatalogCache, listCategories, listProcedures } from './server/repositories/catalog';
import { openApiDocument } from './server/openapi';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getDrizzleDatabase } from './server/db/client';
import { advisorAssignments, advisorExpertise, advisorProfiles, appSettings, auditEvents, authSessions, authTokens, contactMessageNotes, contactMessages, delegationRequests, documentValidations, expertiseAreas, notifications, organizations, paymentOrders, paymentTransactions, procedureCategories, procedureMessages, procedureRequirements, procedureSources, procedureStatusHistory, procedureSteps, procedureVersions, procedures, ratings, roles, simulatedPaymentMethods, uploadedDocuments, userProcedureRequirements, userProcedures, userProcedureSteps, userProfiles, userRoles, users } from './server/db/schema';
import { SESSION_COOKIE, consumeAuthToken, createSession, encryptPrivateValue, findSession, findUserByIdentifier, hashPassword, inspectAuthToken, issueAuthToken, parseCookie, sendAccountEmail, sendContactEmail, tokenHash, verifyPassword } from './server/services/auth';
import { readDocument, removeDocument, saveDocument } from './server/services/document-storage';

export const app = express();

// Express 4 no propaga automáticamente los rechazos de handlers async.
// Así un error transitorio responde con JSON sin terminar el servidor.
type ExpressHandler = (...args: any[]) => any;
const wrapAsyncHandler = (handler: ExpressHandler) => {
  if (typeof handler !== 'function' || handler.length === 4) return handler;
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') result.catch(next);
    } catch (error) {
      next(error);
    }
  };
};

for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
  const register = app[method].bind(app) as (...args: any[]) => any;
  (app as any)[method] = (path: any, ...handlers: ExpressHandler[]) =>
    register(path, ...handlers.map(wrapAsyncHandler));
}

app.use(express.json({ limit: "15mb" }));

const resolveAvatarUrl = (storedValue: string | null | undefined, userId: string) => {
  if (!storedValue) return '';
  if (storedValue.startsWith('/') || /^https?:\/\//i.test(storedValue)) return storedValue;
  return `/api/v1/profile/avatar/${userId}`;
};

const publicUser = (user: typeof users.$inferSelect, profile: typeof userProfiles.$inferSelect | null, roleCodes: string[] = []) => ({
  id: user.id, username: user.username, email: user.email, emailVerified: Boolean(user.emailVerifiedAt),
  phone: user.phone || '', fullName: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user.username,
  dni: profile?.documentLastFour ? `****${profile.documentLastFour}` : '', address: profile?.address || '',
  birthDate: profile?.birthDate || '', gender: profile?.gender || '',
  department: profile?.department || '', province: profile?.province || '', district: profile?.district || '',
  identityVerificationStatus: profile?.identityVerificationStatus || 'unverified',
  avatarUrl: resolveAvatarUrl(profile?.avatarUrl, user.id),
  roles: roleCodes,
});

const getUserRoleCodes = async (userId: string) => (await getDrizzleDatabase().select({ code: roles.code }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, userId))).map((item) => item.code);
const requireAdministrator = async (req: express.Request, res: express.Response) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) { res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para continuar.' }); return null; }
  const roleCodes = await getUserRoleCodes(session.user.id);
  if (!roleCodes.includes('administrator')) { res.status(403).json({ error: 'administrator_required', message: 'No tienes permisos para acceder al panel administrativo.' }); return null; }
  return { ...session, roleCodes };
};
const requireAdvisor = async (req: express.Request, res: express.Response) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) { res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para continuar.' }); return null; }
  const roleCodes = await getUserRoleCodes(session.user.id);
  if (!roleCodes.includes('advisor') && !roleCodes.includes('administrator')) { res.status(403).json({ error: 'advisor_required', message: 'No tienes permisos para acceder al espacio de asesores.' }); return null; }
  return { ...session, roleCodes };
};
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
    const mailRequest = sendAccountEmail(email, 'Verifica tu correo en TramIA', `/verificar-correo?token=${encodeURIComponent(verifyToken)}`)
      .catch((error) => { console.warn('[verification-email]', error instanceof Error ? error.message : error); return { delivered: false, previewUrl: undefined }; });
    const [mail, session] = await Promise.all([
      Promise.race([
        mailRequest,
        new Promise<{ delivered: false; previewUrl: undefined }>((resolve) => setTimeout(() => resolve({ delivered: false, previewUrl: undefined }), 5_000)),
      ]),
      createSession(user.id, { userAgent: req.get('user-agent'), ip: req.ip }),
    ]);
    setSessionCookie(res, session.raw, session.expiresAt);
    res.status(201).json({ user: { ...publicUser(user, profile, await getUserRoleCodes(user.id)), isNew: true }, verificationEmailSent: mail.delivered, previewUrl: mail.previewUrl });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'account_exists', message: 'El correo o nombre de usuario ya está registrado.' });
    console.error(error); res.status(500).json({ error: 'registration_failed', message: 'No pudimos crear la cuenta.' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  const user = await findUserByIdentifier(String(req.body.identifier || ''));
  if (!user || !(await verifyPassword(String(req.body.password || ''), user.passwordHash))) return res.status(401).json({ error: 'invalid_credentials', message: 'Usuario, correo o contraseña incorrectos.' });
  if (process.env.NODE_ENV === 'production' && user.username.toLowerCase() === 'admin' && user.email.toLowerCase().endsWith('@tramia.local')) return res.status(403).json({ error: 'development_account_blocked', message: 'Esta cuenta temporal está bloqueada en producción.' });
  if (user.status !== 'active') return res.status(403).json({ error: 'account_unavailable' });
  const profiles = await getDrizzleDatabase().select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  const session = await createSession(user.id, { userAgent: req.get('user-agent'), ip: req.ip }); setSessionCookie(res, session.raw, session.expiresAt);
  await getDrizzleDatabase().update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  res.json({ user: publicUser(user, profiles[0] || null, await getUserRoleCodes(user.id)) });
});

app.get('/api/v1/auth/session', async (req, res) => {
  const raw = parseCookie(req.headers.cookie)[SESSION_COOKIE];
  const found = await findSession(raw);
  if (!found) return res.status(401).json({ user: null });
  setSessionCookie(res, raw, found.expiresAt);
  res.json({ user: publicUser(found.user, found.profile, await getUserRoleCodes(found.user.id)) });
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

app.get('/api/v1/auth/reset-password/status', async (req, res) => {
  const inspection = await inspectAuthToken(String(req.query.token || ''), 'reset_password');
  if (inspection.status === 'valid') return res.json({ valid: true, expiresAt: inspection.token.expiresAt });
  if (inspection.status === 'expired') return res.status(410).json({ error: 'expired_token', message: 'Este enlace venció. Solicita uno nuevo desde Recupera tu acceso.' });
  if (inspection.status === 'consumed') return res.status(409).json({ error: 'used_token', message: 'Este enlace ya fue utilizado. Si necesitas cambiar nuevamente tu contraseña, solicita otro.' });
  return res.status(400).json({ error: 'invalid_token', message: 'Este enlace no es válido o está incompleto.' });
});

app.post('/api/v1/auth/reset-password', async (req, res) => {
  const raw = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'weak_password', message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  const inspection = await inspectAuthToken(raw, 'reset_password');
  if (inspection.status === 'expired') return res.status(410).json({ error: 'expired_token', message: 'Este enlace venció. Solicita uno nuevo.' });
  if (inspection.status === 'consumed') return res.status(409).json({ error: 'used_token', message: 'Este enlace ya fue utilizado.' });
  if (inspection.status !== 'valid') return res.status(400).json({ error: 'invalid_token', message: 'Este enlace no es válido.' });
  const token = await consumeAuthToken(raw, 'reset_password');
  if (!token) return res.status(409).json({ error: 'token_already_processed', message: 'El enlace ya fue procesado.' });
  const db = getDrizzleDatabase();
  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, token.userId));
  await db.delete(authSessions).where(eq(authSessions.userId, token.userId));
  await db.delete(authTokens).where(and(eq(authTokens.userId, token.userId), eq(authTokens.purpose, 'reset_password')));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  return res.json({ changed: true, message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión con tu nueva clave.' });
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
  const [user] = await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, session.user.id)).returning({ phone: users.phone });
  const [profile] = await db.update(userProfiles).set({ address, department, province, district, updatedAt: new Date() }).where(eq(userProfiles.userId, session.user.id)).returning();
  return res.json({ contact: { phone: user.phone || '', address: profile.address || '', department: profile.department || '', province: profile.province || '', district: profile.district || '' } });
});

app.post('/api/v1/profile/avatar',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const mimeType=String(req.body.mimeType||''),content=String(req.body.contentBase64||'');if(!['image/jpeg','image/png','image/webp'].includes(mimeType))return res.status(400).json({error:'invalid_avatar',message:'Usa una imagen JPG, PNG o WebP.'});const data=Buffer.from(content,'base64');if(!data.length||data.length>3*1024*1024)return res.status(400).json({error:'invalid_avatar_size',message:'La foto debe pesar como máximo 3 MB.'});const key=`avatars/${session.user.id}/${crypto.randomUUID()}`,provider=await saveDocument(key,data,mimeType),avatarUrl=`/api/v1/profile/avatar/${session.user.id}`;const [previous]=await getDrizzleDatabase().select({avatarUrl:userProfiles.avatarUrl}).from(userProfiles).where(eq(userProfiles.userId,session.user.id)).limit(1);await getDrizzleDatabase().update(userProfiles).set({avatarUrl:`${provider}:${key}`,updatedAt:new Date()}).where(eq(userProfiles.userId,session.user.id));if(previous?.avatarUrl?.includes(':'))await removeDocument(previous.avatarUrl.split(':').slice(1).join(':'));res.json({avatarUrl});});

app.get('/api/v1/profile/avatar/:userId',async(req,res)=>{const [profile]=await getDrizzleDatabase().select({avatarUrl:userProfiles.avatarUrl}).from(userProfiles).where(eq(userProfiles.userId,req.params.userId)).limit(1);if(!profile?.avatarUrl?.includes(':'))return res.status(404).end();const stored=await readDocument(profile.avatarUrl.split(':').slice(1).join(':'));if(!stored)return res.status(404).end();res.setHeader('Content-Type',stored.contentType);res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');res.send(stored.data);});

app.get('/api/v1/payment-methods',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const methods=await getDrizzleDatabase().select({id:simulatedPaymentMethods.id,brand:simulatedPaymentMethods.brand,displayName:simulatedPaymentMethods.displayName,holderName:simulatedPaymentMethods.holderName,lastFour:simulatedPaymentMethods.lastFour,expiryMonth:simulatedPaymentMethods.expiryMonth,expiryYear:simulatedPaymentMethods.expiryYear,isDefault:simulatedPaymentMethods.isDefault}).from(simulatedPaymentMethods).where(and(eq(simulatedPaymentMethods.userId,session.user.id),eq(simulatedPaymentMethods.isActive,true))).orderBy(desc(simulatedPaymentMethods.isDefault),desc(simulatedPaymentMethods.createdAt));res.json({methods});});

app.post('/api/v1/payment-methods/simulated',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const brand=String(req.body.brand||'').toLowerCase();if(!['visa','mastercard','amex','diners'].includes(brand))return res.status(400).json({error:'invalid_brand'});const lastFour=String(Math.floor(1000+Math.random()*9000)),expiryYear=new Date().getFullYear()+3,holderName=(session.profile?[session.profile.firstName,session.profile.lastName].filter(Boolean).join(' '):session.user.username).toUpperCase(),token=`sim_${brand}_${crypto.randomUUID()}`;const brandNames:Record<string,string>={visa:'Visa',mastercard:'Mastercard',amex:'American Express',diners:'Diners Club'};const [saved]=await getDrizzleDatabase().insert(simulatedPaymentMethods).values({userId:session.user.id,brand,displayName:brandNames[brand],holderName,token,lastFour,expiryMonth:12,expiryYear,isDefault:false}).returning();res.status(201).json({data:{id:saved.id,brand:saved.brand,displayName:saved.displayName,holderName:saved.holderName,lastFour:saved.lastFour,expiryMonth:saved.expiryMonth,expiryYear:saved.expiryYear},message:'Medio de pago agregado para el entorno de prueba.'});});

app.delete('/api/v1/payment-methods/:id',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});await getDrizzleDatabase().update(simulatedPaymentMethods).set({isActive:false,updatedAt:new Date()}).where(and(eq(simulatedPaymentMethods.id,req.params.id),eq(simulatedPaymentMethods.userId,session.user.id)));res.status(204).end();});

app.patch('/api/v1/payment-methods/:id/default', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });
  const db = getDrizzleDatabase();
  const [owned] = await db.select({ id: simulatedPaymentMethods.id }).from(simulatedPaymentMethods).where(and(eq(simulatedPaymentMethods.id, req.params.id), eq(simulatedPaymentMethods.userId, session.user.id), eq(simulatedPaymentMethods.isActive, true))).limit(1);
  if (!owned) return res.status(404).json({ error: 'payment_method_not_found', message: 'No encontramos esta tarjeta en tu cuenta.' });
  await db.transaction(async tx => {
    // Serializa cambios simultáneos del mismo usuario y mantiene una sola tarjeta predeterminada.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${session.user.id}))`);
    await tx.update(simulatedPaymentMethods).set({ isDefault: false, updatedAt: new Date() }).where(eq(simulatedPaymentMethods.userId, session.user.id));
    await tx.update(simulatedPaymentMethods).set({ isDefault: true, updatedAt: new Date() }).where(eq(simulatedPaymentMethods.id, owned.id));
  });
  res.json({ updated: true, defaultPaymentMethodId: owned.id, message: 'Tarjeta predeterminada actualizada.' });
});

app.get('/api/v1/payments/history',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const rows=await getDrizzleDatabase().select({id:paymentOrders.id,status:paymentOrders.status,type:paymentOrders.type,amountMinor:paymentOrders.amountMinor,currency:paymentOrders.currency,provider:paymentOrders.provider,paidAt:paymentOrders.paidAt,createdAt:paymentOrders.createdAt,procedureTitle:procedures.title,transactionStatus:paymentTransactions.status,cardBrand:paymentTransactions.cardBrand,cardLastFour:paymentTransactions.cardLastFour,reference:paymentTransactions.providerTransactionId}).from(paymentOrders).innerJoin(userProcedures,eq(paymentOrders.userProcedureId,userProcedures.id)).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).leftJoin(paymentTransactions,eq(paymentTransactions.paymentOrderId,paymentOrders.id)).where(eq(userProcedures.userId,session.user.id)).orderBy(desc(paymentOrders.createdAt));res.json({payments:rows});});

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
    const profile = await db.transaction(async tx => {
      const [citizenRole] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.code, 'citizen')).limit(1);
      if (!citizenRole) throw new Error('citizen_role_not_configured');
      const [savedProfile] = await tx.update(userProfiles).set({ documentType: 'DNI', documentNumberEncrypted: encryptPrivateValue(document), documentLastFour: document.slice(-4), firstName: payload.resultado?.nombres || session.profile?.firstName || session.user.username, lastName: [payload.resultado?.apellido_paterno, payload.resultado?.apellido_materno].filter(Boolean).join(' '), birthDate: providerBirthDate, gender: payload.resultado?.genero || undefined, identityVerificationStatus: 'verified', identityVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(userProfiles.userId, session.user.id)).returning();
      await tx.insert(userRoles).values({ userId: session.user.id, roleId: citizenRole.id }).onConflictDoNothing();
      await tx.insert(auditEvents).values({ actorUserId: session.user.id, eventName: 'identity.dni.verified', eventData: { provider: 'perudevs', assignedRole: 'citizen' }, ipHash: createHash('sha256').update(req.ip || 'unknown').digest('hex') });
      return savedProfile;
    });
    const roleCodes = await getUserRoleCodes(session.user.id);
    return res.json({ verified: true, user: publicUser(session.user, profile, roleCodes), assignedRole: 'citizen', message: 'Tu identidad fue validada correctamente y tu cuenta ya tiene el rol Ciudadano.' });
  } catch (error) {
    console.error('[dni-validation]', error);
    if (error instanceof Error && error.message === 'citizen_role_not_configured') return res.status(503).json({ error: 'citizen_role_not_configured', message: 'El rol Ciudadano no está configurado. Comunícate con soporte.' });
    res.status(502).json({ error: 'identity_validation_unavailable', message: 'No pudimos completar la validación de identidad en este momento.' });
  }
});

app.use('/api/v1/my-procedures/:id/delegation/payment',async(req,res,next)=>{if(req.method!=='POST'||!req.body.paymentMethodId)return next();const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const [stored]=await getDrizzleDatabase().select({id:simulatedPaymentMethods.id,brand:simulatedPaymentMethods.brand,lastFour:simulatedPaymentMethods.lastFour}).from(simulatedPaymentMethods).where(and(eq(simulatedPaymentMethods.id,String(req.body.paymentMethodId)),eq(simulatedPaymentMethods.userId,session.user.id),eq(simulatedPaymentMethods.isActive,true))).limit(1);if(!stored)return res.status(400).json({error:'invalid_simulated_card',message:'Selecciona una tarjeta disponible.'});req.body.method='visa_simulada';req.body.cardBrand=stored.brand;req.body.cardLastFour=stored.lastFour;next();});

// El flujo vigente siempre requiere que el usuario elija un asesor antes de
// crear una delegación. La ruta de pago queda excluida de esta validación.
app.use('/api/v1/my-procedures/:id/delegation', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/' && !String(req.body.advisorId || '').trim()) {
    return res.status(400).json({ error: 'advisor_required', message: 'Elige un asesor antes de continuar.' });
  }
  next();
});

// Pago exclusivamente simulado con asignación inmediata del asesor elegido.
// Esta ruta intercepta el contrato actual basado en paymentMethodId; el
// controlador legado permanece temporalmente solo para clientes antiguos.
app.post('/api/v1/my-procedures/:id/delegation/payment', async (req, res, next) => {
  if (!req.body.paymentMethodId) return next();
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });
  const db = getDrizzleDatabase();
  const [request] = await db.select({
    id: delegationRequests.id,
    status: delegationRequests.status,
    amountMinor: delegationRequests.quotedAmountMinor,
    currency: delegationRequests.currency,
    userProcedureId: delegationRequests.userProcedureId,
    advisorId: delegationRequests.requestedAdvisorId,
    procedureStatus: userProcedures.status,
  }).from(delegationRequests)
    .innerJoin(userProcedures, eq(delegationRequests.userProcedureId, userProcedures.id))
    .where(and(eq(delegationRequests.userProcedureId, req.params.id), eq(userProcedures.userId, session.user.id)))
    .limit(1);
  if (!request) return res.status(404).json({ error: 'delegation_not_found', message: 'Primero crea la solicitud de delegación.' });
  if (!request.advisorId) return res.status(409).json({ error: 'advisor_required', message: 'Esta solicitud no tiene un asesor elegido.' });
  if (['paid', 'assigned', 'active', 'completed'].includes(request.status)) return res.status(409).json({ error: 'already_paid', message: 'Esta delegación ya tiene un pago confirmado.' });
  const [advisor] = await db.select().from(advisorProfiles).where(and(
    eq(advisorProfiles.userId, request.advisorId),
    eq(advisorProfiles.verificationStatus, 'verified'),
    eq(advisorProfiles.availabilityStatus, 'available'),
  )).limit(1);
  if (!advisor || advisor.activeCasesCount >= advisor.maxActiveCases) return res.status(409).json({ error: 'advisor_unavailable', message: 'El asesor elegido ya no está disponible.' });

  const now = new Date();
  const reference = `SIM-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.insert(paymentOrders).values({ userProcedureId: request.userProcedureId, delegationRequestId: request.id, type: 'delegation_service', amountMinor: request.amountMinor, currency: request.currency, status: 'paid', provider: 'tramia_simulator', providerOrderId: reference, paidAt: now }).returning();
    await tx.insert(paymentTransactions).values({ paymentOrderId: order.id, provider: 'tramia_simulator', providerTransactionId: reference, paymentMethodType: 'visa_simulada', status: 'paid', amountMinor: request.amountMinor, cardBrand: String(req.body.cardBrand || 'simulada'), cardLastFour: String(req.body.cardLastFour || '0000'), providerResponseCode: 'SIMULATED_APPROVED', processedAt: now });
    await tx.insert(advisorAssignments).values({ delegationRequestId: request.id, advisorId: request.advisorId!, status: 'active' });
    await tx.update(advisorProfiles).set({ activeCasesCount: sql`${advisorProfiles.activeCasesCount}+1`, updatedAt: now }).where(eq(advisorProfiles.userId, request.advisorId));
    await tx.update(delegationRequests).set({ status: 'assigned', acceptedAt: now, updatedAt: now }).where(eq(delegationRequests.id, request.id));
    await tx.update(userProcedures).set({ mode: 'delegated', status: 'delegated', updatedAt: now }).where(eq(userProcedures.id, request.userProcedureId));
    await tx.insert(procedureStatusHistory).values({ userProcedureId: request.userProcedureId, changedBy: session.user.id, previousStatus: request.procedureStatus, newStatus: 'delegated', reason: 'Pago simulado aprobado y asesor asignado.', metadata: { source: 'payment_simulator', orderId: order.id, advisorId: request.advisorId } });
    return order;
  });
  return res.status(201).json({ paid: true, assigned: true, reference, amountMinor: request.amountMinor, currency: request.currency, method: 'visa_simulada', orderId: result.id, advisorId: request.advisorId, message: 'Pago simulado aprobado. Tu asesor ya fue asignado.' });
});

const activeProcedureStatuses = ['draft', 'active', 'waiting_user', 'eligible_for_delegation', 'waiting_payment', 'waiting_assignment', 'delegated', 'in_progress', 'paused'] as const;

async function getDelegationPrerequisites(caseId:string,userId:string){
  const db=getDrizzleDatabase();
  const [record]=await db.select({id:userProcedures.id,ownerId:userProcedures.userId}).from(userProcedures).where(and(eq(userProcedures.id,caseId),eq(userProcedures.userId,userId))).limit(1);
  if(!record)return null;
  const allSteps=await db.select({id:userProcedureSteps.id,procedureStepId:userProcedureSteps.procedureStepId,status:userProcedureSteps.status,isFinalized:userProcedureSteps.isFinalized,title:procedureSteps.title,description:procedureSteps.description,position:procedureSteps.position,requiresUserPresence:procedureSteps.requiresUserPresence,canBeDelegated:procedureSteps.canBeDelegated}).from(userProcedureSteps).innerJoin(procedureSteps,eq(userProcedureSteps.procedureStepId,procedureSteps.id)).where(eq(userProcedureSteps.userProcedureId,caseId)).orderBy(asc(procedureSteps.position));
  const configured=allSteps.filter(step=>step.requiresUserPresence||!step.canBeDelegated);
  // Los catálogos antiguos no marcaban prerrequisitos de delegación. En ese
  // caso usamos las primeras cuatro acciones para mantener una preparación
  // corta, secuencial y segura antes de permitir asesor y pago.
  const steps=(configured.length?configured:allSteps).slice(0,Math.min(4,allSteps.length));
  return{steps,pending:steps.filter(step=>step.status!=='completed'||!step.isFinalized),ready:steps.every(step=>step.status==='completed'&&step.isFinalized)};
}

app.get('/api/v1/my-procedures/:id/delegation-prerequisites',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const result=await getDelegationPrerequisites(req.params.id,session.user.id);if(!result)return res.status(404).json({error:'procedure_not_found'});res.json(result);});

app.use('/api/v1/my-procedures/:id/delegation',async(req,res,next)=>{if(req.method!=='POST'||req.path!=='/')return next();const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const prerequisites=await getDelegationPrerequisites(req.params.id,session.user.id);if(!prerequisites)return res.status(404).json({error:'procedure_not_found'});if(!prerequisites.ready)return res.status(409).json({error:'delegation_prerequisites_pending',message:'Completa tus pasos obligatorios antes de elegir un asesor.',pending:prerequisites.pending});next();});

app.post('/api/v1/my-procedures/:caseId/steps/:stepId/complete', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });
  if (req.body.confirmCompleted !== true) return res.status(400).json({ error: 'completion_confirmation_required', message: 'Confirma que deseas marcar esta etapa como realizada.' });
  const db = getDrizzleDatabase();
  const [step] = await db.select({ instanceId: userProcedureSteps.id, status: userProcedureSteps.status, isFinalized: userProcedureSteps.isFinalized, ownerId: userProcedures.userId, procedureStepId: userProcedureSteps.procedureStepId, procedureStatus: userProcedures.status, completionMode: procedureSteps.completionMode, position: procedureSteps.position, actionConfig: procedureSteps.actionConfig, dateTrackingEnabled: procedureSteps.dateTrackingEnabled, dateTrackingType: procedureSteps.dateTrackingType, isPointOfNoReturn: procedureSteps.isPointOfNoReturn }).from(userProcedureSteps).innerJoin(userProcedures, eq(userProcedureSteps.userProcedureId, userProcedures.id)).innerJoin(procedureSteps, eq(userProcedureSteps.procedureStepId, procedureSteps.id)).where(and(eq(userProcedureSteps.userProcedureId, req.params.caseId), eq(userProcedureSteps.procedureStepId, req.params.stepId))).limit(1);
  if (!step || step.ownerId !== session.user.id) return res.status(404).json({ error: 'step_not_found' });
  if (['completed', 'cancelled', 'rejected'].includes(step.procedureStatus)) return res.status(409).json({ error: 'procedure_closed', message: 'Este trámite ya no admite cambios.' });
  if (step.isFinalized || step.status === 'completed') return res.status(409).json({ error: 'step_finalized', message: 'Esta etapa ya fue realizada y no puede modificarse.' });
  if (!['available', 'in_progress'].includes(step.status)) return res.status(409).json({ error: 'step_locked', message: 'Completa primero las etapas anteriores.' });
  const [previousPending] = await db.select({ id: userProcedureSteps.id }).from(userProcedureSteps).innerJoin(procedureSteps, eq(userProcedureSteps.procedureStepId, procedureSteps.id)).where(and(eq(userProcedureSteps.userProcedureId, req.params.caseId), sql`${procedureSteps.position}<${step.position}`, sql`${userProcedureSteps.status}<>'completed'`)).limit(1);
  if (previousPending) return res.status(409).json({ error: 'previous_step_pending', message: 'Completa y confirma el paso anterior antes de continuar.' });
  const completionData = req.body.data && typeof req.body.data === 'object' ? req.body.data as Record<string, unknown> : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(completionData.date || ''))) return res.status(400).json({ error: 'step_date_required', message: 'Selecciona la fecha en que realizaste esta etapa.' });
  const fields = Array.isArray((step.actionConfig as any)?.fields) ? (step.actionConfig as any).fields : [];
  const missingFields = fields.filter((field: any) => field?.required && !String(completionData[field.key] ?? '').trim()).map((field: any) => field.label || field.key);
  if (missingFields.length) return res.status(400).json({ error: 'step_data_required', message: `Completa: ${missingFields.join(', ')}.` });
  if (step.completionMode === 'form' && !Object.keys(completionData).length) return res.status(400).json({ error: 'step_data_required', message: 'Completa la información solicitada.' });
  if (step.completionMode === 'evidence') {
    const documentId = String(completionData.documentId || '');
    const [evidence] = documentId ? await db.select({ id: uploadedDocuments.id }).from(uploadedDocuments).where(and(eq(uploadedDocuments.id, documentId), eq(uploadedDocuments.userProcedureId, req.params.caseId), eq(uploadedDocuments.uploadedBy, session.user.id), isNull(uploadedDocuments.deletedAt))).limit(1) : [];
    if (!evidence) return res.status(409).json({ error: 'evidence_required', message: 'Adjunta el documento o evidencia antes de completar esta etapa.' });
  }
  const protectedCompletionData = { ...completionData };
  for (const field of fields) {
    if (field?.sensitive && String(completionData[field.key] ?? '').trim()) protectedCompletionData[field.key] = `enc:${encryptPrivateValue(String(completionData[field.key]))}`;
  }
  const now = new Date();
  const result = await db.transaction(async tx => {
    await tx.update(userProcedureSteps).set({ status: 'completed', completedAt: now, completedBy: session.user.id, completionSource: 'user_action', completionData: protectedCompletionData, isFinalized: true, updatedAt: now }).where(eq(userProcedureSteps.id, step.instanceId));
    const [next] = await tx.select({ id: userProcedureSteps.id, procedureStepId: userProcedureSteps.procedureStepId }).from(userProcedureSteps).innerJoin(procedureSteps, eq(userProcedureSteps.procedureStepId, procedureSteps.id)).where(and(eq(userProcedureSteps.userProcedureId, req.params.caseId), sql`${procedureSteps.position}>${step.position}`)).orderBy(asc(procedureSteps.position)).limit(1);
    if (next) await tx.update(userProcedureSteps).set({ status: 'available', startedAt: now, updatedAt: now }).where(eq(userProcedureSteps.id, next.id));
    const [counts] = await tx.select({ total: sql<number>`count(*)::int`, done: sql<number>`count(*) filter(where ${userProcedureSteps.status}='completed')::int` }).from(userProcedureSteps).where(eq(userProcedureSteps.userProcedureId, req.params.caseId));
    const percentage = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
    const nextStatus = percentage >= 100 ? 'completed' : 'in_progress';
    await tx.update(userProcedures).set({ progressPercentage: percentage, currentStepId: next?.procedureStepId || step.procedureStepId, status: nextStatus, completedAt: percentage >= 100 ? now : null, nonReturnReachedAt: step.isPointOfNoReturn ? now : undefined, updatedAt: now }).where(eq(userProcedures.id, req.params.caseId));
    await tx.insert(procedureStatusHistory).values({ userProcedureId: req.params.caseId, changedBy: session.user.id, previousStatus: step.procedureStatus, newStatus: nextStatus, reason: 'Etapa completada por el usuario.', metadata: { source: 'step_action', stepId: req.params.stepId, percentage } });
    return { percentage, status: nextStatus, nextStepId: next?.procedureStepId || null };
  });
  res.json({ completed: true, locked: true, ...result });
});

const defaultContactSettings={email:process.env.SUPPORT_EMAIL||'soporte@tramia.pe',phone:'(+51) 999 000 000',location:'Lima, Perú',schedule:'Lunes a viernes, 9:00 a. m. a 6:00 p. m.',responseTime:'Dentro de 2 días hábiles'};
const defaultLandingSettings={showTestimonials:true,showTrustBar:true,showLifeMoments:true,showContactBanner:true,heroAnnouncement:'Tu copiloto para trámites en Perú',contactBannerTitle:'¿Necesitas ayuda con un trámite?'};
app.get('/api/v1/public/settings',async(_req,res)=>{const rows=await getDrizzleDatabase().select().from(appSettings).where(eq(appSettings.isPublic,true));const settings=Object.fromEntries(rows.map(item=>[item.key,item.value]));res.json({settings:{...settings,contact:{...defaultContactSettings,...(settings.contact as object||{})},landing:{...defaultLandingSettings,...(settings.landing as object||{})}}});});
app.get('/api/v1/admin/settings',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const rows=await getDrizzleDatabase().select().from(appSettings).orderBy(asc(appSettings.key));res.json({settings:rows});});
app.put('/api/v1/admin/settings/:key',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const key=String(req.params.key).replace(/[^a-z0-9_-]/g,'');if(!key)return res.status(400).json({error:'invalid_setting'});const [saved]=await getDrizzleDatabase().insert(appSettings).values({key,value:req.body.value||{},isPublic:Boolean(req.body.isPublic),updatedBy:admin.user.id}).onConflictDoUpdate({target:appSettings.key,set:{value:req.body.value||{},isPublic:Boolean(req.body.isPublic),updatedBy:admin.user.id,updatedAt:new Date()}}).returning();await writeAdminAudit(admin.user.id,'admin.setting.updated',{key},req);res.json({data:saved});});

let hardResetInProgress = false;
const createHardResetAuthorization = (userId: string) => {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + 45_000, nonce: crypto.randomUUID() })).toString('base64url');
  const signature = createHmac('sha256', process.env.SESSION_SECRET || 'local-development-secret').update(payload).digest('base64url');
  return `${payload}.${signature}`;
};
const verifyHardResetAuthorization = (token: string, userId: string) => {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = createHmac('sha256', process.env.SESSION_SECRET || 'local-development-secret').update(payload).digest('base64url');
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.userId === userId && Number(data.expiresAt) >= Date.now();
  } catch { return false; }
};
app.post('/api/v1/admin/hard-reset/authorize', async (req, res) => {
  const admin = await requireAdministrator(req, res); if (!admin) return;
  const confirmation = String(req.body.confirmation || '');
  const expectedConfirmation = process.env.HARD_RESET_CONFIRMATION || 'david';
  if (confirmation !== expectedConfirmation) return res.status(400).json({ error: 'invalid_hard_reset_confirmation', message: 'La palabra de seguridad no es correcta.' });
  return res.json({ authorized: true, authorization: createHardResetAuthorization(admin.user.id), expiresInSeconds: 45 });
});
app.post('/api/v1/admin/hard-reset', async (req, res) => {
  const admin = await requireAdministrator(req, res); if (!admin) return;
  if (!verifyHardResetAuthorization(String(req.body.authorization || ''), admin.user.id)) return res.status(400).json({ error: 'invalid_hard_reset_authorization', message: 'La autorización venció o no es válida. Inicia nuevamente el proceso.' });
  if (hardResetInProgress) return res.status(409).json({ error: 'hard_reset_in_progress', message: 'Ya hay un Hard reset en ejecución.' });

  hardResetInProgress = true;
  try {
    const db = getDrizzleDatabase();
    const [caseCount, paymentCount, ratingCount, contactCount, documentCount, notificationCount, conversationCount, paymentMethodCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(userProcedures),
      db.select({ count: sql<number>`count(*)::int` }).from(paymentOrders),
      db.select({ count: sql<number>`count(*)::int` }).from(ratings),
      db.select({ count: sql<number>`count(*)::int` }).from(contactMessages),
      db.select({ count: sql<number>`count(*)::int` }).from(uploadedDocuments),
      db.select({ count: sql<number>`count(*)::int` }).from(notifications),
      db.select({ count: sql<number>`count(*)::int` }).from(procedureMessages),
      db.select({ count: sql<number>`count(*)::int` }).from(simulatedPaymentMethods),
    ]);
    const deleted = {
      procedures: caseCount[0]?.count || 0,
      payments: paymentCount[0]?.count || 0,
      ratings: ratingCount[0]?.count || 0,
      contacts: contactCount[0]?.count || 0,
      documents: documentCount[0]?.count || 0,
      notifications: notificationCount[0]?.count || 0,
      conversations: conversationCount[0]?.count || 0,
      paymentMethods: paymentMethodCount[0]?.count || 0,
    };

    await db.transaction(async tx => {
      await tx.delete(documentValidations);
      await tx.delete(paymentTransactions);
      await tx.delete(advisorAssignments);
      await tx.delete(ratings);
      await tx.delete(procedureMessages);
      await tx.delete(notifications);
      await tx.delete(uploadedDocuments);
      await tx.delete(userProcedureRequirements);
      await tx.delete(userProcedureSteps);
      await tx.delete(procedureStatusHistory);
      await tx.delete(paymentOrders);
      await tx.delete(delegationRequests);
      await tx.delete(userProcedures);
      await tx.delete(contactMessageNotes);
      await tx.delete(contactMessages);
      await tx.delete(simulatedPaymentMethods);
      await tx.update(advisorProfiles).set({ averageRating: '0', completedCasesCount: 0, cancelledCasesCount: 0, activeCasesCount: 0, updatedAt: new Date() });
      await tx.insert(auditEvents).values({
        actorUserId: admin.user.id,
        eventName: 'admin.hard_reset.completed',
        eventData: { deleted, preserved: ['users', 'user_profiles', 'roles', 'advisors', 'catalog', 'settings', 'auth_sessions'] },
        ipHash: createHash('sha256').update(req.ip || 'unknown').digest('hex'),
      });
    });
    return res.json({ reset: true, deleted, message: 'Hard reset completado. Las cuentas, asesores y el catálogo fueron conservados.' });
  } catch (error) {
    console.error('[admin-hard-reset]', error);
    return res.status(503).json({ error: 'hard_reset_failed', message: 'No pudimos completar el Hard reset. La transacción fue revertida.' });
  } finally {
    hardResetInProgress = false;
  }
});

app.get('/api/v1/my-procedures/by-procedure/:procedureId/workspace', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });
  const db = getDrizzleDatabase();
  const procedureId = await resolveProcedureIdentifier(req.params.procedureId);
  if (!procedureId) return res.status(404).json({ error: 'procedure_not_found' });
  const [record] = await db.select().from(userProcedures).where(and(eq(userProcedures.userId, session.user.id), eq(userProcedures.procedureId, procedureId), inArray(userProcedures.status, [...activeProcedureStatuses]))).orderBy(desc(userProcedures.updatedAt)).limit(1);
  if (!record) return res.status(404).json({ error: 'procedure_not_found' });
  const [steps, requirements] = await Promise.all([
    db.select({ instanceId: userProcedureSteps.id, procedureStepId: userProcedureSteps.procedureStepId, status: userProcedureSteps.status, isFinalized: userProcedureSteps.isFinalized, completionData: userProcedureSteps.completionData, completedAt: userProcedureSteps.completedAt, dueAt: userProcedureSteps.dueAt }).from(userProcedureSteps).where(eq(userProcedureSteps.userProcedureId, record.id)),
    db.select({ instanceId: userProcedureRequirements.id, requirementId: userProcedureRequirements.requirementId, status: userProcedureRequirements.status, approvedAt: userProcedureRequirements.approvedAt, expiresAt: userProcedureRequirements.expiresAt }).from(userProcedureRequirements).where(eq(userProcedureRequirements.userProcedureId, record.id)),
  ]);
  res.json({ instance: record, completedStepIds: steps.filter(step => step.status === 'completed' || step.status === 'skipped').map(step => step.procedureStepId), steps, requirements });
});

app.get('/api/v1/my-procedures/:id/workspace', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });
  const db = getDrizzleDatabase();
  const [record] = await db.select().from(userProcedures).where(and(
    eq(userProcedures.id, req.params.id),
    eq(userProcedures.userId, session.user.id),
  )).limit(1);
  if (!record) return res.status(404).json({ error: 'procedure_not_found' });
  const [steps, requirements] = await Promise.all([
    db.select({ instanceId: userProcedureSteps.id, procedureStepId: userProcedureSteps.procedureStepId, status: userProcedureSteps.status, isFinalized: userProcedureSteps.isFinalized, completionData: userProcedureSteps.completionData, completedAt: userProcedureSteps.completedAt, dueAt: userProcedureSteps.dueAt }).from(userProcedureSteps).where(eq(userProcedureSteps.userProcedureId, record.id)),
    db.select({ instanceId: userProcedureRequirements.id, requirementId: userProcedureRequirements.requirementId, status: userProcedureRequirements.status, approvedAt: userProcedureRequirements.approvedAt, expiresAt: userProcedureRequirements.expiresAt }).from(userProcedureRequirements).where(eq(userProcedureRequirements.userProcedureId, record.id)),
  ]);
  res.json({ instance: record, completedStepIds: steps.filter(step => step.status === 'completed' || step.status === 'skipped').map(step => step.procedureStepId), steps, requirements });
});

app.get('/api/v1/my-procedures/:id/detail', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para consultar esta gestión.' });
  const db = getDrizzleDatabase();
  const [record] = await db.select({
    id: userProcedures.id,
    trackingCode: userProcedures.trackingCode,
    status: userProcedures.status,
    mode: userProcedures.mode,
    progressPercentage: userProcedures.progressPercentage,
    startedAt: userProcedures.startedAt,
    expectedCompletionAt: userProcedures.expectedCompletionAt,
    completedAt: userProcedures.completedAt,
    cancelledAt: userProcedures.cancelledAt,
    cancellationReason: userProcedures.cancellationReason,
    updatedAt: userProcedures.updatedAt,
    title: procedures.title,
    category: procedureCategories.name,
    organization: organizations.shortName,
  }).from(userProcedures)
    .innerJoin(procedures, eq(userProcedures.procedureId, procedures.id))
    .innerJoin(procedureCategories, eq(procedures.categoryId, procedureCategories.id))
    .leftJoin(organizations, eq(procedures.organizationId, organizations.id))
    .where(and(eq(userProcedures.id, req.params.id), eq(userProcedures.userId, session.user.id)))
    .limit(1);
  if (!record) return res.status(404).json({ error: 'procedure_not_found', message: 'No encontramos esta gestión en tu cuenta.' });

  const [steps, requirements, documents, payments, advisor] = await Promise.all([
    db.select({ id: userProcedureSteps.id, status: userProcedureSteps.status, completedAt: userProcedureSteps.completedAt, dueAt: userProcedureSteps.dueAt, position: procedureSteps.position, title: procedureSteps.title, description: procedureSteps.description }).from(userProcedureSteps).innerJoin(procedureSteps, eq(userProcedureSteps.procedureStepId, procedureSteps.id)).where(eq(userProcedureSteps.userProcedureId, record.id)).orderBy(asc(procedureSteps.position)),
    db.select({ id: userProcedureRequirements.id, status: userProcedureRequirements.status, approvedAt: userProcedureRequirements.approvedAt, name: procedureRequirements.name }).from(userProcedureRequirements).innerJoin(procedureRequirements, eq(userProcedureRequirements.requirementId, procedureRequirements.id)).where(eq(userProcedureRequirements.userProcedureId, record.id)).orderBy(asc(procedureRequirements.name)),
    db.select({ id: uploadedDocuments.id, originalFileName: uploadedDocuments.originalFileName, mimeType: uploadedDocuments.mimeType, status: uploadedDocuments.status, createdAt: uploadedDocuments.createdAt }).from(uploadedDocuments).where(and(eq(uploadedDocuments.userProcedureId, record.id), isNull(uploadedDocuments.deletedAt))).orderBy(desc(uploadedDocuments.createdAt)),
    db.select({ id: paymentOrders.id, type: paymentOrders.type, amountMinor: paymentOrders.amountMinor, currency: paymentOrders.currency, status: paymentOrders.status, paidAt: paymentOrders.paidAt }).from(paymentOrders).where(eq(paymentOrders.userProcedureId, record.id)).orderBy(desc(paymentOrders.createdAt)),
    db.select({ name: advisorProfiles.publicName, averageRating: advisorProfiles.averageRating, completedCasesCount: advisorProfiles.completedCasesCount }).from(delegationRequests).innerJoin(advisorAssignments, eq(advisorAssignments.delegationRequestId, delegationRequests.id)).innerJoin(advisorProfiles, eq(advisorProfiles.userId, advisorAssignments.advisorId)).where(eq(delegationRequests.userProcedureId, record.id)).orderBy(desc(advisorAssignments.assignedAt)).limit(1),
  ]);

  res.json({ data: { record, steps, requirements, documents, payments, advisor: advisor[0] || null } });
});

app.post('/api/v1/my-procedures',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required',message:'Inicia sesión para empezar un trámite.'});const procedureId=await resolveProcedureIdentifier(req.body.procedureId);if(!procedureId)return res.status(400).json({error:'procedure_required',message:'Selecciona un trámite válido.'});const requestedMode=String(req.body.mode||'self_service')==='hybrid'?'hybrid':'self_service';const db=getDrizzleDatabase();const [version]=await db.select().from(procedureVersions).where(and(eq(procedureVersions.procedureId,procedureId),inArray(procedureVersions.status,['reviewed','published']))).orderBy(desc(procedureVersions.versionNumber)).limit(1);if(!version)return res.status(409).json({error:'procedure_not_available',message:'Este trámite todavía no tiene una versión disponible.'});const [steps,requirements]=await Promise.all([db.select().from(procedureSteps).where(eq(procedureSteps.procedureVersionId,version.id)).orderBy(asc(procedureSteps.position)),db.select().from(procedureRequirements).where(eq(procedureRequirements.procedureVersionId,version.id))]);const trackingCode=`TRM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;const created=await db.transaction(async tx=>{const [record]=await tx.insert(userProcedures).values({trackingCode,userId:session.user.id,procedureId,procedureVersionId:version.id,status:'active',mode:requestedMode,currentStepId:steps[0]?.id||null,startedAt:new Date(),progressPercentage:0}).returning();if(steps.length)await tx.insert(userProcedureSteps).values(steps.map((step,index)=>({userProcedureId:record.id,procedureStepId:step.id,status:(index===0?'available':'locked') as 'available'|'locked'})));if(requirements.length)await tx.insert(userProcedureRequirements).values(requirements.map(requirement=>({userProcedureId:record.id,requirementId:requirement.id,status:'pending' as const})));await tx.insert(procedureStatusHistory).values({userProcedureId:record.id,changedBy:session.user.id,newStatus:'active',reason:requestedMode==='hybrid'?'Preparación para delegación iniciada por el usuario.':'Trámite iniciado por el usuario.',metadata:{source:'user',mode:requestedMode}});return record});res.status(201).json({data:created,existing:false});});

app.get('/api/v1/my-procedures/:id/delegation',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const db=getDrizzleDatabase();const [record]=await db.select().from(userProcedures).where(and(eq(userProcedures.id,req.params.id),eq(userProcedures.userId,session.user.id))).limit(1);if(!record)return res.status(404).json({error:'procedure_not_found'});const [request]=await db.select().from(delegationRequests).where(eq(delegationRequests.userProcedureId,record.id)).limit(1);const orders=request?await db.select({id:paymentOrders.id,status:paymentOrders.status,amountMinor:paymentOrders.amountMinor,currency:paymentOrders.currency,provider:paymentOrders.provider,paidAt:paymentOrders.paidAt,createdAt:paymentOrders.createdAt}).from(paymentOrders).where(eq(paymentOrders.delegationRequestId,request.id)).orderBy(desc(paymentOrders.createdAt)):[];const advisors=await db.select({userId:advisorProfiles.userId,publicName:advisorProfiles.publicName,bio:advisorProfiles.bio,averageRating:advisorProfiles.averageRating,completedCasesCount:advisorProfiles.completedCasesCount,baseFeeMinor:advisorProfiles.baseFeeMinor,currency:advisorProfiles.currency,activeCasesCount:advisorProfiles.activeCasesCount,maxActiveCases:advisorProfiles.maxActiveCases,avatarStored:userProfiles.avatarUrl,identityVerificationStatus:userProfiles.identityVerificationStatus}).from(advisorProfiles).innerJoin(userProfiles,eq(userProfiles.userId,advisorProfiles.userId)).where(and(eq(advisorProfiles.verificationStatus,'verified'),eq(advisorProfiles.availabilityStatus,'available'),sql`${advisorProfiles.activeCasesCount}<${advisorProfiles.maxActiveCases}`)).orderBy(desc(advisorProfiles.averageRating));res.json({procedure:record,delegation:request||null,payments:orders,advisors:advisors.map(item=>({...item,avatarUrl:resolveAvatarUrl(item.avatarStored,item.userId),idVerified:item.identityVerificationStatus==='verified'}))});});

app.post('/api/v1/my-procedures/:id/delegation',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const advisorId=String(req.body.advisorId||'')||null;const db=getDrizzleDatabase();const [record]=await db.select().from(userProcedures).where(and(eq(userProcedures.id,req.params.id),eq(userProcedures.userId,session.user.id))).limit(1);if(!record)return res.status(404).json({error:'procedure_not_found'});if(['completed','cancelled','rejected'].includes(record.status))return res.status(409).json({error:'terminal_procedure'});if(advisorId){const [advisor]=await db.select().from(advisorProfiles).where(and(eq(advisorProfiles.userId,advisorId),eq(advisorProfiles.verificationStatus,'verified'),eq(advisorProfiles.availabilityStatus,'available'))).limit(1);if(!advisor||advisor.activeCasesCount>=advisor.maxActiveCases)return res.status(409).json({error:'advisor_unavailable',message:'Este asesor ya no está disponible.'});}const [previous]=await db.select().from(delegationRequests).where(eq(delegationRequests.userProcedureId,record.id)).limit(1);if(previous)return res.json({data:previous,existing:true});const amount=advisorId?(await db.select({fee:advisorProfiles.baseFeeMinor}).from(advisorProfiles).where(eq(advisorProfiles.userId,advisorId)).limit(1))[0]?.fee||6500:6500;const [saved]=await db.insert(delegationRequests).values({userProcedureId:record.id,requestedAdvisorId:advisorId,status:'awaiting_payment',quotedAmountMinor:amount,currency:'PEN',expiresAt:new Date(Date.now()+24*60*60*1000)}).returning();await db.update(userProcedures).set({mode:'hybrid',status:'waiting_payment',updatedAt:new Date()}).where(eq(userProcedures.id,record.id));await db.insert(procedureStatusHistory).values({userProcedureId:record.id,changedBy:session.user.id,previousStatus:record.status,newStatus:'waiting_payment',reason:'Solicitud de delegación creada.',metadata:{source:'user',delegationId:saved.id}});res.status(201).json({data:saved,existing:false});});

app.post('/api/v1/my-procedures/:id/delegation/payment',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const method=String(req.body.method||'');if(!['visa_simulada','paypal_simulado'].includes(method))return res.status(400).json({error:'invalid_payment_method',message:'Selecciona un medio ficticio para la simulación.'});const db=getDrizzleDatabase();const [request]=await db.select({id:delegationRequests.id,status:delegationRequests.status,amountMinor:delegationRequests.quotedAmountMinor,currency:delegationRequests.currency,userProcedureId:delegationRequests.userProcedureId,ownerId:userProcedures.userId,procedureStatus:userProcedures.status}).from(delegationRequests).innerJoin(userProcedures,eq(delegationRequests.userProcedureId,userProcedures.id)).where(and(eq(delegationRequests.userProcedureId,req.params.id),eq(userProcedures.userId,session.user.id))).limit(1);if(!request)return res.status(404).json({error:'delegation_not_found',message:'Primero crea la solicitud de delegación.'});if(['paid','assigned','active','completed'].includes(request.status))return res.status(409).json({error:'already_paid',message:'Esta delegación ya tiene un pago confirmado.'});const now=new Date(),reference=`SIM-${crypto.randomUUID().slice(0,12).toUpperCase()}`;const result=await db.transaction(async tx=>{const [order]=await tx.insert(paymentOrders).values({userProcedureId:request.userProcedureId,delegationRequestId:request.id,type:'delegation_service',amountMinor:request.amountMinor,currency:request.currency,status:'paid',provider:'tramia_simulator',providerOrderId:reference,paidAt:now}).returning();const [transaction]=await tx.insert(paymentTransactions).values({paymentOrderId:order.id,provider:'tramia_simulator',providerTransactionId:reference,paymentMethodType:method,status:'paid',amountMinor:request.amountMinor,cardBrand:String(req.body.cardBrand||'simulada'),cardLastFour:String(req.body.cardLastFour||'0000'),providerResponseCode:'SIMULATED_APPROVED',processedAt:now}).returning();await tx.update(delegationRequests).set({status:'paid',acceptedAt:now,updatedAt:now}).where(eq(delegationRequests.id,request.id));await tx.update(userProcedures).set({status:'waiting_assignment',updatedAt:now}).where(eq(userProcedures.id,request.userProcedureId));await tx.insert(procedureStatusHistory).values({userProcedureId:request.userProcedureId,changedBy:session.user.id,previousStatus:request.procedureStatus,newStatus:'waiting_assignment',reason:'Pago simulado de delegación aprobado.',metadata:{source:'payment_simulator',orderId:order.id,method}});return{order,transaction}});res.status(201).json({paid:true,reference,amountMinor:request.amountMinor,currency:request.currency,method,orderId:result.order.id,message:'Pago simulado aprobado. Ahora asignaremos a tu asesor.'});});

app.patch('/api/v1/my-procedures/:id/progress',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const percentage=Math.max(0,Math.min(100,Math.round(Number(req.body.progressPercentage)||0))),currentStepId=String(req.body.currentStepId||'')||null,completedStepIds=Array.isArray(req.body.completedStepIds)?req.body.completedStepIds.map(String):[];const db=getDrizzleDatabase();const [record]=await db.select().from(userProcedures).where(and(eq(userProcedures.userId,session.user.id),eq(userProcedures.id,req.params.id),inArray(userProcedures.status,[...activeProcedureStatuses]))).limit(1);if(!record)return res.status(404).json({error:'procedure_not_found'});if(['waiting_assignment','delegated'].includes(record.status))return res.status(409).json({error:'advisor_managed',message:'El avance de este trámite está bajo gestión del asesor.'});const nextStatus=percentage>=100?'completed':percentage>0?'in_progress':'active',now=new Date();await db.transaction(async tx=>{await tx.update(userProcedures).set({progressPercentage:percentage,currentStepId,status:nextStatus,completedAt:percentage>=100?now:null,updatedAt:now}).where(eq(userProcedures.id,record.id));if(completedStepIds.length)await tx.update(userProcedureSteps).set({status:'completed',completedAt:now,completedBy:session.user.id,completionSource:'user',updatedAt:now}).where(and(eq(userProcedureSteps.userProcedureId,record.id),inArray(userProcedureSteps.procedureStepId,completedStepIds)));if(currentStepId)await tx.update(userProcedureSteps).set({status:'in_progress',startedAt:now,updatedAt:now}).where(and(eq(userProcedureSteps.userProcedureId,record.id),eq(userProcedureSteps.procedureStepId,currentStepId)));if(nextStatus!==record.status)await tx.insert(procedureStatusHistory).values({userProcedureId:record.id,changedBy:session.user.id,previousStatus:record.status,newStatus:nextStatus,reason:percentage>=100?'Trámite completado por el usuario.':'Avance actualizado por el usuario.',metadata:{source:'workspace',percentage}});});res.json({updated:true,progressPercentage:percentage,status:nextStatus});});

app.delete('/api/v1/my-procedures/:id', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });

  const requestedAction = req.body?.action === 'delete' ? 'delete' : 'cancel';
  const reason = String(req.body?.reason || 'Cancelado por el usuario desde su espacio de trabajo.').slice(0, 1000);
  const db = getDrizzleDatabase();
  const [record] = await db.select().from(userProcedures).where(and(
    eq(userProcedures.userId, session.user.id),
    eq(userProcedures.id, req.params.id),
    inArray(userProcedures.status, [...activeProcedureStatuses]),
  )).limit(1);
  if (!record) return res.status(404).json({ error: 'procedure_not_found' });

  const [[completed], [payments], [protectedPayments], [delegation]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(userProcedureSteps).where(and(eq(userProcedureSteps.userProcedureId, record.id), eq(userProcedureSteps.status, 'completed'))),
    db.select({ count: sql<number>`count(*)::int` }).from(paymentOrders).where(eq(paymentOrders.userProcedureId, record.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(paymentOrders).where(and(eq(paymentOrders.userProcedureId, record.id), inArray(paymentOrders.status, ['authorized', 'paid', 'partially_refunded']))),
    db.select().from(delegationRequests).where(eq(delegationRequests.userProcedureId, record.id)).limit(1),
  ]);
  const canDelete = record.progressPercentage === 0 && (completed?.count || 0) === 0 && (payments?.count || 0) === 0 && !record.nonReturnReachedAt;

  if (requestedAction === 'delete' && canDelete) {
    await db.delete(userProcedures).where(eq(userProcedures.id, record.id));
    return res.json({ deleted: true, cancelled: false });
  }

  if (!req.body?.acknowledgeNoRefund) {
    return res.status(409).json({
      error: 'cancellation_acknowledgement_required',
      message: 'El trámite ya fue iniciado y solo puede cancelarse.',
      requiresAcknowledgement: true,
      hasProtectedPayment: (protectedPayments?.count || 0) > 0,
    });
  }

  const [assignment] = delegation ? await db.select().from(advisorAssignments).where(eq(advisorAssignments.delegationRequestId, delegation.id)).limit(1) : [];
  const now = new Date();
  await db.transaction(async tx => {
    if (assignment && ['reserved', 'active'].includes(assignment.status)) {
      await tx.update(advisorAssignments).set({ status: 'cancelled', endedAt: now, endReason: reason }).where(eq(advisorAssignments.id, assignment.id));
      await tx.update(advisorProfiles).set({ activeCasesCount: sql`greatest(${advisorProfiles.activeCasesCount} - 1, 0)`, updatedAt: now }).where(eq(advisorProfiles.userId, assignment.advisorId));
    }
    if (delegation) await tx.update(delegationRequests).set({ status: 'cancelled', updatedAt: now }).where(eq(delegationRequests.id, delegation.id));
    await tx.update(userProcedures).set({ status: 'cancelled', cancelledAt: now, cancellationReason: reason, updatedAt: now }).where(eq(userProcedures.id, record.id));
    await tx.insert(procedureStatusHistory).values({
      userProcedureId: record.id,
      changedBy: session.user.id,
      previousStatus: record.status,
      newStatus: 'cancelled',
      reason,
      metadata: { source: 'workspace', noRefundAcknowledged: true, protectedPaymentCount: protectedPayments?.count || 0 },
    });
  });
  return res.json({ deleted: false, cancelled: true });
});

app.post('/api/v1/my-procedures/:id/delegation/auto-assign', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required' });
  const db = getDrizzleDatabase();
  const [request] = await db.select({
    id: delegationRequests.id,
    status: delegationRequests.status,
    userProcedureId: delegationRequests.userProcedureId,
    advisorId: delegationRequests.requestedAdvisorId,
  }).from(delegationRequests)
    .innerJoin(userProcedures, eq(delegationRequests.userProcedureId, userProcedures.id))
    .where(and(eq(delegationRequests.userProcedureId, req.params.id), eq(userProcedures.userId, session.user.id)))
    .limit(1);
  if (!request) return res.status(404).json({ error: 'delegation_not_found' });
  if (!request.advisorId || request.status !== 'paid') return res.json({ assigned: false, reason: 'manual_assignment_required' });
  const [advisor] = await db.select().from(advisorProfiles).where(and(
    eq(advisorProfiles.userId, request.advisorId),
    eq(advisorProfiles.verificationStatus, 'verified'),
    eq(advisorProfiles.availabilityStatus, 'available'),
    sql`${advisorProfiles.activeCasesCount}<${advisorProfiles.maxActiveCases}`,
  )).limit(1);
  if (!advisor) return res.json({ assigned: false, reason: 'advisor_unavailable' });
  const now = new Date();
  await db.transaction(async tx => {
    await tx.insert(advisorAssignments).values({ delegationRequestId: request.id, advisorId: advisor.userId, status: 'active' });
    await tx.update(advisorProfiles).set({ activeCasesCount: sql`${advisorProfiles.activeCasesCount}+1`, updatedAt: now }).where(eq(advisorProfiles.userId, advisor.userId));
    await tx.update(delegationRequests).set({ status: 'assigned', acceptedAt: now, updatedAt: now }).where(eq(delegationRequests.id, request.id));
    await tx.update(userProcedures).set({ mode: 'delegated', status: 'delegated', updatedAt: now }).where(eq(userProcedures.id, request.userProcedureId));
    await tx.insert(procedureStatusHistory).values({ userProcedureId: request.userProcedureId, changedBy: session.user.id, previousStatus: 'waiting_assignment', newStatus: 'delegated', reason: 'Asesor elegido asignado automáticamente después del pago.', metadata: { source: 'automatic_assignment', advisorId: advisor.userId } });
  });
  return res.json({ assigned: true, advisorId: advisor.userId, advisorName: advisor.publicName });
});

app.get('/api/v1/my-procedures', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para consultar tus trámites.' });
  try {
    const db = getDrizzleDatabase();
    const pendingAssignments = await db.select({ requestId: delegationRequests.id, userProcedureId: delegationRequests.userProcedureId, advisorId: delegationRequests.requestedAdvisorId })
      .from(delegationRequests)
      .innerJoin(userProcedures, eq(delegationRequests.userProcedureId, userProcedures.id))
      .where(and(eq(userProcedures.userId, session.user.id), eq(delegationRequests.status, 'paid')));
    for (const pending of pendingAssignments) {
      if (!pending.advisorId) continue;
      const [advisor] = await db.select().from(advisorProfiles).where(and(eq(advisorProfiles.userId, pending.advisorId), eq(advisorProfiles.verificationStatus, 'verified'), eq(advisorProfiles.availabilityStatus, 'available'), sql`${advisorProfiles.activeCasesCount}<${advisorProfiles.maxActiveCases}`)).limit(1);
      if (!advisor) continue;
      const now = new Date();
      await db.transaction(async tx => {
        await tx.insert(advisorAssignments).values({ delegationRequestId: pending.requestId, advisorId: advisor.userId, status: 'active' });
        await tx.update(advisorProfiles).set({ activeCasesCount: sql`${advisorProfiles.activeCasesCount}+1`, updatedAt: now }).where(eq(advisorProfiles.userId, advisor.userId));
        await tx.update(delegationRequests).set({ status: 'assigned', acceptedAt: now, updatedAt: now }).where(eq(delegationRequests.id, pending.requestId));
        await tx.update(userProcedures).set({ mode: 'delegated', status: 'delegated', updatedAt: now }).where(eq(userProcedures.id, pending.userProcedureId));
        await tx.insert(procedureStatusHistory).values({ userProcedureId: pending.userProcedureId, changedBy: session.user.id, previousStatus: 'waiting_assignment', newStatus: 'delegated', reason: 'Asesor elegido asignado automáticamente después del pago.', metadata: { source: 'automatic_assignment', advisorId: advisor.userId } });
      });
    }
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
    const cancelledCount = rows.filter((item) => item.status === 'cancelled').length;
    const delegatedCompletedCount = rows.filter((item) => item.status === 'completed' && item.mode !== 'self_service').length;
    const ratedAdvisorsCount = rows.filter((item) => item.userRating !== null).length;
    return res.json({
      data: { active, history },
      summary: { activeCount: active.length, completedCount, cancelledCount, delegatedCompletedCount, ratedAdvisorsCount, totalCount: rows.length },
    });
  } catch (error) {
    console.error('[my-procedures]', error);
    return res.status(503).json({ error: 'procedures_unavailable', message: 'No pudimos cargar tus trámites en este momento.' });
  }
});

app.get('/api/v1/advisor/cases', async (req, res) => {
  const advisor = await requireAdvisor(req, res); if (!advisor) return;
  const db = getDrizzleDatabase();
  const cases = await db.select({ id:userProcedures.id, trackingCode:userProcedures.trackingCode, status:userProcedures.status, progressPercentage:userProcedures.progressPercentage, currentStepId:userProcedures.currentStepId, startedAt:userProcedures.startedAt, expectedCompletionAt:userProcedures.expectedCompletionAt, updatedAt:userProcedures.updatedAt, assignmentId:advisorAssignments.id, assignmentStatus:advisorAssignments.status, assignedAt:advisorAssignments.assignedAt, title:procedures.title, category:procedureCategories.name, clientName:sql<string>`trim(concat(coalesce(${userProfiles.firstName},''),' ',coalesce(${userProfiles.lastName},'')))`, clientUsername:users.username })
    .from(advisorAssignments).innerJoin(delegationRequests,eq(advisorAssignments.delegationRequestId,delegationRequests.id)).innerJoin(userProcedures,eq(delegationRequests.userProcedureId,userProcedures.id)).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).innerJoin(procedureCategories,eq(procedures.categoryId,procedureCategories.id)).innerJoin(users,eq(userProcedures.userId,users.id)).leftJoin(userProfiles,eq(users.id,userProfiles.userId))
    .where(and(eq(advisorAssignments.advisorId,advisor.user.id),inArray(advisorAssignments.status,['reserved','active']))).orderBy(desc(userProcedures.updatedAt));
  res.json({ cases, summary:{ total:cases.length, active:cases.filter(item=>item.status==='delegated'||item.status==='in_progress').length, paused:cases.filter(item=>item.status==='paused'||item.status==='waiting_user').length, averageProgress:cases.length?Math.round(cases.reduce((sum,item)=>sum+item.progressPercentage,0)/cases.length):0 } });
});

app.get('/api/v1/advisor/profile',async(req,res)=>{const advisor=await requireAdvisor(req,res);if(!advisor)return;const [profile]=await getDrizzleDatabase().select({publicName:advisorProfiles.publicName,bio:advisorProfiles.bio,averageRating:advisorProfiles.averageRating,completedCasesCount:advisorProfiles.completedCasesCount,verificationStatus:advisorProfiles.verificationStatus,avatarUrl:userProfiles.avatarUrl,identityVerificationStatus:userProfiles.identityVerificationStatus}).from(advisorProfiles).innerJoin(userProfiles,eq(userProfiles.userId,advisorProfiles.userId)).where(eq(advisorProfiles.userId,advisor.user.id)).limit(1);res.json({profile:{...profile,avatarUrl:resolveAvatarUrl(profile?.avatarUrl,advisor.user.id),idVerified:profile?.identityVerificationStatus==='verified'}});});

app.patch('/api/v1/advisor/profile',async(req,res)=>{const advisor=await requireAdvisor(req,res);if(!advisor)return;const publicName=String(req.body.publicName||'').trim(),bio=String(req.body.bio||'').trim().slice(0,2000),availabilityStatus=String(req.body.availabilityStatus||''),maxActiveCases=Math.max(1,Math.min(50,Number(req.body.maxActiveCases)||10)),baseFeeMinor=Math.max(0,Math.min(10000000,Number(req.body.baseFeeMinor)||0));if(publicName.length<3)return res.status(400).json({error:'invalid_public_name'});if(!['available','busy','offline'].includes(availabilityStatus))return res.status(400).json({error:'invalid_availability'});const [saved]=await getDrizzleDatabase().update(advisorProfiles).set({publicName,bio,availabilityStatus,maxActiveCases,baseFeeMinor,updatedAt:new Date()}).where(eq(advisorProfiles.userId,advisor.user.id)).returning();res.json({data:saved});});

app.get('/api/v1/advisor/expertise',async(req,res)=>{const advisor=await requireAdvisor(req,res);if(!advisor)return;const db=getDrizzleDatabase();const [areas,selected]=await Promise.all([db.select().from(expertiseAreas).orderBy(asc(expertiseAreas.name)),db.select({id:expertiseAreas.id,name:expertiseAreas.name,level:advisorExpertise.level,yearsExperience:advisorExpertise.yearsExperience,isVerified:advisorExpertise.isVerified}).from(advisorExpertise).innerJoin(expertiseAreas,eq(advisorExpertise.expertiseId,expertiseAreas.id)).where(eq(advisorExpertise.advisorId,advisor.user.id))]);res.json({areas,selected});});

app.put('/api/v1/advisor/expertise',async(req,res)=>{const advisor=await requireAdvisor(req,res);if(!advisor)return;const ids=Array.isArray(req.body.expertiseIds)?[...new Set(req.body.expertiseIds.map(String))].slice(0,20):[];const db=getDrizzleDatabase();await db.transaction(async tx=>{await tx.delete(advisorExpertise).where(eq(advisorExpertise.advisorId,advisor.user.id));if(ids.length)await tx.insert(advisorExpertise).values(ids.map((expertiseId:any)=>({advisorId:advisor.user.id,expertiseId,level:'specialist'})));});res.json({updated:true});});

app.get('/api/v1/advisor/cases/:id', async (req, res) => {
  const advisor = await requireAdvisor(req, res); if (!advisor) return;
  const db=getDrizzleDatabase();
  const [caseItem]=await db.select({id:userProcedures.id,trackingCode:userProcedures.trackingCode,status:userProcedures.status,progressPercentage:userProcedures.progressPercentage,currentStepId:userProcedures.currentStepId,title:procedures.title,category:procedureCategories.name,clientName:sql<string>`trim(concat(coalesce(${userProfiles.firstName},''),' ',coalesce(${userProfiles.lastName},'')))`,clientUsername:users.username}).from(advisorAssignments).innerJoin(delegationRequests,eq(advisorAssignments.delegationRequestId,delegationRequests.id)).innerJoin(userProcedures,eq(delegationRequests.userProcedureId,userProcedures.id)).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).innerJoin(procedureCategories,eq(procedures.categoryId,procedureCategories.id)).innerJoin(users,eq(userProcedures.userId,users.id)).leftJoin(userProfiles,eq(users.id,userProfiles.userId)).where(and(eq(userProcedures.id,req.params.id),eq(advisorAssignments.advisorId,advisor.user.id),inArray(advisorAssignments.status,['reserved','active']))).limit(1);
  if(!caseItem)return res.status(404).json({error:'case_not_found',message:'No encontramos este caso entre tus asignaciones.'});
  const [steps,requirements]=await Promise.all([db.select({id:userProcedureSteps.id,procedureStepId:userProcedureSteps.procedureStepId,status:userProcedureSteps.status,notes:userProcedureSteps.notes,position:procedureSteps.position,title:procedureSteps.title,description:procedureSteps.description,isPointOfNoReturn:procedureSteps.isPointOfNoReturn}).from(userProcedureSteps).innerJoin(procedureSteps,eq(userProcedureSteps.procedureStepId,procedureSteps.id)).where(eq(userProcedureSteps.userProcedureId,caseItem.id)).orderBy(asc(procedureSteps.position)),db.select({id:userProcedureRequirements.id,status:userProcedureRequirements.status,name:procedureRequirements.name,isRequired:procedureRequirements.isRequired}).from(userProcedureRequirements).innerJoin(procedureRequirements,eq(userProcedureRequirements.requirementId,procedureRequirements.id)).where(eq(userProcedureRequirements.userProcedureId,caseItem.id)).orderBy(asc(procedureRequirements.name))]);
  res.json({case:caseItem,steps,requirements});
});

app.patch('/api/v1/advisor/cases/:id/progress', async (req, res) => {
  const advisor=await requireAdvisor(req,res);if(!advisor)return;const db=getDrizzleDatabase();
  const [assigned]=await db.select({assignmentId:advisorAssignments.id,status:userProcedures.status}).from(advisorAssignments).innerJoin(delegationRequests,eq(advisorAssignments.delegationRequestId,delegationRequests.id)).innerJoin(userProcedures,eq(delegationRequests.userProcedureId,userProcedures.id)).where(and(eq(userProcedures.id,req.params.id),eq(advisorAssignments.advisorId,advisor.user.id),eq(advisorAssignments.status,'active'))).limit(1);
  if(!assigned)return res.status(404).json({error:'case_not_found'});
  const progress=Math.max(0,Math.min(100,Math.round(Number(req.body.progressPercentage)||0))),currentStepId=String(req.body.currentStepId||'')||null,notes=String(req.body.notes||'').trim().slice(0,2000),now=new Date(),requestedStatus=String(req.body.status||'in_progress');
  const nextStatus = (progress>=100?'completed':requestedStatus) as 'in_progress'|'waiting_user'|'paused'|'completed';
  if(!['in_progress','waiting_user','paused','completed'].includes(nextStatus))return res.status(400).json({error:'invalid_status'});
  await db.transaction(async tx=>{await tx.update(userProcedures).set({progressPercentage:progress,currentStepId,status:nextStatus as any,completedAt:nextStatus==='completed'?now:null,updatedAt:now}).where(eq(userProcedures.id,req.params.id));if(currentStepId)await tx.update(userProcedureSteps).set({status:progress>=100?'completed':'in_progress',startedAt:now,completedAt:progress>=100?now:null,completedBy:advisor.user.id,completionSource:'advisor',notes:notes||undefined,updatedAt:now}).where(and(eq(userProcedureSteps.userProcedureId,req.params.id),eq(userProcedureSteps.procedureStepId,currentStepId)));await tx.insert(procedureStatusHistory).values({userProcedureId:req.params.id,changedBy:advisor.user.id,previousStatus:assigned.status,newStatus:nextStatus,reason:notes||'Avance actualizado por el asesor.',metadata:{source:'advisor_portal',progress}});if(nextStatus==='completed'){await tx.update(advisorAssignments).set({status:'completed',endedAt:now,endReason:'Trámite completado'}).where(eq(advisorAssignments.id,assigned.assignmentId));await tx.update(advisorProfiles).set({activeCasesCount:sql`greatest(${advisorProfiles.activeCasesCount}-1,0)`,completedCasesCount:sql`${advisorProfiles.completedCasesCount}+1`,updatedAt:now}).where(eq(advisorProfiles.userId,advisor.user.id));}});res.json({updated:true,status:nextStatus,progressPercentage:progress});
});

app.get('/api/v1/procedure-cases/:id/messages',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const db=getDrizzleDatabase();const [access]=await db.select({ownerId:userProcedures.userId,advisorId:advisorAssignments.advisorId}).from(userProcedures).leftJoin(delegationRequests,eq(delegationRequests.userProcedureId,userProcedures.id)).leftJoin(advisorAssignments,and(eq(advisorAssignments.delegationRequestId,delegationRequests.id),inArray(advisorAssignments.status,['reserved','active']))).where(eq(userProcedures.id,req.params.id)).limit(1);if(!access||![access.ownerId,access.advisorId].includes(session.user.id))return res.status(403).json({error:'case_access_denied'});await db.update(procedureMessages).set({readAt:new Date()}).where(and(eq(procedureMessages.userProcedureId,req.params.id),eq(procedureMessages.recipientUserId,session.user.id),isNull(procedureMessages.readAt)));const messages=await db.select({id:procedureMessages.id,senderUserId:procedureMessages.senderUserId,recipientUserId:procedureMessages.recipientUserId,body:procedureMessages.body,readAt:procedureMessages.readAt,createdAt:procedureMessages.createdAt,senderUsername:users.username}).from(procedureMessages).innerJoin(users,eq(procedureMessages.senderUserId,users.id)).where(eq(procedureMessages.userProcedureId,req.params.id)).orderBy(asc(procedureMessages.createdAt));res.json({messages});});

app.post('/api/v1/procedure-cases/:id/messages',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const body=String(req.body.body||'').trim();if(body.length<1||body.length>3000)return res.status(400).json({error:'invalid_message',message:'El mensaje debe tener entre 1 y 3000 caracteres.'});const db=getDrizzleDatabase();const [access]=await db.select({ownerId:userProcedures.userId,advisorId:advisorAssignments.advisorId,title:procedures.title}).from(userProcedures).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).leftJoin(delegationRequests,eq(delegationRequests.userProcedureId,userProcedures.id)).leftJoin(advisorAssignments,and(eq(advisorAssignments.delegationRequestId,delegationRequests.id),inArray(advisorAssignments.status,['reserved','active']))).where(eq(userProcedures.id,req.params.id)).limit(1);if(!access||![access.ownerId,access.advisorId].includes(session.user.id))return res.status(403).json({error:'case_access_denied'});const recipientId=session.user.id===access.ownerId?access.advisorId:access.ownerId;if(!recipientId)return res.status(409).json({error:'recipient_unavailable',message:'Este trámite todavía no tiene un asesor asignado.'});const [message]=await db.insert(procedureMessages).values({userProcedureId:req.params.id,senderUserId:session.user.id,recipientUserId:recipientId,body}).returning();await db.insert(notifications).values({userId:recipientId,userProcedureId:req.params.id,type:'procedure_message',title:'Nuevo mensaje sobre tu trámite',body:`Tienes un mensaje nuevo en ${access.title}.`});res.status(201).json({data:message});});

app.get('/api/v1/notifications',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const items=await getDrizzleDatabase().select().from(notifications).where(eq(notifications.userId,session.user.id)).orderBy(desc(notifications.createdAt)).limit(100);res.json({notifications:items,unreadCount:items.filter(item=>!item.readAt).length});});
app.patch('/api/v1/notifications/:id/read',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const [saved]=await getDrizzleDatabase().update(notifications).set({status:'read',readAt:new Date()}).where(and(eq(notifications.id,req.params.id),eq(notifications.userId,session.user.id))).returning();if(!saved)return res.status(404).json({error:'notification_not_found'});res.json({data:saved});});

app.get('/api/v1/procedure-cases/:id/documents',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const db=getDrizzleDatabase();const [access]=await db.select({ownerId:userProcedures.userId,advisorId:advisorAssignments.advisorId}).from(userProcedures).leftJoin(delegationRequests,eq(delegationRequests.userProcedureId,userProcedures.id)).leftJoin(advisorAssignments,and(eq(advisorAssignments.delegationRequestId,delegationRequests.id),inArray(advisorAssignments.status,['reserved','active']))).where(eq(userProcedures.id,req.params.id)).limit(1);if(!access||![access.ownerId,access.advisorId].includes(session.user.id))return res.status(403).json({error:'case_access_denied'});const documents=await db.select({id:uploadedDocuments.id,userProcedureRequirementId:uploadedDocuments.userProcedureRequirementId,originalFileName:uploadedDocuments.originalFileName,mimeType:uploadedDocuments.mimeType,sizeBytes:uploadedDocuments.sizeBytes,status:uploadedDocuments.status,createdAt:uploadedDocuments.createdAt,deletedAt:uploadedDocuments.deletedAt}).from(uploadedDocuments).where(and(eq(uploadedDocuments.userProcedureId,req.params.id),isNull(uploadedDocuments.deletedAt))).orderBy(desc(uploadedDocuments.createdAt));res.json({documents});});

app.post('/api/v1/procedure-cases/:id/documents',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const db=getDrizzleDatabase();const [record]=await db.select({ownerId:userProcedures.userId}).from(userProcedures).where(eq(userProcedures.id,req.params.id)).limit(1);if(!record||record.ownerId!==session.user.id)return res.status(403).json({error:'case_owner_required'});const fileName=String(req.body.fileName||'').trim(),mimeType=String(req.body.mimeType||''),content=String(req.body.contentBase64||''),requirementId=String(req.body.userProcedureRequirementId||'')||null;if(!fileName||!['application/pdf','image/jpeg','image/png'].includes(mimeType))return res.status(400).json({error:'invalid_document',message:'Solo se permiten archivos PDF, JPG o PNG.'});const data=Buffer.from(content,'base64');if(!data.length||data.length>8*1024*1024)return res.status(400).json({error:'invalid_document_size',message:'El archivo debe pesar como máximo 8 MB.'});if(requirementId){const [requirement]=await db.select({id:userProcedureRequirements.id}).from(userProcedureRequirements).where(and(eq(userProcedureRequirements.id,requirementId),eq(userProcedureRequirements.userProcedureId,req.params.id))).limit(1);if(!requirement)return res.status(400).json({error:'invalid_requirement'});}const key=`cases/${req.params.id}/${crypto.randomUUID()}`,provider=await saveDocument(key,data,mimeType),checksum=createHash('sha256').update(data).digest('hex');const [saved]=await db.insert(uploadedDocuments).values({userProcedureId:req.params.id,userProcedureRequirementId:requirementId,uploadedBy:session.user.id,storageProvider:provider,storageKey:key,originalFileName:fileName.slice(0,255),mimeType,sizeBytes:data.length,checksum,status:'pending'}).returning();if(requirementId)await db.update(userProcedureRequirements).set({status:'uploaded',updatedAt:new Date()}).where(eq(userProcedureRequirements.id,requirementId));res.status(201).json({data:{id:saved.id,originalFileName:saved.originalFileName,mimeType:saved.mimeType,sizeBytes:saved.sizeBytes,status:saved.status}});});

app.get('/api/v1/documents/:id/content',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).end();const db=getDrizzleDatabase();const [document]=await db.select({id:uploadedDocuments.id,userProcedureId:uploadedDocuments.userProcedureId,storageKey:uploadedDocuments.storageKey,mimeType:uploadedDocuments.mimeType,originalFileName:uploadedDocuments.originalFileName,deletedAt:uploadedDocuments.deletedAt,ownerId:userProcedures.userId,advisorId:advisorAssignments.advisorId}).from(uploadedDocuments).innerJoin(userProcedures,eq(uploadedDocuments.userProcedureId,userProcedures.id)).leftJoin(delegationRequests,eq(delegationRequests.userProcedureId,userProcedures.id)).leftJoin(advisorAssignments,and(eq(advisorAssignments.delegationRequestId,delegationRequests.id),inArray(advisorAssignments.status,['reserved','active']))).where(eq(uploadedDocuments.id,req.params.id)).limit(1);if(!document||document.deletedAt||![document.ownerId,document.advisorId].includes(session.user.id))return res.status(404).end();const stored=await readDocument(document.storageKey);if(!stored)return res.status(404).end();res.setHeader('Content-Type',document.mimeType);res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(document.originalFileName)}`);res.send(stored.data);});

app.patch('/api/v1/documents/:id/review',async(req,res)=>{const advisor=await requireAdvisor(req,res);if(!advisor)return;const status=String(req.body.status||'');if(!['approved','rejected'].includes(status))return res.status(400).json({error:'invalid_status'});const db=getDrizzleDatabase();const [document]=await db.select({id:uploadedDocuments.id,requirementId:uploadedDocuments.userProcedureRequirementId,userProcedureId:uploadedDocuments.userProcedureId,ownerId:userProcedures.userId}).from(uploadedDocuments).innerJoin(userProcedures,eq(uploadedDocuments.userProcedureId,userProcedures.id)).innerJoin(delegationRequests,eq(delegationRequests.userProcedureId,userProcedures.id)).innerJoin(advisorAssignments,and(eq(advisorAssignments.delegationRequestId,delegationRequests.id),eq(advisorAssignments.advisorId,advisor.user.id),eq(advisorAssignments.status,'active'))).where(eq(uploadedDocuments.id,req.params.id)).limit(1);if(!document)return res.status(404).json({error:'document_not_found'});const [saved]=await db.update(uploadedDocuments).set({status:status as any,updatedAt:new Date()}).where(eq(uploadedDocuments.id,document.id)).returning();if(document.requirementId)await db.update(userProcedureRequirements).set({status:status as any,approvedAt:status==='approved'?new Date():null,updatedAt:new Date()}).where(eq(userProcedureRequirements.id,document.requirementId));await db.insert(notifications).values({userId:document.ownerId,userProcedureId:document.userProcedureId,type:'document_review',title:status==='approved'?'Documento aprobado':'Documento por corregir',body:status==='approved'?'Tu asesor aprobó uno de los documentos del trámite.':String(req.body.comment||'Revisa el documento y vuelve a cargarlo.')});res.json({data:saved});});

app.delete('/api/v1/documents/:id',async(req,res)=>{const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);if(!session)return res.status(401).json({error:'authentication_required'});const db=getDrizzleDatabase();const [document]=await db.select({id:uploadedDocuments.id,storageKey:uploadedDocuments.storageKey,ownerId:userProcedures.userId}).from(uploadedDocuments).innerJoin(userProcedures,eq(uploadedDocuments.userProcedureId,userProcedures.id)).where(eq(uploadedDocuments.id,req.params.id)).limit(1);if(!document||document.ownerId!==session.user.id)return res.status(404).json({error:'document_not_found'});await db.update(uploadedDocuments).set({deletedAt:new Date(),updatedAt:new Date()}).where(eq(uploadedDocuments.id,document.id));await removeDocument(document.storageKey);res.status(204).end();});

app.post('/api/v1/my-procedures/:id/rating', async (req, res) => {
  const session = await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'authentication_required', message: 'Inicia sesión para calificar.' });
  const stars = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim().slice(0, 1000);
  if (!Number.isInteger(stars * 2) || stars < 1 || stars > 5) return res.status(400).json({ error: 'invalid_rating', message: 'Selecciona una calificación de 1 a 5 estrellas, en incrementos de media estrella.' });
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

    const [existing] = await db.select({ id: ratings.id }).from(ratings).where(and(eq(ratings.userProcedureId, record.id), eq(ratings.reviewerUserId, session.user.id), eq(ratings.reviewedUserId, record.advisorId))).limit(1);
    if (existing) return res.status(409).json({ error: 'rating_already_submitted', message: 'Esta calificación ya fue enviada y no se puede modificar.' });
    const [saved] = await db.insert(ratings).values({ userProcedureId: record.id, reviewerUserId: session.user.id, reviewedUserId: record.advisorId, rating: stars, comment: comment || null, ratingType: 'advisor' })
      .onConflictDoNothing()
      .returning({ rating: ratings.rating, comment: ratings.comment });
    if (!saved) return res.status(409).json({ error: 'rating_already_submitted', message: 'Esta calificación ya fue enviada y no se puede modificar.' });
    const [aggregate] = await db.select({ average: sql<string>`round(avg(${ratings.rating})::numeric, 2)` }).from(ratings)
      .where(and(eq(ratings.reviewedUserId, record.advisorId), eq(ratings.ratingType, 'advisor')));
    await db.update(advisorProfiles).set({ averageRating: aggregate?.average || '0', updatedAt: new Date() }).where(eq(advisorProfiles.userId, record.advisorId));
    return res.json({ data: saved, advisorAverageRating: aggregate?.average || '0', message: 'Tu calificación fue registrada. Gracias por compartir tu experiencia.' });
  } catch (error) {
    console.error('[advisor-rating]', error);
    return res.status(503).json({ error: 'rating_unavailable', message: 'No pudimos guardar tu calificación.' });
  }
});

app.post('/api/v1/advisor/cases/:id/rating-user',async(req,res)=>{const advisor=await requireAdvisor(req,res);if(!advisor)return;const stars=Number(req.body.rating),comment=String(req.body.comment||'').trim().slice(0,1000);if(!Number.isInteger(stars)||stars<1||stars>5)return res.status(400).json({error:'invalid_rating'});const db=getDrizzleDatabase();const [record]=await db.select({id:userProcedures.id,status:userProcedures.status,ownerId:userProcedures.userId}).from(userProcedures).innerJoin(delegationRequests,eq(delegationRequests.userProcedureId,userProcedures.id)).innerJoin(advisorAssignments,and(eq(advisorAssignments.delegationRequestId,delegationRequests.id),eq(advisorAssignments.advisorId,advisor.user.id))).where(eq(userProcedures.id,req.params.id)).limit(1);if(!record)return res.status(404).json({error:'case_not_found'});if(record.status!=='completed')return res.status(409).json({error:'case_not_completed',message:'Podrás calificar al usuario al finalizar el trámite.'});const [saved]=await db.insert(ratings).values({userProcedureId:record.id,reviewerUserId:advisor.user.id,reviewedUserId:record.ownerId,rating:stars,comment:comment||null,ratingType:'advisor_to_client'}).onConflictDoUpdate({target:[ratings.userProcedureId,ratings.reviewerUserId,ratings.reviewedUserId],set:{rating:stars,comment:comment||null}}).returning();res.json({data:saved});});

app.get('/api/v1/users/:id/reputation',async(req,res)=>{const rows=await getDrizzleDatabase().select({average:sql<string>`coalesce(round(avg(${ratings.rating})::numeric,2),0)`,count:sql<number>`count(*)::int`}).from(ratings).where(eq(ratings.reviewedUserId,req.params.id));res.json({reputation:{average:rows[0]?.average||'0',count:rows[0]?.count||0}});});

app.get('/api/v1/admin/dashboard', async (req, res) => {
  const admin = await requireAdministrator(req, res); if (!admin) return;
  const db = getDrizzleDatabase();
  const [userStats, procedureStats, messageStats, caseStats] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, verified: sql<number>`count(${users.emailVerifiedAt})::int`, active: sql<number>`count(*) filter (where ${users.status} = 'active')::int` }).from(users),
    db.select({ total: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where ${procedures.isActive})::int`, featured: sql<number>`count(*) filter (where ${procedures.isFeatured})::int` }).from(procedures),
    db.select({ total: sql<number>`count(*)::int`, pending: sql<number>`count(*) filter (where ${contactMessages.status} = 'received')::int` }).from(contactMessages),
    db.select({ total: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where ${userProcedures.status} not in ('completed','cancelled','rejected'))::int`, completed: sql<number>`count(*) filter (where ${userProcedures.status} = 'completed')::int` }).from(userProcedures),
  ]);
  const recentUsers = await db.select({ id: users.id, username: users.username, email: users.email, status: users.status, emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(6);
  const recentMessages = await db.select({ id: contactMessages.id, name: contactMessages.name, email: contactMessages.email, topic: contactMessages.topic, status: contactMessages.status, createdAt: contactMessages.createdAt }).from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(6);
  await db.insert(auditEvents).values({ actorUserId: admin.user.id, eventName: 'admin.dashboard.viewed', eventData: { path: req.path }, ipHash: createHash('sha256').update(req.ip || 'unknown').digest('hex') });
  res.json({
    currentUser: publicUser(admin.user, admin.profile, admin.roleCodes),
    summary: { users: userStats[0], procedures: procedureStats[0], messages: messageStats[0], cases: caseStats[0] },
    recentUsers, recentMessages, generatedAt: new Date().toISOString(),
  });
});

app.get('/api/v1/admin/payments',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const rows=await getDrizzleDatabase().select({id:paymentOrders.id,status:paymentOrders.status,type:paymentOrders.type,amountMinor:paymentOrders.amountMinor,currency:paymentOrders.currency,provider:paymentOrders.provider,paidAt:paymentOrders.paidAt,createdAt:paymentOrders.createdAt,trackingCode:userProcedures.trackingCode,procedureTitle:procedures.title,username:users.username,transactionId:paymentTransactions.id,transactionStatus:paymentTransactions.status,reference:paymentTransactions.providerTransactionId,cardBrand:paymentTransactions.cardBrand,cardLastFour:paymentTransactions.cardLastFour,failureReason:paymentTransactions.failureReason}).from(paymentOrders).innerJoin(userProcedures,eq(paymentOrders.userProcedureId,userProcedures.id)).innerJoin(users,eq(userProcedures.userId,users.id)).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).leftJoin(paymentTransactions,eq(paymentTransactions.paymentOrderId,paymentOrders.id)).orderBy(desc(paymentOrders.createdAt)).limit(500);res.json({payments:rows});});

app.patch('/api/v1/admin/payments/:id/status',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const status=String(req.body.status||''),reason=String(req.body.reason||'').trim();if(!['failed','refunded','partially_refunded'].includes(status))return res.status(400).json({error:'invalid_payment_status'});if(reason.length<8)return res.status(400).json({error:'reason_required',message:'Indica un motivo de al menos 8 caracteres.'});const db=getDrizzleDatabase();const [order]=await db.select().from(paymentOrders).where(eq(paymentOrders.id,req.params.id)).limit(1);if(!order)return res.status(404).json({error:'payment_not_found'});await db.transaction(async tx=>{await tx.update(paymentOrders).set({status:status as any,updatedAt:new Date()}).where(eq(paymentOrders.id,order.id));await tx.update(paymentTransactions).set({status:status as any,failureReason:status==='failed'?reason:null,processedAt:new Date()}).where(eq(paymentTransactions.paymentOrderId,order.id));});await writeAdminAudit(admin.user.id,'admin.payment.status_changed',{paymentOrderId:order.id,status,reason},req);res.json({updated:true});});

app.get('/api/v1/admin/ratings',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const rows=await getDrizzleDatabase().select({id:ratings.id,rating:ratings.rating,comment:ratings.comment,ratingType:ratings.ratingType,createdAt:ratings.createdAt,trackingCode:userProcedures.trackingCode,reviewerId:ratings.reviewerUserId,reviewedId:ratings.reviewedUserId}).from(ratings).innerJoin(userProcedures,eq(ratings.userProcedureId,userProcedures.id)).orderBy(desc(ratings.createdAt)).limit(500);res.json({ratings:rows});});

app.delete('/api/v1/admin/ratings/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const reason=String(req.body?.reason||'').trim();if(reason.length<8)return res.status(400).json({error:'reason_required'});const [removed]=await getDrizzleDatabase().delete(ratings).where(eq(ratings.id,req.params.id)).returning();if(!removed)return res.status(404).json({error:'rating_not_found'});await writeAdminAudit(admin.user.id,'admin.rating.removed',{ratingId:removed.id,reason},req);res.status(204).end();});

app.get('/api/v1/admin/reports/overview',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase();const [paymentsReport,ratingsReport,ratingDistribution,advisorReport,documentsReport,proceduresReport,usersReport]=await Promise.all([db.select({count:sql<number>`count(*)::int`,approved:sql<number>`count(*) filter(where ${paymentOrders.status}='paid')::int`,pending:sql<number>`count(*) filter(where ${paymentOrders.status} in ('created','pending','authorized'))::int`,refunded:sql<number>`count(*) filter(where ${paymentOrders.status} in ('refunded','partially_refunded'))::int`,amount:sql<number>`coalesce(sum(${paymentOrders.amountMinor}) filter(where ${paymentOrders.status}='paid'),0)::int`}).from(paymentOrders),db.select({count:sql<number>`count(*)::int`,average:sql<string>`coalesce(round(avg(${ratings.rating})::numeric,2),0)`}).from(ratings),db.select({rating:ratings.rating,count:sql<number>`count(*)::int`}).from(ratings).groupBy(ratings.rating).orderBy(ratings.rating),db.select({total:sql<number>`count(*)::int`,available:sql<number>`count(*) filter(where ${advisorProfiles.availabilityStatus}='available')::int`,activeCases:sql<number>`coalesce(sum(${advisorProfiles.activeCasesCount}),0)::int`,capacity:sql<number>`coalesce(sum(${advisorProfiles.maxActiveCases}),0)::int`}).from(advisorProfiles),db.select({total:sql<number>`count(*)::int`,pending:sql<number>`count(*) filter(where ${uploadedDocuments.status}='pending')::int`,approved:sql<number>`count(*) filter(where ${uploadedDocuments.status}='approved')::int`,rejected:sql<number>`count(*) filter(where ${uploadedDocuments.status} in ('correction_required','error'))::int`}).from(uploadedDocuments).where(isNull(uploadedDocuments.deletedAt)),db.select({total:sql<number>`count(*)::int`,active:sql<number>`count(*) filter(where ${userProcedures.status} in ('active','in_progress','waiting_user','waiting_payment','waiting_assignment','delegated'))::int`,completed:sql<number>`count(*) filter(where ${userProcedures.status}='completed')::int`}).from(userProcedures),db.select({total:sql<number>`count(*)::int`,verified:sql<number>`count(*) filter(where ${users.emailVerifiedAt} is not null)::int`}).from(users)]);res.json({generatedAt:new Date().toISOString(),payments:paymentsReport[0],ratings:{...ratingsReport[0],distribution:ratingDistribution},advisors:advisorReport[0],documents:documentsReport[0],procedures:proceduresReport[0],users:usersReport[0]});});

app.get('/api/v1/admin/audit-events',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase(),q=String(req.query.q||'').trim().toLowerCase();const events=await db.select({id:auditEvents.id,eventName:auditEvents.eventName,eventData:auditEvents.eventData,ipHash:auditEvents.ipHash,createdAt:auditEvents.createdAt,actorUserId:auditEvents.actorUserId,actorUsername:users.username,actorEmail:users.email}).from(auditEvents).leftJoin(users,eq(auditEvents.actorUserId,users.id)).where(q?sql`lower(${auditEvents.eventName}) like ${`%${q}%`} or lower(coalesce(${users.username},'')) like ${`%${q}%`} or lower(coalesce(${users.email},'')) like ${`%${q}%`}`:undefined).orderBy(desc(auditEvents.createdAt)).limit(500);res.json({events});});

const slugifyAdmin = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 180);
const normalizeCompletionMode = (value: unknown) => {
  const mode = String(value || 'manual');
  if (mode === 'upload') return 'evidence' as const;
  if (mode === 'external') return 'external_check' as const;
  if (mode === 'date') return 'form' as const;
  if (['manual', 'evidence', 'form', 'external_check', 'payment'].includes(mode)) {
    return mode as 'manual' | 'evidence' | 'form' | 'external_check' | 'payment';
  }
  return 'manual' as const;
};
const adminStepTracking = (body: Record<string, unknown>) => {
  const legacyDateMode = body.completionMode === 'date';
  const dateTrackingType = String(body.dateTrackingType || (legacyDateMode ? 'FOLLOW_UP' : '')).trim() || null;
  return {
    completionMode: normalizeCompletionMode(body.completionMode),
    dateTrackingEnabled: Boolean(body.dateTrackingEnabled || dateTrackingType),
    dateTrackingType,
  };
};
const resolveProcedureIdentifier = async (value: unknown) => {
  const identifier = String(value || '').trim();
  if (!identifier) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) return identifier;
  const [procedure] = await getDrizzleDatabase().select({ id: procedures.id }).from(procedures).where(eq(procedures.slug, identifier)).limit(1);
  return procedure?.id || null;
};
const writeAdminAudit = (actorUserId: string, eventName: string, eventData: Record<string, unknown>, req: express.Request) => getDrizzleDatabase().insert(auditEvents).values({ actorUserId, eventName, eventData, ipHash: createHash('sha256').update(req.ip || 'unknown').digest('hex') });

app.get('/api/v1/admin/catalog', async (req, res) => {
  const admin = await requireAdministrator(req, res); if (!admin) return;
  const db = getDrizzleDatabase();
  const [categories, organizationsList, procedureList] = await Promise.all([
    db.select().from(procedureCategories).orderBy(asc(procedureCategories.position), asc(procedureCategories.name)),
    db.select().from(organizations).orderBy(asc(organizations.name)),
    db.select({ id:procedures.id,slug:procedures.slug,title:procedures.title,shortDescription:procedures.shortDescription,procedureType:procedures.procedureType,isFeatured:procedures.isFeatured,isActive:procedures.isActive,categoryId:procedures.categoryId,categoryName:procedureCategories.name,organizationId:procedures.organizationId,organizationName:organizations.name,latestVersion:sql<number>`max(${procedureVersions.versionNumber})::int`,editorialStatus:sql<string>`coalesce((array_agg(${procedureVersions.status} order by ${procedureVersions.versionNumber} desc))[1]::text, 'sin_version')` }).from(procedures).innerJoin(procedureCategories,eq(procedures.categoryId,procedureCategories.id)).leftJoin(organizations,eq(procedures.organizationId,organizations.id)).leftJoin(procedureVersions,eq(procedureVersions.procedureId,procedures.id)).groupBy(procedures.id,procedureCategories.name,organizations.name).orderBy(asc(procedures.title)),
  ]);
  res.json({ categories, organizations:organizationsList, procedures:procedureList });
});

app.post('/api/v1/admin/categories', async (req,res)=>{
  const admin=await requireAdministrator(req,res);if(!admin)return;
  const name=String(req.body.name||'').trim(),description=String(req.body.description||'').trim(),icon=String(req.body.icon||'').trim(),slug=slugifyAdmin(String(req.body.slug||name)),position=Number(req.body.position||0);
  if(name.length<2||name.length>160||!slug)return res.status(400).json({error:'invalid_category',message:'Revisa el nombre y slug de la categoría.'});
  try{const [saved]=await getDrizzleDatabase().insert(procedureCategories).values({name,slug,description:description||null,icon:icon||null,position:Number.isFinite(position)?position:0,isActive:req.body.isActive!==false}).returning();await writeAdminAudit(admin.user.id,'admin.category.created',{id:saved.id,name:saved.name},req);return res.status(201).json({data:saved});}catch(error:any){if(error?.code==='23505')return res.status(409).json({error:'slug_exists',message:'Ya existe una categoría con ese slug.'});throw error;}
});
app.patch('/api/v1/admin/categories/:id',async(req,res)=>{
 const admin=await requireAdministrator(req,res);if(!admin)return;const name=String(req.body.name||'').trim(),slug=slugifyAdmin(String(req.body.slug||name));if(name.length<2||!slug)return res.status(400).json({error:'invalid_category',message:'Revisa los datos de la categoría.'});
 const [saved]=await getDrizzleDatabase().update(procedureCategories).set({name,slug,description:String(req.body.description||'').trim()||null,icon:String(req.body.icon||'').trim()||null,position:Number(req.body.position||0),isActive:req.body.isActive!==false,updatedAt:new Date()}).where(eq(procedureCategories.id,req.params.id)).returning();if(!saved)return res.status(404).json({error:'category_not_found'});await writeAdminAudit(admin.user.id,'admin.category.updated',{id:saved.id,name:saved.name},req);res.json({data:saved});
});
app.delete('/api/v1/admin/categories/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const [usage]=await getDrizzleDatabase().select({count:sql<number>`count(*)::int`}).from(procedures).where(eq(procedures.categoryId,req.params.id));if((usage?.count||0)>0)return res.status(409).json({error:'category_in_use',message:'No puedes eliminar una categoría que tiene trámites. Puedes desactivarla.'});const [removed]=await getDrizzleDatabase().delete(procedureCategories).where(eq(procedureCategories.id,req.params.id)).returning({id:procedureCategories.id});if(!removed)return res.status(404).json({error:'category_not_found'});await writeAdminAudit(admin.user.id,'admin.category.deleted',{id:removed.id},req);res.status(204).end();});

app.post('/api/v1/admin/organizations',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const name=String(req.body.name||'').trim(),slug=slugifyAdmin(String(req.body.slug||name)),organizationType=String(req.body.organizationType||'public_entity').trim(),officialUrl=String(req.body.officialUrl||'').trim();if(name.length<2||!slug||officialUrl&&!/^https:\/\//i.test(officialUrl))return res.status(400).json({error:'invalid_organization',message:'Revisa el nombre y la URL oficial.'});try{const [saved]=await getDrizzleDatabase().insert(organizations).values({name,slug,shortName:String(req.body.shortName||'').trim()||null,organizationType,officialUrl:officialUrl||null,countryCode:'PE',isActive:req.body.isActive!==false}).returning();await writeAdminAudit(admin.user.id,'admin.organization.created',{id:saved.id,name:saved.name},req);res.status(201).json({data:saved});}catch(error:any){if(error?.code==='23505')return res.status(409).json({error:'slug_exists',message:'Ya existe una entidad con ese slug.'});throw error;}});
app.patch('/api/v1/admin/organizations/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const name=String(req.body.name||'').trim(),slug=slugifyAdmin(String(req.body.slug||name)),officialUrl=String(req.body.officialUrl||'').trim();if(name.length<2||!slug||officialUrl&&!/^https:\/\//i.test(officialUrl))return res.status(400).json({error:'invalid_organization',message:'Revisa los datos de la entidad.'});const [saved]=await getDrizzleDatabase().update(organizations).set({name,slug,shortName:String(req.body.shortName||'').trim()||null,organizationType:String(req.body.organizationType||'public_entity'),officialUrl:officialUrl||null,isActive:req.body.isActive!==false,updatedAt:new Date()}).where(eq(organizations.id,req.params.id)).returning();if(!saved)return res.status(404).json({error:'organization_not_found'});await writeAdminAudit(admin.user.id,'admin.organization.updated',{id:saved.id,name:saved.name},req);res.json({data:saved});});
app.delete('/api/v1/admin/organizations/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const [usage]=await getDrizzleDatabase().select({count:sql<number>`count(*)::int`}).from(procedures).where(eq(procedures.organizationId,req.params.id));if((usage?.count||0)>0)return res.status(409).json({error:'organization_in_use',message:'No puedes eliminar una entidad asociada a trámites. Puedes desactivarla.'});const [removed]=await getDrizzleDatabase().delete(organizations).where(eq(organizations.id,req.params.id)).returning({id:organizations.id});if(!removed)return res.status(404).json({error:'organization_not_found'});await writeAdminAudit(admin.user.id,'admin.organization.deleted',{id:removed.id},req);res.status(204).end();});

app.get('/api/v1/admin/procedures/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase();const [procedure]=await db.select().from(procedures).where(eq(procedures.id,req.params.id)).limit(1);if(!procedure)return res.status(404).json({error:'procedure_not_found'});const versions=await db.select().from(procedureVersions).where(eq(procedureVersions.procedureId,procedure.id)).orderBy(desc(procedureVersions.versionNumber));const version=versions[0]||null;const [requirements,steps,sources]=version?await Promise.all([db.select().from(procedureRequirements).where(eq(procedureRequirements.procedureVersionId,version.id)).orderBy(asc(procedureRequirements.name)),db.select().from(procedureSteps).where(eq(procedureSteps.procedureVersionId,version.id)).orderBy(asc(procedureSteps.position)),db.select().from(procedureSources).where(eq(procedureSources.procedureVersionId,version.id)).orderBy(desc(procedureSources.isPrimary),asc(procedureSources.title))]):[[],[],[]];res.json({procedure,versions,version,requirements,steps,sources});});

app.post('/api/v1/admin/procedures',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const title=String(req.body.title||'').trim(),shortDescription=String(req.body.shortDescription||'').trim(),slug=slugifyAdmin(String(req.body.slug||title)),categoryId=String(req.body.categoryId||''),organizationId=String(req.body.organizationId||'')||null;if(title.length<4||shortDescription.length<10||!slug||!categoryId)return res.status(400).json({error:'invalid_procedure',message:'Completa título, descripción y categoría.'});try{const [saved]=await getDrizzleDatabase().insert(procedures).values({title,slug,shortDescription,categoryId,organizationId,procedureType:String(req.body.procedureType||'government'),isFeatured:Boolean(req.body.isFeatured),isActive:req.body.isActive!==false}).returning();await writeAdminAudit(admin.user.id,'admin.procedure.created',{id:saved.id,title:saved.title},req);res.status(201).json({data:saved});}catch(error:any){if(error?.code==='23505')return res.status(409).json({error:'slug_exists',message:'Ya existe un trámite con ese slug.'});throw error;}});
app.patch('/api/v1/admin/procedures/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const title=String(req.body.title||'').trim(),shortDescription=String(req.body.shortDescription||'').trim(),slug=slugifyAdmin(String(req.body.slug||title));if(title.length<4||shortDescription.length<10||!slug)return res.status(400).json({error:'invalid_procedure',message:'Revisa los datos generales.'});const [saved]=await getDrizzleDatabase().update(procedures).set({title,slug,shortDescription,categoryId:String(req.body.categoryId),organizationId:String(req.body.organizationId||'')||null,procedureType:String(req.body.procedureType||'government'),isFeatured:Boolean(req.body.isFeatured),isActive:req.body.isActive!==false,updatedAt:new Date()}).where(eq(procedures.id,req.params.id)).returning();if(!saved)return res.status(404).json({error:'procedure_not_found'});invalidateCatalogCache();await writeAdminAudit(admin.user.id,'admin.procedure.updated',{id:saved.id,title:saved.title,isActive:saved.isActive},req);res.json({data:saved});});
app.patch('/api/v1/admin/procedures/:id/active',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;if(typeof req.body.isActive!=='boolean')return res.status(400).json({error:'invalid_active_state',message:'Selecciona si el trámite estará visible o inactivo.'});const [saved]=await getDrizzleDatabase().update(procedures).set({isActive:req.body.isActive,updatedAt:new Date()}).where(eq(procedures.id,req.params.id)).returning({id:procedures.id,title:procedures.title,isActive:procedures.isActive});if(!saved)return res.status(404).json({error:'procedure_not_found',message:'No encontramos el trámite.'});invalidateCatalogCache();await writeAdminAudit(admin.user.id,req.body.isActive?'admin.procedure.activated':'admin.procedure.deactivated',{id:saved.id,title:saved.title,isActive:saved.isActive},req);res.json({data:saved,message:saved.isActive?'El trámite ya está visible en el catálogo.':'El trámite fue retirado del catálogo público.'});});

app.post('/api/v1/admin/procedures/:id/versions',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase();const [latest]=await db.select({number:sql<number>`coalesce(max(${procedureVersions.versionNumber}),0)::int`}).from(procedureVersions).where(eq(procedureVersions.procedureId,req.params.id));const fullDescription=String(req.body.fullDescription||'').trim();if(fullDescription.length<10)return res.status(400).json({error:'invalid_version',message:'Agrega una descripción completa.'});const [saved]=await db.insert(procedureVersions).values({procedureId:req.params.id,versionNumber:(latest?.number||0)+1,fullDescription,modality:req.body.modality||'mixta',difficulty:req.body.difficulty||'media',officialCostMin:req.body.officialCostMin||null,officialCostMax:req.body.officialCostMax||null,currency:'PEN',estimatedDurationMin:Number(req.body.estimatedDurationMin)||null,estimatedDurationMax:Number(req.body.estimatedDurationMax)||null,durationUnit:'business_day',officialUrl:String(req.body.officialUrl||'').trim()||null,dataClassification:String(req.body.dataClassification||'official_reference_demo'),verificationNotes:String(req.body.verificationNotes||'').trim()||null,status:'draft'}).returning();await writeAdminAudit(admin.user.id,'admin.procedure_version.created',{procedureId:req.params.id,versionId:saved.id,version:saved.versionNumber},req);res.status(201).json({data:saved});});
app.patch('/api/v1/admin/versions/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const fullDescription=String(req.body.fullDescription||'').trim();if(fullDescription.length<10)return res.status(400).json({error:'invalid_version',message:'Agrega una descripción completa.'});const status=['draft','reviewed','published','archived'].includes(req.body.status)?req.body.status:'draft';const [saved]=await getDrizzleDatabase().update(procedureVersions).set({fullDescription,modality:req.body.modality||'mixta',difficulty:req.body.difficulty||'media',officialCostMin:req.body.officialCostMin||null,officialCostMax:req.body.officialCostMax||null,estimatedDurationMin:Number(req.body.estimatedDurationMin)||null,estimatedDurationMax:Number(req.body.estimatedDurationMax)||null,officialUrl:String(req.body.officialUrl||'').trim()||null,dataClassification:String(req.body.dataClassification||'official_reference_demo'),verificationNotes:String(req.body.verificationNotes||'').trim()||null,status,publishedAt:status==='published'?new Date():null,updatedAt:new Date()}).where(eq(procedureVersions.id,req.params.id)).returning();if(!saved)return res.status(404).json({error:'version_not_found'});await writeAdminAudit(admin.user.id,'admin.procedure_version.updated',{versionId:saved.id,status:saved.status},req);res.json({data:saved});});

app.post('/api/v1/admin/versions/:versionId/requirements',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const name=String(req.body.name||'').trim();if(name.length<3)return res.status(400).json({error:'invalid_requirement',message:'Indica el nombre del requisito.'});const [saved]=await getDrizzleDatabase().insert(procedureRequirements).values({procedureVersionId:req.params.versionId,name,description:String(req.body.description||'').trim()||null,requirementType:req.body.requirementType||'document',allowedFileTypes:req.body.allowedFileTypes||['application/pdf','image/jpeg','image/png'],isRequired:req.body.isRequired!==false,isSensitive:Boolean(req.body.isSensitive),validationMethod:req.body.validationMethod||'manual'}).returning();await writeAdminAudit(admin.user.id,'admin.requirement.created',{id:saved.id,versionId:req.params.versionId},req);res.status(201).json({data:saved});});
app.patch('/api/v1/admin/requirements/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const name=String(req.body.name||'').trim();if(name.length<3)return res.status(400).json({error:'invalid_requirement',message:'Indica el nombre del requisito.'});const [saved]=await getDrizzleDatabase().update(procedureRequirements).set({name,description:String(req.body.description||'').trim()||null,requirementType:req.body.requirementType||'document',isRequired:req.body.isRequired!==false,isSensitive:Boolean(req.body.isSensitive),validationMethod:req.body.validationMethod||'manual',updatedAt:new Date()}).where(eq(procedureRequirements.id,req.params.id)).returning();if(!saved)return res.status(404).json({error:'requirement_not_found'});await writeAdminAudit(admin.user.id,'admin.requirement.updated',{id:saved.id},req);res.json({data:saved});});
app.delete('/api/v1/admin/requirements/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const [removed]=await getDrizzleDatabase().delete(procedureRequirements).where(eq(procedureRequirements.id,req.params.id)).returning({id:procedureRequirements.id});if(!removed)return res.status(404).json({error:'requirement_not_found'});await writeAdminAudit(admin.user.id,'admin.requirement.deleted',{id:removed.id},req);res.status(204).end();});
app.post('/api/v1/admin/versions/:versionId/steps',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const title=String(req.body.title||'').trim(),description=String(req.body.description||'').trim(),position=Number(req.body.position);if(title.length<3||description.length<5||!Number.isInteger(position)||position<1)return res.status(400).json({error:'invalid_step',message:'Completa título, descripción y posición.'});try{const tracking=adminStepTracking(req.body);const [saved]=await getDrizzleDatabase().insert(procedureSteps).values({procedureVersionId:req.params.versionId,title,description,position,...tracking,actionConfig:req.body.actionConfig&&typeof req.body.actionConfig==='object'?req.body.actionConfig:{},officialUrl:String(req.body.officialUrl||'').trim()||null,requiresUserPresence:Boolean(req.body.requiresUserPresence),canBeDelegated:req.body.canBeDelegated!==false,isPointOfNoReturn:Boolean(req.body.isPointOfNoReturn),isOptional:Boolean(req.body.isOptional),helpText:String(req.body.helpText||'').trim()||null}).returning();await writeAdminAudit(admin.user.id,'admin.step.created',{id:saved.id,versionId:req.params.versionId},req);res.status(201).json({data:saved});}catch(error:any){if(error?.code==='23505')return res.status(409).json({error:'position_exists',message:'Ya existe un paso en esa posición.'});throw error;}});
app.patch('/api/v1/admin/steps/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const title=String(req.body.title||'').trim(),description=String(req.body.description||'').trim(),position=Number(req.body.position);if(title.length<3||description.length<5||!Number.isInteger(position)||position<1)return res.status(400).json({error:'invalid_step',message:'Completa título, descripción y posición.'});try{const tracking=adminStepTracking(req.body);const [saved]=await getDrizzleDatabase().update(procedureSteps).set({title,description,position,...tracking,actionConfig:req.body.actionConfig&&typeof req.body.actionConfig==='object'?req.body.actionConfig:{},officialUrl:String(req.body.officialUrl||'').trim()||null,requiresUserPresence:Boolean(req.body.requiresUserPresence),canBeDelegated:req.body.canBeDelegated!==false,isPointOfNoReturn:Boolean(req.body.isPointOfNoReturn),isOptional:Boolean(req.body.isOptional),helpText:String(req.body.helpText||'').trim()||null,updatedAt:new Date()}).where(eq(procedureSteps.id,req.params.id)).returning();if(!saved)return res.status(404).json({error:'step_not_found'});await writeAdminAudit(admin.user.id,'admin.step.updated',{id:saved.id},req);res.json({data:saved});}catch(error:any){if(error?.code==='23505')return res.status(409).json({error:'position_exists',message:'Ya existe un paso en esa posición.'});throw error;}});
app.delete('/api/v1/admin/steps/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const [removed]=await getDrizzleDatabase().delete(procedureSteps).where(eq(procedureSteps.id,req.params.id)).returning({id:procedureSteps.id});if(!removed)return res.status(404).json({error:'step_not_found'});await writeAdminAudit(admin.user.id,'admin.step.deleted',{id:removed.id},req);res.status(204).end();});
app.post('/api/v1/admin/versions/:versionId/sources',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const title=String(req.body.title||'').trim(),url=String(req.body.url||'').trim();if(title.length<3||!/^https:\/\//i.test(url))return res.status(400).json({error:'invalid_source',message:'Completa el título y una URL HTTPS.'});const [saved]=await getDrizzleDatabase().insert(procedureSources).values({procedureVersionId:req.params.versionId,organizationId:String(req.body.organizationId||'')||null,title,url,lastCheckedAt:new Date(),isPrimary:Boolean(req.body.isPrimary),status:'active'}).returning();await writeAdminAudit(admin.user.id,'admin.source.created',{id:saved.id,versionId:req.params.versionId},req);res.status(201).json({data:saved});});
app.patch('/api/v1/admin/sources/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const title=String(req.body.title||'').trim(),url=String(req.body.url||'').trim();if(title.length<3||!/^https:\/\//i.test(url))return res.status(400).json({error:'invalid_source',message:'Completa el título y una URL HTTPS.'});const [saved]=await getDrizzleDatabase().update(procedureSources).set({organizationId:String(req.body.organizationId||'')||null,title,url,lastCheckedAt:new Date(),isPrimary:Boolean(req.body.isPrimary),status:'active'}).where(eq(procedureSources.id,req.params.id)).returning();if(!saved)return res.status(404).json({error:'source_not_found'});await writeAdminAudit(admin.user.id,'admin.source.updated',{id:saved.id},req);res.json({data:saved});});
app.delete('/api/v1/admin/sources/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const [removed]=await getDrizzleDatabase().delete(procedureSources).where(eq(procedureSources.id,req.params.id)).returning({id:procedureSources.id});if(!removed)return res.status(404).json({error:'source_not_found'});await writeAdminAudit(admin.user.id,'admin.source.deleted',{id:removed.id},req);res.status(204).end();});

app.get('/api/v1/admin/users',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase();const query=String(req.query.q||'').trim().toLowerCase(),status=String(req.query.status||'all'),role=String(req.query.role||'all');const conditions=[] as any[];if(query)conditions.push(sql`(lower(${users.username}) like ${`%${query}%`} or lower(${users.email}) like ${`%${query}%`} or lower(coalesce(${userProfiles.firstName},'')) like ${`%${query}%`} or lower(coalesce(${userProfiles.lastName},'')) like ${`%${query}%`})`);if(['pending','active','suspended','deleted'].includes(status))conditions.push(eq(users.status,status as any));const list=await db.select({id:users.id,username:users.username,email:users.email,phone:users.phone,status:users.status,emailVerifiedAt:users.emailVerifiedAt,lastLoginAt:users.lastLoginAt,createdAt:users.createdAt,firstName:userProfiles.firstName,lastName:userProfiles.lastName,identityVerificationStatus:userProfiles.identityVerificationStatus}).from(users).leftJoin(userProfiles,eq(userProfiles.userId,users.id)).where(conditions.length?and(...conditions):undefined).orderBy(desc(users.createdAt)).limit(250);const assignments=list.length?await db.select({userId:userRoles.userId,id:roles.id,code:roles.code,name:roles.name}).from(userRoles).innerJoin(roles,eq(userRoles.roleId,roles.id)).where(inArray(userRoles.userId,list.map(item=>item.id))):[];const roleMap=new Map<string,Array<{id:string;code:string;name:string}>>();for(const item of assignments)roleMap.set(item.userId,[...(roleMap.get(item.userId)||[]),{id:item.id,code:item.code,name:item.name}]);const availableRoles=await db.select().from(roles).orderBy(asc(roles.name));const enriched=list.map(item=>({...item,roles:roleMap.get(item.id)||[]})).filter(item=>role==='all'||item.roles.some(itemRole=>itemRole.code===role));res.json({users:enriched,roles:availableRoles,currentUserId:admin.user.id});});

app.get('/api/v1/admin/users/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase();const [account]=await db.select({id:users.id,username:users.username,email:users.email,phone:users.phone,status:users.status,emailVerifiedAt:users.emailVerifiedAt,lastLoginAt:users.lastLoginAt,createdAt:users.createdAt,updatedAt:users.updatedAt,firstName:userProfiles.firstName,lastName:userProfiles.lastName,birthDate:userProfiles.birthDate,gender:userProfiles.gender,address:userProfiles.address,department:userProfiles.department,province:userProfiles.province,district:userProfiles.district,documentLastFour:userProfiles.documentLastFour,identityVerificationStatus:userProfiles.identityVerificationStatus,identityVerifiedAt:userProfiles.identityVerifiedAt}).from(users).leftJoin(userProfiles,eq(userProfiles.userId,users.id)).where(eq(users.id,req.params.id)).limit(1);if(!account)return res.status(404).json({error:'user_not_found',message:'No encontramos esta cuenta.'});const [assignedRoles,caseStats,sessionStats]=await Promise.all([db.select({id:roles.id,code:roles.code,name:roles.name}).from(userRoles).innerJoin(roles,eq(userRoles.roleId,roles.id)).where(eq(userRoles.userId,account.id)),db.select({total:sql<number>`count(*)::int`,active:sql<number>`count(*) filter (where ${userProcedures.status} not in ('completed','cancelled','rejected'))::int`,completed:sql<number>`count(*) filter (where ${userProcedures.status}='completed')::int`}).from(userProcedures).where(eq(userProcedures.userId,account.id)),db.select({active:sql<number>`count(*) filter (where ${authSessions.expiresAt}>now())::int`}).from(authSessions).where(eq(authSessions.userId,account.id))]);res.json({user:{...account,roles:assignedRoles},stats:{procedures:caseStats[0],sessions:sessionStats[0]}});});

app.patch('/api/v1/admin/users/:id/status',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const status=String(req.body.status||'');if(!['active','suspended'].includes(status))return res.status(400).json({error:'invalid_status',message:'Selecciona un estado permitido.'});if(admin.user.id===req.params.id&&status!=='active')return res.status(409).json({error:'self_suspend_forbidden',message:'No puedes suspender tu propia cuenta administrativa.'});const db=getDrizzleDatabase();const [previous]=await db.select({status:users.status,email:users.email}).from(users).where(eq(users.id,req.params.id)).limit(1);if(!previous)return res.status(404).json({error:'user_not_found'});const [saved]=await db.update(users).set({status:status as any,updatedAt:new Date()}).where(eq(users.id,req.params.id)).returning({id:users.id,status:users.status});if(status==='suspended')await db.delete(authSessions).where(eq(authSessions.userId,req.params.id));await writeAdminAudit(admin.user.id,'admin.user.status_changed',{userId:saved.id,email:previous.email,from:previous.status,to:saved.status},req);res.json({data:saved});});

app.put('/api/v1/admin/users/:id/roles',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const requested=[...new Set((Array.isArray(req.body.roles)?req.body.roles:[]).map((value:unknown)=>String(value)))];const db=getDrizzleDatabase();const available=await db.select().from(roles);const valid=available.filter(item=>requested.includes(item.code));if(valid.length!==requested.length)return res.status(400).json({error:'invalid_roles',message:'Uno de los roles seleccionados no existe.'});const current=await getUserRoleCodes(req.params.id);if(admin.user.id===req.params.id&&current.includes('administrator')&&!requested.includes('administrator'))return res.status(409).json({error:'self_admin_removal_forbidden',message:'No puedes retirar tu propio acceso de administrador.'});const [target]=await db.select({id:users.id,email:users.email}).from(users).where(eq(users.id,req.params.id)).limit(1);if(!target)return res.status(404).json({error:'user_not_found'});await db.transaction(async tx=>{await tx.delete(userRoles).where(eq(userRoles.userId,target.id));if(valid.length)await tx.insert(userRoles).values(valid.map(item=>({userId:target.id,roleId:item.id})));});await writeAdminAudit(admin.user.id,'admin.user.roles_changed',{userId:target.id,email:target.email,from:current,to:requested},req);res.json({data:{userId:target.id,roles:valid.map(item=>item.code)}});});

app.get('/api/v1/admin/contact-messages',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase(),query=String(req.query.q||'').trim().toLowerCase(),status=String(req.query.status||'all'),topic=String(req.query.topic||'all');const conditions=[] as any[];if(query)conditions.push(sql`(lower(${contactMessages.name}) like ${`%${query}%`} or lower(${contactMessages.email}) like ${`%${query}%`} or lower(${contactMessages.message}) like ${`%${query}%`})`);if(status!=='all')conditions.push(eq(contactMessages.status,status));if(topic!=='all')conditions.push(eq(contactMessages.topic,topic));const list=await db.select({id:contactMessages.id,name:contactMessages.name,email:contactMessages.email,phone:contactMessages.phone,topic:contactMessages.topic,message:contactMessages.message,status:contactMessages.status,deliveryProvider:contactMessages.deliveryProvider,deliveredAt:contactMessages.deliveredAt,assignedToUserId:contactMessages.assignedToUserId,assigneeUsername:users.username,createdAt:contactMessages.createdAt,updatedAt:contactMessages.updatedAt}).from(contactMessages).leftJoin(users,eq(contactMessages.assignedToUserId,users.id)).where(conditions.length?and(...conditions):undefined).orderBy(desc(contactMessages.createdAt)).limit(300);const [summary,topics,staff]=await Promise.all([db.select({total:sql<number>`count(*)::int`,open:sql<number>`count(*) filter (where ${contactMessages.status} in ('received','delivered','queued','delivery_failed','in_progress'))::int`,closed:sql<number>`count(*) filter (where ${contactMessages.status}='closed')::int`,failed:sql<number>`count(*) filter (where ${contactMessages.status}='delivery_failed')::int`}).from(contactMessages),db.select({topic:contactMessages.topic,count:sql<number>`count(*)::int`}).from(contactMessages).groupBy(contactMessages.topic).orderBy(asc(contactMessages.topic)),db.selectDistinct({id:users.id,username:users.username,email:users.email}).from(users).innerJoin(userRoles,eq(userRoles.userId,users.id)).innerJoin(roles,eq(userRoles.roleId,roles.id)).where(and(eq(users.status,'active'),inArray(roles.code,['administrator','support']))).orderBy(asc(users.username))]);res.json({messages:list,summary:summary[0],topics,staff,currentUserId:admin.user.id});});

app.get('/api/v1/admin/contact-messages/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase();const [message]=await db.select({id:contactMessages.id,userId:contactMessages.userId,name:contactMessages.name,email:contactMessages.email,phone:contactMessages.phone,topic:contactMessages.topic,message:contactMessages.message,status:contactMessages.status,deliveryProvider:contactMessages.deliveryProvider,deliveryMessageId:contactMessages.deliveryMessageId,deliveredAt:contactMessages.deliveredAt,failureReason:contactMessages.failureReason,assignedToUserId:contactMessages.assignedToUserId,assigneeUsername:users.username,handledAt:contactMessages.handledAt,ipHash:contactMessages.ipHash,userAgent:contactMessages.userAgent,sourcePath:contactMessages.sourcePath,metadata:contactMessages.metadata,createdAt:contactMessages.createdAt,updatedAt:contactMessages.updatedAt}).from(contactMessages).leftJoin(users,eq(contactMessages.assignedToUserId,users.id)).where(eq(contactMessages.id,req.params.id)).limit(1);if(!message)return res.status(404).json({error:'contact_message_not_found',message:'No encontramos esta consulta.'});const notes=await db.select({id:contactMessageNotes.id,note:contactMessageNotes.note,createdAt:contactMessageNotes.createdAt,authorUserId:contactMessageNotes.authorUserId,authorUsername:users.username}).from(contactMessageNotes).leftJoin(users,eq(contactMessageNotes.authorUserId,users.id)).where(eq(contactMessageNotes.contactMessageId,message.id)).orderBy(desc(contactMessageNotes.createdAt));res.json({message,notes});});

app.patch('/api/v1/admin/contact-messages/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const allowed=['received','in_progress','responded','closed'];const status=String(req.body.status||'');if(!allowed.includes(status))return res.status(400).json({error:'invalid_contact_status',message:'Selecciona un estado de atención válido.'});const assignedToUserId=String(req.body.assignedToUserId||'')||null;const db=getDrizzleDatabase();if(assignedToUserId){const [staff]=await db.select({id:users.id}).from(users).innerJoin(userRoles,eq(userRoles.userId,users.id)).innerJoin(roles,eq(userRoles.roleId,roles.id)).where(and(eq(users.id,assignedToUserId),inArray(roles.code,['administrator','support']))).limit(1);if(!staff)return res.status(400).json({error:'invalid_assignee',message:'Selecciona un responsable con permisos de soporte.'});}const [previous]=await db.select({status:contactMessages.status,assignedToUserId:contactMessages.assignedToUserId}).from(contactMessages).where(eq(contactMessages.id,req.params.id)).limit(1);if(!previous)return res.status(404).json({error:'contact_message_not_found'});const [saved]=await db.update(contactMessages).set({status,assignedToUserId,handledAt:['responded','closed'].includes(status)?new Date():null,updatedAt:new Date()}).where(eq(contactMessages.id,req.params.id)).returning();await writeAdminAudit(admin.user.id,'admin.contact.updated',{messageId:saved.id,fromStatus:previous.status,toStatus:status,fromAssignee:previous.assignedToUserId,toAssignee:assignedToUserId},req);res.json({data:saved});});

app.post('/api/v1/admin/contact-messages/:id/notes',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const note=String(req.body.note||'').trim();if(note.length<3||note.length>3000)return res.status(400).json({error:'invalid_note',message:'La nota debe tener entre 3 y 3000 caracteres.'});const db=getDrizzleDatabase();const [exists]=await db.select({id:contactMessages.id}).from(contactMessages).where(eq(contactMessages.id,req.params.id)).limit(1);if(!exists)return res.status(404).json({error:'contact_message_not_found'});const [saved]=await db.insert(contactMessageNotes).values({contactMessageId:exists.id,authorUserId:admin.user.id,note}).returning();await writeAdminAudit(admin.user.id,'admin.contact.note_created',{messageId:exists.id,noteId:saved.id},req);res.status(201).json({data:saved});});

app.get('/api/v1/admin/operations',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase(),query=String(req.query.q||'').trim().toLowerCase(),status=String(req.query.status||'all'),mode=String(req.query.mode||'all'),procedureId=String(req.query.procedureId||'all');const conditions=[] as any[];if(query)conditions.push(sql`(lower(${userProcedures.trackingCode}) like ${`%${query}%`} or lower(${users.email}) like ${`%${query}%`} or lower(${users.username}) like ${`%${query}%`} or lower(${procedures.title}) like ${`%${query}%`})`);if(status!=='all')conditions.push(eq(userProcedures.status,status as any));if(mode!=='all')conditions.push(eq(userProcedures.mode,mode as any));if(procedureId!=='all')conditions.push(eq(userProcedures.procedureId,procedureId));const cases=await db.select({id:userProcedures.id,trackingCode:userProcedures.trackingCode,status:userProcedures.status,mode:userProcedures.mode,progressPercentage:userProcedures.progressPercentage,startedAt:userProcedures.startedAt,expectedCompletionAt:userProcedures.expectedCompletionAt,nonReturnReachedAt:userProcedures.nonReturnReachedAt,updatedAt:userProcedures.updatedAt,userId:users.id,username:users.username,email:users.email,procedureId:procedures.id,procedureTitle:procedures.title,currentStepTitle:procedureSteps.title}).from(userProcedures).innerJoin(users,eq(userProcedures.userId,users.id)).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).leftJoin(procedureSteps,eq(userProcedures.currentStepId,procedureSteps.id)).where(conditions.length?and(...conditions):undefined).orderBy(desc(userProcedures.updatedAt)).limit(300);const [summary,procedureList]=await Promise.all([db.select({total:sql<number>`count(*)::int`,active:sql<number>`count(*) filter (where ${userProcedures.status} not in ('completed','cancelled','rejected'))::int`,paused:sql<number>`count(*) filter (where ${userProcedures.status}='paused')::int`,overdue:sql<number>`count(*) filter (where ${userProcedures.expectedCompletionAt}<now() and ${userProcedures.status} not in ('completed','cancelled','rejected'))::int`,completed:sql<number>`count(*) filter (where ${userProcedures.status}='completed')::int`}).from(userProcedures),db.select({id:procedures.id,title:procedures.title}).from(procedures).orderBy(asc(procedures.title))]);res.json({cases,summary:summary[0],procedures:procedureList});});

app.get('/api/v1/admin/operations/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase();const [caseItem]=await db.select({id:userProcedures.id,trackingCode:userProcedures.trackingCode,status:userProcedures.status,mode:userProcedures.mode,progressPercentage:userProcedures.progressPercentage,startedAt:userProcedures.startedAt,expectedCompletionAt:userProcedures.expectedCompletionAt,completedAt:userProcedures.completedAt,cancelledAt:userProcedures.cancelledAt,cancellationReason:userProcedures.cancellationReason,nonReturnReachedAt:userProcedures.nonReturnReachedAt,createdAt:userProcedures.createdAt,updatedAt:userProcedures.updatedAt,userId:users.id,username:users.username,email:users.email,phone:users.phone,procedureId:procedures.id,procedureTitle:procedures.title,procedureSlug:procedures.slug,versionNumber:procedureVersions.versionNumber,currentStepId:userProcedures.currentStepId}).from(userProcedures).innerJoin(users,eq(userProcedures.userId,users.id)).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).innerJoin(procedureVersions,eq(userProcedures.procedureVersionId,procedureVersions.id)).where(eq(userProcedures.id,req.params.id)).limit(1);if(!caseItem)return res.status(404).json({error:'operation_not_found',message:'No encontramos esta gestión.'});const [steps,requirements,documents,history,payments,delegation]=await Promise.all([db.select({id:userProcedureSteps.id,status:userProcedureSteps.status,startedAt:userProcedureSteps.startedAt,completedAt:userProcedureSteps.completedAt,dueAt:userProcedureSteps.dueAt,notes:userProcedureSteps.notes,position:procedureSteps.position,title:procedureSteps.title,description:procedureSteps.description,isPointOfNoReturn:procedureSteps.isPointOfNoReturn}).from(userProcedureSteps).innerJoin(procedureSteps,eq(userProcedureSteps.procedureStepId,procedureSteps.id)).where(eq(userProcedureSteps.userProcedureId,caseItem.id)).orderBy(asc(procedureSteps.position)),db.select({id:userProcedureRequirements.id,status:userProcedureRequirements.status,approvedAt:userProcedureRequirements.approvedAt,expiresAt:userProcedureRequirements.expiresAt,name:procedureRequirements.name,isRequired:procedureRequirements.isRequired,isSensitive:procedureRequirements.isSensitive}).from(userProcedureRequirements).innerJoin(procedureRequirements,eq(userProcedureRequirements.requirementId,procedureRequirements.id)).where(eq(userProcedureRequirements.userProcedureId,caseItem.id)).orderBy(asc(procedureRequirements.name)),db.select({id:uploadedDocuments.id,originalFileName:uploadedDocuments.originalFileName,mimeType:uploadedDocuments.mimeType,sizeBytes:uploadedDocuments.sizeBytes,status:uploadedDocuments.status,createdAt:uploadedDocuments.createdAt,deletedAt:uploadedDocuments.deletedAt}).from(uploadedDocuments).where(eq(uploadedDocuments.userProcedureId,caseItem.id)).orderBy(desc(uploadedDocuments.createdAt)),db.select({id:procedureStatusHistory.id,previousStatus:procedureStatusHistory.previousStatus,newStatus:procedureStatusHistory.newStatus,reason:procedureStatusHistory.reason,metadata:procedureStatusHistory.metadata,createdAt:procedureStatusHistory.createdAt,changedBy:procedureStatusHistory.changedBy}).from(procedureStatusHistory).where(eq(procedureStatusHistory.userProcedureId,caseItem.id)).orderBy(desc(procedureStatusHistory.createdAt)),db.select({id:paymentOrders.id,type:paymentOrders.type,amountMinor:paymentOrders.amountMinor,currency:paymentOrders.currency,status:paymentOrders.status,provider:paymentOrders.provider,paidAt:paymentOrders.paidAt,createdAt:paymentOrders.createdAt}).from(paymentOrders).where(eq(paymentOrders.userProcedureId,caseItem.id)).orderBy(desc(paymentOrders.createdAt)),db.select({id:delegationRequests.id,status:delegationRequests.status,quotedAmountMinor:delegationRequests.quotedAmountMinor,currency:delegationRequests.currency,requestedAdvisorId:delegationRequests.requestedAdvisorId}).from(delegationRequests).where(eq(delegationRequests.userProcedureId,caseItem.id)).limit(1)]);res.json({case:caseItem,steps,requirements,documents,history,payments,delegation:delegation[0]||null,guards:{hasPaidPayment:payments.some(item=>['paid','authorized','partially_refunded'].includes(item.status)),hasReachedPointOfNoReturn:Boolean(caseItem.nonReturnReachedAt)||steps.some(item=>item.isPointOfNoReturn&&item.status==='completed')}});});

app.patch('/api/v1/admin/operations/:id/status',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const action=String(req.body.action||''),reason=String(req.body.reason||'').trim();if(!['pause','resume','cancel'].includes(action))return res.status(400).json({error:'invalid_operation_action',message:'Selecciona una acción válida.'});if(reason.length<8||reason.length>1000)return res.status(400).json({error:'reason_required',message:'Indica un motivo de al menos 8 caracteres.'});const db=getDrizzleDatabase();const [current]=await db.select().from(userProcedures).where(eq(userProcedures.id,req.params.id)).limit(1);if(!current)return res.status(404).json({error:'operation_not_found'});if(['completed','cancelled','rejected'].includes(current.status))return res.status(409).json({error:'terminal_operation',message:'Esta gestión ya se encuentra en un estado final.'});let nextStatus:any;if(action==='pause'){if(current.status==='paused')return res.status(409).json({error:'already_paused',message:'La gestión ya está pausada.'});nextStatus='paused'}else if(action==='resume'){if(current.status!=='paused')return res.status(409).json({error:'not_paused',message:'Solo puedes reactivar una gestión pausada.'});nextStatus=current.progressPercentage>0?'in_progress':'active'}else{const [paid]=await db.select({count:sql<number>`count(*)::int`}).from(paymentOrders).where(and(eq(paymentOrders.userProcedureId,current.id),inArray(paymentOrders.status,['paid','authorized','partially_refunded'])));const protectedCase=Boolean(current.nonReturnReachedAt)||(paid?.count||0)>0;if(protectedCase&&!req.body.acknowledgeNoRefund)return res.status(409).json({error:'cancellation_acknowledgement_required',message:'Esta gestión tiene un pago o alcanzó un punto de no retorno. Confirma que la cancelación puede no generar devolución.',requiresAcknowledgement:true});nextStatus='cancelled'}const now=new Date();const [saved]=await db.update(userProcedures).set({status:nextStatus,cancelledAt:nextStatus==='cancelled'?now:null,cancellationReason:nextStatus==='cancelled'?reason:null,updatedAt:now}).where(eq(userProcedures.id,current.id)).returning();await db.insert(procedureStatusHistory).values({userProcedureId:current.id,changedBy:admin.user.id,previousStatus:current.status,newStatus:nextStatus,reason,metadata:{source:'admin',action}});await writeAdminAudit(admin.user.id,'admin.operation.status_changed',{userProcedureId:current.id,trackingCode:current.trackingCode,from:current.status,to:nextStatus,reason},req);res.json({data:saved});});

app.get('/api/v1/admin/advisors',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase(),query=String(req.query.q||'').trim().toLowerCase(),availability=String(req.query.availability||'all'),verification=String(req.query.verification||'all');const conditions=[] as any[];if(query)conditions.push(sql`(lower(${advisorProfiles.publicName}) like ${`%${query}%`} or lower(${users.email}) like ${`%${query}%`} or lower(${users.username}) like ${`%${query}%`})`);if(availability!=='all')conditions.push(eq(advisorProfiles.availabilityStatus,availability));if(verification!=='all')conditions.push(eq(advisorProfiles.verificationStatus,verification));const advisors=await db.select({userId:advisorProfiles.userId,publicName:advisorProfiles.publicName,bio:advisorProfiles.bio,licenseNumber:advisorProfiles.licenseNumber,verificationStatus:advisorProfiles.verificationStatus,availabilityStatus:advisorProfiles.availabilityStatus,averageRating:advisorProfiles.averageRating,completedCasesCount:advisorProfiles.completedCasesCount,cancelledCasesCount:advisorProfiles.cancelledCasesCount,activeCasesCount:advisorProfiles.activeCasesCount,maxActiveCases:advisorProfiles.maxActiveCases,baseFeeMinor:advisorProfiles.baseFeeMinor,currency:advisorProfiles.currency,username:users.username,email:users.email,phone:users.phone,avatarStored:userProfiles.avatarUrl}).from(advisorProfiles).innerJoin(users,eq(advisorProfiles.userId,users.id)).leftJoin(userProfiles,eq(userProfiles.userId,users.id)).where(conditions.length?and(...conditions):undefined).orderBy(asc(advisorProfiles.publicName));const expertise=advisors.length?await db.select({advisorId:advisorExpertise.advisorId,expertiseId:expertiseAreas.id,name:expertiseAreas.name,level:advisorExpertise.level,yearsExperience:advisorExpertise.yearsExperience,isVerified:advisorExpertise.isVerified}).from(advisorExpertise).innerJoin(expertiseAreas,eq(advisorExpertise.expertiseId,expertiseAreas.id)).where(inArray(advisorExpertise.advisorId,advisors.map(item=>item.userId))):[];const map=new Map<string,any[]>();for(const item of expertise)map.set(item.advisorId,[...(map.get(item.advisorId)||[]),item]);const [areas,candidates]=await Promise.all([db.select().from(expertiseAreas).orderBy(asc(expertiseAreas.name)),db.selectDistinct({id:users.id,username:users.username,email:users.email,firstName:userProfiles.firstName,lastName:userProfiles.lastName}).from(users).leftJoin(userProfiles,eq(userProfiles.userId,users.id)).leftJoin(advisorProfiles,eq(advisorProfiles.userId,users.id)).where(and(eq(users.status,'active'),sql`${advisorProfiles.userId} is null`)).orderBy(asc(users.username)).limit(250)]);res.json({advisors:advisors.map(item=>({...item,avatarUrl:resolveAvatarUrl(item.avatarStored,item.userId),expertise:map.get(item.userId)||[]})),areas,candidates});});

app.post('/api/v1/admin/advisors',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const userId=String(req.body.userId||''),publicName=String(req.body.publicName||'').trim(),bio=String(req.body.bio||'').trim();if(!userId||publicName.length<3||bio.length<10)return res.status(400).json({error:'invalid_advisor',message:'Selecciona una cuenta y completa el nombre y la presentación.'});const db=getDrizzleDatabase();const [advisorRole]=await db.select().from(roles).where(eq(roles.code,'advisor')).limit(1);try{const [saved]=await db.insert(advisorProfiles).values({userId,publicName,bio,licenseNumber:String(req.body.licenseNumber||'').trim()||null,verificationStatus:String(req.body.verificationStatus||'pending'),availabilityStatus:String(req.body.availabilityStatus||'offline'),maxActiveCases:Math.max(1,Number(req.body.maxActiveCases)||10),baseFeeMinor:Math.max(0,Math.round(Number(req.body.baseFee||0)*100))}).returning();if(advisorRole)await db.insert(userRoles).values({userId,roleId:advisorRole.id}).onConflictDoNothing();await writeAdminAudit(admin.user.id,'admin.advisor.created',{userId,publicName},req);res.status(201).json({data:saved});}catch(error:any){if(error?.code==='23505')return res.status(409).json({error:'advisor_exists',message:'Esta cuenta ya tiene un perfil de asesor.'});throw error;}});

app.patch('/api/v1/admin/advisors/:id',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const publicName=String(req.body.publicName||'').trim(),bio=String(req.body.bio||'').trim(),availability=String(req.body.availabilityStatus||'offline'),verification=String(req.body.verificationStatus||'pending');if(publicName.length<3||bio.length<10||!['available','busy','offline'].includes(availability)||!['pending','verified','rejected'].includes(verification))return res.status(400).json({error:'invalid_advisor',message:'Revisa los datos y estados del asesor.'});const [saved]=await getDrizzleDatabase().update(advisorProfiles).set({publicName,bio,licenseNumber:String(req.body.licenseNumber||'').trim()||null,verificationStatus:verification,availabilityStatus:availability,maxActiveCases:Math.max(1,Number(req.body.maxActiveCases)||10),baseFeeMinor:Math.max(0,Math.round(Number(req.body.baseFee||0)*100)),updatedAt:new Date()}).where(eq(advisorProfiles.userId,req.params.id)).returning();if(!saved)return res.status(404).json({error:'advisor_not_found'});await writeAdminAudit(admin.user.id,'admin.advisor.updated',{userId:saved.userId,publicName:saved.publicName},req);res.json({data:saved});});

app.put('/api/v1/admin/advisors/:id/expertise',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const items=Array.isArray(req.body.items)?req.body.items:[];const db=getDrizzleDatabase(),areas=await db.select({id:expertiseAreas.id}).from(expertiseAreas),validIds=new Set(areas.map(item=>item.id));if(items.some((item:any)=>!validIds.has(String(item.expertiseId))))return res.status(400).json({error:'invalid_expertise'});await db.transaction(async tx=>{await tx.delete(advisorExpertise).where(eq(advisorExpertise.advisorId,req.params.id));if(items.length)await tx.insert(advisorExpertise).values(items.map((item:any)=>({advisorId:req.params.id,expertiseId:String(item.expertiseId),level:String(item.level||'specialist'),yearsExperience:Number(item.yearsExperience)||null,isVerified:Boolean(item.isVerified)})));});await writeAdminAudit(admin.user.id,'admin.advisor.expertise_changed',{advisorId:req.params.id,count:items.length},req);res.json({data:{advisorId:req.params.id,count:items.length}});});

app.get('/api/v1/admin/delegations',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const db=getDrizzleDatabase(),status=String(req.query.status||'all'),query=String(req.query.q||'').trim().toLowerCase();const conditions=[] as any[];if(status!=='all')conditions.push(eq(delegationRequests.status,status as any));if(query)conditions.push(sql`(lower(${userProcedures.trackingCode}) like ${`%${query}%`} or lower(${users.email}) like ${`%${query}%`} or lower(${procedures.title}) like ${`%${query}%`})`);const requests=await db.select({id:delegationRequests.id,status:delegationRequests.status,quotedAmountMinor:delegationRequests.quotedAmountMinor,currency:delegationRequests.currency,requestedAt:delegationRequests.requestedAt,expiresAt:delegationRequests.expiresAt,userProcedureId:userProcedures.id,trackingCode:userProcedures.trackingCode,procedureTitle:procedures.title,username:users.username,email:users.email,requestedAdvisorId:delegationRequests.requestedAdvisorId,requestedAdvisorName:advisorProfiles.publicName,paymentStatus:sql<string>`coalesce((select po.status::text from payment_orders po where po.delegation_request_id=${delegationRequests.id} order by po.created_at desc limit 1),'sin_pago')`}).from(delegationRequests).innerJoin(userProcedures,eq(delegationRequests.userProcedureId,userProcedures.id)).innerJoin(procedures,eq(userProcedures.procedureId,procedures.id)).innerJoin(users,eq(userProcedures.userId,users.id)).leftJoin(advisorProfiles,eq(delegationRequests.requestedAdvisorId,advisorProfiles.userId)).where(conditions.length?and(...conditions):undefined).orderBy(desc(delegationRequests.requestedAt));const assignments=requests.length?await db.select({id:advisorAssignments.id,delegationRequestId:advisorAssignments.delegationRequestId,advisorId:advisorAssignments.advisorId,advisorName:advisorProfiles.publicName,status:advisorAssignments.status,assignedAt:advisorAssignments.assignedAt,endedAt:advisorAssignments.endedAt,endReason:advisorAssignments.endReason}).from(advisorAssignments).innerJoin(advisorProfiles,eq(advisorAssignments.advisorId,advisorProfiles.userId)).where(inArray(advisorAssignments.delegationRequestId,requests.map(item=>item.id))).orderBy(desc(advisorAssignments.assignedAt)):[];const advisors=await db.select({userId:advisorProfiles.userId,publicName:advisorProfiles.publicName,verificationStatus:advisorProfiles.verificationStatus,availabilityStatus:advisorProfiles.availabilityStatus,activeCasesCount:advisorProfiles.activeCasesCount,maxActiveCases:advisorProfiles.maxActiveCases,averageRating:advisorProfiles.averageRating}).from(advisorProfiles).orderBy(asc(advisorProfiles.publicName));res.json({requests:requests.map(item=>({...item,assignments:assignments.filter(a=>a.delegationRequestId===item.id)})),advisors});});

app.post('/api/v1/admin/delegations/:id/assign',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const advisorId=String(req.body.advisorId||''),reason=String(req.body.reason||'').trim();if(!advisorId||reason.length<8)return res.status(400).json({error:'assignment_reason_required',message:'Selecciona un asesor e indica el motivo de la asignación.'});const db=getDrizzleDatabase();const [request]=await db.select().from(delegationRequests).where(eq(delegationRequests.id,req.params.id)).limit(1);if(!request)return res.status(404).json({error:'delegation_not_found'});if(['completed','cancelled','rejected','expired'].includes(request.status))return res.status(409).json({error:'terminal_delegation'});const [advisor]=await db.select().from(advisorProfiles).where(eq(advisorProfiles.userId,advisorId)).limit(1);if(!advisor||advisor.verificationStatus!=='verified'||advisor.availabilityStatus==='offline'||advisor.activeCasesCount>=advisor.maxActiveCases)return res.status(409).json({error:'advisor_unavailable',message:'El asesor debe estar verificado, disponible y dentro de su capacidad.'});const [paid]=await db.select({count:sql<number>`count(*)::int`}).from(paymentOrders).where(and(eq(paymentOrders.delegationRequestId,request.id),inArray(paymentOrders.status,['authorized','paid'])));if(request.status!=='paid'&&(paid?.count||0)===0)return res.status(409).json({error:'payment_required',message:'La delegación debe estar pagada o autorizada antes de asignarla.'});const current=await db.select().from(advisorAssignments).where(and(eq(advisorAssignments.delegationRequestId,request.id),inArray(advisorAssignments.status,['reserved','active'])));const now=new Date();await db.transaction(async tx=>{for(const item of current){await tx.update(advisorAssignments).set({status:'reassigned',endedAt:now,endReason:reason}).where(eq(advisorAssignments.id,item.id));await tx.update(advisorProfiles).set({activeCasesCount:sql`greatest(${advisorProfiles.activeCasesCount}-1,0)`,updatedAt:now}).where(eq(advisorProfiles.userId,item.advisorId));}await tx.insert(advisorAssignments).values({delegationRequestId:request.id,advisorId,status:'active'});await tx.update(advisorProfiles).set({activeCasesCount:sql`${advisorProfiles.activeCasesCount}+1`,updatedAt:now}).where(eq(advisorProfiles.userId,advisorId));await tx.update(delegationRequests).set({requestedAdvisorId:advisorId,status:'assigned',acceptedAt:now,updatedAt:now}).where(eq(delegationRequests.id,request.id));await tx.update(userProcedures).set({mode:'delegated',status:'delegated',updatedAt:now}).where(eq(userProcedures.id,request.userProcedureId));});await writeAdminAudit(admin.user.id,current.length?'admin.delegation.reassigned':'admin.delegation.assigned',{delegationId:request.id,userProcedureId:request.userProcedureId,advisorId,previousAdvisors:current.map(item=>item.advisorId),reason},req);res.status(201).json({assigned:true});});

app.patch('/api/v1/admin/delegations/:id/status',async(req,res)=>{const admin=await requireAdministrator(req,res);if(!admin)return;const status=String(req.body.status||''),reason=String(req.body.reason||'').trim();if(!['cancelled','rejected','expired'].includes(status)||reason.length<8)return res.status(400).json({error:'invalid_delegation_status',message:'Selecciona un estado final e indica el motivo.'});const db=getDrizzleDatabase();const [request]=await db.select().from(delegationRequests).where(eq(delegationRequests.id,req.params.id)).limit(1);if(!request)return res.status(404).json({error:'delegation_not_found'});const current=await db.select().from(advisorAssignments).where(and(eq(advisorAssignments.delegationRequestId,request.id),inArray(advisorAssignments.status,['reserved','active'])));const now=new Date();await db.transaction(async tx=>{for(const item of current){await tx.update(advisorAssignments).set({status:'cancelled',endedAt:now,endReason:reason}).where(eq(advisorAssignments.id,item.id));await tx.update(advisorProfiles).set({activeCasesCount:sql`greatest(${advisorProfiles.activeCasesCount}-1,0)`,updatedAt:now}).where(eq(advisorProfiles.userId,item.advisorId));}await tx.update(delegationRequests).set({status:status as any,rejectedAt:status==='rejected'?now:null,updatedAt:now}).where(eq(delegationRequests.id,request.id));await tx.update(userProcedures).set({mode:'self_service',status:status==='cancelled'?'cancelled':'active',cancellationReason:status==='cancelled'?reason:null,cancelledAt:status==='cancelled'?now:null,updatedAt:now}).where(eq(userProcedures.id,request.userProcedureId));});await writeAdminAudit(admin.user.id,`admin.delegation.${status}`,{delegationId:request.id,reason},req);res.json({updated:true,status});});

type EnvironmentCheck = { configured: boolean; valid: boolean; required: boolean; category: 'core'|'email'|'identity'; message?: string };
const hasPlaceholder = (value:string) => /change_me|my_app_url|your_|example|placeholder/i.test(value);
const isHttpUrl = (value:string) => { try { return ['http:','https:'].includes(new URL(value).protocol); } catch { return false; } };
const isPostgresUrl = (value:string) => { try { return ['postgres:','postgresql:'].includes(new URL(value).protocol); } catch { return false; } };
const environmentHealth = () => {
  const value=(name:string)=>process.env[name]?.trim()||'';
  const check=(name:string,category:EnvironmentCheck['category'],required:boolean,validator:(input:string)=>boolean,message:string):[string,EnvironmentCheck]=>{const current=value(name),configured=Boolean(current);return[name,{configured,valid:configured&&validator(current)&&!hasPlaceholder(current),required,category,...((!configured||!validator(current)||hasPlaceholder(current))?{message}:{} )}]};
  const entries=[
    check('DATABASE_URL','core',true,isPostgresUrl,'Debe contener una URL válida de PostgreSQL.'),
    check('APP_URL','core',true,isHttpUrl,'Debe contener la URL HTTP o HTTPS pública de TramIA.'),
    check('SESSION_SECRET','core',true,input=>input.length>=32,'Debe tener al menos 32 caracteres aleatorios.'),
    check('DATA_ENCRYPTION_KEY','core',true,input=>input.length>=32,'Debe tener al menos 32 caracteres aleatorios y ser diferente de SESSION_SECRET.'),
    check('SMTP_HOST','email',false,input=>input.length>=3,'Configura el servidor SMTP.'),
    check('SMTP_PORT','email',false,input=>Number.isInteger(Number(input))&&Number(input)>0&&Number(input)<=65535,'Debe ser un puerto válido.'),
    check('SMTP_SECURE','email',false,input=>['true','false'].includes(input.toLowerCase()),'Usa true o false.'),
    check('SMTP_USER','email',false,input=>/^\S+@\S+\.\S+$/.test(input),'Debe ser un correo válido.'),
    check('SMTP_APP_PASSWORD','email',false,input=>input.replace(/\s/g,'').length>=8,'Configura la contraseña de aplicación SMTP.'),
    check('MAIL_FROM','email',false,input=>input.includes('@'),'Debe contener una dirección de envío válida.'),
    check('SUPPORT_EMAIL','email',false,input=>/^\S+@\S+\.\S+$/.test(input),'Debe ser un correo válido.'),
    check('PERUDEVS_API_KEY','identity',false,input=>input.length>=24,'Configura un token válido de PeruDevs.'),
    check('PERUDEVS_BASE_URL','identity',false,isHttpUrl,'Debe contener una URL HTTP o HTTPS válida.'),
  ];
  const variables=Object.fromEntries(entries) as Record<string,EnvironmentCheck>;
  if(variables.DATA_ENCRYPTION_KEY.configured&&value('DATA_ENCRYPTION_KEY')===value('SESSION_SECRET'))variables.DATA_ENCRYPTION_KEY={...variables.DATA_ENCRYPTION_KEY,valid:false,message:'Debe ser diferente de SESSION_SECRET.'};
  const list=Object.values(variables),mode=process.env.NODE_ENV||'development',developmentFallbacks=new Set(['SESSION_SECRET','DATA_ENCRYPTION_KEY']),coreReady=Object.entries(variables).filter(([,item])=>item.category==='core').every(([name,item])=>item.valid||(mode!=='production'&&developmentFallbacks.has(name))),feature=(category:EnvironmentCheck['category'])=>{const items=list.filter(item=>item.category===category),configured=items.filter(item=>item.configured).length;return{status:items.every(item=>item.valid)?'ready':configured===0?'disabled':'incomplete',configured,required:items.length}};
  return{mode,variables,summary:{total:list.length,configured:list.filter(item=>item.configured).length,valid:list.filter(item=>item.valid).length,missing:list.filter(item=>!item.configured).length,invalid:list.filter(item=>item.configured&&!item.valid).length},coreReady,features:{email:feature('email'),identityVerification:feature('identity'),documentStorage:{status:(process.env.NETLIFY||process.env.NETLIFY_BLOBS_CONTEXT)?'netlify_blobs':'local_memory'}}};
};

app.get('/api/health', async (_req, res) => {
  const checkedAt=new Date(),database=await checkDatabaseConnection(),environment=environmentHealth();
  const databaseReady=database.configured&&database.connected,ready=databaseReady&&environment.coreReady;
  const optionalDegraded=environment.summary.missing>0||environment.summary.invalid>0||environment.features.email.status!=='ready'||environment.features.identityVerification.status!=='ready';
  const status=ready?(optionalDegraded?'degraded':'ok'):'error';
  res.status(ready?200:503).json({status,service:'tramia-api',version:process.env.npm_package_version||'0.6.0',checkedAt:checkedAt.toISOString(),uptimeSeconds:Math.round(process.uptime()),ready,database,environment});
});

const contactAttempts = new Map<string, number[]>();
app.post('/api/v1/contact', async (req, res) => {
  const normalizeContactText=(value:unknown)=>{const source=String(value||'');const repaired=/(Ã|Â|â)/.test(source)?Buffer.from(source,'latin1').toString('utf8'):source;return repaired.normalize('NFC').trim()};
  const name=normalizeContactText(req.body.name), email=normalizeContactText(req.body.email).toLowerCase(), phone=normalizeContactText(req.body.phone), topic=normalizeContactText(req.body.topic||'consulta'), message=normalizeContactText(req.body.message), sourcePath=normalizeContactText(req.body.sourcePath||'/contacto').slice(0,500);
  if(name.length<2||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||message.length<10||message.length>2000) return res.status(400).json({error:'invalid_contact_form',message:'Revisa el nombre, correo y mensaje.'});
  const key=req.ip||'unknown', now=Date.now(), recent=(contactAttempts.get(key)||[]).filter(time=>now-time<60*60*1000); if(recent.length>=5) return res.status(429).json({error:'rate_limited',message:'Alcanzaste el límite temporal de mensajes. Inténtalo más tarde.'}); contactAttempts.set(key,[...recent,now]);
  const db=getDrizzleDatabase(); const session=await findSession(parseCookie(req.headers.cookie)[SESSION_COOKIE]); const ipHash=createHash('sha256').update(`${process.env.SESSION_SECRET||'local'}:${key}`).digest('hex');
  const [record]=await db.insert(contactMessages).values({userId:session?.user.id,name,email,phone:phone||null,topic,message,status:'received',ipHash,userAgent:req.get('user-agent'),sourcePath,metadata:{language:req.get('accept-language')?.slice(0,120)||null,referer:req.get('referer')?.slice(0,500)||null}}).returning({id:contactMessages.id});
  try {
    // Netlify puede congelar la función al responder; el envío debe terminar antes de devolver el resultado.
    const delivery=await sendContactEmail({name,email,phone,topic,message});
    await db.update(contactMessages).set({status:delivery.delivered?'delivered':'queued',deliveryProvider:delivery.provider,deliveryMessageId:delivery.messageId,deliveredAt:delivery.delivered?new Date():null,updatedAt:new Date()}).where(eq(contactMessages.id,record.id));
    return res.status(delivery.delivered?201:202).json({received:true,deliveryStatus:delivery.delivered?'delivered':'queued',reference:record.id,message:delivery.delivered?'Tu mensaje fue registrado y enviado a soporte.':'Tu mensaje fue registrado y quedó pendiente de entrega.'});
  } catch(error) {
    const reason=error instanceof Error?error.message:'Error SMTP'; console.error('[contact-email]',error);
    await db.update(contactMessages).set({status:'delivery_failed',failureReason:reason.slice(0,1000),updatedAt:new Date()}).where(eq(contactMessages.id,record.id));
    return res.status(202).json({received:true,deliveryStatus:'failed',reference:record.id,message:'Tu consulta quedó registrada. El correo a soporte no pudo enviarse en este momento.'});
  }
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
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
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

// Mantener este middleware al final de las rutas API.
app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const detail = error instanceof Error
    ? [error.message, (error as Error & { cause?: unknown }).cause instanceof Error ? (error as Error & { cause: Error }).cause.message : ''].filter(Boolean).join(' | ')
    : String(error);
  console.error('[api-error]', { method: req.method, path: req.originalUrl, detail });
  if (res.headersSent) return;
  res.status(500).json({
    error: 'internal_error',
    message: 'No pudimos completar la operación. Inténtalo nuevamente.',
    ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
  });
});
