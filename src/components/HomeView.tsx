import React, { useState, useMemo } from 'react';
import { 
  Search, Sparkles, UserCheck, Car, Plane, Briefcase, 
  Heart, ChevronRight, FileText, Shield, Clock,
  Building2, Laptop, Globe, ArrowRight, Tag, RefreshCw
} from 'lucide-react';
import { Procedure } from '../types';
import { PROCEDURES } from '../data';

interface HomeViewProps {
  onStartSearch: () => void;
  onSelectProcedure: (procedure: Procedure) => void;
  popularProcedures: Procedure[];
  onSearch?: (text: string) => void;
  activeCount?: number;
  onViewActive?: () => void;
  activeProcedures?: any[];
  reminders?: any[];
  userProfile?: any;
  onSelectProcedureById?: (id: string) => void;
  onTriggerReminder?: (reminder: any) => void;
  onTriggerLogin?: (mode?: 'login' | 'signup') => void;
}

const CATEGORY_DEFINITIONS = [
  { 
    id: 'Identidad', 
    label: 'Identidad', 
    emoji: '🪪', 
    icon: UserCheck, 
    desc: 'DNI y documentos personales de identidad',
    entity: 'RENIEC',
    keywords: [
      { text: 'Renovación o Duplicado de DNI Electrónico', id: 'renovar-dni' },
      { text: 'Rectificación de Partida de Nacimiento', id: 'rectificacion-partida' }
    ],
    bgLight: 'bg-indigo-50/70 border-indigo-100 text-indigo-900',
    badgeColor: 'bg-indigo-100 text-indigo-800'
  },
  { 
    id: 'Negocios', 
    label: 'Negocios', 
    emoji: '💼', 
    icon: Briefcase, 
    desc: 'Tributos, RUC e inscripción de empresas',
    entity: 'SUNAT / SUNARP',
    keywords: [
      { text: 'Inscripción al RUC Persona Natural', id: 'ruc-persona-natural' },
      { text: 'Constitución de Empresa en Línea (SID)', id: 'crear-empresa' }
    ],
    bgLight: 'bg-emerald-50/70 border-emerald-100 text-emerald-900',
    badgeColor: 'bg-emerald-100 text-emerald-800'
  },
  { 
    id: 'Transporte', 
    label: 'Transporte', 
    emoji: '🚗', 
    icon: Car, 
    desc: 'Licencias de conducir y transferencias vehiculares',
    entity: 'MTC / SUNARP',
    keywords: [
      { text: 'Primera Licencia de Conducir (A-I)', id: 'licencia-conducir' },
      { text: 'Traspaso de Propiedad Vehicular', id: 'traspaso-vehiculo' }
    ],
    bgLight: 'bg-amber-50/70 border-amber-100 text-amber-900',
    badgeColor: 'bg-amber-100 text-amber-800'
  },
  { 
    id: 'Viajes', 
    label: 'Viajes', 
    emoji: '✈️', 
    icon: Plane, 
    desc: 'Pasaportes biométricos y visas consulares',
    entity: 'Migraciones / Embajada EE.UU.',
    keywords: [
      { text: 'Pasaporte Electrónico Ordinario (10 años)', id: 'sacar-pasaporte' },
      { text: 'Visa de Turismo para EE.UU. (B1/B2)', id: 'visa-eeuu' }
    ],
    bgLight: 'bg-sky-50/70 border-sky-100 text-sky-900',
    badgeColor: 'bg-sky-100 text-sky-800'
  },
  { 
    id: 'Estado Civil', 
    label: 'Estado Civil', 
    emoji: '❤️', 
    icon: Heart, 
    desc: 'Apertura de expedientes y matrimonio municipal',
    entity: 'Municipalidades',
    keywords: [
      { text: 'Matrimonio Civil Municipal', id: 'matrimonio-civil' }
    ],
    bgLight: 'bg-rose-50/70 border-rose-100 text-rose-900',
    badgeColor: 'bg-rose-100 text-rose-800'
  }
];

