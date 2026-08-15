import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, CheckCircle2, CircleDashed, Clock3, LoaderCircle, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Procedure } from "../types";
import CaseDocuments from "./CaseDocuments";
import CaseMessages from "./CaseMessages";

type Tracking = {
  case: { id: string; title: string; trackingCode: string; status: string; progressPercentage: number };
  advisor: null | { userId: string; publicName: string; avatarUrl: string; averageRating: string; idVerified: boolean };
  steps: Array<{ id: string; status: string; position: number; title: string; description: string; notes?: string | null; completedAt?: string | null }>;
};

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "";

export default function DelegatedTrackingView({ procedure, caseId, onBack }: { procedure: Procedure; caseId: string; onBack: () => void }) {
  const [data, setData] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); setError("");
    try {
      const response = await fetch(`/api/v1/my-procedures/${caseId}/delegated-tracking`, { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No pudimos cargar el seguimiento de tu trámite.");
      setData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar el seguimiento de tu trámite.");
    } finally { setLoading(false); }
  }, [caseId]);
  useEffect(() => { void load(); const timer=window.setInterval(()=>void load(true),20000); return()=>window.clearInterval(timer); }, [load]);

  if (loading) return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-blue-600"/><p className="mt-3 text-sm font-bold text-slate-500">Cargando el avance de tu asesor…</p></div></div>;
  if (!data || error) return <div className="grid min-h-[45vh] place-items-center rounded-3xl border border-red-100 bg-red-50 p-8 text-center"><div><p className="font-black text-red-700">{error || "No encontramos este seguimiento."}</p><button onClick={() => void load()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white"><RefreshCw size={16}/>Reintentar</button></div></div>;

  const completed = data.steps.filter((step) => step.status === "completed").length;
  const progress = data.steps.length ? Math.round((completed / data.steps.length) * 100) : data.case.progressPercentage;
  const next = data.steps.find((step) => step.status !== "completed");
  const finished = data.case.status === "completed" || progress === 100;
  return <div className="space-y-6 animate-fadeIn">
    <section className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_24px_70px_-45px_rgba(8,38,87,.65)]">
      <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/60 px-5 py-3 sm:px-7">
        <button onClick={onBack} className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-600 hover:text-blue-700"><ArrowLeft size={17}/>Volver a mis trámites</button>
        <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-violet-700">Gestión con asesor</span>
      </div>
      <div className="bg-gradient-to-br from-[#071d46] via-blue-700 to-cyan-500 px-5 py-7 text-white sm:px-8 sm:py-9">
        <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">Seguimiento en tiempo real · {data.case.trackingCode}</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">{data.case.title || procedure.title}</h1>
        <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_330px] lg:items-end">
          <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-blue-100">Avance confirmado</p><p className="mt-1 font-bold">{finished ? "Tu trámite está listo" : next ? `Siguiente paso: ${next.title}` : "Preparando la siguiente actualización"}</p></div><strong className="text-4xl font-black">{progress}%</strong></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-950/30"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{width:`${progress}%`}}/></div><p className="mt-2 text-xs text-blue-100">{completed} de {data.steps.length} pasos completados por tu asesor</p></div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur"><div className="flex items-center gap-3"><img src={data.advisor?.avatarUrl || "/assets/mascot/tramia-bot-contact.png"} alt={data.advisor ? `Foto de ${data.advisor.publicName}` : "Asesor en asignación"} className="size-14 rounded-2xl bg-white/90 object-cover"/><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">{data.advisor ? "Tu asesor está aquí" : "Asignación en curso"}</p><p className="truncate font-black">{data.advisor?.publicName || "Estamos confirmando a tu especialista"}</p>{data.advisor?.idVerified && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200"><BadgeCheck size={13}/>Identidad verificada</span>}</div></div>{data.advisor && <button onClick={() => chatRef.current?.scrollIntoView({behavior:"smooth"})} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-black text-blue-800"><MessageCircle size={15}/>Conversar con mi asesor</button>}</div>
        </div>
      </div>
    </section>

    {finished && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={42}/><h2 className="mt-3 text-2xl font-black text-emerald-950">Tu trámite está listo para recoger</h2><p className="mt-2 text-sm text-emerald-800">Tu asesor completó la ruta. Revisa el chat para conocer las indicaciones finales.</p></section>}

    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Ruta de ejecución</p><h2 className="mt-2 text-2xl font-black">Pasos gestionados por tu asesor</h2><p className="mt-1 text-sm text-slate-500">Puedes seguir cada avance; solo el asesor asignado puede completar estos pasos.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><ShieldCheck size={15}/>Seguimiento protegido</span></div>
      <div className="mt-6 space-y-3">{data.steps.map((step) => { const done=step.status==="completed", current=!done && step.id===next?.id; return <article key={step.id} className={`relative rounded-2xl border p-4 pl-16 transition ${done?"border-emerald-200 bg-emerald-50/70":current?"border-blue-300 bg-blue-50 shadow-sm":"border-slate-200 bg-slate-50/70"}`}><span className={`absolute left-4 top-4 grid size-9 place-items-center rounded-xl font-black ${done?"bg-emerald-500 text-white":current?"bg-blue-600 text-white":"bg-white text-slate-400"}`}>{done?<Check size={18}/>:step.position}</span><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-slate-950">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${done?"bg-emerald-100 text-emerald-700":current?"bg-blue-100 text-blue-700":"bg-slate-200 text-slate-500"}`}>{done?<CheckCircle2 size={13}/>:current?<Clock3 size={13}/>:<CircleDashed size={13}/>} {done?"Completado":current?"En gestión":"Pendiente"}</span></div>{done && <div className="mt-3 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-xs text-emerald-800"><strong>Actualizado por tu asesor{step.completedAt ? ` · ${formatDate(step.completedAt)}` : ""}</strong>{step.notes && <p className="mt-1 text-slate-600">{step.notes}</p>}</div>}</article>; })}</div>
    </section>

    {data.advisor && <section ref={chatRef} className="space-y-5"><div className="grid gap-5 lg:grid-cols-[320px_1fr]"><aside className="rounded-[2rem] bg-slate-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-widest text-cyan-300">Canal directo</p><h2 className="mt-2 text-2xl font-black">Habla con tu asesor</h2><p className="mt-3 text-sm leading-6 text-slate-300">Pregunta por avances, observaciones o el siguiente paso de tu gestión.</p><img src={data.advisor.avatarUrl} alt="" className="mt-6 size-24 rounded-3xl border-4 border-white/10 object-cover"/><p className="mt-3 font-black">{data.advisor.publicName}</p></aside><CaseMessages caseId={caseId}/></div><CaseDocuments caseId={caseId} role="owner"/></section>}
  </div>;
}
