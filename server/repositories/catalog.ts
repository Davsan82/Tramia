import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { getDrizzleDatabase } from '../db/client';
import {
  organizations,
  procedureCategories,
  procedureDelegationRules,
  procedureRequirements,
  procedureSources,
  procedureStages,
  procedureSteps,
  procedureStepChecklistItems,
  procedureStepDependencies,
  procedureVersions,
  procedures,
  stepRequirements,
} from '../db/schema';

let bootstrapCache: { expiresAt: number; data: Awaited<ReturnType<typeof queryCatalogBootstrap>> } | null = null;
let bootstrapPromise: Promise<Awaited<ReturnType<typeof queryCatalogBootstrap>>> | null = null;

export function invalidateCatalogCache() {
  bootstrapCache = null;
  bootstrapPromise = null;
}

export async function listCategories() {
  const db = getDrizzleDatabase();
  return db.select({
    id: procedureCategories.id,
    slug: procedureCategories.slug,
    name: procedureCategories.name,
    description: procedureCategories.description,
    icon: procedureCategories.icon,
  }).from(procedureCategories)
    .where(eq(procedureCategories.isActive, true))
    .orderBy(asc(procedureCategories.position), asc(procedureCategories.name));
}

export async function listProcedures() {
  const db = getDrizzleDatabase();
  return db.select({
    id: procedures.id,
    slug: procedures.slug,
    title: procedures.title,
    shortDescription: procedures.shortDescription,
    procedureType: procedures.procedureType,
    featured: procedures.isFeatured,
    categorySlug: procedureCategories.slug,
    categoryName: procedureCategories.name,
    organizationName: organizations.name,
    organizationShortName: organizations.shortName,
    modality: procedureVersions.modality,
    difficulty: procedureVersions.difficulty,
    officialCostMin: procedureVersions.officialCostMin,
    officialCostMax: procedureVersions.officialCostMax,
    currency: procedureVersions.currency,
    estimatedDurationMin: procedureVersions.estimatedDurationMin,
    estimatedDurationMax: procedureVersions.estimatedDurationMax,
    durationUnit: procedureVersions.durationUnit,
    dataClassification: procedureVersions.dataClassification,
    sourceVerifiedAt: procedureVersions.sourceVerifiedAt,
  }).from(procedures)
    .innerJoin(procedureCategories, eq(procedures.categoryId, procedureCategories.id))
    .leftJoin(organizations, eq(procedures.organizationId, organizations.id))
    .innerJoin(procedureVersions, and(
      eq(procedureVersions.procedureId, procedures.id),
      eq(procedureVersions.status, 'reviewed'),
    ))
    .where(eq(procedures.isActive, true))
    .orderBy(asc(procedureCategories.position), asc(procedures.title));
}

async function queryCatalogBootstrap() {
  const db = getDrizzleDatabase();
  const items = await db.select({
    id: procedures.id,
    slug: procedures.slug,
    title: procedures.title,
    shortDescription: procedures.shortDescription,
    procedureType: procedures.procedureType,
    featured: procedures.isFeatured,
    category: procedureCategories.name,
    categorySlug: procedureCategories.slug,
    organization: organizations.name,
    organizationShortName: organizations.shortName,
    versionId: procedureVersions.id,
    version: procedureVersions.versionNumber,
    fullDescription: procedureVersions.fullDescription,
    modality: procedureVersions.modality,
    difficulty: procedureVersions.difficulty,
    officialCostMin: procedureVersions.officialCostMin,
    officialCostMax: procedureVersions.officialCostMax,
    currency: procedureVersions.currency,
    estimatedDurationMin: procedureVersions.estimatedDurationMin,
    estimatedDurationMax: procedureVersions.estimatedDurationMax,
    durationUnit: procedureVersions.durationUnit,
    officialUrl: procedureVersions.officialUrl,
    dataClassification: procedureVersions.dataClassification,
    verificationNotes: procedureVersions.verificationNotes,
    sourceVerifiedAt: procedureVersions.sourceVerifiedAt,
  }).from(procedures)
    .innerJoin(procedureCategories, eq(procedures.categoryId, procedureCategories.id))
    .leftJoin(organizations, eq(procedures.organizationId, organizations.id))
    .innerJoin(procedureVersions, and(
      eq(procedureVersions.procedureId, procedures.id),
      eq(procedureVersions.status, 'reviewed'),
    ))
    .where(eq(procedures.isActive, true))
    .orderBy(asc(procedureCategories.position), asc(procedures.title));

  if (items.length === 0) return [];
  const versionIds = items.map((item) => item.versionId);
  const [allStages, allSteps, allRequirements, allSources, allDelegations] = await Promise.all([
    db.select().from(procedureStages).where(inArray(procedureStages.procedureVersionId, versionIds)).orderBy(asc(procedureStages.position)),
    db.select().from(procedureSteps).where(inArray(procedureSteps.procedureVersionId, versionIds)).orderBy(asc(procedureSteps.position)),
    db.select().from(procedureRequirements).where(inArray(procedureRequirements.procedureVersionId, versionIds)),
    db.select().from(procedureSources).where(inArray(procedureSources.procedureVersionId, versionIds)),
    db.select().from(procedureDelegationRules).where(inArray(procedureDelegationRules.procedureVersionId, versionIds)),
  ]);
  const stepIds = allSteps.map((step) => step.id);
  const links = stepIds.length
    ? await db.select().from(stepRequirements).where(inArray(stepRequirements.stepId, stepIds))
    : [];
  const [checklistItems, dependencies] = stepIds.length ? await Promise.all([
    db.select().from(procedureStepChecklistItems).where(inArray(procedureStepChecklistItems.stepId, stepIds)).orderBy(asc(procedureStepChecklistItems.position)),
    db.select().from(procedureStepDependencies).where(inArray(procedureStepDependencies.stepId, stepIds)),
  ]) : [[], []];

  return items.map((item) => ({
    ...item,
    stages: allStages.filter((stage) => stage.procedureVersionId === item.versionId),
    steps: allSteps
      .filter((step) => step.procedureVersionId === item.versionId)
      .map((step) => ({
        ...step,
        requirements: allRequirements.filter((requirement) => links.some(
          (link) => link.stepId === step.id && link.requirementId === requirement.id,
        )),
        checklistItems: checklistItems.filter((checklistItem) => checklistItem.stepId === step.id),
        dependsOn: dependencies.filter((dependency) => dependency.stepId === step.id).map((dependency) => dependency.dependsOnStepId),
      })),
    sources: allSources.filter((source) => source.procedureVersionId === item.versionId),
    delegation: allDelegations.find((rule) => rule.procedureVersionId === item.versionId) ?? null,
  }));
}

