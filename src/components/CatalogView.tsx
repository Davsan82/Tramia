import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ChevronDown, Clock3, Layers3, Search, ShieldCheck, Sparkles, UserPlus, WalletCards, X } from 'lucide-react';
import type { Procedure, UserProfile } from '../types';
import ProcedureIcon from './ProcedureIcon';

interface Props {
  procedures: Procedure[];
  userProfile: UserProfile | null;
  onBack: () => void;
  onSelectProcedure: (procedure: Procedure) => void;
  onCreateAccount: () => void;
  onLogin: () => void;
  initialQuery?: string;
  initialCategory?: string;
}

type SearchInterpretation = { terms: string[]; category: string | null; confidence: number; mode: 'ai' | 'fallback' };
const normalizeSearchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clientFallbackTerm = (value: string) => {
  const normalized = normalizeSearchText(value);
  const intents: Array<[RegExp, string]> = [
    [/visa|estados unidos|ee\.?\s*uu|b1\/?b2|turismo/, 'visa'],
    [/pasaporte|viajar|viaje|extranjero/, 'pasaporte'],
    [/ruc|sunat|tribut|impuesto/, 'ruc'],
    [/empresa|negocio|constitu/, 'empresa'],
    [/matrimonio|casar|boda|union/, 'matrimonio'],
    [/dni|identidad|reniec/, 'dni'],
    [/auto|carro|vehiculo|brevete|licencia de conducir/, 'vehículo'],
    [/legalizar|legalizacion|documento/, 'legalizar'],
  ];
  return intents.find(([pattern]) => pattern.test(normalized))?.[1] || normalized.split(/\s+/).find((term) => term.length > 3) || value.trim();
};

