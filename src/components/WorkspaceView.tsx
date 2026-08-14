import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  ShieldCheck,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  RefreshCw,
  Layers,
  Lock,
  Check,
  MessageSquare,
  Building,
  Globe,
  DollarSign,
  Award,
  Trash2,
  CheckSquare,
  Square,
  FileUp,
  ExternalLink,
  Info,
  MousePointerClick,
  ClipboardList,
  CircleDashed,
  CalendarCheck2,
  X,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { Procedure, Requirement, Step } from "../types";
import { GESTORES_VERIFICADOS } from "../data";
import TramIABot from "./TramIABot";
import CaseDocuments from "./CaseDocuments";
import CaseMessages from "./CaseMessages";
import DocumentValidationModal, {
  ValidationResult,
} from "./DocumentValidationModal";
import { trackEvent } from "../utils/analytics";

function getPaymentInfo(
  stepTitle: string,
  stepDesc: string,
  procedureId: string,
) {
  const text = (stepTitle + " " + stepDesc).toLowerCase();
  if (
    text.includes("pagalo") ||
    text.includes("págalo") ||
    text.includes("tasa") ||
    text.includes("banco de la nación") ||
    text.includes("arancel")
  ) {
    return {
      url: "https://pagalo.pe",
      label: "Pagar en Pagalo.pe (Oficial)",
      site: "pagalo.pe",
    };
  }
  if (text.includes("sat") || text.includes("multa")) {
    return {
      url: "https://www.sat.gob.pe",
      label: "Ir a SAT Virtual",
      site: "sat.gob.pe",
    };
  }
  if (
    text.includes("sunarp") ||
    text.includes("reserva") ||
    text.includes("propiedad")
  ) {
    return {
      url: "https://www.sunarp.gob.pe",
      label: "Ir a SUNARP en Línea",
      site: "sunarp.gob.pe",
    };
  }
  if (text.includes("sunat") || text.includes("ruc")) {
    return {
      url: "https://www.sunat.gob.pe",
      label: "Ir a SUNAT Virtual",
      site: "sunat.gob.pe",
    };
  }
  if (procedureId === "soat") {
    return {
      url: "https://www.interseguro.pe/soat",
      label: "Adquirir SOAT en Línea",
      site: "interseguro.pe",
    };
  }
  if (
    text.includes("pago") ||
    text.includes("pagar") ||
    text.includes("comprar") ||
    text.includes("adquirir")
  ) {
    return {
      url: "https://pagalo.pe",
      label: "Ir a Portal de Pago Seguro",
      site: "Plataforma del Estado",
    };
  }
  return null;
}

function getStepOfficialUrl(
  stepId: string,
  procedureId: string,
  defaultUrl: string,
) {
  const sId = stepId.toLowerCase();
  const pId = procedureId.toLowerCase();

  // Renovación DNI (RENIEC)
  if (pId === "renovar-dni") {
    if (
      sId.includes("pago") ||
      sId.includes("tasa") ||
      sId.includes("pagar") ||
      sId.includes("step-1")
    ) {
      return "https://www.pagalo.pe/rates/02119";
    }
    if (
      sId.includes("foto") ||
      sId.includes("biom") ||
      sId.includes("step-2")
    ) {
      return "https://www.gob.pe/12061-tomar-fotografia-para-el-dni-mediante-la-aplicacion-dni-biofacial";
    }
    if (
      sId.includes("present") ||
      sId.includes("online") ||
      sId.includes("step-3")
    ) {
      return "https://apps.reniec.gob.pe/renovacionDni/";
    }
    if (
      sId.includes("entreg") ||
      sId.includes("recog") ||
      sId.includes("step-4")
    ) {
      return "https://serviciosportal.reniec.gob.pe/cetdnipi/inicio.htm";
    }
  }

  // Pasaporte Biométrico
  if (pId === "sacar-pasaporte") {
    if (
      sId.includes("pago") ||
      sId.includes("tasa") ||
      sId.includes("01810") ||
      sId.includes("pass-1")
    ) {
      return "https://www.pagalo.pe/rates/01810";
    }
    if (
      sId.includes("cita") ||
      sId.includes("reserv") ||
      sId.includes("pass-2")
    ) {
      return "https://sel.migraciones.gob.pe/web-citas/";
    }
    if (
      sId.includes("biometr") ||
      sId.includes("captur") ||
      sId.includes("pass-3")
    ) {
      return "https://www.gob.pe/112-obtener-pasaporte-electronico-ordinario#pasos-del-tramite";
    }
    if (
      sId.includes("emision") ||
      sId.includes("entreg") ||
      sId.includes("pass-4")
    ) {
      return "https://www.gob.pe/112-obtener-pasaporte-electronico-ordinario";
    }
  }

  // Licencia de Conducir (MTC)
  if (pId === "licencia-conducir") {
    if (
      sId.includes("medico") ||
      sId.includes("psico") ||
      sId.includes("step-lc-1")
    ) {
      return "https://rec.mtc.gob.pe/LicenciaConducir/ArctSgCentroMedicoAutorizado";
    }
    if (
      sId.includes("reglas") ||
      sId.includes("conocimiento") ||
      sId.includes("step-lc-2")
    ) {
      return "https://licencias.mtc.gob.pe/";
    }
    if (
      sId.includes("manejo") ||
      sId.includes("practic") ||
      sId.includes("step-lc-3")
    ) {
      return "https://touring.pe/inscripciones/";
    }
    if (
      sId.includes("emision") ||
      sId.includes("tramit") ||
      sId.includes("step-lc-4")
    ) {
      return "https://licencias-tramite.mtc.gob.pe/";
    }
  }

  // RUC SUNAT
  if (pId === "ruc-sunat") {
    if (
      sId.includes("solicitud") ||
      sId.includes("inscrib") ||
      sId.includes("step-ruc-1")
    ) {
      return "https://www.gob.pe/654-inscribirse-en-el-ruc";
    }
    if (
      sId.includes("sol") ||
      sId.includes("clave") ||
      sId.includes("step-ruc-2")
    ) {
      return "https://www.gob.pe/671-obtener-clave-sol";
    }
    if (
      sId.includes("activ") ||
      sId.includes("tribut") ||
      sId.includes("step-ruc-3")
    ) {
      return "https://www.sunat.gob.pe/operacioneslineas.html";
    }
  }

  // SUNARP
  if (
    pId === "reserva-nombre" ||
    pId === "copia-literal" ||
    pId === "inscripcion-casa"
  ) {
    return "https://www.sunarp.gob.pe/sprl/inicio";
  }

  // SAT & Alcabala
  if (pId === "multas-sat" || pId === "pago-alcabala") {
    return "https://www.sat.gob.pe/WebSiteV9/Inicio/Papeletas";
  }

  // Fallback defaults
  if (
    sId.includes("pago") ||
    sId.includes("tasa") ||
    sId.includes("pagar") ||
    sId.includes("abono")
  ) {
    return "https://www.pagalo.pe";
  }
  return defaultUrl;
}

