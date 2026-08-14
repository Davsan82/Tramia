import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';

type DialogVariant = 'info' | 'warning' | 'danger' | 'success';
type DialogOptions = {
  title: string;
  message: string;
  variant?: DialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
};
type DialogRequest = { options: DialogOptions; resolve: (value: boolean) => void };

const EVENT_NAME = 'tramia:dialog';

function requestDialog(options: DialogOptions) {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent<DialogRequest>(EVENT_NAME, { detail: { options, resolve } }));
  });
}

export const confirmTramia = (options: DialogOptions) => requestDialog({ ...options, showCancel: true });
export const alertTramia = (options: DialogOptions) => requestDialog({ ...options, showCancel: false });

const themes = {
  info: { icon: Info, iconClass: 'bg-blue-100 text-blue-700', button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200', eyebrow: 'Información TramIA' },
  warning: { icon: AlertTriangle, iconClass: 'bg-amber-100 text-amber-700', button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200', eyebrow: 'Revisa antes de continuar' },
  danger: { icon: ShieldAlert, iconClass: 'bg-red-100 text-red-700', button: 'bg-red-600 hover:bg-red-700 shadow-red-200', eyebrow: 'Acción importante' },
  success: { icon: CheckCircle2, iconClass: 'bg-emerald-100 text-emerald-700', button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200', eyebrow: 'Todo listo' },
};

export default function TramiaDialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  useEffect(() => {
    const listener = (event: Event) => setRequest((event as CustomEvent<DialogRequest>).detail);
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  }, []);
  if (!request) return null;
  const options = request.options;
  const theme = themes[options.variant || 'info'];
  const Icon = theme.icon;
  const finish = (result: boolean) => { request.resolve(result); setRequest(null); };
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-[#06142f]/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="tramia-dialog-title">
    <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_32px_100px_rgba(3,18,52,.42)] animate-scaleIn">
      <div className="h-1.5 bg-[linear-gradient(90deg,#125cff,#13b8d1)]"/>
      <button type="button" onClick={() => finish(false)} aria-label="Cerrar" className="absolute right-4 top-5 grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"><X size={17}/></button>
      <div className="p-6 sm:p-7">
        <span className={`grid size-14 place-items-center rounded-2xl ${theme.iconClass}`}><Icon size={27}/></span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">{theme.eyebrow}</p>
        <h2 id="tramia-dialog-title" className="mt-1 text-2xl font-black leading-tight text-slate-950">{options.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{options.message}</p>
        <div className={`mt-6 grid gap-3 ${options.showCancel ? 'sm:grid-cols-2' : ''}`}>
          {options.showCancel && <button type="button" onClick={() => finish(false)} className="min-h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-100">{options.cancelLabel || 'Cancelar'}</button>}
          <button type="button" autoFocus onClick={() => finish(true)} className={`min-h-12 rounded-2xl text-sm font-black text-white shadow-lg transition ${theme.button}`}>{options.confirmLabel || 'Entendido'}</button>
        </div>
      </div>
    </section>
  </div>;
}