export default function CatalogView({ procedures, userProfile, onBack, onSelectProcedure, onCreateAccount, onLogin, initialQuery = '', initialCategory = 'Todos' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery.trim());
  const [category, setCategory] = useState(initialCategory);
  const [interpretation, setInterpretation] = useState<SearchInterpretation | null>(null);
  const [interpreting, setInterpreting] = useState(false);

  useEffect(() => { setQuery(initialQuery); setAppliedQuery(initialQuery.trim()); setCategory(initialCategory); }, [initialQuery, initialCategory]);
  const uniqueProcedures = useMemo(() => Array.from(new Map<string, Procedure>(procedures.map((item) => [item.id, item])).values()), [procedures]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set<string>(uniqueProcedures.map((item) => item.category))).sort((a,b)=>a.localeCompare(b,'es'))], [uniqueProcedures]);

  useEffect(() => {
    if (!appliedQuery) { setInterpretation(null); return; }
    const controller = new AbortController();
    setInterpreting(true);
    fetch('/api/v1/ai/search/interpret', { method:'POST', credentials:'include', signal:controller.signal, headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:appliedQuery}) })
      .then(async response => { const payload=await response.json().catch(()=>({})); if(!response.ok)throw new Error(payload.message||'No pudimos interpretar la búsqueda.'); setInterpretation(payload.interpretation); })
      .catch(error => { if(error instanceof DOMException&&error.name==='AbortError')return; setInterpretation({terms:[clientFallbackTerm(appliedQuery)],category:null,confidence:0,mode:'fallback'}); })
      .finally(()=>{if(!controller.signal.aborted)setInterpreting(false)});
    return()=>controller.abort();
  }, [appliedQuery]);

  const searchTerms = interpretation?.terms?.length ? interpretation.terms.slice(0, 1) : appliedQuery ? [clientFallbackTerm(appliedQuery)] : [];
  const interpretedCategory = category === 'Todos' ? interpretation?.category : null;
  const filtered = useMemo(() => uniqueProcedures
    .filter((item) => {
      const text = normalizeSearchText(`${item.title} ${item.description} ${item.entity || ''} ${item.category}`);
      const matchesTerms = !searchTerms.length || searchTerms.some(term=>text.includes(normalizeSearchText(term)));
      const matchesManualCategory = category === 'Todos' || item.category === category;
      return matchesManualCategory && matchesTerms;
    })
    .sort((a, b) => interpretedCategory ? Number(b.category === interpretedCategory) - Number(a.category === interpretedCategory) : 0),
  [uniqueProcedures, searchTerms, category, interpretedCategory]);
  const frequent = uniqueProcedures.filter((item) => item.popular).slice(0, 4);

  const submitSearch = (event:React.FormEvent) => { event.preventDefault(); const next=query.trim(); if(next.length<3)return; setInterpretation(null); setAppliedQuery(next); };
  const clearSearch = () => { setQuery(''); setAppliedQuery(''); setInterpretation(null); setCategory('Todos'); };

  return <div className="min-h-screen bg-[var(--tramia-canvas-soft)] text-slate-950">
    <section className="relative isolate overflow-hidden bg-[linear-gradient(125deg,#071a3d_0%,#0d4db7_58%,#13afd1_100%)] text-white">
      <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[24px_24px]" />
      <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 py-9 sm:px-6 md:grid-cols-[1fr_280px] md:py-12 lg:px-8">
        <div>
          <button onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-extrabold hover:bg-white/20"><ArrowLeft size={16}/> Volver al inicio</button>
          <p className="mt-7 text-xs font-black uppercase tracking-[.18em] text-cyan-200">Búsqueda inteligente TramIA</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Encuentra el trámite que necesitas</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">Escribe lo que quieres resolver. TramIA convertirá tu necesidad en una búsqueda clara dentro del catálogo.</p>
          <form onSubmit={submitSearch} className="mt-7 flex max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Busca por trámite, entidad o categoría</span><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={21}/><input value={query} onChange={(event)=>setQuery(event.target.value)} maxLength={300} placeholder="Ej. Quiero viajar a Estados Unidos por turismo" className="min-h-14 w-full rounded-xl border-0 bg-white pl-12 pr-11 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"/>{query&&<button type="button" onClick={clearSearch} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-slate-500"><X size={16}/></button>}</label>
            <button disabled={query.trim().length<3||interpreting} className="min-h-14 rounded-xl bg-blue-600 px-6 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50">{interpreting?'Interpretando…':'Buscar con TramIA'}</button>
          </form>
        </div>
        <img src="/assets/mascot/tramia-bot-guiding.png" alt="TramIA te guía para encontrar un trámite" className="mx-auto hidden max-h-72 object-contain drop-shadow-[0_24px_28px_rgba(0,0,0,.25)] md:block"/>
      </div>
    </section>

    <main className="mx-auto max-w-7xl space-y-9 px-4 py-8 sm:px-6 lg:px-8 lg:py-11">
      {(interpreting||interpretation)&&appliedQuery&&<section aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Sparkles size={19}/></span><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">{interpreting?'Interpretando tu búsqueda':interpretation?.mode==='ai'?'Entendimos tu búsqueda':'Búsqueda optimizada'}</p><p className="mt-1 text-sm text-slate-600">{interpreting?'Identificando la ruta más cercana…':<>Buscando por <strong className="text-slate-950">{interpretation?.terms.join(' · ')}</strong>{interpretation?.category&&category==='Todos'?<> en <strong className="text-slate-950">{interpretation.category}</strong></>:null}.</>}</p></div></div>{!interpreting&&<span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">{filtered.length} coincidencias</span>}</section>}

      {frequent.length > 0 && !appliedQuery && category === 'Todos' && <section><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Más consultados</p><h2 className="mt-1 text-2xl font-black">Trámites frecuentes</h2></div><span className="hidden text-xs font-semibold text-slate-500 sm:block">Accesos rápidos para ahorrar tiempo</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{frequent.map((item)=><button key={item.id} onClick={()=>onSelectProcedure(item)} className="group flex min-h-64 flex-col items-center rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"><span className="transition-transform group-hover:scale-110"><ProcedureIcon category={item.category} title={item.title} size={36}/></span><h3 className="mt-5 text-base font-black leading-5 group-hover:text-blue-700">{item.title}</h3><p className="mt-2 text-xs font-semibold text-slate-500">{item.entity || item.category}</p><span className="mt-auto inline-flex items-center gap-1 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 group-hover:bg-blue-600 group-hover:text-white">Conocer el trámite <ArrowRight size={14}/></span></button>)}</div></section>}

      {!userProfile && <section className="relative overflow-hidden rounded-3xl border border-blue-200 bg-[linear-gradient(105deg,#eef6ff,#e8fbff)] p-6 sm:p-8"><div className="absolute -right-10 -top-16 size-48 rounded-full bg-cyan-300/25 blur-2xl"/><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex max-w-3xl gap-4"><div className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white sm:grid"><UserPlus size={23}/></div><div><p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">Da el siguiente paso</p><h2 className="mt-1 text-xl font-black sm:text-2xl">¿Quieres gestionar un trámite sin perderte en el proceso?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Crea tu cuenta gratis, arma tu checklist, guarda avances y recibe alertas sobre tus próximos pasos.</p></div></div><AuthCta onSignup={onCreateAccount} onLogin={onLogin}/></div></section>}

      <section>
        <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Layers3 size={22}/></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Catálogo organizado</p><h2 className="text-xl font-black text-slate-950 sm:text-2xl">Todos los trámites</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">{filtered.length} {filtered.length===1?'resultado disponible':'resultados disponibles'}</p></div></div><label className="relative sm:hidden"><span className="sr-only">Filtrar por categoría</span><select value={category} onChange={(event)=>setCategory(event.target.value)} className="min-h-12 w-full appearance-none rounded-xl border border-blue-100 bg-slate-50 px-4 pr-10 text-sm font-black text-slate-800 outline-none">{categories.map(item=><option key={item}>{item}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-blue-600"/></label></div><div className="mt-5 hidden flex-wrap gap-2 border-t border-slate-100 pt-4 sm:flex">{categories.map((item)=><button key={item} onClick={()=>setCategory(item)} aria-pressed={category===item} className={`min-h-10 rounded-full px-4 text-xs font-extrabold transition ${category===item?'bg-blue-600 text-white shadow-md':'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700'}`}>{item}</button>)}</div></div>
        {filtered.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item)=><div key={item.id}><ProcedureCard item={item} onSelect={onSelectProcedure}/></div>)}</div>:<div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center"><Search className="mx-auto text-blue-300" size={38}/><h3 className="mt-4 text-lg font-black">No encontramos coincidencias</h3><p className="mt-2 text-sm text-slate-500">Prueba con otra necesidad o revisa todas las categorías.</p><button onClick={clearSearch} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">Ver todos los trámites</button></div>}
      </section>

      {!userProfile && <section className="grid gap-5 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8 md:grid-cols-[1fr_190px] md:items-center"><div><div className="flex gap-3 text-cyan-300"><ShieldCheck/><CheckCircle2/><Sparkles/></div><h2 className="mt-4 text-2xl font-black">Consultar es gratis. Gestionar también puede ser más simple.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Regístrate para convertir cualquier trámite del catálogo en una ruta personalizada con pasos, documentos y seguimiento.</p><div className="mt-5 w-fit text-center"><button onClick={onCreateAccount} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-blue-700">Empezar gratis <ArrowRight size={16}/></button><p className="mt-2 text-[11px] text-slate-400">¿Ya tienes cuenta? <button onClick={onLogin} className="font-black text-cyan-300 hover:underline">Inicia sesión</button></p></div></div><img src="/assets/mascot/tramia-bot-superhero.png" alt="TramIA listo para acompañarte" className="mx-auto hidden max-h-48 object-contain md:block"/></section>}
    </main>
  </div>;
}