export async function getCatalogBootstrap() {
  const now = Date.now();
  if (bootstrapCache && bootstrapCache.expiresAt > now) return bootstrapCache.data;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = queryCatalogBootstrap().then((data) => {
    bootstrapCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
    return data;
  }).finally(() => {
    bootstrapPromise = null;
  });
  return bootstrapPromise;
}

export async function getProcedureBySlug(slug: string) {
  const db = getDrizzleDatabase();
  const [procedure] = await db.select({
    id: procedures.id,
    slug: procedures.slug,
    title: procedures.title,
    shortDescription: procedures.shortDescription,
    procedureType: procedures.procedureType,
    featured: procedures.isFeatured,
    category: procedureCategories.name,
    organization: organizations.name,
    organizationShortName: organizations.shortName,
    versionId: procedureVersions.id,
    version: procedureVersions.versionNumber,
    fullDescription: procedureVersions.fullDescription,
    modality: procedureVersions.modality,
    difficulty: procedureVersions.difficulty,
    officialCostMin: procedureVersions.officialCostMin,
    officialCostMax: procedureVersions.officialCostMax,
    currency: procedureVersions.currency,
    estimatedDurationMin: procedureVersions.estimatedDurationMin,
    estimatedDurationMax: procedureVersions.estimatedDurationMax,
    durationUnit: procedureVersions.durationUnit,
    officialUrl: procedureVersions.officialUrl,
    dataClassification: procedureVersions.dataClassification,
    verificationNotes: procedureVersions.verificationNotes,
    sourceVerifiedAt: procedureVersions.sourceVerifiedAt,
  }).from(procedures)
    .innerJoin(procedureCategories, eq(procedures.categoryId, procedureCategories.id))
    .leftJoin(organizations, eq(procedures.organizationId, organizations.id))
    .innerJoin(procedureVersions, and(
      eq(procedureVersions.procedureId, procedures.id),
      eq(procedureVersions.status, 'reviewed'),
    ))
    .where(and(eq(procedures.slug, slug), eq(procedures.isActive, true)))
    .orderBy(desc(procedureVersions.versionNumber))
    .limit(1);

  if (!procedure) return null;

  const [stages, steps, requirements, sources, delegation] = await Promise.all([
    db.select().from(procedureStages).where(eq(procedureStages.procedureVersionId, procedure.versionId)).orderBy(asc(procedureStages.position)),
    db.select().from(procedureSteps).where(eq(procedureSteps.procedureVersionId, procedure.versionId)).orderBy(asc(procedureSteps.position)),
    db.select().from(procedureRequirements).where(eq(procedureRequirements.procedureVersionId, procedure.versionId)),
    db.select().from(procedureSources).where(eq(procedureSources.procedureVersionId, procedure.versionId)),
    db.select().from(procedureDelegationRules).where(eq(procedureDelegationRules.procedureVersionId, procedure.versionId)).limit(1),
  ]);

  const requirementLinks = steps.length
    ? await db.select().from(stepRequirements).where(inArray(stepRequirements.stepId, steps.map((step) => step.id)))
    : [];
  const [checklistItems, dependencies] = steps.length ? await Promise.all([
    db.select().from(procedureStepChecklistItems).where(inArray(procedureStepChecklistItems.stepId, steps.map((step) => step.id))).orderBy(asc(procedureStepChecklistItems.position)),
    db.select().from(procedureStepDependencies).where(inArray(procedureStepDependencies.stepId, steps.map((step) => step.id))),
  ]) : [[], []];

  return {
    ...procedure,
    stages,
    steps: steps.map((step) => ({
      ...step,
      requirements: requirements.filter((requirement) => requirementLinks.some(
        (link) => link.stepId === step.id && link.requirementId === requirement.id,
      )),
      checklistItems: checklistItems.filter((checklistItem) => checklistItem.stepId === step.id),
      dependsOn: dependencies.filter((dependency) => dependency.stepId === step.id).map((dependency) => dependency.dependsOnStepId),
    })),
    sources,
    delegation: delegation[0] ?? null,
  };
}
