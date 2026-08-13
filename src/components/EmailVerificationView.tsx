import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, LogIn, RotateCcw, UserRound } from 'lucide-react';
import TramIALogo from './TramIALogo';

type Status = 'loading' | 'success' | 'alreadyVerified' | 'expired' | 'invalid' | 'serviceError';
export default function EmailVerificationView({ onOpenProfile, onLogin }: { onOpenProfile: () => void; onLogin: () => void }) {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Estamos verificando tu correo de forma segura…');
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setStatus('invalid'); setMessage('El enlace está incompleto. Revisa que hayas abierto el enlace completo recibido en tu correo.'); return; }
    fetch('/api/v1/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.ok) { setStatus(result.alreadyVerified ? 'alreadyVerified' : 'success'); setMessage(result.message || 'Tu correo fue verificado correctamente.'); return; }
        if (result.error === 'expired_token') setStatus('expired'); else if (['invalid_token','used_token'].includes(result.error)) setStatus('invalid'); else setStatus('serviceError');
        setMessage(result.message || 'No pudimos verificar tu correo en este momento.');
      }).catch(() => { setStatus('serviceError'); setMessage('No pudimos comunicarnos con TramIA. Revisa tu conexión e inténtalo nuevamente.'); });
  }, []);
  const success = status === 'success' || status === 'alreadyVerified';
  const Icon = status === 'loading' ? LoaderCircle : success ? CheckCircle2 : status === 'expired' ? Clock3 : AlertCircle;
  return <div className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top,#dff6ff_0,#eef6ff_32%,#fff_72%)] px-4 py-10 sm:py-14">
    <section className="relative mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_28px_80px_rgba(8,45,110,.14)]">
      <div className="h-2 bg-[linear-gradient(90deg,#071a3d,#1769e0,#19b8d4)]" />
      <div className="p-7 text-center sm:p-10"><div className="mx-auto w-fit"><TramIALogo iconSize={38} textSize="text-2xl" variant="light" /></div><img src={success ? '/assets/mascot/tramia-bot-guiding.png' : '/assets/mascot/tramia-bot-reading.png'} alt="TramIA procesa la verificación de correo" className="mx-auto mt-4 h-44 w-44 object-contain" />
        <span className={`mx-auto grid size-16 place-items-center rounded-full ${success ? 'bg-emerald-100 text-emerald-600' : status === 'loading' ? 'bg-blue-100 text-blue-600' : status === 'expired' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}><Icon className={status === 'loading' ? 'animate-spin' : ''} size={30} /></span>
        <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-blue-600">Verificación de correo</p><h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{status === 'loading' ? 'Un momento' : status === 'success' ? 'Correo verificado' : status === 'alreadyVerified' ? 'Tu correo ya está verificado' : status === 'expired' ? 'El enlace venció' : status === 'invalid' ? 'Enlace no válido' : 'No pudimos completar la verificación'}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">{message}</p>
        {status !== 'loading' && <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">{success ? <button onClick={onOpenProfile} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white hover:bg-blue-700"><UserRound size={17}/> Ir a mi perfil</button> : <><button onClick={onLogin} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white hover:bg-blue-700"><LogIn size={17}/> Iniciar sesión</button><button onClick={() => window.location.reload()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-6 text-sm font-extrabold text-blue-700 hover:bg-blue-50"><RotateCcw size={17}/> Intentar nuevamente</button></>}</div>}
        <p className="mt-6 text-xs leading-5 text-slate-500">Los enlaces enviados por TramIA tienen una vigencia de 24 horas. No compartas este enlace con otras personas.</p>
      </div>
    </section>
  </div>;
}
