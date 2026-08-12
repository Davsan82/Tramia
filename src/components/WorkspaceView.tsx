import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ArrowLeft, FileText, Sparkles, ShieldCheck, 
  UploadCloud, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, ChevronUp,
  HelpCircle, Clock, RefreshCw, Layers, Lock,
  Check, MessageSquare, Building, Globe, DollarSign, Award,
  Trash2, CheckSquare, Square, FileUp, ExternalLink, Info, MousePointerClick
} from 'lucide-react';
import { Procedure, Requirement, Step } from '../types';
import { GESTORES_VERIFICADOS } from '../data';
import TramIABot from './TramIABot';
import DocumentValidationModal, { ValidationResult } from './DocumentValidationModal';
import { trackEvent } from '../utils/analytics';

function getPaymentInfo(stepTitle: string, stepDesc: string, procedureId: string) {
  const text = (stepTitle + " " + stepDesc).toLowerCase();
  if (text.includes("pagalo") || text.includes("págalo") || text.includes("tasa") || text.includes("banco de la nación") || text.includes("arancel")) {
    return {
      url: "https://pagalo.pe",
      label: "Pagar en Pagalo.pe (Oficial)",
      site: "pagalo.pe"
    };
  }
  if (text.includes("sat") || text.includes("multa")) {
    return {
      url: "https://www.sat.gob.pe",
      label: "Ir a SAT Virtual",
      site: "sat.gob.pe"
    };
  }
  if (text.includes("sunarp") || text.includes("reserva") || text.includes("propiedad")) {
    return {
      url: "https://www.sunarp.gob.pe",
      label: "Ir a SUNARP en Línea",
      site: "sunarp.gob.pe"
    };
  }
  if (text.includes("sunat") || text.includes("ruc")) {
    return {
      url: "https://www.sunat.gob.pe",
      label: "Ir a SUNAT Virtual",
      site: "sunat.gob.pe"
    };
  }
  if (procedureId === "soat") {
    return {
      url: "https://www.interseguro.pe/soat",
      label: "Adquirir SOAT en Línea",
      site: "interseguro.pe"
    };
  }
  if (text.includes("pago") || text.includes("pagar") || text.includes("comprar") || text.includes("adquirir")) {
    return {
      url: "https://pagalo.pe",
      label: "Ir a Portal de Pago Seguro",
      site: "Plataforma del Estado"
    };
  }
  return null;
}

function getStepOfficialUrl(stepId: string, procedureId: string, defaultUrl: string) {
  const sId = stepId.toLowerCase();
  const pId = procedureId.toLowerCase();
  
  // Renovación DNI (RENIEC)
  if (pId === 'renovar-dni') {
    if (sId.includes('pago') || sId.includes('tasa') || sId.includes('pagar') || sId.includes('step-1')) {
      return "https://www.pagalo.pe/rates/02119";
    }
    if (sId.includes('foto') || sId.includes('biom') || sId.includes('step-2')) {
      return "https://www.gob.pe/12061-tomar-fotografia-para-el-dni-mediante-la-aplicacion-dni-biofacial";
    }
    if (sId.includes('present') || sId.includes('online') || sId.includes('step-3')) {
      return "https://apps.reniec.gob.pe/renovacionDni/";
    }
    if (sId.includes('entreg') || sId.includes('recog') || sId.includes('step-4')) {
      return "https://serviciosportal.reniec.gob.pe/cetdnipi/inicio.htm";
    }
  }

  // Pasaporte Biométrico
  if (pId === 'sacar-pasaporte') {
    if (sId.includes('pago') || sId.includes('tasa') || sId.includes('01810') || sId.includes('pass-1')) {
      return "https://www.pagalo.pe/rates/01810";
    }
    if (sId.includes('cita') || sId.includes('reserv') || sId.includes('pass-2')) {
      return "https://sel.migraciones.gob.pe/web-citas/";
    }
    if (sId.includes('biometr') || sId.includes('captur') || sId.includes('pass-3')) {
      return "https://www.gob.pe/112-obtener-pasaporte-electronico-ordinario#pasos-del-tramite";
    }
    if (sId.includes('emision') || sId.includes('entreg') || sId.includes('pass-4')) {
      return "https://www.gob.pe/112-obtener-pasaporte-electronico-ordinario";
    }
  }

  // Licencia de Conducir (MTC)
  if (pId === 'licencia-conducir') {
    if (sId.includes('medico') || sId.includes('psico') || sId.includes('step-lc-1')) {
      return "https://rec.mtc.gob.pe/LicenciaConducir/ArctSgCentroMedicoAutorizado";
    }
    if (sId.includes('reglas') || sId.includes('conocimiento') || sId.includes('step-lc-2')) {
      return "https://licencias.mtc.gob.pe/";
    }
    if (sId.includes('manejo') || sId.includes('practic') || sId.includes('step-lc-3')) {
      return "https://touring.pe/inscripciones/";
    }
    if (sId.includes('emision') || sId.includes('tramit') || sId.includes('step-lc-4')) {
      return "https://licencias-tramite.mtc.gob.pe/";
    }
  }

  // RUC SUNAT
  if (pId === 'ruc-sunat') {
    if (sId.includes('solicitud') || sId.includes('inscrib') || sId.includes('step-ruc-1')) {
      return "https://www.gob.pe/654-inscribirse-en-el-ruc";
    }
    if (sId.includes('sol') || sId.includes('clave') || sId.includes('step-ruc-2')) {
      return "https://www.gob.pe/671-obtener-clave-sol";
    }
    if (sId.includes('activ') || sId.includes('tribut') || sId.includes('step-ruc-3')) {
      return "https://www.sunat.gob.pe/operacioneslineas.html";
    }
  }

  // SUNARP
  if (pId === 'reserva-nombre' || pId === 'copia-literal' || pId === 'inscripcion-casa') {
    return "https://www.sunarp.gob.pe/sprl/inicio";
  }

  // SAT & Alcabala
  if (pId === 'multas-sat' || pId === 'pago-alcabala') {
    return "https://www.sat.gob.pe/WebSiteV9/Inicio/Papeletas";
  }

  // Fallback defaults
  if (sId.includes("pago") || sId.includes("tasa") || sId.includes("pagar") || sId.includes("abono")) {
    return "https://www.pagalo.pe";
  }
  return defaultUrl;
}

