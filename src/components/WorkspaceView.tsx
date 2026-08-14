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
import TramIABot from "./TramIABot";
import CaseDocuments from "./CaseDocuments";
import CaseMessages from "./CaseMessages";
import DocumentValidationModal, {
  ValidationResult,
} from "./DocumentValidationModal";
import { trackEvent } from "../utils/analytics";
import DelegationModalV2 from "./DelegationModalV2";
import { alertTramia } from "./TramiaDialog";

function getOfficialSource(procedure: Procedure) {
  return {
    url: procedure.officialUrl || "",
    siteName: procedure.entity || "Entidad responsable",
    description: procedure.entity
      ? `Consulta las condiciones vigentes directamente en el portal oficial de ${procedure.entity}.`
      : "Consulta las condiciones vigentes directamente en la fuente oficial del trámite.",
  };
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
  key?: string;
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
  initialDelegationOpen?: boolean;
  onDelegationOpened?: () => void;
  initialIsPaid?: boolean;
  onDeleteProcedure?: (procedureId: string, action: "delete" | "cancel") => void;
}

export default function WorkspaceView({
  procedure,
  onBack,
  onAddActiveProcedure,
  initialIsDelegated = false,
  initialDelegationOpen = false,
  onDelegationOpened,
  initialIsPaid = false,
  onDeleteProcedure,
}: WorkspaceViewProps) {
  const officialSource = getOfficialSource(procedure);
  const procedureType = ({
    government: "Estatal",
    private: "Privado",
    mixed: "Estatal / Privado",
    consular: "Consular",
  } as Record<string, string>)[procedure.procedureType || "government"] || "Estatal";

  // Navigation: Autogestionar vs Delegar
  // Una solicitud híbrida aún no es una delegación activa. Solo cambiamos a
  // delegado cuando el pago fue confirmado y el asesor quedó asignado.
  const [isDelegated, setIsDelegated] = useState<boolean>(initialIsDelegated && initialIsPaid);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(initialDelegationOpen);
  const [delegationIntent, setDelegationIntent] = useState(initialDelegationOpen || (initialIsDelegated && !initialIsPaid));
  const [isBotChatOpen, setIsBotChatOpen] = useState(false);
  const initialCaseId = String(procedure.userProcedureId || "");
  const [caseId, setCaseId] = useState<string>(initialCaseId);
  const [delegationPrerequisiteStepIds, setDelegationPrerequisiteStepIds] = useState<string[] | null>(null);
  const [actionStep, setActionStep] = useState<Step | null>(null);
  const [actionData, setActionData] = useState<Record<string, string>>({});
  const [inlineStepData, setInlineStepData] = useState<Record<string, Record<string, string>>>({});
  const today = () => new Date().toISOString().slice(0, 10);
  useEffect(() => {
    if (initialCaseId) {
      setCaseId(initialCaseId);
      return;
    }
    fetch(`/api/v1/my-procedures/by-procedure/${procedure.databaseId || procedure.id}/workspace`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((p) => setCaseId(p.instance?.id || ""))
      .catch(() => {});
  }, [initialCaseId, procedure.databaseId, procedure.id]);
  useEffect(() => {
    if (!delegationIntent || !caseId) {
      setDelegationPrerequisiteStepIds(null);
      return;
    }
    fetch(`/api/v1/my-procedures/${caseId}/delegation-prerequisites`, { credentials: "include" })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.message || "No pudimos preparar la delegación.");
        setDelegationPrerequisiteStepIds((payload.steps || []).map((step: { procedureStepId: string }) => step.procedureStepId));
      })
      .catch(() => setDelegationPrerequisiteStepIds([]));
  }, [caseId, delegationIntent]);
  useEffect(() => {
    if (initialDelegationOpen) {
      setDelegationIntent(true);
      setIsDelegationModalOpen(true);
      onDelegationOpened?.();
    }
  }, [initialDelegationOpen, onDelegationOpened]);
  const completeAction = async (stepOverride?: Step, dataOverride?: Record<string, string>) => {
    const targetStep = stepOverride || actionStep;
    const targetData = dataOverride || actionData;
    if (!targetStep || !caseId) return;
    const response = await fetch(
        `/api/v1/my-procedures/${caseId}/steps/${targetStep.id}/complete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmCompleted: true, data: targetData }),
        },
      ),
      payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      await alertTramia({ title: "No pudimos completar la etapa", message: payload.message || "Revisa los datos e inténtalo nuevamente.", variant: "warning" });
      return;
    }
    setCompletedStepIds((value) => [...new Set([...value, targetStep.id])]);
    setCompletedStepDetails((value) => ({ ...value, [targetStep.id]: { ...targetData, completedAt: new Date().toISOString() } }));
    setRequirements((items) => items.map((item) => item.requiredForStepId === targetStep.id ? { ...item, status: "Aprobado", isValidated: true } : item));
    setInlineStepData((value) => { const next = { ...value }; delete next[targetStep.id]; return next; });
    const currentIndex = procedure.steps.findIndex((item) => item.id === targetStep.id);
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

  // Removal/cancellation confirmation state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const handleDeleteProcedureClick = () => {
    setShowDeleteConfirmModal(true);
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
    fetch(`/api/v1/my-procedures/${caseId}/workspace`, { credentials: "include" })
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
  }, [caseId]);

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
      void alertTramia({ title: "Formato no compatible", message: "Selecciona un archivo PDF, JPG o PNG.", variant: "warning" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      void alertTramia({ title: "El archivo es demasiado grande", message: "Puedes adjuntar archivos de hasta 8 MB.", variant: "warning" });
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
      await alertTramia({ title: "No pudimos guardar el documento", message: error instanceof Error ? error.message : "Inténtalo nuevamente en unos momentos.", variant: "danger" });
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle manual confirmation checkbox
  const toggleManualStep = (stepId: string) => {
    const target = procedure.steps.find((step) => step.id === stepId);
    if (completedStepIds.includes(stepId)) return;
    if (target) {
      setActionData(inlineStepData[stepId] || { date: today() });
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
  const [delegationSnapshot, setDelegationSnapshot] = useState<any>(null);
  const [isPaid, setIsPaid] = useState<boolean>(initialIsPaid);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  useEffect(() => {
    if (!caseId || !isDelegated) return;
    fetch(`/api/v1/my-procedures/${caseId}/delegation`, { credentials: "include" })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => { if (response.ok) setDelegationSnapshot(payload); })
      .catch(() => {});
  }, [caseId, isDelegated]);
  const assignedAdvisorRecord = delegationSnapshot?.advisors?.find((item: any) => item.userId === delegationSnapshot?.delegation?.requestedAdvisorId);
  const advisor = {
    name: assignedAdvisorRecord?.publicName || "Asesor por asignar",
    avatar: assignedAdvisorRecord?.avatarUrl || "/assets/mascot/tramia-bot-contact.png",
    colegiatura: assignedAdvisorRecord?.idVerified ? "Identidad verificada" : "Asignación pendiente",
  };

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

  const displayedRouteSteps = useMemo(() => {
    if (!delegationIntent || delegationPrerequisiteStepIds === null) return procedure.steps;
    const requiredIds = new Set(delegationPrerequisiteStepIds);
    return procedure.steps.filter((step) => requiredIds.has(step.id));
  }, [delegationIntent, delegationPrerequisiteStepIds, procedure.steps]);
  const displayedCompletedCount = displayedRouteSteps.filter((step) => completedStepIds.includes(step.id)).length;
  const displayedProgress = displayedRouteSteps.length
    ? Math.round((displayedCompletedCount / displayedRouteSteps.length) * 100)
    : delegationIntent && delegationPrerequisiteStepIds !== null ? 100 : completionPercentageA;
  const displayedNextStep = displayedRouteSteps.find((step) => !completedStepIds.includes(step.id));

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
  const hasStartedProcedure = completedStepIds.length > 0 || completionPercentageA > 0 || isPaid;

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

      {/* Cabecera contextual del trámite */}
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_22px_60px_-38px_rgba(8,38,87,.55)]">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 size-48 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-blue-100/80 bg-blue-50/55 px-5 py-3 sm:px-7">
          <button
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-blue-700"
          >
            <ArrowLeft size={17} />
            Volver a mis trámites
          </button>
          <button
            onClick={handleDeleteProcedureClick}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-100 bg-white px-3 text-xs font-black text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
            title={hasStartedProcedure ? "Cancelar trámite" : "Eliminar trámite"}
          >
            {hasStartedProcedure ? <X size={15}/> : <Trash2 size={15} />}
            <span className="hidden sm:inline">{hasStartedProcedure ? "Cancelar trámite" : "Eliminar trámite"}</span>
            <span className="sm:hidden">{hasStartedProcedure ? "Cancelar" : "Eliminar"}</span>
          </button>
        </div>

        <div className="relative grid gap-6 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] ${isDelegated ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"}`}>
                {isDelegated ? <ShieldCheck size={14}/> : <Sparkles size={14}/>}
                {isDelegated ? "Gestión con asesor" : delegationIntent ? "Preparación para delegar" : "Ruta autogestionada"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600">
                <Globe size={13} className="text-blue-600"/> {procedureType}
              </span>
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600">
                <Building size={13} className="shrink-0 text-blue-600"/>
                <span className="truncate">{formatEntityName(officialSource.siteName)}</span>
              </span>
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-blue-600">Tu trámite en TramIA</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl">
              {procedure.title}
            </h1>
            <p className="mt-4 max-w-4xl text-sm font-medium leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
              {procedure.description}
            </p>
          </div>

          <div className="hidden h-44 items-end justify-center lg:flex" aria-hidden="true">
            <img src="/assets/mascot/tramia-bot-guiding.png" alt="" className="max-h-44 w-auto object-contain drop-shadow-[0_18px_20px_rgba(15,75,160,.18)]"/>
          </div>
        </div>

        <div className="relative grid border-t border-blue-100 bg-slate-50/75 sm:grid-cols-3">
          <div className="flex min-w-0 items-center gap-3 border-b border-blue-100 px-5 py-4 sm:border-b-0 sm:border-r sm:px-7">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700"><Clock size={20}/></span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">Tiempo estimado</p><p className="mt-1 text-sm font-black text-slate-900">{procedure.estimatedDuration || procedure.duration}</p></div>
          </div>
          <div className="flex min-w-0 items-center gap-3 border-b border-blue-100 px-5 py-4 sm:border-b-0 sm:border-r sm:px-7">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><DollarSign size={20}/></span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">Tasa referencial</p><p className="mt-1 text-sm font-black text-slate-900">{procedure.estimatedCost}</p></div>
          </div>
          <div className="flex min-w-0 items-center gap-3 px-5 py-4 sm:px-7">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Award size={20}/></span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">Nivel de dificultad</p><p className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${getComplexityBadgeStyle(procedure.complexity)}`}>{procedure.complexity}</p></div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ======================== FLOW A: AUTOGESTIONAR TRÁMITE ================== */}
      {/* ========================================================================= */}
      {!isDelegated ? (
        <div className="space-y-6">
          {/* TramIA route summary */}
          <section className={`relative overflow-hidden rounded-[2rem] p-5 text-white shadow-[0_20px_55px_-28px_rgba(8,38,87,.65)] sm:p-7 ${delegationIntent ? "bg-[linear-gradient(125deg,#251052_0%,#5b21b6_55%,#0d9fc1_125%)]" : "bg-[linear-gradient(125deg,#082657_0%,#0d4fc4_55%,#13b5d1_125%)]"}`}>
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">
                  <ClipboardList size={14} /> {delegationIntent ? "Preparación para delegar" : "Tu ruta TramIA"}
                </span>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">{delegationIntent ? "Delega con claridad y mantén el control" : "Avanza paso a paso, sin perderte"}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  {delegationIntent ? "Completa tus acciones personales, elige al asesor que prefieras y confirma el servicio con una tarjeta guardada." : "Completa una actividad a la vez. Te indicaremos qué hacer, qué documento presentar y cuál es tu siguiente paso."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-blue-50">
                  {delegationIntent ? <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">1 · Pasos personales</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">2 · Elegir asesor</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">3 · Confirmar pago</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">4 · Seguimiento</span>
                  </> : <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><CheckSquare size={14}/> Confirmaciones guiadas</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><FileUp size={14}/> Archivos y evidencias</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><CalendarCheck2 size={14}/> Fechas y alertas</span>
                  </>}
                </div>
                {delegationIntent && <button type="button" onClick={() => setIsDelegationModalOpen(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-violet-800 shadow-lg transition hover:bg-violet-50"><ShieldCheck size={17}/> Abrir panel de delegación <ChevronRight size={16}/></button>}
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-100">Progreso actual</p>
                    <p className="mt-1 text-sm font-bold text-white">{displayedCompletedCount} de {displayedRouteSteps.length} pasos</p>
                  </div>
                  <strong className="text-3xl font-black">{displayedProgress}%</strong>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-950/25 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-500 ${displayedProgress === 100 ? "bg-emerald-300" : "bg-cyan-300"}`} style={{ width: `${displayedProgress}%` }} />
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-50">
                  {displayedProgress === 100 ? <CheckCircle2 size={16} className="text-emerald-300"/> : <CircleDashed size={16} className="text-cyan-300"/>}
                  {delegationIntent ? (displayedProgress === 100 ? "Preparación lista: ya puedes elegir asesor" : `Siguiente: ${displayedNextStep?.title || "completar requisitos"}`) : isAllStepsCompleted ? "Trámite finalizado" : isPriorStepsCompleted ? "Solo falta el paso final" : "Ruta en curso"}
                </p>
              </div>
            </div>
          </section>

          {/* INTERMEDIATE BANNER: ALL REQUIREMENTS COMPLETED EXCEPT FINAL PICKUP */}
          {!delegationIntent && isPriorStepsCompleted && !isAllStepsCompleted && (
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
          {!delegationIntent && isAllStepsCompleted && (
            <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300 bg-[linear-gradient(115deg,#ecfdf5_0%,#effcff_62%,#dff8ff_100%)] p-6 shadow-lg shadow-emerald-100/70 animate-fadeIn sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_1px_1px,#34d399_1px,transparent_0)] bg-size-[22px_22px]" />
              <Sparkles className="absolute right-8 top-7 text-cyan-400/60" size={26} aria-hidden="true" />
              <div className="relative z-10 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
                <div className="text-center sm:text-left">
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                      <CheckCircle2 size={30} strokeWidth={2.5} />
                    </span>
                    <div>
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-emerald-800">
                        Ruta completada · 100%
                      </span>
                      <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                        ¡Excelente, completaste tu trámite!
                      </h3>
                    </div>
                  </div>
                  <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:mx-0">
                    Terminaste todos los pasos de <strong className="text-slate-800">{procedure.title}</strong>. La ruta quedó guardada en tu historial para que puedas consultar sus fechas, documentos y avances cuando lo necesites.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    Conserva tus constancias y comprobantes hasta recibir el resultado definitivo de la entidad responsable.
                  </p>
                  <button
                    onClick={onBack}
                    className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    <span>Ver mis trámites</span>
                    <ChevronRight size={17} />
                  </button>
                </div>
                <img
                  src="/assets/mascot/tramia-bot-superhero.png"
                  alt="TramIA celebra que completaste tu trámite"
                  className="mx-auto h-36 w-36 object-contain drop-shadow-xl sm:h-44 sm:w-44"
                />
              </div>
            </section>
          )}

          {/* Guided TramIA timeline */}
          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Checklist guiado</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{delegationIntent ? "Requisitos previos para delegar" : "Tu ruta de actividades"}</h2>
                <p className="mt-1 text-sm text-slate-500">{delegationIntent ? "Completa únicamente la información y los documentos que tu asesor no puede gestionar por ti." : "Abre el paso actual para revisar las indicaciones y completar su acción."}</p>
              </div>
              <span className="text-xs font-bold text-slate-500">{displayedRouteSteps.length - displayedCompletedCount} pasos pendientes</span>
            </div>
            <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[22px] before:top-8 before:w-0.5 before:bg-gradient-to-b before:from-blue-300 before:via-blue-100 before:to-slate-100 sm:before:left-[27px]">
            {displayedRouteSteps.length === 0 && delegationIntent && <div className="relative ml-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:ml-16"><CheckCircle2 className="text-emerald-600"/><h3 className="mt-3 font-black text-emerald-950">No tienes acciones personales pendientes</h3><p className="mt-1 text-sm text-emerald-800">Este trámite puede pasar directamente a la elección del asesor.</p></div>}
            {displayedRouteSteps.map((step, idx) => {
              const isEvidenceStep = isStepEvidenceRequired(
                step,
                procedure,
                requirements,
              );
              const isStepDone = completedStepIds.includes(step.id);
              const isCurrentStep = !isStepDone && displayedRouteSteps.findIndex((item) => !completedStepIds.includes(item.id)) === idx;
              const isLockedStep = !isStepDone && !isCurrentStep;
              const isExpanded = expandedStepId === step.id;
              const completionDetail = completedStepDetails[step.id];
              const stepReq =
                requirements.find((r) => r.requiredForStepId === step.id) ||
                requirements[0];
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
                          <InlineStepChecklist
                            step={step}
                            value={inlineStepData[step.id] || { date: today() }}
                            onChange={(next) => setInlineStepData((current) => ({ ...current, [step.id]: next }))}
                            onOpenModal={() => toggleManualStep(step.id)}
                            onComplete={(data) => void completeAction(step, data)}
                          />
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
                      {hasStartedProcedure ? <X size={13}/> : <Trash2 size={13} />}
                      {hasStartedProcedure ? "Cancelar trámite" : "Eliminar trámite"}
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

      {/* Delete or cancellation confirmation modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                {hasStartedProcedure ? <AlertTriangle size={20}/> : <Trash2 size={20} />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {hasStartedProcedure ? "¿Cancelar este trámite?" : "¿Eliminar este trámite?"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {hasStartedProcedure ? "El trámite pasará a tu historial como cancelado." : "Esta acción no se puede deshacer."}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-gray-200">
              {hasStartedProcedure ? <>
                Se cancelará <strong className="text-slate-900">"{procedure.title}"</strong> y ya no podrás continuar su checklist. Los pagos realizados a la entidad o por servicios de gestión <strong className="text-red-700">no serán reembolsados</strong>.
              </> : <>
                Se eliminará permanentemente <strong className="text-slate-900">"{procedure.title}"</strong> de tu lista. Como todavía no registraste avances ni pagos, no se conservará en el historial.
              </>}
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
                    onDeleteProcedure(caseId, hasStartedProcedure ? "cancel" : "delete");
                  }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {hasStartedProcedure ? <AlertTriangle size={14}/> : <Trash2 size={14} />}
                {hasStartedProcedure ? "Sí, cancelar trámite" : "Sí, eliminar trámite"}
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

      {isDelegationModalOpen && caseId && (
        <DelegationModalV2
          item={{ id: caseId }}
          onClose={() => setIsDelegationModalOpen(false)}
          onSaved={() => {
            setIsPaid(true);
            setIsDelegated(true);
            setDelegationIntent(false);
          }}
          onContact={() => {
            setIsDelegationModalOpen(false);
            setIsBotChatOpen(true);
          }}
          onFinish={onBack}
        />
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
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#06142f]/75 p-3 backdrop-blur-md sm:p-5" role="dialog" aria-modal="true" aria-labelledby="complete-stage-title">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void completeAction();
            }}
            className={`my-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-[2rem] border border-white/60 bg-white shadow-[0_32px_100px_rgba(3,18,52,.38)] sm:max-h-[calc(100dvh-2.5rem)] ${(actionStep.actionConfig?.fields?.length || 0) === 0 ? "max-w-lg" : "max-w-2xl"}`}
          >
            <header className={`relative overflow-hidden bg-[linear-gradient(120deg,#071a3d,#0d55c7_62%,#12afd1)] px-5 text-white sm:px-7 ${(actionStep.actionConfig?.fields?.length || 0) === 0 ? "py-5" : "py-6 sm:py-7 sm:pr-40"}`}>
              <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[22px_22px]"/>
              <button type="button" onClick={() => { setActionStep(null); setActionData({}); }} aria-label="Cerrar" className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"><X size={18}/></button>
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-cyan-100"><ClipboardList size={14}/> Completar etapa</span>
                <h2 id="complete-stage-title" className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{actionStep.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">{actionStep.description}</p>
              </div>
              {(actionStep.actionConfig?.fields?.length || 0) > 0 && <img src="/assets/mascot/tramia-bot-guiding.png" alt="" className="absolute -bottom-5 right-6 hidden h-36 object-contain drop-shadow-xl sm:block" aria-hidden="true"/>}
            </header>

            <div className={`p-5 sm:p-7 ${(actionStep.actionConfig?.fields?.length || 0) === 0 ? "space-y-4" : "space-y-5"}`}>
              {(actionStep.actionConfig?.fields?.length || 0) > 0 && <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><Info className="mt-0.5 shrink-0 text-blue-600" size={18}/><p className="text-xs leading-5 text-slate-600">Registra los datos que correspondan. Los campos obligatorios están identificados; la información adicional es opcional.</p></div>}

              <div className={`grid gap-4 ${(actionStep.actionConfig?.fields?.length || 0) > 0 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                <label className="block text-xs font-black text-slate-800">
                    <span className="inline-flex items-center gap-1.5"><CalendarCheck2 size={15} className="text-blue-600"/>Fecha de realización <span className="text-red-500">*</span></span>
                    <input type="date" required className="field-input mt-2" value={actionData.date || ""} onChange={(e) => setActionData({ ...actionData, date: e.target.value })}/>
                    <span className="mt-1.5 block text-[11px] font-normal leading-4 text-slate-500">Quedará registrada junto con la confirmación.</span>
                </label>
                {actionStep.actionConfig?.fields?.map(field=><label key={field.key} className="block text-xs font-black text-slate-800"><span>{field.label}{field.required ? <span className="ml-1 text-red-500">*</span> : <span className="ml-1 font-medium text-slate-400">(opcional)</span>}</span>{field.type==='select'?<select required={field.required} className="field-input mt-2" value={actionData[field.key]||''} onChange={e=>setActionData({...actionData,[field.key]:e.target.value})}><option value="">Selecciona una opción</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select>:<input type={field.type||'text'} required={field.required} className="field-input mt-2" value={actionData[field.key]||''} onChange={e=>setActionData({...actionData,[field.key]:e.target.value})}/>}</label>)}
              </div>

              {actionData.documentId && <a href={`/api/v1/documents/${actionData.documentId}/content`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100"><span className="inline-flex min-w-0 items-center gap-2"><FileText size={17}/><span className="truncate">{actionData.fileName || "Ver archivo adjunto"}</span></span><Eye size={17}/></a>}

              {(actionStep.actionConfig?.fields?.length || 0) > 0 && <label className="block text-xs font-black text-slate-800">
                <span>Información o referencia <span className="font-medium text-slate-400">(opcional)</span></span>
                <textarea className="field-input mt-2 min-h-24 resize-y" placeholder="Agrega una nota, número de referencia o detalle que quieras recordar." value={actionData.notes || ""} onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}/>
              </label>}

              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 text-xs leading-5 text-amber-950 transition hover:border-amber-300 ${(actionStep.actionConfig?.fields?.length || 0) === 0 ? "p-3" : "p-4"}`}>
                <input type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-blue-600"/>
                <span><strong className="block">Confirmo que completé esta etapa</strong><span className="mt-0.5 block text-amber-800">Al guardarla quedará cerrada y ya no se podrá modificar.</span></span>
              </label>
            </div>
            <div className={`grid gap-3 border-t border-slate-100 bg-slate-50/70 sm:grid-cols-2 sm:px-7 ${(actionStep.actionConfig?.fields?.length || 0) === 0 ? "p-4" : "p-5"}`}>
              <button
                type="button"
                onClick={() => { setActionStep(null); setActionData({}); }}
                className="min-h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700">
                <ShieldCheck size={17}/> Guardar y completar
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

function InlineStepChecklist({
  step,
  value,
  onChange,
  onOpenModal,
  onComplete,
}: {
  step: Step;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  onOpenModal: () => void;
  onComplete: (value: Record<string, string>) => void;
}) {
  const fields = step.actionConfig?.fields || [];
  const isSimpleStep = fields.length === 0;
  const requiredReady = Boolean(value.date) && fields.filter((field) => field.required).every((field) => Boolean(value[field.key]?.trim()));
  const confirmed = value.confirmed === "true";
  const update = (key: string, nextValue: string) => onChange({ ...value, [key]: nextValue });
  const stateIcon = (complete: boolean) => <span className={`grid size-8 shrink-0 place-items-center rounded-full border-2 ${complete ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-400"}`}>{complete ? <Check size={15} strokeWidth={3}/> : <CircleDashed size={15}/>}</span>;

  if (isSimpleStep) {
    return <div className="space-y-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">Confirmación rápida</p><p className="mt-0.5 text-[11px] text-slate-500">Selecciona la fecha en que terminaste este paso.</p></div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/35">
        <div className="p-3 sm:p-4">
          <label className="flex min-w-0 items-center gap-3">
            {stateIcon(Boolean(value.date))}
            <span className="min-w-0 flex-1"><span className="text-xs font-black text-slate-900">Fecha de realización <span className="text-red-500">*</span></span><input type="date" required className="field-input mt-1.5 min-h-10 py-2" value={value.date || ""} onChange={(event) => update("date", event.target.value)}/></span>
          </label>
        </div>
      </div>

      <button type="button" disabled={!requiredReady} onClick={(event) => { event.stopPropagation(); onComplete(value); }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"><ShieldCheck size={16}/>{requiredReady ? "Confirmar etapa" : "Selecciona la fecha de realización"}</button>
      <p className="text-center text-[10px] leading-4 text-slate-500">Al confirmar, este paso quedará cerrado y ya no se podrá modificar.</p>
    </div>;
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">Datos de la etapa</p><p className="mt-1 text-xs text-slate-500">Completa cada punto y confirma cuando todo esté listo.</p></div>
      <button type="button" onClick={(event) => { event.stopPropagation(); onOpenModal(); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-[11px] font-black text-blue-700 transition hover:bg-blue-50"><MousePointerClick size={15}/>Completar en una ventana</button>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <label className="flex items-start gap-3 border-b border-slate-100 p-4">
        {stateIcon(Boolean(value.date))}
        <span className="min-w-0 flex-1"><span className="text-xs font-black text-slate-900">Fecha de realización <span className="text-red-500">*</span></span><input type="date" required className="field-input mt-2" value={value.date || ""} onChange={(event) => update("date", event.target.value)}/></span>
      </label>

      {fields.map((field) => {
        const complete = Boolean(value[field.key]?.trim());
        return <label key={field.key} className="flex items-start gap-3 border-b border-slate-100 p-4">
          {stateIcon(complete)}
          <span className="min-w-0 flex-1"><span className="text-xs font-black text-slate-900">{field.label}{field.required ? <span className="ml-1 text-red-500">*</span> : <span className="ml-1 font-medium text-slate-400">(opcional)</span>}</span>{field.type === "select" ? <select required={field.required} className="field-input mt-2" value={value[field.key] || ""} onChange={(event) => update(field.key, event.target.value)}><option value="">Selecciona una opción</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : <input type={field.type || "text"} required={field.required} className="field-input mt-2" value={value[field.key] || ""} onChange={(event) => update(field.key, event.target.value)}/>}</span>
        </label>;
      })}

      <label className="flex items-start gap-3 border-b border-slate-100 p-4">
        {stateIcon(Boolean(value.notes?.trim()))}
        <span className="min-w-0 flex-1"><span className="text-xs font-black text-slate-900">Información o referencia <span className="font-medium text-slate-400">(opcional)</span></span><textarea className="field-input mt-2 min-h-20 resize-y" placeholder="Nota, número de referencia o detalle que quieras recordar." value={value.notes || ""} onChange={(event) => update("notes", event.target.value)}/></span>
      </label>

      <label className={`flex cursor-pointer items-start gap-3 p-4 transition ${confirmed ? "bg-emerald-50" : "bg-amber-50/70"}`}>
        <input type="checkbox" checked={confirmed} onChange={(event) => update("confirmed", event.target.checked ? "true" : "")} className="mt-1 size-4 shrink-0 accent-blue-600"/>
        <span><strong className="text-xs text-slate-900">Confirmo que completé esta etapa</strong><span className="mt-1 block text-[11px] leading-4 text-slate-600">Después de guardarla quedará cerrada y no se podrá modificar.</span></span>
      </label>
    </div>

    <button type="button" disabled={!requiredReady || !confirmed} onClick={(event) => { event.stopPropagation(); onComplete(value); }} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"><ShieldCheck size={17}/>{requiredReady ? confirmed ? "Guardar y completar paso" : "Confirma que completaste la etapa" : "Completa los datos obligatorios"}</button>
  </div>;
}
