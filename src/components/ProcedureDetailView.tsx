import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Clock, DollarSign, Award, ChevronRight, ChevronDown,
  Sparkles, ShieldCheck, UserCheck, Layers, HelpCircle,
  ExternalLink, FileText, ArrowRight, Building, Globe, UploadCloud
} from 'lucide-react';
import { Procedure, Requirement, UserProfile } from '../types';
import DocumentValidationModal from './DocumentValidationModal';
import { trackEvent } from '../utils/analytics';

interface ProcedureDetailViewProps {
  procedure: Procedure;
  onBack: () => void;
  onStartProcedure: (procedure: Procedure, isDelegated: boolean, authMode?: 'login' | 'signup') => void;
  userProfile?: UserProfile | null;
  onTriggerLogin?: (mode?: 'login' | 'signup') => void;
}

function getOfficialSource(procedureId: string) {
  switch (procedureId) {
    case 'sacar-pasaporte':
      return {
        url: 'https://www.gob.pe/pasaporte',
        siteName: 'Superintendencia Nacional de Migraciones',
        description: 'La información de este trámite está basada en la Plataforma Única del Estado Peruano y los portales oficiales de la Superintendencia Nacional de Migraciones.'
      };
    case 'licencia-conducir':
      return {
        url: 'https://licencias.mtc.gob.pe/',
        siteName: 'Ministerio de Transportes y Comunicaciones (MTC)',
        description: 'La información de este trámite está basada en el Portal Oficial del Sistema Nacional de Conductores del MTC.'
      };
    case 'ruc-sunat':
      return {
        url: 'https://www.sunat.gob.pe',
        siteName: 'Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT)',
        description: 'La información de este trámite está basada en los portales oficiales de SUNAT y la normativa tributaria de la República del Perú.'
      };
    case 'reserva-nombre':
    case 'copia-literal':
    case 'inscripcion-casa':
      return {
        url: 'https://www.gob.pe/sunarp',
        siteName: 'Superintendencia Nacional de los Registros Públicos (SUNARP)',
        description: 'La información de este trámite está basada en el Portal Institucional de la SUNARP y el Sistema de Publicidad Registral.'
      };
    case 'multas-sat':
    case 'pago-alcabala':
      return {
        url: 'https://www.sat.gob.pe',
        siteName: 'Servicio de Administración Tributaria de Lima (SAT)',
        description: 'La información de este trámite está basada en el Portal del SAT de Lima y municipalidades de la República del Perú.'
      };
    case 'soat':
      return {
        url: 'https://www.apeseg.org.pe',
        siteName: 'Asociación Peruana de Empresas de Seguros (APESEG)',
        description: 'La información de este trámite está basada en el registro oficial de la APESEG y la normativa nacional de tránsito.'
      };
    case 'certificado-nacido-vivo':
      return {
        url: 'https://www.gob.pe/minsa',
        siteName: 'Ministerio de Salud (MINSA)',
        description: 'La información de este trámite está basada en el Sistema de Registro del Nacido Vivo del MINSA y RENIEC.'
      };
    case 'renovar-dni':
    case 'acta-nacimiento':
    case 'dni-menor':
    case 'active-1':
      return {
        url: 'https://www.gob.pe/reniec',
        siteName: 'Registro Nacional de Identificación y Estado Civil (RENIEC)',
        description: 'La información de este trámite está basada en el portal de la RENIEC para trámites de identificación y estado civil.'
      };
    default:
      return {
        url: 'https://www.gob.pe',
        siteName: 'Plataforma Digital Única del Estado Peruano',
        description: 'La información de este trámite está basada en los portales del Estado Peruano y las directivas institucionales oficiales.'
      };
  }
}

function formatEntityName(siteName: string) {
  if (siteName.includes('(')) {
    const match = siteName.match(/\(([^)]+)\)/);
    if (match) return match[1];
  }
  if (siteName.includes('Migraciones')) return 'Migraciones';
  if (siteName.includes('Salud')) return 'MINSA';
  if (siteName.includes('Asociación Peruana')) return 'APESEG';
  if (siteName.includes('Plataforma Digital Única')) return 'Gobierno del Perú';
  return siteName;
}