function ProcedureCard({item,onSelect}:{item:Procedure;onSelect:(item:Procedure)=>void}) { return <article className="group relative flex min-h-[350px] flex-col overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-[0_10px_35px_rgba(16,63,125,.07)] transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"><div className="relative flex items-start justify-between overflow-hidden border-b border-blue-50 bg-[linear-gradient(130deg,#f7faff,#edf7ff)] p-5"><span><ProcedureIcon category={item.category} title={item.title} size={32}/></span>{item.popular&&<span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-700"><Sparkles size={11}/> Frecuente</span>}</div><div className="flex flex-1 flex-col p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">{item.category}</p><h3 className="mt-2 text-lg font-black leading-6 text-slate-950 group-hover:text-blue-700">{item.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p><div className="mt-5 grid grid-cols-2 gap-2"><QuickFact icon={Clock3} label="Duración" value={item.estimatedDuration}/><QuickFact icon={WalletCards} label="Costo" value={item.estimatedCost}/><div className="col-span-2"><QuickFact icon={Building2} label="Entidad" value={item.entity || 'Entidad competente'}/></div></div><button onClick={()=>onSelect(item)} className="mt-5 flex min-h-12 w-full items-center justify-between rounded-2xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg transition hover:bg-blue-700"><span>Conocer el trámite</span><ArrowRight size={16}/></button></div></article> }
function AuthCta({onSignup,onLogin}:{onSignup:()=>void;onLogin:()=>void}) { return <div className="shrink-0 text-center"><button onClick={onSignup} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg">Crear mi cuenta gratis <ArrowRight size={17}/></button><p className="mt-2 text-[11px] text-slate-500">¿Ya tienes cuenta? <button onClick={onLogin} className="font-black text-blue-700 hover:underline">Inicia sesión</button></p></div> }
function QuickFact({icon:Icon,label,value}:{icon:React.ElementType;label:string;value:string}) { return <div className="flex min-h-14 items-center gap-2.5 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><Icon size={15}/></span><span className="min-w-0"><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</span><strong className="block truncate text-[11px] text-slate-700" title={value}>{value}</strong></span></div> }