function getOfficialSource(procedureId: string) {
  switch (procedureId) {
    case "sacar-pasaporte":
      return {
        url: "https://www.gob.pe/pasaporte",
        siteName: "Superintendencia Nacional de Migraciones",
        description:
          "La información de este trámite está basada en la Plataforma Única del Estado Peruano y los portales oficiales de Migraciones.",
      };
    case "licencia-conducir":
      return {
        url: "https://licencias.mtc.gob.pe/",
        siteName: "Ministerio de Transportes y Comunicaciones (MTC)",
        description:
          "La información de este trámite está basada en el Portal Oficial del MTC.",
      };
    case "ruc-sunat":
      return {
        url: "https://www.sunat.gob.pe",
        siteName:
          "Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT)",
        description:
          "La información de este trámite está basada en los portales oficiales de SUNAT.",
      };
    case "reserva-nombre":
    case "copia-literal":
    case "inscripcion-casa":
      return {
        url: "https://www.gob.pe/sunarp",
        siteName:
          "Superintendencia Nacional de los Registros Públicos (SUNARP)",
        description:
          "La información de este trámite está basada en el Portal Institucional de la SUNARP.",
      };
    case "multas-sat":
    case "pago-alcabala":
      return {
        url: "https://www.sat.gob.pe",
        siteName: "Servicio de Administración Tributaria de Lima (SAT)",
        description:
          "La información de este trámite está basada en el Portal del SAT de Lima.",
      };
    case "soat":
      return {
        url: "https://www.apeseg.org.pe",
        siteName: "Asociación Peruana de Empresas de Seguros (APESEG)",
        description:
          "La información de este trámite está basada en el registro oficial de la APESEG.",
      };
    case "renovar-dni":
    case "acta-nacimiento":
    case "dni-menor":
    default:
      return {
        url: "https://www.gob.pe/reniec",
        siteName: "Registro Nacional de Identificación y Estado Civil (RENIEC)",
        description:
          "La información de este trámite está basada en los portales oficiales del Estado Peruano.",
      };
  }
}

function formatEntityName(siteName: string) {
  if (siteName.includes("(")) {
    const match = siteName.match(/\(([^)]+)\)/);
    if (match) return match[1];
  }
  if (siteName.includes("Migraciones")) return "Migraciones";
  if (siteName.includes("Salud")) return "MINSA";
  if (siteName.includes("Asociación Peruana")) return "APESEG";
  if (siteName.includes("Plataforma Digital Única")) return "Gobierno del Perú";
  return siteName;
}

const getComplexityBadgeStyle = (complexity: string) => {
  switch (complexity) {
    case "Baja":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Media":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Alta":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-slate-50 text-slate-700 border-slate-150";
  }
};

