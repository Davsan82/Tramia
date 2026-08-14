export interface Step {
  id: string;
  title: string;
  description: string;
  status: 'PENDIENTE' | 'COMPLETADO' | 'EN_PROGRESO';
  order: number;
  requiresEvidence?: boolean; // Indica si este paso requiere carga de archivo/foto
  actionUrl?: string; // Enlace directo opcional a portal oficial
  actionUrlLabel?: string;
  stageId?: string;
  stageName?: string;
  stepType?: string;
  helpText?: string;
  whyItMatters?: string;
  nextStepHint?: string;
  dateTrackingType?: string;
  reminderOffsets?: string[];
  completionMode?: 'manual'|'form'|'upload'|'date'|'external';
  actionConfig?: {fields?:Array<{key:string;label:string;type?:string;required?:boolean;options?:string[];sensitive?:boolean}>};
  checklistItems?: Array<{ id: string; label: string; isRequired: boolean }>;
  dependsOn?: string[];
}

export interface Requirement {
  id: string;
  name: string;
  description: string; // texto de ayuda instruccional
  code?: string;
  status: 'Por iniciar' | 'Pendiente' | 'Validando' | 'Corregir' | 'Aprobado';
  critical: boolean;
  requiredForStepId: string;
  uploadedFileName?: string;
  feedbackMessage?: string;
  detectedErrors?: string[];
  imageQuality?: 'Buena' | 'Regular' | 'Mala' | 'No detectada';
  recommendations?: string[];
  // Requisitos específicos solicitados:
  isValidated: boolean; // bandera de validación inteligente
  isRequired: boolean; // obligatoriedad
  requiresEvidence?: boolean; // Indica si requiere carga de evidencia
  userProcedureRequirementId?: string;
}

export interface Advisor {
  name: string;
  avatar: string;
  status: string;
  rating: number;
  casesCompleted: number;
  colegiatura?: string; // Colegiatura oficial de abogado o gestor verificado
  fee?: string; // tasa fija de delegación
}

export interface TramiteOption {
  id: string;
  databaseId?: string;
  title: string;
  category: 'Identidad' | 'Transporte' | 'Negocios' | 'Finanzas' | 'Familia' | 'Viajes' | string;
  description: string;
  complexity: 'Baja' | 'Media' | 'Alta';
  estimatedCost: string;
  duration: string; // duración estimada del trámite
  estimatedDuration: string; // compatible con vistas anteriores
  entity?: string; // Entidad responsable (RENIEC, SUNAT, MTC, etc.)
  officialUrl?: string; // Fuente oficial almacenada en el catálogo
  modality?: 'Virtual' | 'Presencial' | 'Mixta' | string; // Modalidad
  requirements: Requirement[];
  steps: Step[];
  coPilotAdvice?: string; // consejos del copiloto inteligente
  actionLabel?: string; // etiquetas de acción de pasos
  popular: boolean;
  timeSavedText?: string;
  avoidedQueuesText?: string;
  feeAmount?: string;
}

// Keep Procedure alias pointing to TramiteOption for maximum code compatibility
export type Procedure = TramiteOption;

export interface UserProfile {
  id?: string;
  username?: string;
  fullName: string;
  dni: string;
  phone: string;
  address: string;
  email: string;
  emailVerified?: boolean;
  identityVerificationStatus?: string;
  birthDate?: string;
  gender?: string;
  department?: string;
  province?: string;
  district?: string;
  isNew?: boolean;
  roles?: string[];
  avatarUrl?: string;
}

export interface ActiveProcedure {
  id: string;
  procedureId: string;
  title: string;
  category: string;
  currentStepId: string;
  startedAt: string;
  estimatedCompletion: string;
  completionPercentage: number;
  isDelegated: boolean;
  isPaid?: boolean;
  requirements: Requirement[];
  completedStepIds?: string[];
  timeline: {
    title: string;
    status: 'completado' | 'actual' | 'pendiente';
    time?: string;
  }[];
}

export interface ExpirationReminder {
  id: string;
  title: string;
  subtitle: string;
  expirationDate: string;
  daysRemaining: number;
  type: 'DNI' | 'SOAT' | 'Pasaporte' | 'Tributos' | 'Licencia';
  critical: boolean;
}

export interface HistoryRecord {
  id: string;
  title: string;
  category: string;
  completedAt: string;
  cost: string;
  advisorName?: string;
  documentUrl?: string;
}