function getStepOfficialUrl(stepId: string, procedureId: string, defaultUrl: string) {
  const sId = stepId.toLowerCase();
  const pId = procedureId.toLowerCase();
  
  // Renovación DNI (RENIEC)
  if (pId === 'renovar-dni') {
    if (sId.includes('pago') || sId.includes('tasa') || sId.includes('pagar') || sId.includes('step-1')) {
      return "https://www.pagalo.pe/rates/02119"; // Pago de tasa de renovación DNI en Pagalo.pe
    }
    if (sId.includes('foto') || sId.includes('biom') || sId.includes('step-2')) {
      return "https://www.gob.pe/12061-tomar-fotografia-para-el-dni-mediante-la-aplicacion-dni-biofacial"; // DNI Biofacial Info
    }
    if (sId.includes('present') || sId.includes('online') || sId.includes('step-3')) {
      return "https://apps.reniec.gob.pe/renovacionDni/"; // Portal directo de Renovación RENIEC
    }
    if (sId.includes('entreg') || sId.includes('recog') || sId.includes('step-4')) {
      return "https://serviciosportal.reniec.gob.pe/cetdnipi/inicio.htm"; // Consulta de estado de trámite de DNI
    }
  }

  // Pasaporte Biométrico
  if (pId === 'sacar-pasaporte') {
    if (sId.includes('pago') || sId.includes('tasa') || sId.includes('01810') || sId.includes('pass-1')) {
      return "https://www.pagalo.pe/rates/01810"; // Código Tasa 01810 en Pagalo.pe
    }
    if (sId.includes('cita') || sId.includes('reserv') || sId.includes('pass-2')) {
      return "https://sel.migraciones.gob.pe/web-citas/"; // Programación directa de citas de Migraciones
    }
    if (sId.includes('biometr') || sId.includes('captur') || sId.includes('pass-3')) {
      return "https://www.gob.pe/112-obtener-pasaporte-electronico-ordinario#pasos-del-tramite"; // Pasos exactos en gob.pe
    }
    if (sId.includes('emision') || sId.includes('entreg') || sId.includes('pass-4')) {
      return "https://www.gob.pe/112-obtener-pasaporte-electronico-ordinario";
    }
  }

  // Licencia de Conducir (MTC)
  if (pId === 'licencia-conducir') {
    if (sId.includes('medico') || sId.includes('psico') || sId.includes('step-lc-1')) {
      return "https://rec.mtc.gob.pe/LicenciaConducir/ArctSgCentroMedicoAutorizado"; // Centros médicos autorizados MTC
    }
    if (sId.includes('reglas') || sId.includes('conocimiento') || sId.includes('step-lc-2')) {
      return "https://licencias.mtc.gob.pe/"; // Turnos de evaluación de reglas
    }
    if (sId.includes('manejo') || sId.includes('practic') || sId.includes('step-lc-3')) {
      return "https://touring.pe/inscripciones/"; // Touring e Automóvil Club para reservas de manejo
    }
    if (sId.includes('emision') || sId.includes('tramit') || sId.includes('step-lc-4')) {
      return "https://licencias-tramite.mtc.gob.pe/"; // Trámite de emisión de licencia física o electrónica
    }
  }

  // RUC SUNAT
  if (pId === 'ruc-sunat') {
    if (sId.includes('solicitud') || sId.includes('inscrib') || sId.includes('step-ruc-1')) {
      return "https://www.gob.pe/654-inscribirse-en-el-ruc"; // Trámite paso a paso de Inscripción en RUC
    }
    if (sId.includes('sol') || sId.includes('clave') || sId.includes('step-ruc-2')) {
      return "https://www.gob.pe/671-obtener-clave-sol"; // Obtener Clave SOL de SUNAT
    }
    if (sId.includes('activ') || sId.includes('tribut') || sId.includes('step-ruc-3')) {
      return "https://www.sunat.gob.pe/operacioneslineas.html"; // Mis Operaciones en Línea SUNAT
    }
  }

  // SUNARP (Reserva de Nombre, Copia Literal, Inscripción Casa)
  if (pId === 'reserva-nombre' || pId === 'copia-literal' || pId === 'inscripcion-casa') {
    if (sId.includes('busqued') || sId.includes('indice')) {
      return "https://www.sunarp.gob.pe/sprl/inicio"; // SPRL Oficina Virtual SUNARP
    }
    if (sId.includes('reserv') || sId.includes('nombre')) {
      return "https://www.sunarp.gob.pe/sprl/inicio"; // Reserva online SUNARP
    }
    if (sId.includes('copia') || sId.includes('literal') || sId.includes('partida')) {
      return "https://www.sunarp.gob.pe/sprl/inicio"; // Solicitud de Publicidad Registral de SUNARP
    }
    if (sId.includes('notaria') || sId.includes('escritura')) {
      return "https://www.gob.pe/sunarp";
    }
  }

  // SAT & Alcabala
  if (pId === 'multas-sat' || pId === 'pago-alcabala') {
    if (sId.includes('consult') || sId.includes('deuda') || sId.includes('papeleta')) {
      return "https://www.sat.gob.pe/WebSiteV9/Inicio/Papeletas"; // Consulta de papeletas SAT de Lima
    }
    if (sId.includes('pago') || sId.includes('liquidac') || sId.includes('alcabala')) {
      return "https://www.sat.gob.pe/WebSiteV9/Inicio/FormasPago"; // Canales de Pago SAT de Lima
    }
  }

  // SOAT
  if (pId === 'soat') {
    if (sId.includes('consulta') || sId.includes('vigencia')) {
      return "https://www.apeseg.org.pe/consulta-soat/"; // Consulta oficial APESEG SOAT
    }
    return "https://www.interseguro.pe/soat"; // Venta directa de SOAT digital
  }

  // Fallback defaults
  if (sId.includes("pago") || sId.includes("tasa") || sId.includes("pagar") || sId.includes("abono") || sId.includes("01810") || sId.includes("02119") || sId.includes("05214")) {
    return "https://www.pagalo.pe";
  }
  
  return defaultUrl;
}