const formatRecordedDate = (value?: string) => {
  if (!value) return "Fecha registrada";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

/**
 * Determinación precisa de si un paso requiere carga de evidencia (foto/documento) o si es una confirmación manual
 */
function isStepEvidenceRequired(
  step: Step,
  procedure: Procedure,
  requirements: Requirement[],
): boolean {
  if (step.requiresEvidence !== undefined) return step.requiresEvidence;

  const stepReqs = requirements.filter((r) => r.requiredForStepId === step.id);
  if (stepReqs.some((r) => r.requiresEvidence === true)) return true;
  if (stepReqs.some((r) => r.requiresEvidence === false)) return false;

  const combinedText = (
    step.title +
    " " +
    step.description +
    " " +
    stepReqs.map((r) => r.name + " " + r.description).join(" ")
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

  if (
    stepReqs.some(
      (r) =>
        r.uploadedFileName &&
        !r.uploadedFileName.includes("manual") &&
        !r.uploadedFileName.includes("Modo Guía"),
    )
  ) {
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
    completedStepIds?: string[],
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
  onDeleteProcedure,
}: WorkspaceViewProps) {
  const officialSource = getOfficialSource(procedure.id);
  const isPrivate = ["soat", "escritura-casa", "permiso-menores"].includes(
    procedure.id,
  );
  const isMixed = ["crear-empresa", "constituir-eirl"].includes(procedure.id);
  const procedureType = isPrivate
    ? "Privado"
    : isMixed
      ? "Estatal / Privado"
      : "Estatal";

  // Navigation: Autogestionar vs Delegar
  const [isDelegated, setIsDelegated] = useState<boolean>(initialIsDelegated);
  const [isBotChatOpen, setIsBotChatOpen] = useState(false);
  const [caseId, setCaseId] = useState<string>("");
  const [actionStep, setActionStep] = useState<Step | null>(null);
  const [actionData, setActionData] = useState<Record<string, string>>({});
  const today = () => new Date().toISOString().slice(0, 10);
  useEffect(() => {
    fetch(`/api/v1/my-procedures/by-procedure/${procedure.databaseId || procedure.id}/workspace`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((p) => setCaseId(p.instance?.id || ""))
      .catch(() => {});
  }, [procedure.databaseId, procedure.id]);
  const completeAction = async () => {
    if (!actionStep || !caseId) return;
    const response = await fetch(
        `/api/v1/my-procedures/${caseId}/steps/${actionStep.id}/complete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmCompleted: true, data: actionData }),
        },
      ),
      payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(payload.message || "No pudimos completar la etapa.");
      return;
    }
    setCompletedStepIds((value) => [...new Set([...value, actionStep.id])]);
    setCompletedStepDetails((value) => ({ ...value, [actionStep.id]: { ...actionData, completedAt: new Date().toISOString() } }));
    setRequirements((items) => items.map((item) => item.requiredForStepId === actionStep.id ? { ...item, status: "Aprobado", isValidated: true } : item));
    const currentIndex = procedure.steps.findIndex((item) => item.id === actionStep.id);
    const nextStep = procedure.steps.slice(currentIndex + 1).find((item) => !completedStepIds.includes(item.id));
    if (nextStep) setExpandedStepId(nextStep.id);
    setActionStep(null);
    setActionData({});
  };

  // AI Document Validation Modal State
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [activeValidationRequirement, setActiveValidationRequirement] =
    useState<Requirement | null>(null);

  const handleOpenAiValidation = (req: Requirement) => {
    setActiveValidationRequirement(req);
    setIsValidationModalOpen(true);
  };

  // Deletion modals state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteRestrictedModal, setShowDeleteRestrictedModal] =
    useState(false);

  const handleDeleteProcedureClick = () => {
    if (isDelegated && isPaid) {
      setShowDeleteRestrictedModal(true);
    } else {
      setShowDeleteConfirmModal(true);
    }
  };

  // Requirements state
  const [requirements, setRequirements] = useState<Requirement[]>(() => {
    return procedure.requirements.map((r) => {
      if (
        r.uploadedFileName ||
        (r.status && r.status !== "Por iniciar" && r.status !== "Pendiente")
      ) {
        return { ...r };
      }
      return {
        ...r,
        status: "Pendiente",
        uploadedFileName: undefined,
        feedbackMessage: undefined,
        imageQuality: undefined,
        detectedErrors: undefined,
        recommendations: undefined,
        isValidated: false,
      };
    });
  });

  // Checklist completion state for steps (by step.id)
  const [completedStepIds, setCompletedStepIds] = useState<string[]>(() => {
    if (
      (procedure as any).completedStepIds &&
      Array.isArray((procedure as any).completedStepIds)
    ) {
      return (procedure as any).completedStepIds;
    }
    const initialCompleted: string[] = [];
    procedure.steps.forEach((s) => {
      const sReqs = procedure.requirements.filter(
        (r) => r.requiredForStepId === s.id,
      );
      if (sReqs.length > 0 && sReqs.every((r) => r.status === "Aprobado")) {
        initialCompleted.push(s.id);
      }
    });
    return initialCompleted;
  });
  const [completedStepDetails, setCompletedStepDetails] = useState<Record<string, { date?: string; completedAt?: string; fileName?: string; documentId?: string }>>({});

  useEffect(() => {
    if (!caseId) return;
    fetch(`/api/v1/my-procedures/by-procedure/${procedure.databaseId || procedure.id}/workspace`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("workspace_unavailable");
        return response.json();
      })
      .then((payload) => {
        setCompletedStepIds(Array.isArray(payload.completedStepIds) ? payload.completedStepIds : []);
        setCompletedStepDetails(Object.fromEntries((payload.steps || []).filter((item: any) => item.status === "completed").map((item: any) => [item.procedureStepId, { ...(item.completionData || {}), completedAt: item.completedAt }])));
        const requirementState = new Map((payload.requirements || []).map((item: any) => [item.requirementId, item]));
        const labels: Record<string, Requirement["status"]> = { approved: "Aprobado", rejected: "Corregir", uploaded: "Validando", validating: "Validando", pending: "Pendiente" };
        setRequirements((items) => items.map((item) => {
          const persisted: any = requirementState.get(item.id);
          return persisted ? { ...item, userProcedureRequirementId: persisted.instanceId, status: labels[persisted.status] || "Pendiente", isValidated: persisted.status === "approved" } : item;
        }));
      })
      .catch(() => {});
  }, [caseId, procedure.databaseId, procedure.id]);

  // Active expanded step state (accordion functionality)
  const [expandedStepId, setExpandedStepId] = useState<string | null>(() => {
    const firstPending = procedure.steps.find((s) => {
      const sReqs = procedure.requirements.filter(
        (r) => r.requiredForStepId === s.id,
      );
      return !(sReqs.length > 0 && sReqs.every((r) => r.status === "Aprobado"));
    });
    return firstPending ? firstPending.id : procedure.steps[0]?.id || null;
  });

  const toggleStepExpand = (stepId: string) => {
    setExpandedStepId((prev) => (prev === stepId ? null : stepId));
  };

  // File upload trigger refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const closeUploadModal = () => {
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setUploadPreviewUrl("");
    setSelectedUploadFile(null);
    setUploadingReqId(null);
    setIsDraggingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectUploadFile = (file?: File) => {
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      alert("Selecciona un archivo PDF, JPG o PNG.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("El archivo debe pesar como máximo 8 MB.");
      return;
    }
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setSelectedUploadFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
  };

  const handleTriggerUpload = (reqId: string) => {
    setUploadingReqId(reqId);
  };

  const uploadSelectedEvidence = async () => {
    const file = selectedUploadFile;
    if (!file || !uploadingReqId || !caseId) return;
    const requirement = requirements.find((item) => item.id === uploadingReqId || item.requiredForStepId === uploadingReqId);
    const targetStep = procedure.steps.find((item) => item.id === requirement?.requiredForStepId || item.id === uploadingReqId);
    if (!requirement || !targetStep) return;
    setIsScanning(true);
    setScanStep("Guardando el documento de forma segura…");
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = () => reject(new Error("No pudimos leer el archivo."));
        reader.readAsDataURL(file);
      });
      const response = await fetch(`/api/v1/procedure-cases/${caseId}/documents`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, contentBase64, userProcedureRequirementId: requirement.userProcedureRequirementId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No pudimos guardar el documento.");
      setRequirements((items) => items.map((item) => item.id === requirement.id ? { ...item, status: "Validando", uploadedFileName: file.name, feedbackMessage: "Documento guardado. Confirma la etapa para continuar." } : item));
      setActionData({ documentId: payload.data.id, fileName: file.name, mimeType: file.type, date: today() });
      setActionStep(targetStep);
      closeUploadModal();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No pudimos guardar el documento.");
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle manual confirmation checkbox
  const toggleManualStep = (stepId: string) => {
    const target = procedure.steps.find((step) => step.id === stepId);
    if (completedStepIds.includes(stepId)) return;
    if (target) {
      setActionData({ date: today() });
      setActionStep(target);
      return;
    }
  };

  // Scanning & Simulator states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>("");

  const runAISimulator = (
    reqId: string,
    type: "good" | "bad" | "blurry",
    customFileName?: string,
  ) => {
    setIsScanning(true);
    setScanStep("Leyendo archivo cargado...");

    setTimeout(() => {
      setScanStep("Analizando calidad de imagen e integridad...");
      setTimeout(() => {
        setScanStep(
          "Cruzando registros con bases de datos públicas de TramIA...",
        );
        setTimeout(() => {
          setIsScanning(false);

          let updatedReq: Partial<Requirement> = {};
          const originalReq = requirements.find(
            (r) => r.id === reqId || r.requiredForStepId === reqId,
          );
          const reqName = originalReq ? originalReq.name : "Documento";

          if (type === "good") {
            updatedReq = {
              status: "Aprobado",
              uploadedFileName: customFileName || `${reqId}_verificado.pdf`,
              feedbackMessage: `Verificado por TramIA: El archivo "${reqName}" ha sido validado exitosamente. Cumple plenamente con el estándar requerido.`,
              imageQuality: "Buena",
              detectedErrors: [],
              isValidated: true,
            };
          }

          // Update requirement
          setRequirements((prev) =>
            prev.map((r) => {
              if (r.id === reqId || r.requiredForStepId === reqId) {
                return { ...r, ...updatedReq } as Requirement;
              }
              return r;
            }),
          );

          // Mark associated step as completed automatically
          const targetStepId = originalReq?.requiredForStepId || reqId;
          setCompletedStepIds((prev) => {
            const nextCompleted = Array.from(new Set([...prev, targetStepId]));
            const currentIdx = procedure.steps.findIndex(
              (s) => s.id === targetStepId,
            );
            const nextUncompleted = procedure.steps
              .slice(currentIdx + 1)
              .find((s) => !nextCompleted.includes(s.id));
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
    return requirements.every((r) => r.status === "Aprobado");
  }, [requirements]);

  // Real-time Progress percentage calculation
  const totalSteps = procedure.steps.length;
  const lastStep = totalSteps > 0 ? procedure.steps[totalSteps - 1] : undefined;

  const completionPercentageA = useMemo(() => {
    if (totalSteps === 0) return 0;
    const count = completedStepIds.length;
    return Math.round((count / totalSteps) * 100);
  }, [completedStepIds, totalSteps]);

  const nextPendingStep = useMemo(
    () => procedure.steps.find((step) => !completedStepIds.includes(step.id)),
    [procedure.steps, completedStepIds],
  );

  const isLastStepCompleted = useMemo(() => {
    return lastStep ? completedStepIds.includes(lastStep.id) : false;
  }, [lastStep, completedStepIds]);

  const isPriorStepsCompleted = useMemo(() => {
    if (totalSteps <= 1) return false;
    const priorSteps = procedure.steps.slice(0, totalSteps - 1);
    return (
      priorSteps.every((s) => completedStepIds.includes(s.id)) &&
      !isLastStepCompleted
    );
  }, [procedure.steps, completedStepIds, isLastStepCompleted, totalSteps]);

  const completionPercentageB = useMemo(() => {
    const totalReqs = requirements.length;
    if (totalReqs === 0) return 0;
    const approvedCount = requirements.filter(
      (r) => r.status === "Aprobado",
    ).length;
    const rawPct = Math.round((approvedCount / totalReqs) * 100);
    return rawPct === 100 ? 95 : rawPct;
  }, [requirements]);

  // Synchronize progress with parent App in real time
  useEffect(() => {
    const activeStepId =
      procedure.steps.find((s) => !completedStepIds.includes(s.id))?.id ||
      "completed";
    const pct = isDelegated ? completionPercentageB : completionPercentageA;
    onAddActiveProcedure(
      procedure,
      pct,
      isDelegated,
      requirements,
      activeStepId,
      true,
      isPaid,
      completedStepIds,
    );
  }, [
    requirements,
    completedStepIds,
    isDelegated,
    completionPercentageA,
    completionPercentageB,
    isPaid,
  ]);

  const autoCompletedTrackedRef = useRef(false);
  const delegatedDocTrackedRef = useRef(false);

  useEffect(() => {
    if (
      !isDelegated &&
      completionPercentageA === 100 &&
      !autoCompletedTrackedRef.current
    ) {
      autoCompletedTrackedRef.current = true;
      trackEvent("tramite_auto_completado", {
        procedure_id: procedure.id,
        procedure_title: procedure.title,
      });
    }
  }, [isDelegated, completionPercentageA, procedure.id, procedure.title]);

  useEffect(() => {
    if (
      isDelegated &&
      allDocumentsApproved &&
      requirements.length > 0 &&
      !delegatedDocTrackedRef.current
    ) {
      delegatedDocTrackedRef.current = true;
      trackEvent("tramite_delegadado_documentado", {
        procedure_id: procedure.id,
        procedure_title: procedure.title,
      });
    }
  }, [
    isDelegated,
    allDocumentsApproved,
    requirements.length,
    procedure.id,
    procedure.title,
  ]);

  const isAllStepsCompleted =
    completionPercentageA === 100 && isLastStepCompleted;

  return (
    <div className="space-y-6 animate-fadeIn" id="workspace-view-top">
      {/* Hidden File Input for Evidence Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(event) => selectUploadFile(event.target.files?.[0])}
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
              <span
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
                  isDelegated
                    ? "bg-purple-50 text-purple-700 border-purple-100"
                    : "bg-blue-50 text-blue-700 border-blue-100"
                }`}
              >
                {isDelegated
                  ? "Delegación a Asesor Experto"
                  : "Checklist Híbrido Paso a Paso"}
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
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Tipo de Trámite
              </p>
              <div className="mt-0.5 flex md:justify-end items-center gap-1">
                <Globe
                  size={12}
                  className={
                    procedureType === "Privado"
                      ? "text-purple-500"
                      : "text-blue-500"
                  }
                />
                <span
                  className={`inline-block text-[11px] font-extrabold ${
                    procedureType === "Privado"
                      ? "text-purple-700"
                      : procedureType === "Estatal / Privado"
                        ? "text-amber-700"
                        : "text-blue-700"
                  }`}
                >
                  {procedureType}
                </span>
              </div>
            </div>

            <div className="flex-1 md:flex-initial border-l md:border-l-0 md:border-t border-gray-200 pl-4 md:pl-0 md:pt-2 w-full">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Entidad
              </p>
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
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Duración estimada
              </p>
              <p className="text-xs font-bold text-slate-900">
                {procedure.estimatedDuration || procedure.duration}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Tasa del Estado
              </p>
              <p className="text-xs font-bold text-slate-900">
                {procedure.estimatedCost}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 rounded-2xl border border-gray-200/50 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Dificultad
              </p>
              <p
                className={`inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold rounded-md border ${getComplexityBadgeStyle(procedure.complexity)}`}
              >
                {procedure.complexity}
              </p>
            </div>
          </div>
        </div>
        {!isDelegated && (
          <div className="rounded-2xl border border-blue-100 bg-[linear-gradient(110deg,#f8fbff,#eef7ff)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">Avance del trámite</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                  {nextPendingStep ? <><CircleDashed size={17} className="shrink-0 text-blue-600"/><span className="truncate">Siguiente paso: {nextPendingStep.title}</span></> : <><CheckCircle2 size={17} className="text-emerald-600"/>Todos los pasos están completos</>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4"><span className="text-xs font-bold text-slate-500">{completedStepIds.length} de {totalSteps}</span><strong className="text-2xl font-black text-blue-700">{completionPercentageA}%</strong></div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-100"><div className={`h-full rounded-full transition-all duration-500 ${completionPercentageA === 100 ? "bg-emerald-500" : "bg-[linear-gradient(90deg,#2563eb,#06b6d4)]"}`} style={{width:`${completionPercentageA}%`}}/></div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ======================== FLOW A: AUTOGESTIONAR TRÁMITE ================== */}
      {/* ========================================================================= */}
      {!isDelegated ? (
        <div className="space-y-6">
          {/* TramIA route summary */}
          <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(125deg,#082657_0%,#0d4fc4_55%,#13b5d1_125%)] p-5 text-white shadow-[0_20px_55px_-28px_rgba(8,38,87,.65)] sm:p-7">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">
                  <ClipboardList size={14} /> Tu ruta TramIA
                </span>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">Avanza paso a paso, sin perderte</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  Completa una actividad a la vez. Te indicaremos qué hacer, qué documento presentar y cuál es tu siguiente paso.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-blue-50">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><CheckSquare size={14}/> Confirmaciones guiadas</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><FileUp size={14}/> Archivos y evidencias</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><CalendarCheck2 size={14}/> Fechas y alertas</span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-100">Progreso actual</p>
                    <p className="mt-1 text-sm font-bold text-white">{completedStepIds.length} de {procedure.steps.length} pasos</p>
                  </div>
                  <strong className="text-3xl font-black">{completionPercentageA}%</strong>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-950/25 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-500 ${isAllStepsCompleted ? "bg-emerald-300" : isPriorStepsCompleted ? "bg-amber-300" : "bg-cyan-300"}`} style={{ width: `${completionPercentageA}%` }} />
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-50">
                  {isAllStepsCompleted ? <CheckCircle2 size={16} className="text-emerald-300"/> : <CircleDashed size={16} className="text-cyan-300"/>}
                  {isAllStepsCompleted ? "Trámite finalizado" : isPriorStepsCompleted ? "Solo falta el paso final" : "Ruta en curso"}
                </p>
              </div>
            </div>
          </section>

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
                      {completedStepIds.length} de {procedure.steps.length}{" "}
                      Actividades ({completionPercentageA}%)
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-amber-950 leading-snug">
                    ¡Excelente! Ya completaste todos los requisitos del trámite.
                  </h3>
                  <p className="text-xs md:text-sm text-amber-900 font-medium leading-relaxed">
                    Solo queda acudir a la oficina o sede correspondiente para
                    recoger tu documento.
                  </p>
                  <p className="text-[11px] text-amber-850 font-semibold italic pt-1 border-t border-amber-200/80 mt-2">
                    📌 Una vez que hayas acudido a la entidad pública y tengas
                    tu documento en mano, marca la casilla del último paso ("
                    {lastStep?.title}") en el checklist para dar por finalizado
                    tu trámite al 100%.
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
                  Todas las actividades del trámite, incluyendo la recogida
                  oficial del documento en la entidad pública, han sido
                  completadas con éxito.
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

          {/* Guided TramIA timeline */}
          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Checklist guiado</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Tu ruta de actividades</h2>
                <p className="mt-1 text-sm text-slate-500">Abre el paso actual para revisar las indicaciones y completar su acción.</p>
              </div>
              <span className="text-xs font-bold text-slate-500">{procedure.steps.length - completedStepIds.length} pasos pendientes</span>
            </div>
            <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[22px] before:top-8 before:w-0.5 before:bg-gradient-to-b before:from-blue-300 before:via-blue-100 before:to-slate-100 sm:before:left-[27px]">
            {procedure.steps.map((step, idx) => {
              const isEvidenceStep = isStepEvidenceRequired(
                step,
                procedure,
                requirements,
              );
              const isStepDone = completedStepIds.includes(step.id);
              const isCurrentStep = !isStepDone && procedure.steps.findIndex((item) => !completedStepIds.includes(item.id)) === idx;
              const isLockedStep = !isStepDone && !isCurrentStep;
              const isExpanded = expandedStepId === step.id;
              const completionDetail = completedStepDetails[step.id];
              const stepReq =
                requirements.find((r) => r.requiredForStepId === step.id) ||
                requirements[0];
              const paymentInfo = getPaymentInfo(
                step.title,
                step.description,
                procedure.id,
              );
              const officialUrl = getStepOfficialUrl(
                step.id,
                procedure.id,
                officialSource.url,
              );

              return (
                <article
                  key={step.id}
                  className={`relative ml-12 rounded-2xl border transition-all duration-200 sm:ml-16 ${
                    isStepDone
                      ? "border-emerald-200 bg-emerald-50/40"
                      : isLockedStep
                        ? "border-slate-200 bg-slate-50/80 opacity-75"
                        : isExpanded || isCurrentStep
                        ? "border-blue-300 bg-[linear-gradient(135deg,#ffffff_40%,#eff8ff)] shadow-[0_14px_35px_-25px_rgba(37,99,235,.8)] ring-1 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                  }`}
                >
                  <span className={`absolute -left-[49px] top-4 z-10 grid size-10 place-items-center rounded-full border-4 border-white text-xs font-black shadow-sm sm:-left-[65px] sm:size-12 ${isStepDone ? "bg-emerald-500 text-white" : isCurrentStep ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {isStepDone ? <Check size={18} strokeWidth={3}/> : idx + 1}
                  </span>
                  {/* Step Header (Clickable Accordion Row) */}
                  <div
                    onClick={() => { if (!isLockedStep) toggleStepExpand(step.id); }}
                    className={`flex select-none items-start justify-between gap-3 p-4 sm:items-center sm:p-5 ${isLockedStep ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="min-w-0">
                      {/* Step Title & Type Badge */}
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm font-black sm:text-base ${isStepDone ? "text-slate-500" : "text-slate-950"}`}
                        >
                          {step.title}
                        </h3>

                        {isLockedStep ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500"><Lock size={10}/> Bloqueado</span>
                        ) : isEvidenceStep ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-violet-700">
                            <FileUp size={10} className="text-purple-600" />
                            Evidencia
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-700">
                            <CheckSquare size={10} className="text-sky-600" />
                            Confirmación
                          </span>
                        )}
                      </div>
                      {isStepDone && <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700"><CalendarCheck2 size={13}/> Realizado el {formatRecordedDate(completionDetail?.date || completionDetail?.completedAt)}</p>}
                    </div>

                    {/* Right side: Status badge & Chevron */}
                    <div className="flex shrink-0 items-center gap-2">
                      {isStepDone ? (
                        <span className="hidden rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-800 sm:inline-flex">
                          Completado
                        </span>
                      ) : isLockedStep ? (
                        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500 sm:inline-flex">Completa el paso anterior</span>
                      ) : isExpanded ? (
                        <span className="hidden rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black text-blue-800 sm:inline-flex">
                          En curso
                        </span>
                      ) : (
                        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600 sm:inline-flex">
                          Pendiente
                        </span>
                      )}

                      <div className={`grid size-9 place-items-center rounded-full ${isExpanded ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {isLockedStep ? <Lock size={14}/> : isExpanded ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step Expanded Content (Details on Demand) */}
                  {isExpanded && !isLockedStep && (
                  <div className="animate-fadeIn space-y-4 border-t border-blue-100/80 bg-white/70 px-4 pb-5 pt-4 sm:px-5">
                      {/* Instruction text */}
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">Qué debes hacer</p>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                        {step.description}
                        </p>
                      </div>

                      {/* Direct Link to Official Portal if available */}
                      {(paymentInfo || officialUrl) && !isStepDone && (
                        <div>
                          <a
                            href={paymentInfo ? paymentInfo.url : officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                          >
                            <Globe size={12} className="text-blue-600" />
                            <span>
                              {paymentInfo
                                ? paymentInfo.label
                                : "Ir al Portal Oficial"}
                            </span>
                            <ExternalLink
                              size={10}
                              className="text-slate-400"
                            />
                          </a>
                        </div>
                      )}

                      {/* Action Area (Compact Upload zone or Manual Check) */}
                      <div>
                        {isEvidenceStep ? (
                          <div className="mt-1">
                            {!isStepDone ||
                            (stepReq && stepReq.status === "Corregir") ? (
                              <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-2 text-purple-950 font-bold text-xs">
                                  <UploadCloud
                                    size={15}
                                    className="text-purple-600 shrink-0"
                                  />
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-purple-950">
                                      Adjuntar evidencia requerida
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-normal">
                                      Validación automática por IA de TramIA
                                    </p>
                                  </div>
                                </div>

                                {isScanning &&
                                uploadingReqId === (stepReq?.id || step.id) ? (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-900 rounded-lg text-xs font-bold animate-pulse">
                                    <RefreshCw
                                      className="animate-spin"
                                      size={14}
                                    />
                                    <span>{scanStep}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTriggerUpload(
                                          stepReq?.id || step.id,
                                        );
                                      }}
                                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-violet-700"
                                    >
                                      <UploadCloud size={13} />
                                      <span>Subir y validar</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CheckCircle2
                                    size={15}
                                    className="text-emerald-600 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-emerald-950 truncate">
                                      Evidencia validada:{" "}
                                      {stepReq?.uploadedFileName ||
                                        "Documento cargado"}
                                    </p>
                                    {stepReq?.feedbackMessage && (
                                      <p className="text-[10px] text-emerald-800 line-clamp-1">
                                        {stepReq.feedbackMessage}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {!isStepDone && <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTriggerUpload(stepReq?.id || step.id);
                                  }}
                                  className="text-[10px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer shrink-0"
                                >
                                  Reemplazar
                                </button>}
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
                              className={`flex min-h-14 w-full cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                                isStepDone
                                  ? "border-emerald-300 bg-emerald-50/90 text-emerald-950"
                                  : "border-blue-200 bg-blue-600 text-white shadow-md shadow-blue-600/15 hover:bg-blue-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`grid size-7 shrink-0 place-items-center rounded-lg border transition-all ${
                                    isStepDone
                                      ? "bg-emerald-600 border-emerald-600 text-white"
                                      : "border-white/40 bg-white/15 text-white"
                                  }`}
                                >
                                  <Check size={12} strokeWidth={3} />
                                </div>
                                <div>
                                  <p className="text-xs font-extrabold">
                                    {isStepDone ? "Actividad completada" : "Completar este paso"}
                                  </p>
                                </div>
                              </div>

                              {isStepDone && (
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-800">
                                  Listo
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            </div>
          </section>
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
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
                    Resumen del Servicio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Revisa los detalles de tu trámite delegado y la tarifa
                    correspondiente antes de iniciar el pago seguro y comenzar
                    la delegación.
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
                      <h4 className="text-xs font-black text-slate-900">
                        {advisor.name} te ayudará a gestionar este
                        procedimiento.
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {advisor.colegiatura} • Contarás con un asesor humano
                        durante todo el proceso del trámite delegado.
                      </p>
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
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                    Desglose del Costo
                  </h4>

                  <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl bg-slate-50/20 overflow-hidden text-xs">
                    <div className="p-4 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-slate-600 font-medium block">
                          Honorarios del Asesor (Tarifa de Servicio TramIA)
                        </span>
                        <span className="text-[10px] text-gray-400 block font-light">
                          Asistencia experta premium, revisión continua de
                          documentos y presentación formal
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">
                        {procedure.feeAmount || "S/. 65.00"}
                      </span>
                    </div>

                    <div className="p-4 bg-blue-50/30 flex justify-between items-center border-t border-blue-100">
                      <div className="space-y-0.5">
                        <span className="text-blue-900 font-black text-xs block uppercase tracking-wider">
                          Monto Total
                        </span>
                        <span className="text-[10px] text-blue-700 font-medium block">
                          Pago seguro cifrado por PCI-DSS
                        </span>
                      </div>
                      <span className="font-black text-lg text-blue-950 font-mono">
                        {procedure.feeAmount || "S/. 65.00"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estimation and metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-150 rounded-2xl bg-white space-y-1">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider font-mono block">
                      Tiempo Estimado
                    </span>
                    <p className="text-xs font-bold text-slate-900">
                      {procedure.estimatedDuration ||
                        procedure.duration ||
                        "5 días hábiles"}
                    </p>
                  </div>

                  <div className="p-4 border border-gray-150 rounded-2xl bg-white space-y-1">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider font-mono block">
                      Tiempo Ahorrado
                    </span>
                    <p className="text-xs font-bold text-emerald-700">
                      12 horas de colas y papeleo
                    </p>
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
                        trackEvent("tramite_delegado_pagado", {
                          procedure_id: procedure.id,
                          procedure_title: procedure.title,
                          amount: procedure.feeAmount || "S/. 65.00",
                        });
                        onAddActiveProcedure(
                          procedure,
                          completionPercentageB,
                          true,
                          requirements,
                          undefined,
                          true,
                          true,
                        );
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
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                      Pago Confirmado
                    </h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Tu Asesor de TramIA comenzará a gestionar tu trámite ante
                      la entidad pública.
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
                      <span className="text-[9px] font-black tracking-wider uppercase text-emerald-600 font-mono block">
                        Asesor Asignado
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        {advisor.name} te ayudará a gestionar este
                        procedimiento.
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        Contarás con un asesor humano durante todo el proceso
                        del trámite delegado.
                      </p>
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
                  <span className="text-[10px] text-gray-400 font-mono">
                    Código de seguimiento: TRM-{procedure.id.toUpperCase()}-94A
                  </span>
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
                  <h3 className="text-lg font-black text-slate-900">
                    Documentos Necesarios para la Delegación
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sube los documentos requeridos para que tu gestor pueda
                    representarte formalmente ante la entidad.
                  </p>
                </div>

                <div className="space-y-3">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-slate-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          {req.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {req.description}
                        </p>
                      </div>
                      {req.status === "Aprobado" ? (
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
                      Antes de que el asesor comience con las gestiones
                      presenciales o aranceles, TramIA necesita todos tus
                      documentos obligatorios. Contarás con la asistencia de un
                      asesor humano en todo momento.
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
                <h3 className="text-base font-extrabold text-slate-900">
                  ¿Eliminar este trámite?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-gray-200">
              Se eliminará permanentemente{" "}
              <strong className="text-slate-900">"{procedure.title}"</strong> de
              tu lista de trámites en proceso, perdiendo todo el avance del
              checklist y los documentos adjuntos.
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
                <h3 className="text-base font-extrabold text-slate-900">
                  Opción no disponible
                </h3>
                <p className="text-xs text-amber-600 font-bold">
                  Trámite en gestión activa por asesor
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
              <p>
                Este trámite fue abonado y asignado a tu asesor experto{" "}
                <strong className="text-slate-900">{advisor.name}</strong>,
                quien ya inició las gestiones formales ante la entidad pública.
              </p>
              <p className="text-[11px] text-slate-500 font-medium pt-1">
                Por seguridad y cumplimiento legal, no es posible eliminar
                solicitudes activas pagadas. Si requieres cancelar o solicitar
                una reasignación, contacta a soporte de TramIA.
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

      {isDelegated && caseId && (
        <section className="grid gap-5 lg:grid-cols-2">
          <CaseDocuments caseId={caseId} role="owner" />
          <CaseMessages caseId={caseId} />
        </section>
      )}

      {uploadingReqId && (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="upload-evidence-title">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="relative bg-[linear-gradient(120deg,#071a3d,#1261db)] p-6 text-white sm:p-7">
              <button type="button" onClick={closeUploadModal} aria-label="Cerrar" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"><X size={18}/></button>
              <span className="grid size-12 place-items-center rounded-2xl bg-white/15"><UploadCloud /></span>
              <p className="mt-4 text-xs font-black uppercase tracking-[.16em] text-cyan-200">Evidencia del trámite</p>
              <h2 id="upload-evidence-title" className="mt-1 text-2xl font-black">Adjunta tu archivo</h2>
              <p className="mt-2 text-sm text-blue-100">Puedes arrastrar una imagen o PDF y revisarlo antes de guardarlo.</p>
            </header>
            <div className="space-y-5 p-5 sm:p-7">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
                onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={(event) => { event.preventDefault(); setIsDraggingFile(false); }}
                onDrop={(event) => { event.preventDefault(); setIsDraggingFile(false); selectUploadFile(event.dataTransfer.files?.[0]); }}
                className={`grid min-h-44 w-full place-items-center rounded-3xl border-2 border-dashed p-6 text-center transition ${isDraggingFile ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/60"}`}
              >
                <span><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-100 text-blue-700"><UploadCloud size={28}/></span><strong className="mt-4 block text-sm text-slate-900">Arrastra tu archivo aquí</strong><span className="mt-1 block text-xs text-slate-500">o haz clic para seleccionarlo · PDF, JPG o PNG · máximo 8 MB</span></span>
              </button>

              {selectedUploadFile && uploadPreviewUrl && (
                <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">{selectedUploadFile.type === "application/pdf" ? <FileText size={20}/> : <ImageIcon size={20}/>}</span><div className="min-w-0"><p className="truncate text-xs font-black text-slate-900">{selectedUploadFile.name}</p><p className="text-[11px] text-slate-500">{(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB</p></div></div>
                    <a href={uploadPreviewUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700"><Eye size={15}/> Ver aparte</a>
                  </div>
                  {selectedUploadFile.type === "application/pdf" ? <iframe title={`Vista previa de ${selectedUploadFile.name}`} src={uploadPreviewUrl} className="h-72 w-full bg-slate-100"/> : <img src={uploadPreviewUrl} alt={`Vista previa de ${selectedUploadFile.name}`} className="h-72 w-full bg-slate-100 object-contain"/>}
                </section>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={closeUploadModal} disabled={isScanning} className="min-h-12 rounded-xl bg-slate-100 text-sm font-black text-slate-700">Cancelar</button>
                <button type="button" onClick={() => void uploadSelectedEvidence()} disabled={!selectedUploadFile || isScanning} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-200 disabled:opacity-50">{isScanning ? <><RefreshCw className="animate-spin" size={17}/>{scanStep}</> : <><UploadCloud size={17}/>Guardar archivo</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Validation Modal Integration */}
      {actionStep && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void completeAction();
            }}
            className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"
          >
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">
              Completar etapa
            </p>
            <h2 className="mt-2 text-2xl font-black">{actionStep.title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {actionStep.description}
            </p>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-black">
                  Fecha de realización
                  <input
                    type="date"
                    required
                    className="field-input mt-2"
                    value={actionData.date || ""}
                    onChange={(e) =>
                      setActionData({ ...actionData, date: e.target.value })
                    }
                  />
                  <span className="mt-1 block text-[11px] font-normal text-slate-500">Esta fecha quedará registrada junto con la confirmación.</span>
                </label>
              {actionData.documentId && (
                <a href={`/api/v1/documents/${actionData.documentId}/content`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700"><span className="inline-flex min-w-0 items-center gap-2"><FileText size={16}/><span className="truncate">{actionData.fileName || "Ver archivo adjunto"}</span></span><Eye size={16}/></a>
              )}
              {actionStep.actionConfig?.fields?.map(field=><label key={field.key} className="block text-xs font-black">{field.label}{field.type==='select'?<select required={field.required} className="field-input mt-2" value={actionData[field.key]||''} onChange={e=>setActionData({...actionData,[field.key]:e.target.value})}><option value="">Selecciona</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select>:<input type={field.type||'text'} required={field.required} className="field-input mt-2" value={actionData[field.key]||''} onChange={e=>setActionData({...actionData,[field.key]:e.target.value})}/>}</label>)}
              <label className="block text-xs font-black">
                Información o referencia
                <textarea
                  className="field-input mt-2 min-h-24"
                  required
                  value={actionData.notes || ""}
                  onChange={(e) =>
                    setActionData({ ...actionData, notes: e.target.value })
                  }
                />
              </label>
              <label className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <input type="checkbox" required />
                Marcar etapa como realizada. Al confirmar, quedará bloqueada y
                no se podrá modificar.
              </label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionStep(null)}
                className="min-h-11 rounded-xl bg-slate-100 font-black"
              >
                Cancelar
              </button>
              <button className="min-h-11 rounded-xl bg-blue-600 font-black text-white">
                Guardar y completar
              </button>
            </div>
          </form>
        </div>
      )}
      <DocumentValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        requirement={activeValidationRequirement}
        procedureTitle={procedure.title}
        onValidationSuccess={(result, fileName) => {
          if (!activeValidationRequirement) return;
          const targetReqId = activeValidationRequirement.id;

          setRequirements((prev) =>
            prev.map((r) => {
              if (r.id === targetReqId) {
                return {
                  ...r,
                  status: result.isValidated ? "Aprobado" : "Corregir",
                  uploadedFileName: fileName,
                  feedbackMessage: result.summary,
                  imageQuality: result.imageQuality as any,
                  isValidated: result.isValidated,
                  recommendations: result.recommendations,
                  detectedErrors: result.detectedIssues?.map((i) => i.title),
                };
              }
              return r;
            }),
          );

          if (result.isValidated) {
            const targetStepId = activeValidationRequirement.requiredForStepId;
            setCompletedStepIds((prev) =>
              Array.from(new Set([...prev, targetStepId])),
            );
          }
        }}
      />
    </div>
  );
}
