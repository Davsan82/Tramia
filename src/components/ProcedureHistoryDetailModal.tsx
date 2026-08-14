import React, { useEffect, useState } from 'react';
import { Building2, CalendarDays, CheckCircle2, Clock3, CreditCard, FileText, RefreshCw, ShieldCheck, X } from 'lucide-react';

const date = (value?: string | null) => value ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Sin fecha';
const status: Record<string, string> = { completed: 'Completado', cancelled: 'Cancelado', rejected: 'No aprobado', approved: 'Aprobado', uploaded: 'Cargado', pending: 'Pendiente', paid: 'Pagado', skipped: 'Omitido' };

export default function ProcedureHistoryDetailModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/v1/my-procedures/${caseId}/detail`, { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'No pudimos abrir esta gestión.');
      setData(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos abrir esta gestión.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [caseId]);

  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="Detalle del trámite">
    <div className="mx-auto my-3 w-full max-w-4xl overflow-hidden rounded-[2rem] bg-slate-50 shadow-2xl sm:my-6">
      <header className="relative overflow-hidden bg-[linear-gradient(120deg,#071a3d,#1261db_65%,#16b5d4)] p-6 text-white sm:p-8">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[22px_22px]" />
        <button onClick={onClose} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25" aria-label="Cerrar"><X size={19}/></button>
        {data && <div className="relative pr-10"><span className="inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-100">Ficha histórica · solo lectura</span><h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{data.record.title}</h2><p className="mt-2 text-sm text-blue-100">Código {data.record.trackingCode} · {data.record.category}</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">{status[data.record.status] || data.record.status}</span><span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">{data.record.progressPercentage}% completado</span><span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">{data.record.mode === 'self_service' ? 'Autogestionado' : 'Gestión con asesor'}</span></div></div>}
      </header>

      {loading ? <div className="grid min-h-80 place-items-center"><div className="text-center"><RefreshCw className="mx-auto animate-spin text-blue-600"/><p className="mt-3 text-sm font-bold text-slate-500">Cargando tu historial…</p></div></div> : error ? <div className="p-8 text-center"><p className="font-bold text-red-700">{error}</p><button onClick={() => void load()} className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Reintentar</button></div> : data && <div className="space-y-5 p-4 sm:p-6">
        <section className="grid gap-3 sm:grid-cols-3"><Metric icon={CalendarDays} label="Inicio" value={date(data.record.startedAt)}/><Metric icon={CheckCircle2} label="Finalización" value={date(data.record.completedAt || data.record.cancelledAt)}/><Metric icon={Building2} label="Entidad" value={data.record.organization || 'Entidad responsable'}/></section>

        {data.advisor && <section className="flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><span className="grid size-11 place-items-center rounded-xl bg-white text-blue-600"><ShieldCheck/></span><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Asesor asignado</p><p className="font-black text-slate-950">{data.advisor.name}</p><p className="text-xs text-slate-500">★ {data.advisor.averageRating} · {data.advisor.completedCasesCount} gestiones completadas</p></div></section>}

        <Panel title="Ruta realizada" icon={Clock3}><div className="space-y-2">{data.steps.map((step:any) => <div key={step.id} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><span className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-black ${step.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{step.position}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-black text-slate-900">{step.title}</p><span className="text-[10px] font-black text-emerald-700">{status[step.status] || step.status}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>{step.completedAt && <p className="mt-1 text-[10px] font-bold text-slate-400">Realizado: {date(step.completedAt)}</p>}</div></div>)}</div></Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Documentos y requisitos" icon={FileText}>{data.requirements.length === 0 && data.documents.length === 0 ? <Empty text="Esta gestión no registró documentos."/> : <><div className="space-y-2">{data.requirements.map((item:any) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs"><strong>{item.name}</strong><span className="font-black text-blue-700">{status[item.status] || item.status}</span></div>)}</div>{data.documents.map((item:any) => <a key={item.id} href={`/api/v1/documents/${item.id}/content`} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-black text-blue-700"><span className="truncate">{item.originalFileName}</span><span>Ver</span></a>)}</>}</Panel>
          <Panel title="Pagos registrados" icon={CreditCard}>{data.payments.length ? <div className="space-y-2">{data.payments.map((item:any) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-3 text-xs"><strong>{item.type === 'delegation_service' ? 'Servicio de acompañamiento' : item.type}</strong><span className="font-black text-emerald-700">{status[item.status] || item.status}</span></div><p className="mt-2 text-lg font-black">{item.currency} {(item.amountMinor / 100).toFixed(2)}</p>{item.paidAt && <p className="text-[10px] text-slate-500">Pagado: {date(item.paidAt)}</p>}</div>)}</div> : <Empty text="Esta gestión no tiene pagos registrados."/>}</Panel>
        </div>
        <button onClick={onClose} className="min-h-12 w-full rounded-xl bg-slate-950 text-sm font-black text-white">Cerrar detalle</button>
      </div>}
    </div>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><Icon size={19} className="text-blue-600"/><p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-900">{value}</p></div>; }
function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) { return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={18}/></span><h3 className="font-black text-slate-950">{title}</h3></div>{children}</section>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">{text}</p>; }
