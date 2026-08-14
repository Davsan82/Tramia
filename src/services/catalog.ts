import type { Procedure, Requirement, Step } from '../types';

type ApiListItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  categoryName: string;
  organizationShortName?: string;
  organizationName?: string;
  modality: 'virtual' | 'presencial' | 'mixta';
  difficulty: 'baja' | 'media' | 'alta';
  officialCostMin?: string;
  officialCostMax?: string;
  currency: string;
  estimatedDurationMin?: number;
  estimatedDurationMax?: number;
  durationUnit: string;
  featured: boolean;
  officialUrl?: string;
};

type ApiDetail = ApiListItem & {
  category?: string;
  organization?: string;
  fullDescription: string;
  stages?: Array<{ id: string; name: string; position: number }>;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    position: number;
    completionMode: 'manual'|'evidence'|'form'|'external_check'|'payment';
    officialUrl?: string;
    stageId?: string;
    stepType?: string;
    helpText?: string;
    whyItMatters?: string;
    nextStepHint?: string;
    dateTrackingType?: string;
    actionConfig?: any;
    reminderOffsets?: string[];
    checklistItems?: Array<{ id: string; label: string; isRequired: boolean }>;
    dependsOn?: string[];
    requirements: Array<{
      id: string;
      name: string;
      description?: string;
      isRequired: boolean;
    }>;
  }>;
  delegation?: { serviceFeeMinor?: number; currency?: string };
};

const modalityLabel = { virtual: 'Virtual', presencial: 'Presencial', mixta: 'Mixta' } as const;
const difficultyLabel = { baja: 'Baja', media: 'Media', alta: 'Alta' } as const;

function money(item: ApiListItem) {
  if (item.officialCostMin == null) return 'Consultar en la entidad';
  const prefix = item.currency === 'PEN' ? 'S/.' : item.currency;
  if (item.officialCostMax && item.officialCostMax !== item.officialCostMin) {
    return `${prefix} ${item.officialCostMin} – ${item.officialCostMax}`;
  }
  return Number(item.officialCostMin) === 0 ? 'Gratuito' : `${prefix} ${item.officialCostMin}`;
}

function duration(item: ApiListItem) {
  if (item.estimatedDurationMin == null) return 'Según evaluación de la entidad';
  const unit = item.durationUnit === 'business_day' ? 'días hábiles' : 'días';
  return item.estimatedDurationMax && item.estimatedDurationMax !== item.estimatedDurationMin
    ? `${item.estimatedDurationMin} a ${item.estimatedDurationMax} ${unit}`
    : `${item.estimatedDurationMin} ${unit}`;
}

function mapDetail(item: ApiDetail): Procedure {
  const requirements: Requirement[] = item.steps.flatMap((step) => step.requirements.map((requirement) => ({
    id: requirement.id,
    name: requirement.name,
    description: requirement.description || 'Documento requerido para este paso.',
    status: 'Pendiente' as const,
    critical: requirement.isRequired,
    requiredForStepId: step.id,
    isValidated: false,
    isRequired: requirement.isRequired,
    requiresEvidence: true,
  })));
  const steps: Step[] = item.steps.map((step) => {
    const uiCompletionMode: Step['completionMode'] = step.dateTrackingType
      ? 'date'
      : step.completionMode === 'evidence'
        ? 'upload'
        : step.completionMode === 'external_check' || step.completionMode === 'payment'
          ? 'external'
          : step.completionMode;

    return ({
    id: step.id,
    title: step.title,
    description: step.description,
    status: 'PENDIENTE',
    order: step.position,
    requiresEvidence: step.completionMode === 'evidence',
    actionUrl: step.officialUrl,
    actionUrlLabel: step.officialUrl ? 'Ir al sitio oficial' : undefined,
    stageId: step.stageId,
    stageName: item.stages?.find((stage) => stage.id === step.stageId)?.name,
    stepType: step.stepType,
    helpText: step.helpText,
    whyItMatters: step.whyItMatters,
    nextStepHint: step.nextStepHint,
    dateTrackingType: step.dateTrackingType,
    completionMode: uiCompletionMode,
    actionConfig: step.actionConfig,
    reminderOffsets: step.reminderOffsets,
    checklistItems: step.checklistItems,
    dependsOn: step.dependsOn,
    });
  });

  return {
    id: item.slug,
    databaseId: item.id,
    title: item.title,
    category: item.category || item.categoryName,
    description: item.fullDescription || item.shortDescription,
    complexity: difficultyLabel[item.difficulty],
    estimatedCost: money(item),
    duration: duration(item),
    estimatedDuration: duration(item),
    entity: item.organizationShortName || item.organizationName || item.organization,
    officialUrl: item.officialUrl,
    modality: modalityLabel[item.modality],
    requirements,
    steps,
    popular: item.featured,
    feeAmount: item.delegation?.serviceFeeMinor != null
      ? `S/. ${(item.delegation.serviceFeeMinor / 100).toFixed(2)}`
      : undefined,
  };
}

export async function loadProcedureCatalog(): Promise<Procedure[]> {
  try {
    const response = await fetch('/api/v1/catalog/bootstrap');
    if (!response.ok) throw new Error('No se pudo cargar el catálogo');
    const payload = await response.json() as { data: ApiDetail[] };
    return payload.data.map(mapDetail);
  } catch (error) {
    console.error('[TramIA] No se pudo cargar el catálogo desde Neon.', error);
    return [];
  }
}
