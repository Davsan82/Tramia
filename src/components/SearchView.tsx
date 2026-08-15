import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, Compass, Search, Sparkles, X } from 'lucide-react';
import { Procedure } from '../types';
import { trackEvent } from '../utils/analytics';

interface SearchViewProps {
  procedures: Procedure[];
  onSelectProcedure: (procedure: Procedure) => void;
  initialSearchText: string;
  onAddActiveProcedure?: (procedure: Procedure, isDelegated: boolean) => void;
  activeProcedures?: any[];
}

type SearchInterpretation = {
  terms: string[];
  category: string | null;
  confidence: number;
  mode: 'ai' | 'fallback';
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clientFallbackTerm = (value: string) => {
  const normalized = normalize(value);
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

export default function SearchView({ procedures, onSelectProcedure, initialSearchText }: SearchViewProps) {
  const [query, setQuery] = useState(initialSearchText);
  const [appliedQuery, setAppliedQuery] = useState(initialSearchText.trim());
  const [selectedCategory, setSelectedCategory] = useState<string | null | undefined>(undefined);
  const [interpretation, setInterpretation] = useState<SearchInterpretation | null>(null);
  const [interpreting, setInterpreting] = useState(false);

  const uniqueProcedures = useMemo(
    () => Array.from(new Map<string, Procedure>(procedures.map((procedure) => [procedure.id, procedure])).values()),
    [procedures],
  );
  const categories = useMemo(
    () => Array.from(new Set<string>(uniqueProcedures.map((procedure) => procedure.category))).sort((a, b) => a.localeCompare(b, 'es')),
    [uniqueProcedures],
  );

  useEffect(() => {
    const next = initialSearchText.trim();
    setQuery(next);
    setAppliedQuery(next);
  }, [initialSearchText]);

  useEffect(() => {
    if (!appliedQuery) {
      setInterpretation(null);
      return;
    }
    const controller = new AbortController();
    setInterpreting(true);
    fetch('/api/v1/ai/search/interpret', {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: appliedQuery }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'No pudimos interpretar la búsqueda.');
        setInterpretation(payload.interpretation);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setInterpretation({ terms: [clientFallbackTerm(appliedQuery)], category: null, confidence: 0, mode: 'fallback' });
      })
      .finally(() => {
        if (!controller.signal.aborted) setInterpreting(false);
      });
    return () => controller.abort();
  }, [appliedQuery]);

  const activeCategory = selectedCategory === undefined ? interpretation?.category || null : selectedCategory;
  const filterCategory = selectedCategory === undefined ? null : selectedCategory;
  const terms = interpretation?.terms?.length ? interpretation.terms.slice(0, 1) : appliedQuery ? [clientFallbackTerm(appliedQuery)] : [];
  const filteredProcedures = useMemo(() => {
    return uniqueProcedures
      .filter((procedure) => {
        const haystack = normalize(`${procedure.title} ${procedure.description} ${procedure.category} ${procedure.entity || ''}`);
        const matchesTerms = !terms.length || terms.some((term) => haystack.includes(normalize(term)));
        const matchesManualCategory = !filterCategory || procedure.category === filterCategory;
        return matchesTerms && matchesManualCategory;
      })
      .sort((a, b) => interpretation?.category ? Number(b.category === interpretation.category) - Number(a.category === interpretation.category) : 0);
  }, [uniqueProcedures, terms, filterCategory, interpretation?.category]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (next.length < 3) return;
    setAppliedQuery(next);
    setInterpretation(null);
    trackEvent('busqueda_realizada', { query: next, source: 'intelligent_search' });
  }

  function clear() {
    setQuery('');
    setAppliedQuery('');
    setInterpretation(null);
    setSelectedCategory(undefined);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 animate-fadeIn" id="search-view-root">
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#082657,#1261db_62%,#18b9d6)] px-5 py-8 text-white shadow-xl sm:px-8 md:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative max-w-3xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200"><Sparkles size={15}/> Búsqueda inteligente TramIA</p>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Cuéntanos qué necesitas resolver</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">Puedes escribir una necesidad completa. TramIA la convertirá en una palabra clave para encontrar la ruta más cercana.</p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={20}/>
              <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={300} className="min-h-14 w-full rounded-xl border-0 bg-transparent pl-12 pr-11 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400" placeholder="Ej. Quiero viajar a Estados Unidos por turismo" autoFocus/>
              {query && <button type="button" onClick={clear} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-slate-500"><X size={15}/></button>}
            </label>
            <button disabled={query.trim().length < 3 || interpreting} className="min-h-14 rounded-xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {interpreting ? 'Interpretando…' : 'Encontrar mi ruta'}
            </button>
          </form>
        </div>
      </section>

      {(interpreting || interpretation) && appliedQuery && (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Sparkles size={19}/></span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">{interpreting ? 'Interpretando tu búsqueda' : interpretation?.mode === 'ai' ? 'Entendimos tu búsqueda' : 'Búsqueda optimizada'}</p>
              <p className="mt-1 text-sm text-slate-600">{interpreting ? 'Estamos identificando la intención más útil.' : <>Buscando por <strong className="text-slate-950">{interpretation?.terms.join(' · ')}</strong>{interpretation?.category ? <> en <strong className="text-slate-950">{interpretation.category}</strong></> : null}.</>}</p>
            </div>
          </div>
          {!interpreting && <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700"><Check size={13}/> {filteredProcedures.length} coincidencias</span>}
        </section>
      )}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.17em] text-blue-600">Información organizada</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Trámites que pueden ayudarte</h2>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSelectedCategory(null)} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-black ${selectedCategory === null ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>Todos</button>
            {categories.map((category) => <button key={category} onClick={() => setSelectedCategory(category)} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-black ${selectedCategory === category ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{category}</button>)}
          </div>
        </div>

        {filteredProcedures.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProcedures.map((procedure) => (
              <article key={procedure.id} className="group flex min-h-72 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#eaf2ff,#e8fcff)] text-blue-600"><Compass size={26}/></span>
                  {procedure.popular && <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700">Frecuente</span>}
                </div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.15em] text-blue-600">{procedure.category}</p>
                <h3 className="mt-2 text-lg font-black leading-tight text-slate-950">{procedure.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{procedure.description}</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"><Clock3 size={15}/> {procedure.estimatedDuration}</span>
                  <button onClick={() => onSelectProcedure(procedure)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white transition group-hover:bg-blue-600">Revisar trámite <ArrowRight size={15}/></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/50 px-6 py-12 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><Search size={25}/></span>
            <h3 className="mt-4 text-lg font-black text-slate-950">No encontramos una coincidencia exacta</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Prueba con una necesidad más general o revisa todos los trámites disponibles.</p>
            <button onClick={clear} className="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white">Ver todos los trámites</button>
          </div>
        )}
      </section>
    </main>
  );
}