export default function ProcedureDetailView({
  procedure,
  onBack,
  onStartProcedure,
  userProfile,
  onTriggerLogin
}: ProcedureDetailViewProps) {
  const [selectedReqForModal, setSelectedReqForModal] = useState<Requirement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  useEffect(() => {
    trackEvent('tramite_revisado', {
      procedure_id: procedure.id,
      procedure_title: procedure.title,
      category: procedure.category
    });
  }, [procedure.id]);

  const officialSource = getOfficialSource(procedure.id);

  // Determine if the procedure is private or state-owned
  const isPrivate = ['soat', 'escritura-casa', 'permiso-menores'].includes(procedure.id);
  const isMixed = ['crear-empresa', 'constituir-eirl'].includes(procedure.id);
  const procedureType = isPrivate ? 'Privado' : isMixed ? 'Estatal / Privado' : 'Estatal';

  // Complexity level styling helper
  const getComplexityBadgeStyle = (complexity: string) => {
    switch (complexity) {
      case 'Baja':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Media':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Alta':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn max-w-5xl mx-auto px-4" id="procedure-detail-root">
      
      {/* Back button and simple category badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-semibold transition-colors cursor-pointer"
          id="back-to-search-btn"
        >
          <ArrowLeft size={16} />
          Volver a la búsqueda
        </button>
        
        <span className="px-3 py-1 text-xs font-bold font-mono tracking-wider uppercase rounded-full border bg-slate-50 text-slate-700 border-slate-200">
          Mesa de Partes • {procedure.category}
        </span>
      </div>

      {/* Main Overview Panel - Full Width */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-5">
          <div className="space-y-2 flex-1">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {procedure.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
              {procedure.description}
            </p>
          </div>

          {/* Top-right meta badges for Type and Entity */}
          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0 bg-slate-50/80 px-3.5 py-2.5 rounded-xl border border-gray-100 min-w-full md:min-w-[180px] md:text-right">
            <div className="flex-1 md:flex-initial">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">Tipo de Trámite</p>
              <div className="mt-0.5 flex md:justify-end items-center gap-1">
                <Globe size={12} className={procedureType === 'Privado' ? 'text-purple-500' : 'text-blue-500'} />
                <span className={`inline-block text-[11px] font-extrabold ${
                  procedureType === 'Privado' 
                    ? 'text-purple-700' 
                    : procedureType === 'Estatal / Privado'
                    ? 'text-amber-700'
                    : 'text-blue-700'
                }`}>
                  {procedureType}
                </span>
              </div>
            </div>

            <div className="flex-1 md:flex-initial border-l md:border-l-0 md:border-t border-gray-200 pl-3 md:pl-0 md:pt-1.5 w-full">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">Entidad</p>
              <div className="mt-0.5 flex md:justify-end items-center gap-1">
                <Building size={12} className="text-slate-500 shrink-0" />
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  {formatEntityName(officialSource.siteName)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Core Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">Duración estimada</p>
              <p className="text-xs font-bold text-slate-900">{procedure.estimatedDuration || procedure.duration}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">Tasa del Estado</p>
              <p className="text-xs font-bold text-slate-900">{procedure.estimatedCost}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Award size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">Nivel de dificultad</p>
              <p className={`inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold rounded-md border ${getComplexityBadgeStyle(procedure.complexity)}`}>
                {procedure.complexity}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Main Action Banner: ¿Quieres gestionar este trámite? */}
      <div 
        id="procedure-action-banner"
        className="w-full bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border border-blue-800/40 rounded-2xl p-4 sm:p-5 md:p-6 shadow-md relative overflow-hidden group"
      >
        <div className="absolute -right-10 -top-10 w-56 h-56 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-3.5 max-w-2xl text-center sm:text-left">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30 shrink-0 hidden sm:block">
              <Sparkles size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-white tracking-tight">
                ¿Quieres gestionar este trámite?
              </h3>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
                {!userProfile 
                  ? "Crea una cuenta gratuita para hacer seguimiento, subir documentos y recibir alertas de vencimientos."
                  : "Agrégalo a tu panel para subir tus documentos de identidad, recibir alertas y realizar el seguimiento paso a paso."
                }
              </p>
            </div>
          </div>

          {/* Right: CTA Actions */}
          <div className="w-full sm:w-auto shrink-0 flex items-center justify-center sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-800/30">
            {!userProfile ? (
              <>
                <button
                  onClick={() => onStartProcedure(procedure, false, 'login')}
                  className="text-xs text-blue-200 hover:text-white font-semibold transition-colors underline underline-offset-2 cursor-pointer px-1.5 py-1 whitespace-nowrap"
                >
                  Ya tengo cuenta
                </button>
                
                <button
                  onClick={() => onStartProcedure(procedure, false, 'signup')}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                  id="cta-ir-al-tramite-signup"
                >
                  <span>Crear cuenta gratis</span>
                  <ArrowRight size={15} className="stroke-[2.5]" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onStartProcedure(procedure, false)}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                id="cta-ir-al-tramite-authed"
              >
                <span>Agregar a mis trámites</span>
                <ArrowRight size={15} className="stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Scroll Guide Arrow to Route */}
      <div className="flex justify-center -my-1">
        <button
          onClick={() => {
            document.getElementById('procedure-route-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-blue-50/80 text-slate-700 hover:text-blue-700 rounded-full border border-gray-200/90 shadow-2xs text-xs font-bold transition-all cursor-pointer group"
          title="Ver la ruta del procedimiento"
        >
          <span>Ver la ruta del procedimiento paso a paso</span>
          <ChevronDown size={14} className="text-blue-600 group-hover:translate-y-0.5 transition-transform animate-bounce" />
        </button>
      </div>

      {/* 2. Side-by-side cards: Fuente Oficial & Recomendaciones Generales (Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="procedure-secondary-cards">
        
        {/* Fuente Oficial Card (Very Compact) */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                <Globe size={12} className="text-slate-500" />
                Fuente Oficial
              </h3>
              <span className="text-[8.5px] font-mono uppercase font-extrabold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-gray-200">
                Gubernamental
              </span>
            </div>
            <p className="text-[11px] font-extrabold text-slate-900 leading-tight">
              {officialSource.siteName}
            </p>
            <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 font-medium">
              {officialSource.description}
            </p>
          </div>
          
          <a 
            href={officialSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1.5 border border-gray-200 hover:bg-slate-50 text-slate-800 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs"
          >
            <span>Ver sitio oficial</span>
            <ExternalLink size={11} className="text-slate-500" />
          </a>
        </div>

        {/* Recomendaciones Generales de TramIA Card (Very Compact) */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-blue-800 font-mono flex items-center gap-1">
                <Sparkles size={12} className="text-blue-600 shrink-0" />
                Recomendaciones generales
              </h3>
              <span className="text-[8.5px] font-mono uppercase font-extrabold px-1.5 py-0.5 bg-blue-100/70 text-blue-700 rounded-md border border-blue-200/50">
                Copiloto IA
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug font-medium line-clamp-3">
              {procedure.coPilotAdvice || "Verifica siempre la vigencia de tus documentos de identidad antes de iniciar la solicitud en la plataforma oficial."}
            </p>
          </div>

          <div className="pt-1 border-t border-blue-100/60 flex items-center justify-between text-[9px] font-bold text-blue-700 font-mono">
            <span>TramIA Copilot</span>
            <span className="text-blue-500">Verificado</span>
          </div>
        </div>

      </div>

      {/* Step-by-Step Procedure Route */}
      <section id="procedure-route-section" className="bg-slate-50/65 border border-gray-200/80 rounded-2xl p-4 sm:p-5 md:p-6 shadow-3xs space-y-4">
        <div>
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 font-mono flex items-center gap-2">
            <Layers size={14} className="text-slate-500" />
            Ruta del procedimiento
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Línea de tiempo oficial requerida paso a paso por las instituciones públicas en el Perú.</p>
        </div>

        {/* Vertical Timeline container */}
        <div className="relative pl-4 sm:pl-6 space-y-5 before:absolute before:left-4 sm:before:left-[23px] before:top-4 before:bottom-4 before:w-0.5 before:bg-blue-100">
          {procedure.steps && procedure.steps.length > 0 ? (
            procedure.steps.map((st, index) => {
              const stepReqs = procedure.requirements ? procedure.requirements.filter(r => r.requiredForStepId === st.id) : [];
              const stepUrl = getStepOfficialUrl(st.id, procedure.id, officialSource.url);
              
              return (
                <div key={st.id} className="relative flex gap-4 text-left group">
                  {/* Timeline number node indicator */}
                  <div className="absolute -left-9 sm:-left-11 w-7 h-7 rounded-full bg-white border-2 border-blue-500 text-blue-600 flex items-center justify-center font-extrabold text-xs font-mono z-10 shadow-xs transition-all group-hover:scale-105">
                    {index + 1}
                  </div>
                  
                  {/* Step Card with detailed document pills */}
                  <div className="flex-1 bg-white border border-gray-150 rounded-xl p-4 hover:border-gray-250 transition-all space-y-3 shadow-3xs">
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-950">
                        {st.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5 font-medium">
                        {st.description}
                      </p>
                    </div>

                    {/* Required documents rendered as clean capsules */}
                    {stepReqs.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono block">
                          DOCUMENTOS
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {stepReqs.map(req => (
                            <button 
                              key={req.id} 
                              onClick={() => {
                                setSelectedReqForModal(req);
                                setIsModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/90 hover:bg-blue-100 text-blue-800 rounded-lg text-[10px] font-bold border border-blue-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                              title="Haz clic para probar o auditar este requisito con IA"
                            >
                              <FileText size={10} className="text-blue-600 shrink-0" />
                              <span>{req.name}</span>
                              <Sparkles size={9} className="text-blue-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step official external link */}
                    <div className="pt-2 border-t border-gray-100/80 flex items-center justify-between">
                      <a 
                        href={stepUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer font-mono"
                      >
                        <ExternalLink size={11} />
                        Sitio oficial
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-gray-500">Pasos oficiales del trámite cargándose...</div>
          )}
        </div>
      </section>

      {/* Document Validation Modal */}
      <DocumentValidationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        requirement={selectedReqForModal}
        procedureTitle={procedure.title}
        userProfile={userProfile}
      />

    </div>
  );
}
