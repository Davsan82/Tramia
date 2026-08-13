import React, { useState, useMemo } from 'react';
import { 
  Search, Compass, ChevronRight, X, Clock, HelpCircle, 
  Sparkles, Check, BookmarkPlus, BookmarkCheck, ArrowUpRight,
  Info
} from 'lucide-react';
import { Procedure } from '../types';
import { trackEvent } from '../utils/analytics';

interface SearchViewProps {
  procedures: Procedure[];
  onSelectProcedure: (procedure: Procedure) => void;
  initialSearchText: string;
  onAddActiveProcedure?: (procedure: Procedure, isDelegated: boolean) => void;
  activeProcedures?: any[];
}

interface GoalDetail {
  id: string;
  emoji: string;
  title: string;
  explanation: string;
  procedures: {
    id: string;
    why: string;
    status: 'Mandatorio' | 'Recomendado' | 'Opcional';
    difficulty: 'Baja' | 'Media' | 'Alta';
  }[];
}

const GOALS_REGISTRY: Record<string, GoalDetail> = {
  car: {
    id: 'car',
    emoji: '🚗',
    title: 'Comprar un vehículo',
    explanation: 'He identificado los trámites requeridos para adquirir un automóvil y circular legalmente por el territorio nacional peruano. Dependiendo de si es nuevo o usado, algunos trámites pueden ser opcionales o obligatorios.',
    procedures: [
      { id: 'gravamen-vehicular', status: 'Recomendado', difficulty: 'Baja', why: 'Permite verificar que el vehículo no cuente con deudas, embargos ni órdenes de captura policiales vigentes.' },
      { id: 'multas-sat', status: 'Recomendado', difficulty: 'Baja', why: 'Evita heredar deudas de tránsito, papeletas acumuladas o multas tributarias del propietario anterior.' },
      { id: 'transferencia-vehicular', status: 'Mandatorio', difficulty: 'Media', why: 'Trámite legal indispensable para que pases a ser el propietario oficial del vehículo ante la SUNARP.' },
      { id: 'soat', status: 'Mandatorio', difficulty: 'Baja', why: 'Seguro obligatorio indispensable para poder circular con el auto de forma legal por vías públicas.' }
    ]
  },
  travel: {
    id: 'travel',
    emoji: '✈️',
    title: 'Viajar al extranjero',
    explanation: 'He identificado los trámites y requisitos necesarios para salir de forma legal del Perú. La vigencia del pasaporte y los permisos notariales para menores son filtros de control críticos en el aeropuerto.',
    procedures: [
      { id: 'sacar-pasaporte', status: 'Mandatorio', difficulty: 'Media', why: 'Documento nacional de viaje oficial e indispensable para el tránsito por controles internacionales.' },
      { id: 'permiso-menores', status: 'Opcional', difficulty: 'Baja', why: 'Requisito obligatorio por ley si viajas con un menor de edad sin la presencia física de ambos padres.' },
      { id: 'control-migratorio', status: 'Mandatorio', difficulty: 'Baja', why: 'Paso y validación biométrica obligatoria requerida ante Migraciones antes del abordaje internacional.' }
    ]
  },
  business: {
    id: 'business',
    emoji: '💼',
    title: 'Abrir una empresa / Constitución de negocio',
    explanation: 'Identifiqué la secuencia de trámites oficiales para formalizar tu empresa ante SUNARP, SUNAT y las municipalidades del país. Este itinerario te otorga personería jurídica y te permite emitir boletas o facturas comerciales.',
    procedures: [
      { id: 'reserva-nombre', status: 'Recomendado', difficulty: 'Baja', why: 'Protege tu razón social o denominación elegida impidiendo que otras empresas la registren en SUNARP.' },
      { id: 'crear-empresa', status: 'Mandatorio', difficulty: 'Alta', why: 'Establece formalmente tu personería jurídica mediante firma de escritura pública en Notaría.' },
      { id: 'ruc-sunat', status: 'Mandatorio', difficulty: 'Media', why: 'Inscripción tributaria oficial indispensable para emitir comprobantes de pago.' },
      { id: 'licencia-funcionamiento', status: 'Opcional', difficulty: 'Media', why: 'Autorización municipal obligatoria si planeas contar con un local o establecimiento abierto al público.' }
    ]
  },
  house: {
    id: 'house',
    emoji: '🏠',
    title: 'Comprar una casa / Inmueble',
    explanation: 'He estructurado los pasos legales para adquirir un inmueble de forma totalmente segura en el Perú, evitando fraudes registrales y garantizando la validez jurídica de tu patrimonio.',
    procedures: [
      { id: 'copia-literal', status: 'Recomendado', difficulty: 'Baja', why: 'Permite constatar quién es el propietario legítimo y verificar si la casa tiene gravámenes, cargas o hipotecas.' },
      { id: 'pago-alcabala', status: 'Mandatorio', difficulty: 'Media', why: 'Declaración y pago del tributo municipal obligatorio ante el SAT por la transferencia inmobiliaria.' },
      { id: 'escritura-casa', status: 'Mandatorio', difficulty: 'Alta', why: 'Protocolización de la compraventa y elevación a Escritura Pública ante un Notario Público colegiado.' },
      { id: 'inscripcion-casa', status: 'Mandatorio', difficulty: 'Media', why: 'Inscripción final en SUNARP para gozar de publicidad registral y proteger tu derecho de propiedad.' }
    ]
  },
  newborn: {
    id: 'newborn',
    emoji: '👶',
    title: 'Registrar un recién nacido',
    explanation: 'Felicidades por esta nueva etapa. He consolidado la secuencia ordenada de los trámites necesarios para registrar civilmente el nacimiento de tu hijo en el Perú, garantizando sus derechos de filiación e identidad.',
    procedures: [
      { id: 'certificado-nacido-vivo', status: 'Mandatorio', difficulty: 'Baja', why: 'Prueba de parto obligatoria expedida por el hospital o clínica para acreditar los datos biológicos.' },
      { id: 'acta-nacimiento', status: 'Mandatorio', difficulty: 'Baja', why: 'Inscripción que crea la partida oficial del menor de edad en la base de datos civil de RENIEC.' },
      { id: 'dni-menor', status: 'Mandatorio', difficulty: 'Media', why: 'Trámite de obtención del primer Documento Nacional de Identidad (DNI Amarillo) para afiliarlo a seguros y viajar.' }
    ]
  }
};

