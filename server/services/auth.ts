import { createCipheriv, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import nodemailer from 'nodemailer';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { getDrizzleDatabase } from '../db/client';
import { authSessions, authTokens, userProfiles, users } from '../db/schema';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'tramia_session';

export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
function secret(name: string) {
  const value = process.env[name]?.trim();
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV !== 'production') return createHash('sha256').update(`tramia-local-only-${name}`).digest('hex');
    throw new Error(`${name} debe configurarse con al menos 32 caracteres.`);
  }
  return value;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function encryptPrivateValue(value: string) {
  const key = createHash('sha256').update(secret('DATA_ENCRYPTION_KEY')).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export async function createSession(userId: string, metadata: { userAgent?: string; ip?: string }) {
  const raw = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await getDrizzleDatabase().insert(authSessions).values({ userId, tokenHash: tokenHash(raw), expiresAt, userAgent: metadata.userAgent, ipAddress: metadata.ip });
  return { raw, expiresAt };
}

export async function findSession(raw?: string) {
  if (!raw) return null;
  const rows = await getDrizzleDatabase().select({ user: users, profile: userProfiles }).from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(and(eq(authSessions.tokenHash, tokenHash(raw)), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  if (!rows[0]) return null;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await getDrizzleDatabase().update(authSessions).set({ lastSeenAt: new Date(), expiresAt }).where(eq(authSessions.tokenHash, tokenHash(raw)));
  return { ...rows[0], expiresAt };
}

export async function issueAuthToken(userId: string, purpose: 'verify_email' | 'reset_password', ttlMinutes: number) {
  const raw = randomBytes(32).toString('base64url');
  await getDrizzleDatabase().insert(authTokens).values({ userId, purpose, tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) });
  return raw;
}

export async function consumeAuthToken(raw: string, purpose: 'verify_email' | 'reset_password') {
  const db = getDrizzleDatabase();
  const rows = await db.select().from(authTokens).where(and(eq(authTokens.tokenHash, tokenHash(raw)), eq(authTokens.purpose, purpose), isNull(authTokens.consumedAt), gt(authTokens.expiresAt, new Date()))).limit(1);
  if (!rows[0]) return null;
  await db.update(authTokens).set({ consumedAt: new Date() }).where(eq(authTokens.id, rows[0].id));
  return rows[0];
}

export async function inspectAuthToken(raw: string, purpose: 'verify_email' | 'reset_password') {
  if (!raw) return { status: 'invalid' as const };
  const rows = await getDrizzleDatabase().select().from(authTokens).where(and(eq(authTokens.tokenHash, tokenHash(raw)), eq(authTokens.purpose, purpose))).limit(1);
  const token = rows[0];
  if (!token) return { status: 'invalid' as const };
  if (token.consumedAt) return { status: 'consumed' as const, token };
  if (token.expiresAt <= new Date()) return { status: 'expired' as const, token };
  return { status: 'valid' as const, token };
}

export async function findUserByIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  const rows = await getDrizzleDatabase().select().from(users).where(or(sql`lower(${users.email}) = ${normalized}`, sql`lower(${users.username}) = ${normalized}`)).limit(1);
  return rows[0] ?? null;
}

export async function sendAccountEmail(to: string, subject: string, path: string) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const url = `${appUrl}${path}`;
  if (!process.env.SMTP_APP_PASSWORD || !process.env.SMTP_USER) {
    console.info(`[mail-preview] ${subject}: ${url}`);
    return { delivered: false, previewUrl: process.env.NODE_ENV === 'production' ? undefined : url };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD },
  });
  await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text: `${subject}\n\n${url}\n\nSi no solicitaste esta acción, ignora este mensaje.`, html: `<h2>${subject}</h2><p><a href="${url}">Continuar en TramIA</a></p><p>Si no solicitaste esta acción, ignora este mensaje.</p>` });
  return { delivered: true };
}

