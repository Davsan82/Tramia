import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, ArrowRight, CheckCircle2, Sparkles, Clock, Download, Eye, 
  RefreshCw, FileText, TrendingUp, Car, Briefcase, Heart, Plane, Home, 
  Award, UserCheck, Check, X, ChevronRight, AlertTriangle, ShieldAlert,
  BarChart3, Activity, ArrowUpRight, Zap, Target, FileCheck, ThumbsUp
} from 'lucide-react';
import { Procedure, ActiveProcedure, ExpirationReminder, UserProfile } from '../types';

interface PanelViewProps {
  onSelectProcedure: (procedure: Procedure) => void;
  popularProcedures: Procedure[];
  activeCount: number;
  onViewActive: () => void;
  activeProcedures?: ActiveProcedure[];
  reminders?: ExpirationReminder[];
  userProfile?: UserProfile;
  onSelectProcedureById?: (procedureId: string) => void;
  onTriggerReminder?: (reminder: ExpirationReminder) => void;
  onSearch?: (text: string) => void;
  onStartSearch: () => void;
}

export default function PanelView({
  onSelectProcedure,
  popularProcedures,
  activeCount,
  onViewActive,
  activeProcedures = [],
  reminders = [],
  userProfile,
  onSelectProcedureById,
  onTriggerReminder,
  onSearch,
  onStartSearch
}: PanelViewProps) {
  // Interactive Document View Modal states
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<{
    name: string;
    type: string;
    status: 'Validado' | 'Pendiente';
    updated: string;
    number?: string;
    fileUrl?: string;
  } | null>(null);

  // Direct Interactive SOAT Renewal Flow State
  const [isSoatModalOpen, setIsSoatModalOpen] = useState(false);
  const [soatLicensePlate, setSoatLicensePlate] = useState('BXZ-392');
  const [soatProvider, setSoatProvider] = useState<'interseguro' | 'rimac' | 'pacifico'>('interseguro');
  const [soatStep, setSoatStep] = useState<'input' | 'paying' | 'success'>('input');
  const [isSoatRenewed, setIsSoatRenewed] = useState(false); // updates the administrative score to 100%!

  // Dynamic calculations for Administrative Health Score
  const healthScore = useMemo(() => {
    if (userProfile?.isNew) return 100;
    if (isSoatRenewed) return 100;
    return 92;
  }, [isSoatRenewed, userProfile]);

  // SOAT simulated purchase callback
  const handleRenewSoatComplete = () => {
    setSoatStep('paying');
    setTimeout(() => {
      setSoatStep('success');
      setIsSoatRenewed(true);
    }, 2000);
  };

  // Get user's first name
  const firstName = useMemo(() => {
    if (userProfile?.fullName) {
      return userProfile.fullName.split(' ')[0];
    }
    return 'Mayra';
  }, [userProfile]);

  // Handle suggestion click helper
  const handleSuggestionClick = (query: string) => {
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-12" id="panel-view-container">
      
      {/* HEADER: SaaS welcome bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6" id="panel-welcome-header">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black tracking-wider uppercase font-mono border border-blue-100">
            <Sparkles size={11} className="text-blue-600 animate-pulse" />
            Copiloto TramIA Activo
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <p className="text-xs text-slate-500 leading-normal">
            Aquí tienes el resumen del valor, tiempo y esfuerzo que has optimizado gestionando tus trámites con TramIA.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-gray-400 font-mono">Última sincronización con RENIEC: Hoy, 08:30 AM</span>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-white shadow-xs" title="Sistemas conectados" />
        </div>
      </section>

      {/* MAIN REDESIGNED BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch" id="panel-main-grid">
        
        {/* LARGE LEFT COLUMN (Spans 2 cols on desktop): METRICS, SAVINGS AND YEAR ACTIVITY */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SECTION: IMPACT SUMMARY */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-5" id="impact-summary-section">
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono">Resumen de Impacto</h3>
              <p className="text-[11px] text-gray-500 font-sans">Métricas clave del valor real acumulado en tu cuenta.</p>
            </div>

            {/* Unified grid for perfect box alignment (2x4 layout on md/lg, 4x2 on mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Hours Saved */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-teal-300 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-teal-500/10 text-teal-600 rounded-lg">
                    <Clock size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-teal-600 uppercase font-mono tracking-wider">Tiempo</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0 h" : "42 h"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Horas de vida ahorradas</p>
                </div>
              </div>

              {/* Card 2: Completed with TramIA */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                    <CheckCircle2 size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-blue-600 uppercase font-mono tracking-wider">Gestión</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0" : "8"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Trámites completados</p>
                </div>
              </div>

              {/* Card 3: Delegated */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-indigo-300 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg">
                    <UserCheck size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-indigo-600 uppercase font-mono tracking-wider">Delegado</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0" : "5"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Trámites delegados</p>
                </div>
              </div>

              {/* Card 4: Completed by myself */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-slate-400 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-slate-500/10 text-slate-650 rounded-lg">
                    <Activity size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-slate-550 uppercase font-mono tracking-wider">Auto</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0" : "3"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Por mí mismo</p>
                </div>
              </div>

              {/* Card 5: Government visits avoided */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-red-350 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-red-500/10 text-red-600 rounded-lg">
                    <Home size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-red-600 uppercase font-mono tracking-wider">Presencial</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0" : "14"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Visitas físicas evitadas</p>
                </div>
              </div>

              {/* Card 6: Documents verified by TramIA */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-emerald-350 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                    <FileCheck size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase font-mono tracking-wider">Verificación</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0" : "29"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Documentos verificados</p>
                </div>
              </div>

              {/* Card 7: Validation errors prevented */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-amber-350 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                    <AlertTriangle size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-amber-600 uppercase font-mono tracking-wider">Prevención</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0" : "18"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Errores prevenidos por IA</p>
                </div>
              </div>

              {/* Card 8: Level of Delegation */}
              <div className="p-4 bg-white border border-gray-250/70 rounded-2xl flex flex-col justify-between hover:border-cyan-300 hover:shadow-xs transition-all col-span-1 min-h-[110px]">
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-cyan-500/10 text-cyan-600 rounded-lg">
                    <TrendingUp size={14} />
                  </span>
                  <span className="text-[9px] font-bold text-cyan-600 uppercase font-mono tracking-wider">Delegación</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <p className="text-2xl font-black text-slate-900 font-mono leading-none">{userProfile?.isNew ? "0%" : "60%"}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Nivel de delegación</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Spans 1 col on desktop): HEALTH, ACTIVITY, RECOMMENDATIONS */}
        <div className="space-y-6">
          
          {/* ADMINISTRATIVE HEALTH */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4" id="administrative-health-section">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono">Salud Administrativa</h3>
                <span className="px-2 py-0.5 text-[9px] font-extrabold font-mono tracking-wider bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                  {healthScore === 100 ? "COMPLETA" : "ESTABLE"}
                </span>
              </div>
              
              <div className="flex items-center gap-4 py-2 bg-white p-3 rounded-2xl border border-gray-200">
                {/* Score Indicator Ring */}
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`transition-all duration-1000 ${healthScore === 100 ? 'text-teal-500' : 'text-blue-600'}`}
                      strokeDasharray={`${healthScore}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-slate-900 font-mono">{healthScore}%</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">
                    {userProfile?.isNew ? "100% Al día" : (healthScore === 100 ? "¡Todo al día!" : "92% Óptimo")}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {userProfile?.isNew 
                      ? "No tienes vencimientos o alertas pendientes en tu cuenta."
                      : (healthScore === 100 
                        ? "Felicidades, todos tus documentos nacionales están completamente actualizados." 
                        : "Todo está casi al día. Revisa los próximos vencimientos de abajo.")}
                  </p>
                </div>
              </div>

              {/* Upcoming Expirations */}
              <div className="space-y-3 pt-2" id="upcoming-expirations">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Próximos Vencimientos</p>
                
                {userProfile?.isNew ? (
                  <div className="text-center py-6 px-4 border border-dashed border-gray-250 rounded-2xl bg-slate-50/50">
                    <p className="text-[11px] font-bold text-slate-700">Sin vencimientos registrados</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal font-sans">Agrega tus documentos nacionales para monitorear vigencias de forma proactiva con IA.</p>
                  </div>
                ) : (
                  <>
                    {/* SOAT Item */}
                    <div className="flex items-start gap-3 text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                        isSoatRenewed 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                          : 'bg-red-50 border-red-100 text-red-600 animate-pulse'
                      }`}>
                        <Car size={12} />
                      </div>
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-850 text-[11px]">Seguro SOAT Vehicular</p>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded font-mono ${
                            isSoatRenewed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {isSoatRenewed ? "Vigente" : "Vence en 12d"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-tight">Placa BXZ-392. Vence el 12 de Julio.</p>
                        
                        {!isSoatRenewed && (
                          <button 
                            onClick={() => {
                              setSoatStep('input');
                              setIsSoatModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5 pt-1.5"
                          >
                            Renovar SOAT ahora <ChevronRight size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Brevete Item */}
                    <div className="flex items-start gap-3 text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Award size={12} />
                      </div>
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-850 text-[11px]">Licencia de Conducir</p>
                          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-mono">En 4 meses</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-tight">MTC Clase A-I. Vence el 15 de Noviembre.</p>
                        
                        <button 
                          onClick={() => {
                            const brevete = popularProcedures.find(p => p.id === 'licencia-conducir');
                            if (brevete) onSelectProcedure(brevete);
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5 pt-1.5"
                        >
                          Programar Examen Médico <ChevronRight size={10} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* SECOND ROW: RECOMMENDATIONS (Spans 2 columns) & RECENT ACTIVITY (Spans 1 column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mt-6" id="panel-secondary-grid">
        
        {/* RECOMMENDATIONS FROM TRAMIA (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between" id="tramia-recommendations-section">
          <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
            <Sparkles size={100} className="text-blue-400" />
          </div>

          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400 animate-pulse" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-300 font-mono">Recomendaciones de TramIA</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Recommendation 1 */}
              <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-cyan-400 bg-cyan-400/10 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                    Vehicular
                  </span>
                  <h4 className="text-[11px] font-bold text-slate-100">Compra de Auto Seguro</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">Evita estafas en SUNARP. TramIA puede verificar gravámenes y titularidad en segundos antes de comprar.</p>
                </div>
                <button 
                  onClick={() => handleSuggestionClick("comprar un auto")}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  Asistente Auto 🚗
                </button>
              </div>

              {/* Recommendation 2 */}
              <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-teal-400 bg-teal-400/10 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                    Empresarial
                  </span>
                  <h4 className="text-[11px] font-bold text-slate-100">Constitución de Empresa Exprés</h4>
                  <p className="text-[10px] text-slate-400 leading-tight font-sans">Saca tu RUC 20 en SUNARP con firma digital 100% online. Evita notarías costosas.</p>
                </div>
                <button 
                  onClick={() => handleSuggestionClick("constituir empresa")}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  Ver RUC 💼
                </button>
              </div>

              {/* Recommendation 3 */}
              <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider font-sans">
                    Viajes
                  </span>
                  <h4 className="text-[11px] font-bold text-slate-100 font-sans">Permisos de Viaje</h4>
                  <p className="text-[10px] text-slate-400 leading-tight font-sans">Si viajas con menores de edad, verifica el permiso notarial oficial exigido por migraciones.</p>
                </div>
                <button 
                  onClick={() => handleSuggestionClick("viajar al extranjero")}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 font-sans"
                >
                  Permisos de Viaje ✈
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY (Spans 1 column on desktop) */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between" id="recent-activity-section">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono">Actividad Reciente</h3>
            
            {userProfile?.isNew ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="p-3 bg-slate-50 border border-gray-150 rounded-2xl text-slate-400 mb-3 shrink-0">
                  <Activity size={20} />
                </div>
                <p className="text-[11px] font-bold text-slate-700">Sin actividad reciente</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-normal max-w-[180px]">Aquí verás las actualizaciones de tus trámites en tiempo real.</p>
              </div>
            ) : (
              <div className="space-y-4 relative pl-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 mt-4">
                {/* Item 1 */}
                <div className="relative text-xs">
                  <div className="absolute -left-3.5 top-1 w-1.5 h-1.5 rounded-full bg-blue-600 border border-white" />
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 text-[11px]">DNIe verificado por TramIA</p>
                    <p className="text-[10px] text-gray-400">Verificación de firma digital aprobada hace 2 horas</p>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="relative text-xs">
                  <div className="absolute -left-3.5 top-1 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white" />
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 text-[11px]">Pago procesado para Copia Literal</p>
                    <p className="text-[10px] text-gray-400">Tasa registral SUNARP pagada con éxito hace 1 día</p>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="relative text-xs">
                  <div className="absolute -left-3.5 top-1 w-1.5 h-1.5 rounded-full bg-indigo-500 border border-white" />
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 text-[11px]">Asesor asignado formalmente</p>
                    <p className="text-[10px] text-gray-400">Rodrigo Peralta tomó el trámite de Pasaporte hace 2 días</p>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="relative text-xs">
                  <div className="absolute -left-3.5 top-1 w-1.5 h-1.5 rounded-full bg-teal-500 border border-white" />
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 text-[11px]">Minuta de Constitución validada</p>
                    <p className="text-[10px] text-gray-400">Revisión de cláusulas comerciales aprobada hace 3 días</p>
                  </div>
                </div>

                {/* Item 5 */}
                <div className="relative text-xs">
                  <div className="absolute -left-3.5 top-1 w-1.5 h-1.5 rounded-full bg-slate-400 border border-white" />
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 text-[11px]">SOAT vehicular registrado</p>
                    <p className="text-[10px] text-gray-400">Certificado electrónico cargado al casillero hace 5 días</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DIRECT SOAT RENEWAL SIMULATOR MODAL (Interactive state triggers this!) */}
      {isSoatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="soat-renewal-modal">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-50 text-blue-600 rounded-lg">
                  <Car size={15} />
                </div>
                <h4 className="text-xs font-black text-slate-900 font-sans uppercase tracking-wider">Renovación de SOAT Electrónico</h4>
              </div>
              <button 
                onClick={() => setIsSoatModalOpen(false)}
                className="text-gray-400 hover:text-slate-800 p-1 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {soatStep === 'input' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-light">
                  El Seguro Obligatorio (SOAT) de tu vehículo con placa <strong className="text-slate-900 font-bold">BXZ-392</strong> vencerá pronto. Adquiere tu SOAT con TramIA y sube tu puntuación de Salud Administrativa al 100%.
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block">Número de placa vehicular:</label>
                  <input
                    type="text"
                    value={soatLicensePlate}
                    onChange={(e) => setSoatLicensePlate(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-500 uppercase text-center font-bold tracking-widest text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 block">Selecciona tu aseguradora autorizada preferida:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'interseguro' as const, name: 'Interseguro', price: 'S/. 49.00' },
                      { id: 'rimac' as const, name: 'Rimac', price: 'S/. 55.00' },
                      { id: 'pacifico' as const, name: 'Pacífico', price: 'S/. 58.00' }
                    ].map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setSoatProvider(prov.id)}
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-between h-16 ${
                          soatProvider === prov.id 
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-extrabold' 
                            : 'bg-white border-gray-100 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px] leading-tight block">{prov.name}</span>
                        <span className="text-[10px] text-blue-600 font-mono block mt-1">{prov.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-[11px] text-slate-600 font-sans">
                  <div className="flex justify-between">
                    <span>Aseguradora seleccionada:</span>
                    <span className="font-bold text-slate-950 capitalize">{soatProvider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vigencia:</span>
                    <span className="font-bold text-slate-950">1 Año Completo</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-1 mt-1 font-semibold text-slate-900">
                    <span>Monto Total a debitar:</span>
                    <span className="text-blue-600 font-mono text-sm">
                      {soatProvider === 'interseguro' ? 'S/. 49.00' : soatProvider === 'rimac' ? 'S/. 55.00' : 'S/. 58.00'}
                    </span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleRenewSoatComplete}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                >
                  <ShieldCheck size={14} />
                  Pagar y Registrar SOAT Electrónico
                </button>
              </div>
            )}

            {soatStep === 'paying' && (
              <div className="py-8 text-center space-y-4">
                <RefreshCw className="mx-auto text-blue-600 animate-spin" size={32} />
                <div className="space-y-1 font-sans">
                  <p className="text-xs font-bold text-slate-900">Procesando pago seguro...</p>
                  <p className="text-[10px] text-gray-400 leading-normal">TramIA está conectándose con la aseguradora y emitiendo el certificado electrónico oficial ante el MTC.</p>
                </div>
              </div>
            )}

            {soatStep === 'success' && (
              <div className="text-center py-4 space-y-4 font-sans">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100 animate-bounce">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-slate-900">¡SOAT Emitido Exitosamente!</p>
                  <p className="text-[11px] text-gray-500 leading-normal max-w-xs mx-auto font-light">
                    El certificado electrónico para la placa <strong className="text-slate-950 font-bold">{soatLicensePlate}</strong> se encuentra activo y registrado en el MTC.
                  </p>
                </div>

                <div className="bg-emerald-50 text-emerald-800 text-[10px] p-3 rounded-2xl border border-emerald-100 text-left max-w-xs mx-auto space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles size={11} /> Impacto en tu Salud Administrativa:
                  </p>
                  <p className="leading-normal font-light">Tu puntuación ha subido a <strong>100%</strong> y se ha desactivado la alerta de renovación pendiente.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSoatModalOpen(false)}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Excelente, volver al panel
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