export default function HomeView({
  onSelectProcedure,
  onSearch,
  userProfile,
  onTriggerLogin
}: HomeViewProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleKeywordClick = (procedureId: string) => {
    const found = PROCEDURES.find(p => p.id === procedureId);
    if (found) {
      onSelectProcedure(found);
    }
  };

  const getModalityBadge = (modality?: string) => {
    switch (modality) {
      case 'Virtual':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Laptop size={10} />
            Virtual
          </span>
        );
      case 'Presencial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
            <Building2 size={10} />
            Presencial
          </span>
        );
      case 'Mixta':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Globe size={10} />
            Mixta
          </span>
        );
    }
  };

  const categoryProcedures = useMemo(() => {
    if (!selectedCategory) return [];
    return PROCEDURES.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-[70vh] flex flex-col justify-center max-w-4xl mx-auto space-y-10 py-8 px-4 animate-fadeIn" id="home-view-container">
      
      {/* 1. BRAND HEADER SECTION */}
      <div className="text-center space-y-3" id="home-brand-header">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-[11px] font-bold tracking-wider font-mono uppercase border border-gray-200">
          <Sparkles size={11} className="text-blue-600" />
          Plataforma Inteligente de Trámites Perú
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 font-sans">
          Tram<span className="text-blue-600">IA</span>
        </h1>
        
        <p className="text-base sm:text-lg font-bold text-slate-500 font-sans max-w-xl mx-auto">
          Encuentra tu trámite por categoría o palabra clave y obtén tu guía paso a paso con validación de requisitos.
        </p>
      </div>

      {/* 2. CORE INTELLIGENT SEARCH INPUT */}
      <div className="w-full space-y-4 max-w-2xl mx-auto" id="home-core-search-bar">
        <form onSubmit={handleSearchSubmit} className="relative group">
          <div className="absolute inset-0 bg-slate-100/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center bg-white border border-gray-300 hover:border-slate-400 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-100 rounded-2xl shadow-md p-1 transition-all">
            <Search className="ml-4 text-slate-400 shrink-0" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe una palabra clave (ej. DNI, RUC, Brevete, Pasaporte)..."
              className="w-full bg-transparent border-0 focus:ring-0 text-slate-900 placeholder:text-gray-400 font-bold px-3 py-3.5 text-sm md:text-base focus:outline-hidden"
              autoFocus
            />
            <button
              type="submit"
              className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs md:text-sm px-6 py-3 rounded-xl transition-all cursor-pointer font-sans shadow-xs shrink-0"
            >
              Buscar
            </button>
          </div>
        </form>

        {/* 3. POPULAR KEYWORDS PILLS */}
        <div className="text-center space-y-2">
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider font-mono">Búsquedas Frecuentes:</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs" id="suggested-prompts-row">
            {[
              { label: '🪪 DNI Electrónico', id: 'renovar-dni' },
              { label: '💼 RUC SUNAT', id: 'ruc-persona-natural' },
              { label: '🚗 Brevete A-I', id: 'licencia-conducir' },
              { label: '✈️ Pasaporte 10 años', id: 'sacar-pasaporte' },
              { label: '🏢 Crear Empresa', id: 'crear-empresa' },
              { label: '🇺🇸 Visa EE.UU.', id: 'visa-eeuu' },
              { label: '🚘 Traspaso Vehicular', id: 'traspaso-vehiculo' }
            ].map((kw, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleKeywordClick(kw.id)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs active:scale-95 shadow-2xs hover:border-slate-400"
              >
                {kw.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. CATEGORIES & KEYWORDS SECTION */}
      <section className="space-y-6 pt-6 border-t border-slate-200/60" id="home-category-browser">
        
        {/* Header bar with view toggler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <span>Categorías y Palabras Clave</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">5 áreas oficiales</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Haz clic en cualquier palabra clave para abrir su guía o en una categoría para explorar sus detalles.</p>
          </div>

          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer w-fit"
            >
              <RefreshCw size={12} />
              <span>Ver todas las categorías</span>
            </button>
          )}
        </div>

        {/* IF A CATEGORY IS SELECTED: SHOW ITS EXPANDED CARDS */}
        {selectedCategory ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {CATEGORY_DEFINITIONS.find(c => c.id === selectedCategory)?.emoji}
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{selectedCategory}</h4>
                  <p className="text-xs text-slate-500">{CATEGORY_DEFINITIONS.find(c => c.id === selectedCategory)?.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Volver
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryProcedures.map(proc => (
                <div
                  key={proc.id}
                  onClick={() => onSelectProcedure(proc)}
                  className="bg-white border border-gray-200 hover:border-blue-500/80 hover:shadow-md p-4 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-wider font-mono">
                        🏛️ {proc.entity || 'Gob.pe'}
                      </span>
                      {getModalityBadge(proc.modality)}
                    </div>
                    <h5 className="font-extrabold text-slate-900 text-sm md:text-base group-hover:text-blue-600 transition-colors leading-snug">
                      {proc.title}
                    </h5>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                      {proc.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 font-mono">
                      <Clock size={12} className="text-slate-400" />
                      <span>{proc.duration || proc.estimatedDuration}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-all">
                      <span>Iniciar guía</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* INITIAL CATEGORIES & KEYWORDS TILES GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="category-keywords-grid">
            {CATEGORY_DEFINITIONS.map(cat => {
              const CatIcon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="bg-white border border-slate-200 hover:border-slate-400 p-5 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between space-y-4 group"
                >
                  {/* Category Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{cat.emoji}</span>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {cat.label}
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                            {cat.entity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>

                  {/* Keywords Pills inside Category */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                      <Tag size={10} />
                      Palabras Clave:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {cat.keywords.map((kw, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleKeywordClick(kw.id)}
                          className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 text-slate-800 hover:text-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between group/kw"
                        >
                          <span className="truncate pr-2">• {kw.text}</span>
                          <ArrowRight size={12} className="text-slate-400 group-hover/kw:text-blue-600 shrink-0 transition-transform group-hover/kw:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="w-full text-center py-2 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>Explorar categoría {cat.label}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. METRICS SUMMARY CARDS, FEATURES HIGHLIGHT & COVERED INSTITUTIONS (Only for Guest mode) */}
      {!userProfile && (
        <>
          {/* 5.1. METRICS SUMMARY CARDS */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 border-t border-slate-200/60" id="home-metrics-summary">
            {/* Card 1: Trámites Guías */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-slate-200">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <FileText size={20} className="stroke-[2.5]" />
              </div>
              <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4">9</span>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono mt-2">Trámites priorizados</h4>
              <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed max-w-[200px]">
                Explicados paso a paso y completamente actualizados.
              </p>
            </div>

            {/* Card 2: Entidades Cubiertas */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-slate-200">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Shield size={20} className="stroke-[2.5]" />
              </div>
              <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4">7</span>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono mt-2">Entidades oficiales</h4>
              <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed max-w-[200px]">
                RENIEC, SUNAT, MTC, Migraciones, SUNARP, Municipalidades y Embajada EE.UU.
              </p>
            </div>

            {/* Card 3: Tiempo Ahorrado (Highlight Dark Card) */}
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-500/5 pointer-events-none" />
              
              <div className="p-3 bg-slate-900/80 text-cyan-400 border border-slate-800 rounded-2xl z-10">
                <Clock size={20} className="stroke-[2.5]" />
              </div>
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-4 z-10">85%</span>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono mt-2 z-10">Tiempo ahorrado</h4>
              <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed max-w-[200px] z-10">
                Reducción de colas, demoras y visitas innecesarias.
              </p>
            </div>
          </section>

          {/* 5.2. FEATURES HIGHLIGHT */}
          <section className="space-y-8 pt-8 border-t border-slate-200/60" id="home-features-overview">
            <div className="text-center space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Menos confusión, más control</h3>
              <p className="text-sm text-slate-500 font-medium max-w-2xl mx-auto px-4">
                TramIA te acompaña en cada paso para que nunca pierdas tiempo ni dinero.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'Orienta',
                  desc: 'Identificamos el trámite correcto para tu caso y te explicamos cómo hacerlo paso a paso, sin tecnicismos.',
                  icon: FileText
                },
                {
                  title: 'Gestiona',
                  desc: 'Organiza requisitos, documentos y citas en un solo panel centralizado pensado para ti.',
                  icon: Shield
                },
                {
                  title: 'Da seguimiento',
                  desc: 'Marca avances, recibe alertas de vencimientos y mantén siempre el control del estado real.',
                  icon: Clock
                }
              ].map((feat, idx) => {
                const FeatIcon = feat.icon;
                return (
                  <div 
                    key={idx}
                    className="bg-slate-50/60 border border-slate-100 hover:border-slate-200 p-6 rounded-2xl transition-all duration-300 hover:shadow-2xs flex flex-col items-start gap-4"
                  >
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                      <FeatIcon size={18} className="stroke-[2.5]" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-extrabold text-slate-950 tracking-tight">
                        {feat.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5.3. INSTITUTIONS WE COVER */}
          <section className="space-y-6 pt-8 border-t border-slate-200/60 text-center" id="home-institutions-covered">
            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Entidades oficiales cubiertas</h3>
              <p className="text-sm text-slate-500 font-medium">Información respaldada por portales oficiales del Estado peruano y la Embajada de EE.UU.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-xl mx-auto px-2">
              {[
                'RENIEC',
                'SUNAT',
                'MTC',
                'Migraciones',
                'SUNARP',
                'Municipalidades',
                'Embajada EE.UU.'
              ].map((name, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/80 hover:border-blue-400 px-5 py-2 sm:py-2.5 rounded-full transition-all duration-250 hover:shadow-2xs hover:-translate-y-0.5 cursor-default flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.03)] group"
                >
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 6. BOTTOM CTAs CARD */}
      {!userProfile && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl mt-8 relative overflow-hidden animate-fadeIn" id="home-bottom-cta-banner">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-1.5 z-10 flex-1">
            <h3 className="text-base font-black tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles size={16} className="text-cyan-400 animate-pulse" />
              ¿Listo para gestionar tu trámite?
            </h3>
            <p className="text-xs text-slate-350 leading-relaxed font-medium">
              Crea una cuenta gratuita para guardar tu progreso, recibir alertas y subir documentos.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => onTriggerLogin?.('signup')}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-lg shadow-blue-500/15 shrink-0 z-10 flex items-center gap-1.5"
            id="home-btn-create-free-account"
          >
            <span>Crear cuenta gratis</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

    </div>
  );
}