export default function SearchView({
  procedures,
  onSelectProcedure,
  initialSearchText,
  onAddActiveProcedure,
  activeProcedures
}: SearchViewProps) {
  const [query, setQuery] = useState(initialSearchText);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => ['Todos', ...Array.from(new Set(procedures.map((procedure) => procedure.category))).sort((a, b) => a.localeCompare(b, 'es'))],
    [procedures]
  );

  React.useEffect(() => {
    if (selectedCategory && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [categoryOptions, selectedCategory]);

  // Sync initial search text from parents (e.g. popular tags from Home)
  React.useEffect(() => {
    if (initialSearchText) {
      setQuery(initialSearchText);
    }
  }, [initialSearchText]);

  // Track search text typing from search view (debounced)
  React.useEffect(() => {
    if (!query || !query.trim()) return;
    const delayDebounceFn = setTimeout(() => {
      // Avoid tracking if it matches initial search text to avoid duplicates
      if (query !== initialSearchText) {
        trackEvent('busqueda_realizada', { query });
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [query, initialSearchText]);

  // Handle clearing search query
  const handleClear = () => {
    setQuery('');
  };

  // Level 1 -> Natural Language goal detector
  const detectedGoal = useMemo(() => {
    const text = query.toLowerCase();
    if (!text.trim()) return null;
    
    if (text.includes('carro') || text.includes('car') || text.includes('vehícul') || text.includes('vehicul') || text.includes('auto') || text.includes('conducir') || text.includes('brevete') || text.includes('placa') || text.includes('soat') || text.includes('papeleta') || text.includes('multa')) {
      return GOALS_REGISTRY.car;
    }
    if (text.includes('viaj') || text.includes('travel') || text.includes('extranjero') || text.includes('pasaport') || text.includes('vuelo') || text.includes('migracion') || text.includes('salida') || text.includes('menor')) {
      return GOALS_REGISTRY.travel;
    }
    if (text.includes('empresa') || text.includes('negocio') || text.includes('abrir') || text.includes('crear') || text.includes('constitu') || text.includes('sac') || text.includes('eirl') || text.includes('ruc') || text.includes('sunat')) {
      return GOALS_REGISTRY.business;
    }
    if (text.includes('casa') || text.includes('propiedad') || text.includes('comprar casa') || text.includes('departamento') || text.includes('terreno') || text.includes('inmueble') || text.includes('alcabala') || text.includes('hipoteca')) {
      return GOALS_REGISTRY.house;
    }
    if (text.includes('bebe') || text.includes('bebé') || text.includes('nacido') || text.includes('nacimiento') || text.includes('hijo') || text.includes('hija') || text.includes('recien') || text.includes('recién') || text.includes('parto') || text.includes('cnv') || text.includes('acta')) {
      return GOALS_REGISTRY.newborn;
    }
    return null;
  }, [query]);

  // Fallback / standard procedure keyword match if no goal detected
  const filteredProcedures = useMemo(() => {
    return procedures.filter(proc => {
      const MatchesQuery = proc.title.toLowerCase().includes(query.toLowerCase()) || 
                           proc.description.toLowerCase().includes(query.toLowerCase()) ||
                           proc.category.toLowerCase().includes(query.toLowerCase());
      
      const MatchesCategory = !selectedCategory || selectedCategory === 'Todos' || proc.category === selectedCategory;

      return MatchesQuery && MatchesCategory;
    });
  }, [procedures, query, selectedCategory]);

  const handleAddRoadmap = (e: React.MouseEvent, proc: Procedure) => {
    e.stopPropagation();
    if (onAddActiveProcedure) {
      onAddActiveProcedure(proc, false); // Add as autonomous first
      trackEvent('tramite_auto_elegido', {
        procedure_id: proc.id,
        procedure_title: proc.title,
        category: proc.category
      });
      setSuccessToast(`¡"${proc.title}" agregado con éxito a tu Hoja de Ruta!`);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const suggestedClicks = ['Comprar un carro', 'Viajar al extranjero', 'Abrir una empresa', 'Comprar una casa', 'Registrar un bebé'];

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto" id="search-view-root">
      
      {/* Toast alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-850 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-slideIn text-xs font-semibold">
          <div className="p-1 bg-emerald-500 rounded-full text-white">
            <Check size={12} strokeWidth={3} />
          </div>
          <span>{successToast}</span>
        </div>
      )}

      {/* Level 1: Core Goal / Search Input */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Compass className="text-slate-800" size={22} />
            Descubre y planifica tus trámites
          </h2>
          <p className="text-xs text-gray-500 mt-1">Escribe tu objetivo en lenguaje natural o selecciona una de las guías sugeridas de asesoramiento.</p>
        </div>

        {/* Big Search Bar */}
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe el trámite o la meta personal que deseas lograr..."
            className="w-full bg-white border border-gray-300 focus:ring-2 focus:ring-slate-100 focus:border-slate-800 text-sm md:text-base font-semibold px-12 py-3.5 rounded-2xl shadow-xs outline-hidden text-slate-950 transition-all placeholder:text-gray-400"
            autoFocus
          />
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-500">
          <span className="font-bold text-slate-800 shrink-0">Metas sugeridas:</span>
          {suggestedClicks.map((sug) => (
            <button
              key={sug}
              onClick={() => {
                setQuery(sug);
                trackEvent('busqueda_realizada', { query: sug });
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 rounded-full font-bold transition-all cursor-pointer text-[11px] border border-gray-200"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container rendering */}
      {detectedGoal ? (
        // ----------------- INTELLIGENT DISCOVERY GOAL VIEWER -----------------
        <div className="space-y-6 animate-fadeIn" id="goal-detected-container">
          
          {/* Level 2: Goal Detected Header */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
            {/* Ambient visual sparkle */}
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-sm bg-blue-600 text-white uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} />
                Objetivo Detectado por TramIA
              </span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-2.5">
              <span className="text-2xl md:text-3xl">{detectedGoal.emoji}</span>
              <span className="tracking-tight">{detectedGoal.title}</span>
            </h2>
            
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
              {detectedGoal.explanation}
            </p>
          </div>

          {/* Level 3: Recommended Procedures Grid */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} className="text-slate-500" />
              Trámites recomendados para cumplir esta meta
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="recommended-procedures-grid">
              {detectedGoal.procedures.map((gp) => {
                const proc = procedures.find(p => p.id === gp.id);
                if (!proc) return null;

                const IsAdded = activeProcedures?.some(ap => ap.id === proc.id);

                return (
                  <div
                    key={proc.id}
                    className="bg-white border border-gray-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative"
                    id={`proc-card-${proc.id}`}
                  >
                    <div className="space-y-3">
                      {/* Badge line */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider uppercase rounded-md border ${
                          gp.status === 'Mandatorio' ? 'bg-red-50 text-red-700 border-red-100' :
                          gp.status === 'Recomendado' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {gp.status}
                        </span>

                        <span className="text-[10px] font-bold text-gray-400 font-mono">
                          Dificultad: {gp.difficulty}
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm md:text-base leading-tight">
                          {proc.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {proc.description}
                        </p>
                      </div>

                      {/* Why Recommended Callout */}
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-gray-100 text-[11px] text-slate-600 leading-normal italic">
                        <span className="font-bold text-slate-800 not-italic mr-1">Por qué se recomienda:</span>
                        &ldquo;{gp.why}&rdquo;
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="space-y-3.5 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 font-mono">
                        <div>⏱️ DURACIÓN: {proc.estimatedDuration}</div>
                        <div>💰 TASA: {proc.estimatedCost}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => onSelectProcedure(proc)}
                          className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          Ver trámite
                          <ArrowUpRight size={12} />
                        </button>

                        {IsAdded ? (
                          <div className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 select-none">
                            <BookmarkCheck size={12} />
                            Agregado
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleAddRoadmap(e, proc)}
                            className="w-full py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <BookmarkPlus size={12} />
                            Añadir de ruta
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        // ----------------- STANDARD / FALLBACK RESULT LIST -----------------
        <div className="space-y-6">
          
          {/* Categories Tab Bar */}
          <div className="border-b border-gray-200 pb-1">
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap py-1 scrollbar-none">
              {categoryOptions.map((cat) => {
                const IsActive = (!selectedCategory && cat === 'Todos') || selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === 'Todos' ? null : cat)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      IsActive
                        ? 'bg-slate-950 text-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Result Cards List */}
            <div className="md:col-span-2 space-y-3.5">
              <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                {filteredProcedures.length === 1 ? '1 trámite disponible' : `${filteredProcedures.length} trámites disponibles`}
              </h3>

              {filteredProcedures.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                    <HelpCircle size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900 text-sm">No encontramos ese trámite</p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                      Escribe un objetivo como &ldquo;Comprar un auto&rdquo; o busca palabras generales como &ldquo;DNI&rdquo; o &ldquo;Pasaporte&rdquo;.
                    </p>
                  </div>
                  <button 
                    onClick={() => { setQuery(''); setSelectedCategory(null); }}
                    className="text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Restablecer búsqueda
                  </button>
                </div>
              ) : (
                <div className="space-y-3" id="fallback-results-list">
                  {filteredProcedures.map((proc) => {
                    const IsAdded = activeProcedures?.some(ap => ap.id === proc.id);
                    return (
                      <div
                        key={proc.id}
                        onClick={() => onSelectProcedure(proc)}
                        className="bg-white border border-gray-200 hover:border-slate-400 p-5 rounded-2xl hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="space-y-2.5 flex-1 pr-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider uppercase rounded-md border ${
                              proc.category === 'Identidad' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              proc.category === 'Transporte' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              proc.category === 'Finanzas' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              'bg-teal-50 text-teal-700 border-teal-100'
                            }`}>
                              {proc.category}
                            </span>
                            {proc.popular && (
                              <span className="text-[9px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-bold border border-gray-200 uppercase tracking-wide">
                                Popular
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm md:text-base group-hover:text-blue-600 transition-colors truncate leading-tight">
                            {proc.title}
                          </h4>

                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {proc.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[10px] text-gray-500 font-bold">
                            <span>⚡ Duración: {proc.estimatedDuration}</span>
                            <span>•</span>
                            <span>💰 Costo: {proc.estimatedCost}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white rounded-xl text-gray-400 transition-all">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Information Column */}
            <div className="space-y-6">
              {/* How does TramIA work */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">¿Cómo funciona TramIA?</h4>
                <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-medium">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900 font-mono shrink-0">01.</span>
                    <p>Describe tu objetivo global, por ejemplo: &ldquo;Quiero comprar un auto&rdquo;.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900 font-mono shrink-0">02.</span>
                    <p>TramIA identifica todos los trámites (filiación, tributos, registrales) necesarios.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900 font-mono shrink-0">03.</span>
                    <p>Revisa los requisitos, usa el validador de documentos con IA e inicia el trámite.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-900 font-mono shrink-0">04.</span>
                    <p>Elige autogestionar el proceso de forma gratuita o delegarlo de forma segura.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