export async function sendContactEmail(input: { name: string; email: string; phone?: string; topic: string; message: string }) {
  const support = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'davsan82@gmail.com';
  if (!process.env.SMTP_APP_PASSWORD || !process.env.SMTP_USER) { console.info('[contact-preview]', { to: support, ...input }); return { delivered: false, provider: 'preview' }; }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD },
  });
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character);
  const topicLabels: Record<string, string> = { consulta: 'Consulta general', soporte: 'Soporte con mi cuenta', tramite: 'Ayuda con un trámite', privacidad: 'Privacidad y datos', alianza: 'Alianzas' };
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safePhone = escapeHtml(input.phone || 'No indicado');
  const topic = topicLabels[input.topic] || input.topic;
  const safeTopic = escapeHtml(topic);
  const safeMessage = escapeHtml(input.message).replace(/\r?\n/g, '<br>');
  const receivedAt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date());
  const replyUrl = `mailto:${encodeURIComponent(input.email)}?subject=${encodeURIComponent(`Respuesta de TramIA: ${topic}`)}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef4fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4fb;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 14px 40px rgba(15,45,95,.12)"><tr><td style="padding:28px 34px;background:linear-gradient(120deg,#071a3d,#0e55c7 62%,#13afd1);color:#fff"><div style="font-size:25px;font-weight:800;letter-spacing:-.6px">Tram<span style="color:#55c8ff">IA</span></div><div style="margin-top:18px;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#bdeeff">Nueva consulta de contacto</div><h1 style="margin:8px 0 0;font-size:25px;line-height:1.25">${safeTopic}</h1><p style="margin:8px 0 0;color:#e4f3ff;font-size:13px">Recibida el ${escapeHtml(receivedAt)}</p></td></tr><tr><td style="padding:30px 34px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f8fc;border:1px solid #dbe7f5;border-radius:16px"><tr><td style="padding:18px 20px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2563eb">Datos de contacto</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;font-size:14px"><tr><td style="padding:6px 0;color:#64748b;width:105px">Nombre</td><td style="padding:6px 0;font-weight:700">${safeName}</td></tr><tr><td style="padding:6px 0;color:#64748b">Correo</td><td style="padding:6px 0"><a href="mailto:${safeEmail}" style="color:#0e55c7;font-weight:700;text-decoration:none">${safeEmail}</a></td></tr><tr><td style="padding:6px 0;color:#64748b">Celular</td><td style="padding:6px 0;font-weight:700">${safePhone}</td></tr></table></td></tr></table><div style="margin-top:24px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2563eb">Mensaje enviado</div><div style="margin-top:10px;padding:20px;border-left:4px solid #2563eb;border-radius:4px 14px 14px 4px;background:#f8fafc;font-size:15px;line-height:1.7;color:#334155">${safeMessage}</div><div style="margin-top:26px"><a href="${replyUrl}" style="display:inline-block;background:#1769e0;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:11px">Responder a ${safeName}</a></div><p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b">Al responder, el mensaje será enviado directamente a <strong>${safeEmail}</strong>. Verifica que la consulta no contenga contraseñas, Clave SOL ni información financiera sensible.</p></td></tr><tr><td style="padding:18px 34px;background:#071a3d;color:#b9cbea;font-size:11px;line-height:1.5">Notificación generada automáticamente por TramIA · Plataforma de orientación y gestión de trámites.</td></tr></table></td></tr></table></body></html>`;
  const text = `TRAMIA · NUEVA CONSULTA\n\nMotivo: ${topic}\nRecibida: ${receivedAt}\n\nDATOS DE CONTACTO\nNombre: ${input.name}\nCorreo: ${input.email}\nCelular: ${input.phone || 'No indicado'}\n\nMENSAJE\n${input.message}\n\nResponde directamente a este correo para contactar a la persona.`;
  const info = await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: support, replyTo: input.email, subject: `[TramIA] ${topic} · ${input.name}`, text, html });
  return { delivered: true, provider: 'gmail_smtp', messageId: info.messageId };
}

export function parseCookie(header?: string) {
  return Object.fromEntries((header || '').split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key]) => key));
}