function getOfficialSource(procedureId: string) {
  switch (procedureId) {
    case 'sacar-pasaporte':
      return {
        url: 'https://www.gob.pe/pasaporte',
        siteName: 'Superintendencia Nacional de Migraciones',
        description: 'La información de este trámite está basada en la Plataforma Única del Estado Peruano y los portales oficiales de Migraciones.'
      };
    case 'licencia-conducir':
      return {
        url: 'https://licencias.mtc.gob.pe/',
        siteName: 'Ministerio de Transportes y Comunicaciones (MTC)',
        description: 'La información de este trámite está basada en el Portal Oficial del MTC.'
      };
    case 'ruc-sunat':
      return {
        url: 'https://www.sunat.gob.pe',
        siteName: 'Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT)',
        description: 'La información de este trámite está basada en los portales oficiales de SUNAT.'
      };
    case 'reserva-nombre':
    case 'copia-literal':
    case 'inscripcion-casa':
      return {
        url: 'https://www.gob.pe/sunarp',
        siteName: 'Superintendencia Nacional de los Registros Públicos (SUNARP)',
        description: 'La información de este trámite está basada en el Portal Institucional de la SUNARP.'
      };
    case 'multas-sat':
    case 'pago-alcabala':
      return {
        url: 'https://www.sat.gob.pe',
        siteName: 'Servicio de Administración Tributaria de Lima (SAT)',
        description: 'La información de este trámite está basada en el Portal del SAT de Lima.'
      };
    case 'soat':
      return {
        url: 'https://www.apeseg.org.pe',
        siteName: 'Asociación Peruana de Empresas de Seguros (APESEG)',
        description: 'La información de este trámite está basada en el registro oficial de la APESEG.'
      };
    case 'renovar-dni':
    case 'acta-nacimiento':
    case 'dni-menor':
    default:
      return {
        url: 'https://www.gob.pe/reniec',
        siteName: 'Registro Nacional de Identificación y Estado Civil (RENIEC)',
        description: 'La información de este trámite está basada en los portales oficiales del Estado Peruano.'
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

const getComplexityBadgeStyle = (complexity: string) => {
  switch (complexity) {
    case 'Baja':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'Media':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'Alta':
      return 'bg-red-50 text-red-700 border-red-100';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-150';
  }
};

/**
 * Determinación precisa de si un paso requiere carga de evidencia (foto/documento) o si es una confirmación manual
 */
function isStepEvidenceRequired(step: Step, procedure: Procedure, requirements: Requirement[]): boolean {
  if (step.requiresEvidence !== undefined) return step.requiresEvidence;

  const stepReqs = requirements.filter(r => r.requiredForStepId === step.id);
  if (stepReqs.some(r => r.requiresEvidence === true)) return true;
  if (stepReqs.some(r => r.requiresEvidence === false)) return false;

  const combinedText = (
    step.title + " " + step.description + " " + stepReqs.map(r => r.name + " " + r.description).join(" ")
  ).toLowerCase();

  // Pasos que son acciones puras del usuario (pago, formulario web, reservar cita, recojo presencial)
  // No solicitan recibos ni documentos innecesarios (Regla 6)
  if (
    combinedText.includes("pago") || 
    combinedText.includes("pagar") || 
    combinedText.includes("tasa") || 
    combinedText.includes("pagalo") || 
    combinedText.includes("voucher") || 
    combinedText.includes("comprobante") ||
    combinedText.includes("cita") || 
    combinedText.includes("reservar") || 
    combinedText.includes("formulario web") || 
    combinedText.includes("llenar") || 
    combinedText.includes("recoger") || 
    combinedText.includes("entrega") || 
    combinedText.includes("asistir") ||
    combinedText.includes("consulta")
  ) {
    return false;
  }

  // Pasos con verdadero valor agregado para análisis/validación (fotografía biométrica, examen médico, minuta legal)
  if (
    combinedText.includes("foto") || 
    combinedText.includes("biométri") || 
    combinedText.includes("biometri") || 
    combinedText.includes("selfie") || 
    combinedText.includes("rostro") || 
    combinedText.includes("certificado médico") || 
    combinedText.includes("minuta") || 
    combinedText.includes("partida de nacimiento") ||
    combinedText.includes("escritura pública")
  ) {
    return true;
  }

  if (stepReqs.some(r => r.uploadedFileName && !r.uploadedFileName.includes('manual') && !r.uploadedFileName.includes('Modo Guía'))) {
    return true;
  }

  return false;
}

interface WorkspaceViewProps {
  procedure: Procedure;
  onBack: () => void;
  onAddActiveProcedure: (
    proc: Procedure,
    currentPercentage: number,
    isDelegated: boolean,
    customReqs: Requirement[],
    currentStepId?: string,
    isQuiet?: boolean,
    isPaid?: boolean,
    completedStepIds?: string[]
  ) => void;
  isNewUser?: boolean;
  initialIsDelegated?: boolean;
  initialIsPaid?: boolean;
  onDeleteProcedure?: (procedureId: string) => void;
}

export default function WorkspaceView({
  procedure,
  onBack,
  onAddActiveProcedure,
  initialIsDelegated = false,
  initialIsPaid = false,
  onDeleteProcedure
}: WorkspaceViewProps) {
  const officialSource = getOfficialSource(procedure.id);
  const isPrivate = ['soat', 'escritura-casa', 'permiso-menores'].includes(procedure.id);
  const isMixed = ['crear-empresa', 'constituir-eirl'].includes(procedure.id);
  const procedureType = isPrivate ? 'Privado' : isMixed ? 'Estatal / Privado' : 'Estatal';

  // Navigation: Autogestionar vs Delegar
  const [isDelegated, setIsDelegated] = useState<boolean>(initialIsDelegated);
  const [isBotChatOpen, setIsBotChatOpen] = useState(false);

  // AI Document Validation Modal State
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [activeValidationRequirement, setActiveValidationRequirement] = useState<Requirement | null>(null);

  const handleOpenAiValidation = (req: Requirement) => {
    setActiveValidationRequirement(req);
    setIsValidationModalOpen(true);
  };

  // Deletion modals state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteRestrictedModal, setShowDeleteRestrictedModal] = useState(false);

  const handleDeleteProcedureClick = () => {
    if (isDelegated && isPaid) {
      setShowDeleteRestrictedModal(true);
    } else {
      setShowDeleteConfirmModal(true);
    }
  };

  // Requirements state
  const [requirements, setRequirements] = useState<Requirement[]>(() => {
    return procedure.requirements.map(r => {
      if (r.uploadedFileName || (r.status && r.status !== 'Por iniciar' && r.status !== 'Pendiente')) {
        return { ...r };
      }
      return {
        ...r,
        status: 'Pendiente',
        uploadedFileName: undefined,
        feedbackMessage: undefined,
        imageQuality: undefined,
        detectedErrors: undefined,
        recommendations: undefined,
        isValidated: false
      };
    });
  });

  // Checklist completion state for steps (by step.id)
  const [completedStepIds, setCompletedStepIds] = useState<string[]>(() => {
    if ((procedure as any).completedStepIds && Array.isArray((procedure as any).completedStepIds)) {
      return (procedure as any).completedStepIds;
    }
    const initialCompleted: string[] = [];
    procedure.steps.forEach(s => {
      const sReqs = procedure.requirements.filter(r => r.requiredForStepId === s.id);
      if (sReqs.length > 0 && sReqs.every(r => r.status === 'Aprobado')) {
        initialCompleted.push(s.id);
      }
    });
    return initialCompleted;
  });

  // Active expanded step state (accordion functionality)
  const [expandedStepId, setExpandedStepId] = useState<string | null>(() => {
    const firstPending = procedure.steps.find(s => {
      const sReqs = procedure.requirements.filter(r => r.requiredForStepId === s.id);
      return !(sReqs.length > 0 && sReqs.every(r => r.status === 'Aprobado'));
    });
    return firstPending ? firstPending.id : procedure.steps[0]?.id || null;
  });

  const toggleStepExpand = (stepId: string) => {
    setExpandedStepId(prev => (prev === stepId ? null : stepId));
  };

  // File upload trigger refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null);

  const handleTriggerUpload = (reqId: string) => {
    setUploadingReqId(reqId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingReqId) {
      runAISimulator(uploadingReqId, 'good', file.name);
    }
  };

  // Toggle manual confirmation checkbox
  const toggleManualStep = (stepId: string) => {
    setCompletedStepIds(prev => {
      let next: string[];
      if (prev.includes(stepId)) {
        next = prev.filter(id => id !== stepId);
      } else {
        next = [...prev, stepId];
        // Auto advance expand to next uncompleted step
        const currentIdx = procedure.steps.findIndex(s => s.id === stepId);
        const nextStep = procedure.steps.slice(currentIdx + 1).find(s => !next.includes(s.id));
        if (nextStep) {
          setExpandedStepId(nextStep.id);
        }
      }

      // Sync requirements
      setRequirements(prevReqs => prevReqs.map(r => {
        if (r.requiredForStepId === stepId) {
          const isNowCompleted = next.includes(stepId);
          return {
            ...r,
            status: isNowCompleted ? 'Aprobado' : 'Pendiente',
            uploadedFileName: isNowCompleted ? (r.uploadedFileName || 'Confirmado manualmente') : undefined,
            isValidated: isNowCompleted
          };
        }
        return r;
      }));

      return next;
    });
  };

  // Scanning & Simulator states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');

  const runAISimulator = (reqId: string, type: 'good' | 'bad' | 'blurry', customFileName?: string) => {
    setIsScanning(true);
    setScanStep('Leyendo archivo cargado...');
    
    setTimeout(() => {
      setScanStep('Analizando calidad de imagen e integridad...');
      setTimeout(() => {
        setScanStep('Cruzando registros con bases de datos públicas de TramIA...');
        setTimeout(() => {
          setIsScanning(false);
          
          let updatedReq: Partial<Requirement> = {};
          const originalReq = requirements.find(r => r.id === reqId || r.requiredForStepId === reqId);
          const reqName = originalReq ? originalReq.name : 'Documento';

          if (type === 'good') {
            updatedReq = {
              status: 'Aprobado',
              uploadedFileName: customFileName || `${reqId}_verificado.pdf`,
              feedbackMessage: `Verificado por TramIA: El archivo "${reqName}" ha sido validado exitosamente. Cumple plenamente con el estándar requerido.`,
              imageQuality: 'Buena',
              detectedErrors: [],
              isValidated: true
            };
          }

          // Update requirement
          setRequirements(prev => prev.map(r => {
            if (r.id === reqId || r.requiredForStepId === reqId) {
              return { ...r, ...updatedReq } as Requirement;
            }
            return r;
          }));

          // Mark associated step as completed automatically
          const targetStepId = originalReq?.requiredForStepId || reqId;
          setCompletedStepIds(prev => {
            const nextCompleted = Array.from(new Set([...prev, targetStepId]));
            const currentIdx = procedure.steps.findIndex(s => s.id === targetStepId);
            const nextUncompleted = procedure.steps.slice(currentIdx + 1).find(s => !nextCompleted.includes(s.id));
            if (nextUncompleted) {
              setExpandedStepId(nextUncompleted.id);
            }
            return nextCompleted;
          });

        }, 1000);
      }, 900);
    }, 700);
  };

  // Delegation states (Flow B)
  const advisor = GESTORES_VERIFICADOS[0];
  const [isPaid, setIsPaid] = useState<boolean>(initialIsPaid);
  const [isPaying, setIsPaying] = useState<boolean>(false);

  const allDocumentsApproved = useMemo(() => {
    return requirements.every(r => r.status === 'Aprobado');
  }, [requirements]);

  // Real-time Progress percentage calculation
  const totalSteps = procedure.steps.length;
  const lastStep = totalSteps > 0 ? procedure.steps[totalSteps - 1] : undefined;

  const completionPercentageA = useMemo(() => {
    if (totalSteps === 0) return 0;
    const count = completedStepIds.length;
    return Math.round((count / totalSteps) * 100);
  }, [completedStepIds, totalSteps]);

  const isLastStepCompleted = useMemo(() => {
    return lastStep ? completedStepIds.includes(lastStep.id) : false;
  }, [lastStep, completedStepIds]);

  const isPriorStepsCompleted = useMemo(() => {
    if (totalSteps <= 1) return false;
    const priorSteps = procedure.steps.slice(0, totalSteps - 1);
    return priorSteps.every(s => completedStepIds.includes(s.id)) && !isLastStepCompleted;
  }, [procedure.steps, completedStepIds, isLastStepCompleted, totalSteps]);

  const completionPercentageB = useMemo(() => {
    const totalReqs = requirements.length;
    if (totalReqs === 0) return 0;
    const approvedCount = requirements.filter(r => r.status === 'Aprobado').length;
    const rawPct = Math.round((approvedCount / totalReqs) * 100);
    return rawPct === 100 ? 95 : rawPct;
  }, [requirements]);

  // Synchronize progress with parent App in real time
  useEffect(() => {
    const activeStepId = procedure.steps.find(s => !completedStepIds.includes(s.id))?.id || 'completed';
    const pct = isDelegated ? completionPercentageB : completionPercentageA;
    onAddActiveProcedure(procedure, pct, isDelegated, requirements, activeStepId, true, isPaid, completedStepIds);
  }, [requirements, completedStepIds, isDelegated, completionPercentageA, completionPercentageB, isPaid]);

  const autoCompletedTrackedRef = useRef(false);
  const delegatedDocTrackedRef = useRef(false);

  useEffect(() => {
    if (!isDelegated && completionPercentageA === 100 && !autoCompletedTrackedRef.current) {
      autoCompletedTrackedRef.current = true;
      trackEvent('tramite_auto_completado', {
        procedure_id: procedure.id,
        procedure_title: procedure.title
      });
    }
  }, [isDelegated, completionPercentageA, procedure.id, procedure.title]);

  useEffect(() => {
    if (isDelegated && allDocumentsApproved && requirements.length > 0 && !delegatedDocTrackedRef.current) {
      delegatedDocTrackedRef.current = true;
      trackEvent('tramite_delegadado_documentado', {
        procedure_id: procedure.id,
        procedure_title: procedure.title
      });
    }
  }, [isDelegated, allDocumentsApproved, requirements.length, procedure.id, procedure.title]);

  const isAllStepsCompleted = completionPercentageA === 100 && isLastStepCompleted;

  return (
    <div className="space-y-6 animate-fadeIn" id="workspace-view-top">
      
      {/* Hidden File Input for Evidence Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*,.pdf"
      />

      {/* Mini Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium cursor-pointer"
        >
          <ArrowLeft size={16} />
          Volver a Trámites en Proceso
        </button>
        <div className="flex items-center gap-4">
          {!(isDelegated && isPaid) && (
            <button
              onClick={handleDeleteProcedureClick}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-white bg-white hover:bg-red-600 px-3 py-1.5 rounded-xl border border-red-200 hover:border-red-600 transition-all cursor-pointer shadow-xs"
              title="Eliminar trámite"
            >
              <Trash2 size={13} />
              Eliminar trámite
            </button>
          )}
        </div>
      </div>

      {/* Main Title Banner & Meta Info */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-600 font-mono tracking-wider uppercase">
                {isDelegated ? "TRÁMITE DELEGADO" : "AUTOGESTIÓN INTERACTIVA"}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
                isDelegated 
                  ? 'bg-purple-50 text-purple-700 border-purple-100' 
                  : 'bg-blue-50 text-blue-700 border-blue-100'
              }`}>
                {isDelegated ? "Delegación a Asesor Experto" : "Checklist Híbrido Paso a Paso"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {procedure.title}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {procedure.description}
            </p>
          </div>

          {/* Top-right meta badges */}
          <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 shrink-0 bg-slate-50/60 px-4 py-3 rounded-2xl border border-gray-100/80 min-w-full md:min-w-[190px] md:text-right">
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

            <div className="flex-1 md:flex-initial border-l md:border-l-0 md:border-t border-gray-200 pl-4 md:pl-0 md:pt-2 w-full">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-gray-100">
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Duración estimada</p>
              <p className="text-xs font-bold text-slate-900">{procedure.estimatedDuration || procedure.duration}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Tasa del Estado</p>
              <p className="text-xs font-bold text-slate-900">{procedure.estimatedCost}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Dificultad</p>
              <p className={`inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold rounded-md border ${getComplexityBadgeStyle(procedure.complexity)}`}>
                {procedure.complexity}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* ======================== FLOW A: AUTOGESTIONAR TRÁMITE ================== */}
      {/* ========================================================================= */}
      {!isDelegated ? (
        <div className="space-y-6">
          
          {/* CHECKLIST HYBRID PROGRESS BANNER */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckSquare size={18} className="text-blue-600" />
                  <h2 className="text-lg font-black text-slate-900">Checklist de Autogestión Paso a Paso</h2>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Completa cada acción según las indicaciones para avanzar de forma autónoma.
                </p>
              </div>

              {/* Progress metric box */}
              <div className="bg-blue-50/80 border border-blue-100/80 px-4 py-2.5 rounded-2xl text-right shrink-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 font-mono">Avance en Tiempo Real</p>
                <p className="text-lg font-black text-blue-950 font-mono">
                  {completedStepIds.length} de {procedure.steps.length} Actividades • {completionPercentageA}%
                </p>
                <p className={`text-[11px] font-bold font-sans mt-0.5 ${
                  isAllStepsCompleted 
                    ? 'text-emerald-700' 
                    : isPriorStepsCompleted 
                    ? 'text-amber-700' 
                    : 'text-blue-700'
                }`}>
                  {isAllStepsCompleted 
                    ? "Estado: Trámite finalizado" 
                    : isPriorStepsCompleted 
                    ? "Estado: Pendiente de recoger documento" 
                    : "Estado: En curso"}
                </p>
              </div>
            </div>

            {/* Dynamic Real-time Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                <div 
                  className={`h-full rounded-full transition-all duration-500 shadow-xs ${
                    isAllStepsCompleted ? 'bg-emerald-600' : isPriorStepsCompleted ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${completionPercentageA}%` }}
                />
              </div>
            </div>

            {/* Legend showing visual difference between manual and evidence steps (Rules 4 & 5) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-sky-50/60 border border-sky-100 rounded-2xl flex items-center gap-3">
                <span className="p-2 bg-sky-100 text-sky-800 rounded-xl shrink-0">
                  <CheckSquare size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-sky-950">Acciones del Usuario (Confirmación Manual)</p>
                  <p className="text-[11px] text-sky-800/90 leading-tight">
                    Pagos, formularios web, citas o recojos. Marca el checkbox cuando lo hayas realizado.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-center gap-3">
                <span className="p-2 bg-purple-100 text-purple-800 rounded-xl shrink-0">
                  <FileUp size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-purple-950">Evidencias (Validación por Archivo)</p>
                  <p className="text-[11px] text-purple-800/90 leading-tight">
                    Fotografías o certificados clave. El sistema lo completa automáticamente al subir el archivo.
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* INTERMEDIATE BANNER: ALL REQUIREMENTS COMPLETED EXCEPT FINAL PICKUP */}
          {isPriorStepsCompleted && !isAllStepsCompleted && (
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-6 md:p-8 space-y-3 shadow-xs animate-fadeIn">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  <Building size={24} />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-amber-200/90 text-amber-950 text-[10px] font-black uppercase font-mono rounded-md">
                      Paso Final Presencial Requerido
                    </span>
                    <span className="text-xs font-bold text-amber-850 font-mono">
                      {completedStepIds.length} de {procedure.steps.length} Actividades ({completionPercentageA}%)
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-amber-950 leading-snug">
                    ¡Excelente! Ya completaste todos los requisitos del trámite.
                  </h3>
                  <p className="text-xs md:text-sm text-amber-900 font-medium leading-relaxed">
                    Solo queda acudir a la oficina o sede correspondiente para recoger tu documento.
                  </p>
                  <p className="text-[11px] text-amber-850 font-semibold italic pt-1 border-t border-amber-200/80 mt-2">
                    📌 Una vez que hayas acudido a la entidad pública y tengas tu documento en mano, marca la casilla del último paso ("{lastStep?.title}") en el checklist para dar por finalizado tu trámite al 100%.
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* DEFINITIVE COMPLETION BANNER: 100% COMPLETE */}
          {isAllStepsCompleted && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 md:p-8 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-sm">
                ✓
              </div>
              <div className="space-y-1.5 max-w-xl mx-auto">
                <span className="inline-block px-3 py-0.5 bg-emerald-200/80 text-emerald-900 font-black text-[10px] uppercase font-mono tracking-wider rounded-md">
                  Trámite Finalizado al 100%
                </span>
                <h3 className="text-xl font-extrabold text-emerald-950">
                  ¡Has completado al 100% tu trámite! 🎉
                </h3>
                <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                  Todas las actividades del trámite, incluyendo la recogida oficial del documento en la entidad pública, han sido completadas con éxito.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => setCompletedStepIds([])}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-gray-200 cursor-pointer shadow-2xs"
                >
                  Reiniciar checklist
                </button>
                <button
                  onClick={onBack}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <span>Volver a Mis Trámites</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}


          {/* COMPACT ACCORDION CHECKLIST ITEM LIST */}
          <div className="space-y-2">
            {procedure.steps.map((step, idx) => {
              const isEvidenceStep = isStepEvidenceRequired(step, procedure, requirements);
              const isStepDone = completedStepIds.includes(step.id);
              const isExpanded = expandedStepId === step.id;
              const stepReq = requirements.find(r => r.requiredForStepId === step.id) || requirements[0];
              const paymentInfo = getPaymentInfo(step.title, step.description, procedure.id);
              const officialUrl = getStepOfficialUrl(step.id, procedure.id, officialSource.url);

              return (
                <div 
                  key={step.id} 
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isStepDone 
                      ? 'bg-emerald-50/20 border-emerald-200/70' 
                      : isExpanded
                        ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-500/10'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Step Header (Clickable Accordion Row) */}
                  <div 
                    onClick={() => toggleStepExpand(step.id)}
                    className="p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Step Number Badge */}
                      <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center text-[10px] font-black font-mono shrink-0 ${
                        isStepDone 
                          ? 'bg-emerald-600 text-white' 
                          : isExpanded
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-white'
                      }`}>
                        {isStepDone ? '✓' : idx + 1}
                      </div>

                      {/* Step Title & Type Badge */}
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <h3 className={`text-xs sm:text-sm font-extrabold truncate ${isStepDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                          {step.title}
                        </h3>

                        {isEvidenceStep ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200/80 inline-flex items-center gap-0.5 shrink-0">
                            <FileUp size={10} className="text-purple-600" />
                            Evidencia
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-50 text-sky-700 border border-sky-200/80 inline-flex items-center gap-0.5 shrink-0">
                            <CheckSquare size={10} className="text-sky-600" />
                            Manual
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side: Status badge & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isStepDone ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md font-mono">
                          Completado ✓
                        </span>
                      ) : isExpanded ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md font-mono">
                          En curso
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md font-mono">
                          Pendiente
                        </span>
                      )}

                      <div className="text-slate-400 p-0.5">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Step Expanded Content (Details on Demand) */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-100/80 space-y-2.5 animate-fadeIn">
                      {/* Instruction text */}
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-snug font-medium pl-8">
                        {step.description}
                      </p>

                      {/* Direct Link to Official Portal if available */}
                      {(paymentInfo || officialUrl) && !isStepDone && (
                        <div className="pl-8">
                          <a
                            href={paymentInfo ? paymentInfo.url : officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-md border border-gray-200 transition-all cursor-pointer shadow-2xs"
                          >
                            <Globe size={12} className="text-blue-600" />
                            <span>{paymentInfo ? paymentInfo.label : "Ir al Portal Oficial"}</span>
                            <ExternalLink size={10} className="text-slate-400" />
                          </a>
                        </div>
                      )}

                      {/* Action Area (Compact Upload zone or Manual Check) */}
                      <div className="pl-8">
                        {isEvidenceStep ? (
                          <div className="mt-1">
                            {!isStepDone || (stepReq && stepReq.status === 'Corregir') ? (
                              <div className="p-2.5 bg-purple-50/40 border border-purple-200/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-purple-950 font-bold text-xs">
                                  <UploadCloud size={15} className="text-purple-600 shrink-0" />
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-purple-950">Adjuntar evidencia requerida</p>
                                    <p className="text-[10px] text-slate-500 font-normal">Validación automática por IA de TramIA</p>
                                  </div>
                                </div>

                                 {isScanning && uploadingReqId === (stepReq?.id || step.id) ? (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-900 rounded-lg text-xs font-bold animate-pulse">
                                    <RefreshCw className="animate-spin" size={14} />
                                    <span>{scanStep}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTriggerUpload(stepReq?.id || step.id);
                                      }}
                                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                                    >
                                      <UploadCloud size={13} />
                                      <span>Subir y validar</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-2 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-emerald-950 truncate">
                                      Evidencia validada: {stepReq?.uploadedFileName || 'Documento cargado'}
                                    </p>
                                    {stepReq?.feedbackMessage && (
                                      <p className="text-[10px] text-emerald-800 line-clamp-1">
                                        {stepReq.feedbackMessage}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTriggerUpload(stepReq?.id || step.id);
                                  }}
                                  className="text-[10px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer shrink-0"
                                >
                                  Reemplazar
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleManualStep(step.id);
                              }}
                              className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                isStepDone
                                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                                  : 'bg-white border-gray-200 hover:border-sky-400 hover:bg-sky-50/20 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                                  isStepDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-gray-300 text-transparent'
                                }`}>
                                  <Check size={12} strokeWidth={3} />
                                </div>
                                <div>
                                  <p className="text-xs font-extrabold">
                                    {isStepDone ? 'Actividad completada ✓' : 'Marcar actividad como realizada'}
                                  </p>
                                </div>
                              </div>

                              {isStepDone && (
                                <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                                  Listo ✓
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* ======================== FLOW B: DELEGATE TO TRAMIA ===================== */
        /* ========================================================================= */
        <div className="space-y-6">
          
          {allDocumentsApproved ? (
            !isPaid ? (
              /* SERVICE SUMMARY VIEW FOR DELEGATION */
              <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-8 animate-fadeIn max-w-2xl mx-auto">
                <div className="space-y-2 text-center md:text-left">
                  <span className="px-3 py-1 text-[10px] font-bold font-mono tracking-wider uppercase rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Paso final de delegación
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">Resumen del Servicio</h3>
                  <p className="text-xs text-slate-500">
                    Revisa los detalles de tu trámite delegado y la tarifa correspondiente antes de iniciar el pago seguro y comenzar la delegación.
                  </p>
                </div>

                {/* Assigned Advisor Info */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-5 p-4 bg-slate-50 border border-gray-200/55 rounded-2xl">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img 
                      src={advisor.avatar} 
                      alt={advisor.name} 
                      className="w-14 h-14 rounded-full object-cover ring-4 ring-blue-50 border-2 border-white shadow-md shrink-0" 
                    />
                    <div className="text-center sm:text-left space-y-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-black tracking-wider uppercase font-mono">
                        Asesor Experto Asignado
                      </span>
                      <h4 className="text-xs font-black text-slate-900">{advisor.name} te ayudará a gestionar este procedimiento.</h4>
                      <p className="text-[11px] text-gray-500">{advisor.colegiatura} • Contarás con un asesor humano durante todo el proceso del trámite delegado.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsBotChatOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <MessageSquare size={13} className="text-slate-300" />
                    Contactar a tu Asesor
                  </button>
                </div>

                {/* Cost Breakdown Grid */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">Desglose del Costo</h4>
                  
                  <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl bg-slate-50/20 overflow-hidden text-xs">
                    <div className="p-4 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-slate-600 font-medium block">Honorarios del Asesor (Tarifa de Servicio TramIA)</span>
                        <span className="text-[10px] text-gray-400 block font-light">Asistencia experta premium, revisión continua de documentos y presentación formal</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">{procedure.feeAmount || 'S/. 65.00'}</span>
                    </div>

                    <div className="p-4 bg-blue-50/30 flex justify-between items-center border-t border-blue-100">
                      <div className="space-y-0.5">
                        <span className="text-blue-900 font-black text-xs block uppercase tracking-wider">Monto Total</span>
                        <span className="text-[10px] text-blue-700 font-medium block">Pago seguro cifrado por PCI-DSS</span>
                      </div>
                      <span className="font-black text-lg text-blue-950 font-mono">
                        {procedure.feeAmount || 'S/. 65.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estimation and metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-150 rounded-2xl bg-white space-y-1">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider font-mono block">Tiempo Estimado</span>
                    <p className="text-xs font-bold text-slate-900">{procedure.estimatedDuration || procedure.duration || "5 días hábiles"}</p>
                  </div>

                  <div className="p-4 border border-gray-150 rounded-2xl bg-white space-y-1">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider font-mono block">Tiempo Ahorrado</span>
                    <p className="text-xs font-bold text-emerald-700">12 horas de colas y papeleo</p>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={onBack}
                      disabled={isPaying}
                      className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Regresar
                    </button>

                    <button
                      onClick={handleDeleteProcedureClick}
                      disabled={isPaying}
                      className="flex-1 sm:flex-none px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Eliminar trámite
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsPaying(true);
                      setTimeout(() => {
                        setIsPaying(false);
                        setIsPaid(true);
                        trackEvent('tramite_delegado_pagado', {
                          procedure_id: procedure.id,
                          procedure_title: procedure.title,
                          amount: procedure.feeAmount || 'S/. 65.00'
                        });
                        onAddActiveProcedure(procedure, completionPercentageB, true, requirements, undefined, true, true);
                      }, 1800);
                    }}
                    disabled={isPaying}
                    className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    {isPaying ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Procesando pago seguro...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Pagar y comenzar delegación
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* CONFIRMATION VIEW (POST-PAYMENT) */
              <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-8 animate-fadeIn max-w-2xl mx-auto">
                <div className="text-center py-4 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold animate-bounce shadow-xs">
                    ✓
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Pago Confirmado</h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Tu Asesor de TramIA comenzará a gestionar tu trámite ante la entidad pública.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 border border-gray-100 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <img 
                      src={advisor.avatar} 
                      alt={advisor.name} 
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-50 border border-white shrink-0" 
                    />
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black tracking-wider uppercase text-emerald-600 font-mono block">Asesor Asignado</span>
                      <h4 className="text-xs font-bold text-slate-900">{advisor.name} te ayudará a gestionar este procedimiento.</h4>
                      <p className="text-[10px] text-gray-500">Contarás con un asesor humano durante todo el proceso del trámite delegado.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsBotChatOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    <MessageSquare size={12} className="text-slate-300" />
                    Contactar a tu Asesor
                  </button>
                </div>

                <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[10px] text-gray-400 font-mono">Código de seguimiento: TRM-{procedure.id.toUpperCase()}-94A</span>
                  <button
                    onClick={onBack}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Ir a Mis Trámites
                  </button>
                </div>
              </div>
            )
          ) : (
            /* UPLOAD REQUIREMENTS FOR DELEGATION */
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Documentos Necesarios para la Delegación</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sube los documentos requeridos para que tu gestor pueda representarte formalmente ante la entidad.
                  </p>
                </div>

                <div className="space-y-3">
                  {requirements.map((req) => (
                    <div key={req.id} className="p-4 bg-slate-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{req.name}</h4>
                        <p className="text-[11px] text-slate-500">{req.description}</p>
                      </div>
                      {req.status === 'Aprobado' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase font-mono">
                          Cargado ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTriggerUpload(req.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <UploadCloud size={13} />
                          Subir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisor Card in Delegated Flow */}
              <div className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={advisor.avatar} 
                    alt={advisor.name} 
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-100 border border-slate-200 shrink-0" 
                  />
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-slate-900">
                      {advisor.name} te ayudará a gestionar este procedimiento.
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                      Antes de que el asesor comience con las gestiones presenciales o aranceles, TramIA necesita todos tus documentos obligatorios. Contarás con la asistencia de un asesor humano en todo momento.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBotChatOpen(true)}
                  className="shrink-0 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl border border-slate-800 shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <MessageSquare size={14} className="text-slate-300" />
                  <span>Contactar a tu Asesor</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TramIA Bot Modal */}
      {isBotChatOpen && (
        <TramIABot 
          procedure={procedure}
          requirements={requirements}
          isPaid={isPaid}
          advisorName={advisor.name}
          isOpen={isBotChatOpen}
          onClose={() => setIsBotChatOpen(false)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">¿Eliminar este trámite?</h3>
                <p className="text-xs text-slate-500 font-medium">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-gray-200">
              Se eliminará permanentemente <strong className="text-slate-900">"{procedure.title}"</strong> de tu lista de trámites en proceso, perdiendo todo el avance del checklist y los documentos adjuntos.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  if (onDeleteProcedure) {
                    onDeleteProcedure(procedure.id);
                  }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Sí, eliminar trámite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Restricted Modal (Paid Delegated Procedure) */}
      {showDeleteRestrictedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Opción no disponible</h3>
                <p className="text-xs text-amber-600 font-bold">Trámite en gestión activa por asesor</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
              <p>
                Este trámite fue abonado y asignado a tu asesor experto <strong className="text-slate-900">{advisor.name}</strong>, quien ya inició las gestiones formales ante la entidad pública.
              </p>
              <p className="text-[11px] text-slate-500 font-medium pt-1">
                Por seguridad y cumplimiento legal, no es posible eliminar solicitudes activas pagadas. Si requieres cancelar o solicitar una reasignación, contacta a soporte de TramIA.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDeleteRestrictedModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Validation Modal Integration */}
      <DocumentValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        requirement={activeValidationRequirement}
        procedureTitle={procedure.title}
        onValidationSuccess={(result, fileName) => {
          if (!activeValidationRequirement) return;
          const targetReqId = activeValidationRequirement.id;
          
          setRequirements(prev => prev.map(r => {
            if (r.id === targetReqId) {
              return {
                ...r,
                status: result.isValidated ? 'Aprobado' : 'Corregir',
                uploadedFileName: fileName,
                feedbackMessage: result.summary,
                imageQuality: result.imageQuality as any,
                isValidated: result.isValidated,
                recommendations: result.recommendations,
                detectedErrors: result.detectedIssues?.map(i => i.title)
              };
            }
            return r;
          }));

          if (result.isValidated) {
            const targetStepId = activeValidationRequirement.requiredForStepId;
            setCompletedStepIds(prev => Array.from(new Set([...prev, targetStepId])));
          }
        }}
      />

    </div>
  );
}
