import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, AtSign, Check, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import type { UserProfile } from '../types';
import TramIALogo from './TramIALogo';
import { trackEvent } from '../utils/analytics';

type Mode = 'login' | 'signup' | 'forgot';
interface LoginViewProps { onAuthSuccess: (profile: UserProfile) => void; onClose?: () => void; initialMode?: Mode; adminMode?: boolean; }

export default function LoginView({ onAuthSuccess, onClose, initialMode = 'login', adminMode = false }: LoginViewProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '' });

  useEffect(() => { setMode(initialMode); setMessage(null); }, [initialMode]);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((value) => ({ ...value, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(null); setSubmitting(true);
    try {
      const endpoint = mode === 'signup' ? '/api/v1/auth/register' : mode === 'forgot' ? '/api/v1/auth/forgot-password' : '/api/v1/auth/login';
      const body = mode === 'login' ? { identifier: form.email, password: form.password } : mode === 'forgot' ? { email: form.email } : form;
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'No pudimos completar la operación.');
      if (mode === 'forgot') { setMessage({ type: 'success', text: result.message }); return; }
      const profile: UserProfile = { ...result.user, isNew: mode === 'signup' };
      trackEvent(mode === 'signup' ? 'cuenta_creada' : 'iniciar_sesion', { email_verified: result.user.emailVerified });
      onAuthSuccess(profile);
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' }); }
    finally { setSubmitting(false); }
  }

  const isSignup = mode === 'signup';
  return (
    <div className={`relative grid w-full overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_30px_100px_rgba(4,22,61,.28)] animate-fadeIn md:grid-cols-[.84fr_1.16fr] ${isSignup ? 'max-w-5xl' : 'max-w-4xl'}`}>
      {onClose && <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 z-30 grid size-10 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:text-slate-950"><X size={18} /></button>}

      <aside className={`relative hidden overflow-hidden bg-[linear-gradient(145deg,#071a3d_0%,#0d47a1_58%,#11a9cf_100%)] text-white md:flex md:flex-col ${isSignup ? 'min-h-[620px] p-8 lg:p-10' : mode === 'forgot' ? 'min-h-[430px] p-7' : 'min-h-[450px] p-7'}`}>
        <div className="absolute -left-20 top-20 size-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[24px_24px]" />
        <div className="relative z-10"><TramIALogo iconSize={38} textSize="text-2xl" variant="dark" /><p className="mt-5 text-sm font-bold text-cyan-100">Tu ruta empieza con una cuenta segura.</p></div>
        <div className={`relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden ${isSignup ? 'py-2' : 'py-1'}`}>
          <img src={isSignup ? '/assets/mascot/tramia-bot-guiding.png' : '/assets/mascot/tramia-bot-reading.png'} alt={isSignup ? 'TramIA te da la bienvenida' : 'TramIA protege tu acceso'} className={`h-full w-full object-contain drop-shadow-[0_20px_26px_rgba(0,0,0,.25)] ${isSignup ? 'max-h-[360px] scale-110' : 'max-h-[230px] scale-105'}`} />
        </div>
        <div className={`relative z-10 mt-auto ${isSignup ? 'space-y-2.5' : 'space-y-2'}`}>
          {['Tus trámites y documentos en un solo lugar', 'Acceso inmediato aunque el correo esté por verificar', 'Tus credenciales de entidades nunca se almacenan'].map((text) => <div key={text} className="flex items-start gap-2 text-xs leading-4 text-blue-50"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400 text-slate-950"><Check size={12} strokeWidth={3} /></span><span>{text}</span></div>)}
        </div>
      </aside>

      <section className={`max-h-[92vh] overflow-y-auto px-5 sm:px-9 md:px-10 lg:px-12 ${isSignup ? 'py-7 md:py-9' : 'flex flex-col justify-center py-8 md:py-10'}`}>
        <div className={`w-full ${isSignup ? '' : 'my-auto'}`}>
        <div className="mb-7 md:hidden"><TramIALogo iconSize={34} textSize="text-2xl" variant="light" /></div>
        {mode === 'forgot' && <button type="button" onClick={() => { setMode('login'); setMessage(null); }} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft size={16} /> Regresar al inicio de sesión</button>}
        <p className={`text-xs font-black uppercase tracking-[.16em] ${adminMode ? 'text-violet-700' : 'text-blue-600'}`}>{adminMode ? 'Acceso administrativo' : mode === 'login' ? 'Bienvenido de nuevo' : mode === 'signup' ? 'Empieza gratis' : 'Recupera tu acceso'}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{adminMode ? 'Ingresa al centro de control' : mode === 'login' ? 'Inicia sesión' : mode === 'signup' ? 'Crea tu cuenta' : '¿Olvidaste tu contraseña?'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{adminMode ? 'Usa una cuenta con rol de administrador. El acceso queda registrado.' : mode === 'login' ? 'Continúa tus trámites desde donde los dejaste.' : mode === 'signup' ? 'Crea tu perfil ciudadano; podrás verificar el correo después de ingresar.' : 'Te enviaremos un enlace seguro si el correo está registrado.'}</p>

        <form onSubmit={submit} className={`${isSignup ? 'mt-6' : 'mt-5'} space-y-4`}>
          {isSignup && <Field label="Nombre de usuario" icon={AtSign}><input value={form.username} onChange={update('username')} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" autoComplete="username" placeholder="ej. david82" className="field-input" /></Field>}
          <Field label={mode === 'login' ? 'Usuario o correo' : 'Correo electrónico'} icon={Mail}><input type={mode === 'login' ? 'text' : 'email'} value={form.email} onChange={update('email')} required autoComplete="email" placeholder={mode === 'login' ? 'usuario o correo@ejemplo.com' : 'correo@ejemplo.com'} className="field-input" /></Field>
          {mode !== 'forgot' && <Field label="Contraseña" icon={Lock} action={mode === 'login' ? <button type="button" onClick={() => { setMode('forgot'); setMessage(null); }} className="text-xs font-bold text-blue-700 hover:underline">¿La olvidaste?</button> : undefined}><div className="relative"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} required minLength={8} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="Mínimo 8 caracteres" className="field-input pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>}
          {isSignup && <Field label="Celular" icon={Phone}><input type="tel" value={form.phone} onChange={update('phone')} required placeholder="+51 999 999 999" className="field-input" /></Field>}
          {isSignup && <div className="flex gap-3 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-900"><ShieldCheck size={19} className="shrink-0 text-blue-600" /><p>Podrás ingresar inmediatamente. Te mostraremos un recordatorio hasta que confirmes el enlace enviado a tu correo.</p></div>}
          {message && <div role="alert" className={`rounded-xl border p-3 text-sm font-semibold ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message.text}</div>}
          <button disabled={submitting} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white shadow-lg transition disabled:opacity-60 ${adminMode ? 'bg-violet-700 shadow-violet-700/20 hover:bg-violet-800' : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'}`}>{submitting ? 'Procesando…' : adminMode ? 'Ingresar al panel' : mode === 'login' ? 'Ingresar a TramIA' : mode === 'signup' ? 'Crear cuenta y continuar' : 'Enviar enlace seguro'} {!submitting && <ArrowRight size={17} />}</button>
        </form>
        {!adminMode && mode !== 'forgot' && <p className="mt-5 text-center text-sm text-slate-500">{isSignup ? '¿Ya tienes una cuenta?' : '¿Todavía no tienes una cuenta?'} <button type="button" onClick={() => { setMode(isSignup ? 'login' : 'signup'); setMessage(null); }} className="font-extrabold text-blue-700 hover:underline">{isSignup ? 'Inicia sesión' : 'Créala gratis'}</button></p>}
        </div>
      </section>
    </div>
  );
}

function Field({ label, icon: Icon, action, children }: { label: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between text-xs font-extrabold text-slate-700"><span className="flex items-center gap-2"><Icon size={15} className="text-blue-600" />{label}</span>{action}</span>{children}</label>;
}
