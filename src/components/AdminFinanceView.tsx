import React, { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  FileCheck2,
  Activity,
  BadgeCheck,
  Clock3,
  ReceiptText,
  LoaderCircle,
  RefreshCw,
  Star,
  Trash2,
  UsersRound,
} from "lucide-react";
export default function AdminFinanceView() {
  const [tab, setTab] = useState<"reports" | "payments" | "ratings">("reports"),
    [data, setData] = useState<any>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const endpoint =
      tab === "reports"
        ? "/api/v1/admin/reports/overview"
        : tab === "payments"
          ? "/api/v1/admin/payments"
          : "/api/v1/admin/ratings";
    const r = await fetch(endpoint, { credentials: "include" }),
      p = await r.json().catch(() => ({}));
    if (r.ok) setData(p);
    else setError(p.message || "No pudimos cargar la información.");
    setLoading(false);
  }, [tab]);
  const changeTab = (next: "reports" | "payments" | "ratings") => {
    if (next === tab) return;
    setLoading(true);
    setError("");
    setData(undefined);
    setTab(next);
  };
  useEffect(() => {
    void load();
  }, [load]);
  const removeRating = async (id: string) => {
    const reason = prompt("Motivo de moderación (mínimo 8 caracteres)");
    if (!reason) return;
    const r = await fetch(`/api/v1/admin/ratings/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (r.ok) void load();
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[
          ["reports", "Indicadores"],
          ["payments", "Pagos simulados"],
          ["ratings", "Calificaciones"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => changeTab(value as "reports" | "payments" | "ratings")}
            className={`rounded-xl px-4 py-2 text-xs font-black ${tab === value ? "bg-violet-700 text-white" : "bg-white text-slate-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <LoaderCircle className="mx-auto mt-16 animate-spin text-violet-600" />
      ) : error ? (
        <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
          {error}
          <button onClick={() => void load()}>
            <RefreshCw />
          </button>
        </div>
      ) : tab === "reports" ? (
        <ReportsDashboard data={data} reload={load} />
      ) : tab === "payments" ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-black uppercase tracking-widest text-violet-700">Transacciones</p><h2 className="mt-1 text-xl font-black">Pagos registrados</h2></div><button onClick={() => void load()} className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><RefreshCw size={17}/></button></div>
          {Array.isArray(data?.payments) && data.payments.length ? <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr className="border-b">
                <th className="p-4">Usuario</th><th>Trámite</th><th>Estado</th><th>Medio</th><th>Importe</th><th>Fecha</th><th>Referencia</th>
              </tr>
            </thead>
            <tbody>{data.payments.map((x: any) => <tr key={x.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="p-4 font-black">{x.username}</td><td>{x.procedureTitle}<small className="block text-slate-400">{x.trackingCode}</small></td><td><StatusPill status={x.status}/></td><td className="font-bold uppercase text-slate-600">{x.cardBrand || "—"}{x.cardLastFour ? ` ···· ${x.cardLastFour}` : ""}</td><td className="font-black">S/ {(x.amountMinor / 100).toFixed(2)}</td><td>{formatDate(x.paidAt || x.createdAt)}</td><td className="font-mono text-[10px] text-slate-500">{x.reference || "—"}</td></tr>)}</tbody>
          </table></div> : <EmptyPanel icon={ReceiptText} title="Todavía no hay pagos" text="Las operaciones aparecerán aquí cuando un usuario confirme una delegación."/>}
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-violet-700">Reputación</p><h2 className="mt-1 text-xl font-black">Calificaciones registradas</h2></div><button onClick={() => void load()} className="grid size-10 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><RefreshCw size={17}/></button></div>
          {Array.isArray(data?.ratings) && data.ratings.length ? <div className="grid gap-3 lg:grid-cols-2">{data.ratings.map((x: any) => (
            <article key={x.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><strong className="text-lg tracking-wider text-amber-500">{"★".repeat(x.rating)}<span className="text-slate-200">{"★".repeat(5-x.rating)}</span></strong><button onClick={() => void removeRating(x.id)} aria-label="Moderar calificación" className="rounded-xl bg-red-50 p-2.5 text-red-600"><Trash2 size={15}/></button></div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{x.comment || "Sin comentario"}</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1">{x.trackingCode}</span><span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{x.ratingType === "advisor" ? "Usuario a asesor" : "Asesor a usuario"}</span><span className="px-1 py-1">{formatDate(x.createdAt)}</span></div>
            </article>))}</div> : <EmptyPanel icon={Star} title="Todavía no hay calificaciones" text="Las reseñas de usuarios y asesores aparecerán en esta sección."/>}
        </div>
      )}
    </div>
  );
}
function ReportsDashboard({ data, reload }: { data: any; reload: () => Promise<void> }) {
  const paid = Number(data?.payments?.approved || 0), paymentTotal = Number(data?.payments?.count || 0);
  const available = Number(data?.advisors?.available || 0), advisorTotal = Number(data?.advisors?.total || 0);
  const pendingDocs = Number(data?.documents?.pending || 0), documentTotal = Number(data?.documents?.total || 0);
  const activeProcedures = Number(data?.procedures?.active || 0), procedureTotal = Number(data?.procedures?.total || 0);
  return <div className="mt-6 space-y-5">
    <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#32106f,#6d28d9_58%,#2563eb)] p-6 text-white shadow-xl shadow-violet-900/10 sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[22px_22px] opacity-10"/>
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-200">Visión operativa</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Indicadores de TramIA</h2><p className="mt-2 text-sm text-violet-100">Estado actualizado de pagos, trámites, asesores y documentos.</p></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] font-bold text-violet-200">Última actualización</p><p className="mt-1 text-xs font-black">{formatDate(data?.generatedAt, true)}</p></div><button onClick={() => void reload()} aria-label="Actualizar indicadores" className="grid size-12 place-items-center rounded-2xl bg-white text-violet-700 shadow-lg"><RefreshCw size={19}/></button></div></div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={CreditCard} label="Pagos aprobados" value={paid} detail={`S/ ${((data?.payments?.amount || 0) / 100).toFixed(2)} recaudados`} tone="blue" />
      <Metric icon={Activity} label="Trámites activos" value={activeProcedures} detail={`${data?.procedures?.completed || 0} completados`} tone="cyan" />
      <Metric icon={UsersRound} label="Asesores" value={advisorTotal} detail={`${available} disponibles`} tone="violet" />
      <Metric icon={Star} label="Calificaciones" value={data?.ratings?.count || 0} detail={`Promedio ${data?.ratings?.average || 0} de 5`} tone="amber" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <ProgressCard icon={BadgeCheck} label="Aprobación de pagos" value={ratio(paid, paymentTotal)} detail={`${paid} de ${paymentTotal} operaciones aprobadas`} color="bg-blue-600" />
      <ProgressCard icon={UsersRound} label="Disponibilidad de asesores" value={ratio(available, advisorTotal)} detail={`${data?.advisors?.activeCases || 0} casos activos de ${data?.advisors?.capacity || 0} posibles`} color="bg-violet-600" />
      <ProgressCard icon={FileCheck2} label="Documentos por revisar" value={documentTotal ? Math.round((pendingDocs/documentTotal)*100) : 0} detail={`${pendingDocs} pendientes · ${data?.documents?.approved || 0} aprobados`} color="bg-amber-500" inverse />
      <ProgressCard icon={Clock3} label="Trámites en marcha" value={ratio(activeProcedures, procedureTotal)} detail={`${activeProcedures} activos de ${procedureTotal} registrados`} color="bg-cyan-500" />
    </div>
    <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Star/></span><div><h3 className="font-black">Distribución de calificaciones</h3><p className="text-xs text-slate-500">Valoraciones recibidas por usuarios y asesores</p></div></div><div className="mt-5 space-y-3">{[5,4,3,2,1].map(star=>{const count=Number(data?.ratings?.distribution?.find((item:any)=>item.rating===star)?.count||0), total=Number(data?.ratings?.count||0);return <div key={star} className="grid grid-cols-[38px_1fr_28px] items-center gap-3 text-xs"><span className="font-black text-amber-600">{star} ★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{width:`${ratio(count,total)}%`}}/></div><span className="text-right font-bold text-slate-500">{count}</span></div>})}</div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-violet-700">Alertas operativas</p><div className="mt-4 space-y-3"><AlertRow color="amber" label="Documentos pendientes" value={pendingDocs}/><AlertRow color="blue" label="Pagos pendientes" value={data?.payments?.pending || 0}/><AlertRow color="rose" label="Pagos reembolsados" value={data?.payments?.refunded || 0}/><AlertRow color="emerald" label="Usuarios verificados" value={data?.users?.verified || 0}/></div></div>
    </section>
  </div>;
}
const ratio = (value:number,total:number) => total ? Math.min(100,Math.round((value/total)*100)) : 0;
const formatDate = (value?:string, withTime=false) => value ? new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(value)) : '—';
function StatusPill({status}:{status:string}){const labels:Record<string,string>={paid:'Aprobado',pending:'Pendiente',created:'Creado',authorized:'Autorizado',failed:'Fallido',refunded:'Reembolsado',partially_refunded:'Reembolso parcial',cancelled:'Cancelado'};const ok=status==='paid',bad=['failed','cancelled'].includes(status);return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${ok?'bg-emerald-50 text-emerald-700':bad?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'}`}>{labels[status]||status}</span>}
function EmptyPanel({icon:Icon,title,text}:{icon:React.ElementType;title:string;text:string}){return <div className="grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Icon size={28}/></span><h3 className="mt-4 font-black">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{text}</p></div></div>}
function ProgressCard({icon:Icon,label,value,detail,color,inverse=false}:{icon:React.ElementType;label:string;value:number;detail:string;color:string;inverse?:boolean}){return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={19}/></span><strong className="text-xl">{value}%</strong></div><h3 className="mt-4 text-sm font-black">{label}</h3><p className="mt-1 min-h-8 text-xs leading-4 text-slate-500">{detail}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{width:`${inverse?Math.min(value,100):value}%`}}/></div></article>}
function AlertRow({color,label,value}:{color:string;label:string;value:number}){const tones:Record<string,string>={amber:'bg-amber-100 text-amber-700',blue:'bg-blue-100 text-blue-700',rose:'bg-rose-100 text-rose-700',emerald:'bg-emerald-100 text-emerald-700'};return <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><span className="text-xs font-bold text-slate-600">{label}</span><strong className={`grid min-w-9 place-items-center rounded-xl px-2 py-1.5 text-xs ${tones[color]}`}>{value}</strong></div>}
function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "violet",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  detail: string;
  tone?: "blue"|"cyan"|"violet"|"amber";
}) {
  const tones={blue:"bg-blue-50 text-blue-700",cyan:"bg-cyan-50 text-cyan-700",violet:"bg-violet-50 text-violet-700",amber:"bg-amber-50 text-amber-700"};
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`grid size-12 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon />
      </span>
      <p className="mt-4 text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <strong className="mt-1 block text-3xl">{value}</strong>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}
