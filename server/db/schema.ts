import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const accountStatus = pgEnum('account_status', ['pending', 'active', 'suspended', 'deleted']);
export const contentStatus = pgEnum('content_status', ['draft', 'reviewed', 'published', 'archived']);
export const procedureModality = pgEnum('procedure_modality', ['virtual', 'presencial', 'mixta']);
export const procedureDifficulty = pgEnum('procedure_difficulty', ['baja', 'media', 'alta']);
export const completionMode = pgEnum('completion_mode', ['manual', 'evidence', 'form', 'external_check', 'payment']);
export const userProcedureMode = pgEnum('user_procedure_mode', ['self_service', 'delegated', 'hybrid']);
export const userProcedureStatus = pgEnum('user_procedure_status', [
  'draft', 'active', 'waiting_user', 'eligible_for_delegation', 'waiting_payment',
  'waiting_assignment', 'delegated', 'in_progress', 'paused', 'completed', 'cancelled', 'rejected',
]);
export const stepStatus = pgEnum('step_status', ['locked', 'available', 'in_progress', 'in_review', 'completed', 'rejected', 'skipped']);
export const requirementStatus = pgEnum('requirement_status', ['pending', 'uploaded', 'validating', 'approved', 'rejected', 'expired', 'waived']);
export const validationStatus = pgEnum('validation_status', ['pending', 'processing', 'approved', 'correction_required', 'error']);
export const delegationType = pgEnum('delegation_type', ['full', 'partial', 'unavailable']);
export const delegationStatus = pgEnum('delegation_status', ['requested', 'quoted', 'awaiting_payment', 'paid', 'assigned', 'active', 'completed', 'cancelled', 'rejected', 'expired']);
export const assignmentStatus = pgEnum('assignment_status', ['reserved', 'active', 'completed', 'cancelled', 'reassigned']);
export const paymentStatus = pgEnum('payment_status', ['created', 'pending', 'authorized', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded']);
export const paymentType = pgEnum('payment_type', ['government_fee', 'delegation_service', 'additional_service']);
export const notificationStatus = pgEnum('notification_status', ['pending', 'sent', 'read', 'failed', 'cancelled']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 32 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  phone: varchar('phone', { length: 32 }),
  status: accountStatus('status').notNull().default('pending'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex('users_email_uidx').on(sql`lower(${table.email})`),
  uniqueIndex('users_username_uidx').on(sql`lower(${table.username})`),
]);

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('auth_sessions_user_idx').on(table.userId), index('auth_sessions_expiry_idx').on(table.expiresAt)]);

export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: varchar('purpose', { length: 32 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('auth_tokens_user_purpose_idx').on(table.userId, table.purpose)]);

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 120 }).notNull(),
  lastName: varchar('last_name', { length: 160 }).notNull(),
  documentType: varchar('document_type', { length: 24 }),
  documentNumberEncrypted: text('document_number_encrypted'),
  documentLastFour: varchar('document_last_four', { length: 4 }),
  birthDate: date('birth_date'),
  gender: varchar('gender', { length: 24 }),
  address: text('address'),
  department: varchar('department', { length: 120 }),
  province: varchar('province', { length: 120 }),
  district: varchar('district', { length: 120 }),
  avatarUrl: text('avatar_url'),
  identityVerificationStatus: varchar('identity_verification_status', { length: 32 }).notNull().default('unverified'),
  identityVerifiedAt: timestamp('identity_verified_at', { withTimezone: true }),
  ...timestamps,
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 40 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.roleId] })]);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 240 }).notNull(),
  shortName: varchar('short_name', { length: 80 }),
  organizationType: varchar('organization_type', { length: 60 }).notNull(),
  officialUrl: text('official_url'),
  logoUrl: text('logo_url'),
  countryCode: varchar('country_code', { length: 2 }).notNull().default('PE'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const procedureCategories = pgTable('procedure_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 80 }),
  position: integer('position').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const procedures = pgTable('procedures', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 180 }).notNull().unique(),
  categoryId: uuid('category_id').notNull().references(() => procedureCategories.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  title: varchar('title', { length: 280 }).notNull(),
  shortDescription: varchar('short_description', { length: 500 }).notNull(),
  procedureType: varchar('procedure_type', { length: 60 }).notNull().default('government'),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
}, (table) => [index('procedures_category_active_idx').on(table.categoryId, table.isActive)]);

export const procedureVersions = pgTable('procedure_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  procedureId: uuid('procedure_id').notNull().references(() => procedures.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  fullDescription: text('full_description').notNull(),
  modality: procedureModality('modality').notNull(),
  difficulty: procedureDifficulty('difficulty').notNull(),
  officialCostMin: numeric('official_cost_min', { precision: 12, scale: 2 }),
  officialCostMax: numeric('official_cost_max', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('PEN'),
  estimatedDurationMin: integer('estimated_duration_min'),
  estimatedDurationMax: integer('estimated_duration_max'),
  durationUnit: varchar('duration_unit', { length: 30 }).notNull().default('business_day'),
  officialUrl: text('official_url'),
  sourceVerifiedAt: timestamp('source_verified_at', { withTimezone: true }),
  dataClassification: varchar('data_classification', { length: 30 }).notNull().default('demo'),
  verificationNotes: text('verification_notes'),
  validFrom: date('valid_from').notNull().defaultNow(),
  validUntil: date('valid_until'),
  changeSummary: text('change_summary'),
  status: contentStatus('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex('procedure_versions_number_uidx').on(table.procedureId, table.versionNumber)]);

export const procedureSources = pgTable('procedure_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  procedureVersionId: uuid('procedure_version_id').notNull().references(() => procedureVersions.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  title: varchar('title', { length: 300 }).notNull(),
  url: text('url').notNull(),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }).notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
}, (table) => [uniqueIndex('procedure_sources_version_url_uidx').on(table.procedureVersionId, table.url)]);

export const procedureStages = pgTable('procedure_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  procedureVersionId: uuid('procedure_version_id').notNull().references(() => procedureVersions.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  description: text('description'),
  ...timestamps,
}, (table) => [uniqueIndex('procedure_stages_position_uidx').on(table.procedureVersionId, table.position)]);

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
});

export const procedureTags = pgTable('procedure_tags', {
  procedureId: uuid('procedure_id').notNull().references(() => procedures.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.procedureId, table.tagId] })]);

export const procedureSteps = pgTable('procedure_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  procedureVersionId: uuid('procedure_version_id').notNull().references(() => procedureVersions.id, { onDelete: 'cascade' }),
  stageId: uuid('stage_id').references(() => procedureStages.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  title: varchar('title', { length: 240 }).notNull(),
  description: text('description').notNull(),
  completionMode: completionMode('completion_mode').notNull().default('manual'),
  modality: procedureModality('modality'),
  estimatedDurationHours: numeric('estimated_duration_hours', { precision: 8, scale: 2 }),
  officialUrl: text('official_url'),
  requiresUserPresence: boolean('requires_user_presence').notNull().default(false),
  canBeDelegated: boolean('can_be_delegated').notNull().default(true),
  isPointOfNoReturn: boolean('is_point_of_no_return').notNull().default(false),
  isOptional: boolean('is_optional').notNull().default(false),
  stepType: varchar('step_type', { length: 30 }).notNull().default('required'),
  helpText: text('help_text'),
  whyItMatters: text('why_it_matters'),
  nextStepHint: text('next_step_hint'),
  estimatedCostText: varchar('estimated_cost_text', { length: 160 }),
  dateTrackingType: varchar('date_tracking_type', { length: 30 }),
  dateTrackingEnabled: boolean('date_tracking_enabled').notNull().default(false),
  reminderOffsets: text('reminder_offsets').array(),
  applicabilityRule: jsonb('applicability_rule').notNull().default({}),
  actionConfig: jsonb('action_config').notNull().default({}),
  ...timestamps,
}, (table) => [
  uniqueIndex('procedure_steps_position_uidx').on(table.procedureVersionId, table.position),
  check('procedure_steps_position_check', sql`${table.position} > 0`),
]);

export const procedureStepDependencies = pgTable('procedure_step_dependencies', {
  stepId: uuid('step_id').notNull().references(() => procedureSteps.id, { onDelete: 'cascade' }),
  dependsOnStepId: uuid('depends_on_step_id').notNull().references(() => procedureSteps.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.stepId, table.dependsOnStepId] })]);

export const procedureStepChecklistItems = pgTable('procedure_step_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  stepId: uuid('step_id').notNull().references(() => procedureSteps.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  label: text('label').notNull(),
  isRequired: boolean('is_required').notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex('procedure_step_checklist_position_uidx').on(table.stepId, table.position)]);

export const procedureRequirements = pgTable('procedure_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  procedureVersionId: uuid('procedure_version_id').notNull().references(() => procedureVersions.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 240 }).notNull(),
  description: text('description'),
  requirementType: varchar('requirement_type', { length: 50 }).notNull().default('document'),
  allowedFileTypes: text('allowed_file_types').array(),
  maxFileSizeBytes: bigint('max_file_size_bytes', { mode: 'number' }).notNull().default(10485760),
  isRequired: boolean('is_required').notNull().default(true),
  isSensitive: boolean('is_sensitive').notNull().default(false),
  expiresAfterDays: integer('expires_after_days'),
  validationMethod: varchar('validation_method', { length: 50 }).notNull().default('manual'),
  ...timestamps,
});

export const stepRequirements = pgTable('step_requirements', {
  stepId: uuid('step_id').notNull().references(() => procedureSteps.id, { onDelete: 'cascade' }),
  requirementId: uuid('requirement_id').notNull().references(() => procedureRequirements.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.stepId, table.requirementId] })]);

export const procedureDelegationRules = pgTable('procedure_delegation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  procedureVersionId: uuid('procedure_version_id').notNull().unique().references(() => procedureVersions.id, { onDelete: 'cascade' }),
  type: delegationType('type').notNull().default('partial'),
  eligibleAfterStepId: uuid('eligible_after_step_id').references(() => procedureSteps.id),
  requiresPriorStepsCompleted: boolean('requires_prior_steps_completed').notNull().default(true),
  requiresDocumentsApproved: boolean('requires_documents_approved').notNull().default(true),
  serviceFeeMinor: integer('service_fee_minor'),
  currency: varchar('currency', { length: 3 }).notNull().default('PEN'),
  cancellationPolicy: text('cancellation_policy'),
  refundPolicy: text('refund_policy'),
  ...timestamps,
});

export const userProcedures = pgTable('user_procedures', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackingCode: varchar('tracking_code', { length: 40 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  procedureId: uuid('procedure_id').notNull().references(() => procedures.id),
  procedureVersionId: uuid('procedure_version_id').notNull().references(() => procedureVersions.id),
  mode: userProcedureMode('mode').notNull().default('self_service'),
  status: userProcedureStatus('status').notNull().default('draft'),
  currentStepId: uuid('current_step_id').references(() => procedureSteps.id),
  progressPercentage: smallint('progress_percentage').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
  expectedCompletionAt: timestamp('expected_completion_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  nonReturnReachedAt: timestamp('non_return_reached_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index('user_procedures_user_status_idx').on(table.userId, table.status, table.updatedAt),
  check('user_procedures_progress_check', sql`${table.progressPercentage} between 0 and 100`),
]);

export const userProcedureSteps = pgTable('user_procedure_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProcedureId: uuid('user_procedure_id').notNull().references(() => userProcedures.id, { onDelete: 'cascade' }),
  procedureStepId: uuid('procedure_step_id').notNull().references(() => procedureSteps.id),
  status: stepStatus('status').notNull().default('locked'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  completedBy: uuid('completed_by').references(() => users.id),
  completionSource: varchar('completion_source', { length: 40 }),
  notes: text('notes'),
  dueAt: timestamp('due_at', { withTimezone: true }),
  lockedReason: text('locked_reason'),
  completionData: jsonb('completion_data').notNull().default({}),
  isFinalized: boolean('is_finalized').notNull().default(false),
  ...timestamps,
}, (table) => [uniqueIndex('user_procedure_steps_uidx').on(table.userProcedureId, table.procedureStepId)]);

export const userProcedureRequirements = pgTable('user_procedure_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProcedureId: uuid('user_procedure_id').notNull().references(() => userProcedures.id, { onDelete: 'cascade' }),
  requirementId: uuid('requirement_id').notNull().references(() => procedureRequirements.id),
  status: requirementStatus('status').notNull().default('pending'),
  waivedReason: text('waived_reason'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex('user_procedure_requirements_uidx').on(table.userProcedureId, table.requirementId)]);

export const uploadedDocuments = pgTable('uploaded_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProcedureId: uuid('user_procedure_id').notNull().references(() => userProcedures.id, { onDelete: 'cascade' }),
  userProcedureRequirementId: uuid('user_procedure_requirement_id').references(() => userProcedureRequirements.id),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  storageProvider: varchar('storage_provider', { length: 40 }).notNull(),
  storageKey: text('storage_key').notNull().unique(),
  originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  checksum: varchar('checksum', { length: 128 }),
  status: validationStatus('status').notNull().default('pending'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [index('uploaded_documents_case_idx').on(table.userProcedureId, table.createdAt)]);

export const documentValidations = pgTable('document_validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => uploadedDocuments.id, { onDelete: 'cascade' }),
  validatorType: varchar('validator_type', { length: 30 }).notNull(),
  validatorUserId: uuid('validator_user_id').references(() => users.id),
  status: validationStatus('status').notNull(),
  confidenceScore: smallint('confidence_score'),
  observations: text('observations'),
  result: jsonb('result').notNull().default({}),
  validatedAt: timestamp('validated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const expertiseAreas = pgTable('expertise_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
});

export const advisorProfiles = pgTable('advisor_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  publicName: varchar('public_name', { length: 180 }).notNull(),
  bio: text('bio'),
  licenseNumber: varchar('license_number', { length: 100 }),
  verificationStatus: varchar('verification_status', { length: 30 }).notNull().default('pending'),
  availabilityStatus: varchar('availability_status', { length: 30 }).notNull().default('offline'),
  averageRating: numeric('average_rating', { precision: 3, scale: 2 }).notNull().default('0'),
  completedCasesCount: integer('completed_cases_count').notNull().default(0),
  cancelledCasesCount: integer('cancelled_cases_count').notNull().default(0),
  activeCasesCount: integer('active_cases_count').notNull().default(0),
  maxActiveCases: integer('max_active_cases').notNull().default(10),
  baseFeeMinor: integer('base_fee_minor').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('PEN'),
  ...timestamps,
});

export const advisorExpertise = pgTable('advisor_expertise', {
  advisorId: uuid('advisor_id').notNull().references(() => advisorProfiles.userId, { onDelete: 'cascade' }),
  expertiseId: uuid('expertise_id').notNull().references(() => expertiseAreas.id, { onDelete: 'cascade' }),
  level: varchar('level', { length: 30 }).notNull().default('specialist'),
  yearsExperience: smallint('years_experience'),
  isVerified: boolean('is_verified').notNull().default(false),
}, (table) => [primaryKey({ columns: [table.advisorId, table.expertiseId] })]);

export const delegationRequests = pgTable('delegation_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProcedureId: uuid('user_procedure_id').notNull().unique().references(() => userProcedures.id, { onDelete: 'cascade' }),
  requestedAdvisorId: uuid('requested_advisor_id').references(() => advisorProfiles.userId),
  status: delegationStatus('status').notNull().default('requested'),
  quotedAmountMinor: integer('quoted_amount_minor').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('PEN'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  ...timestamps,
});

export const advisorAssignments = pgTable('advisor_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  delegationRequestId: uuid('delegation_request_id').notNull().references(() => delegationRequests.id, { onDelete: 'cascade' }),
  advisorId: uuid('advisor_id').notNull().references(() => advisorProfiles.userId),
  status: assignmentStatus('status').notNull().default('reserved'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  endReason: text('end_reason'),
}, (table) => [index('advisor_assignments_active_idx').on(table.advisorId, table.status)]);

export const paymentOrders = pgTable('payment_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProcedureId: uuid('user_procedure_id').notNull().references(() => userProcedures.id, { onDelete: 'restrict' }),
  delegationRequestId: uuid('delegation_request_id').references(() => delegationRequests.id),
  type: paymentType('type').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('PEN'),
  status: paymentStatus('status').notNull().default('created'),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerOrderId: varchar('provider_order_id', { length: 180 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index('payment_orders_case_idx').on(table.userProcedureId, table.createdAt),
  check('payment_orders_amount_check', sql`${table.amountMinor} >= 0`),
]);

export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentOrderId: uuid('payment_order_id').notNull().references(() => paymentOrders.id, { onDelete: 'restrict' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerTransactionId: varchar('provider_transaction_id', { length: 180 }),
  paymentMethodType: varchar('payment_method_type', { length: 40 }).notNull(),
  cardBrand: varchar('card_brand', { length: 30 }),
  cardLastFour: varchar('card_last_four', { length: 4 }),
  status: paymentStatus('status').notNull(),
  amountMinor: integer('amount_minor').notNull(),
  providerResponseCode: varchar('provider_response_code', { length: 80 }),
  failureReason: text('failure_reason'),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProcedureId: uuid('user_procedure_id').notNull().references(() => userProcedures.id, { onDelete: 'cascade' }),
  reviewerUserId: uuid('reviewer_user_id').notNull().references(() => users.id),
  reviewedUserId: uuid('reviewed_user_id').notNull().references(() => users.id),
  rating: numeric('rating', { precision: 2, scale: 1, mode: 'number' }).notNull(),
  comment: varchar('comment', { length: 1000 }),
  ratingType: varchar('rating_type', { length: 30 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('ratings_direction_uidx').on(table.userProcedureId, table.reviewerUserId, table.reviewedUserId),
  check('ratings_stars_check', sql`${table.rating} between 1 and 5`),
]);

export const simulatedPaymentMethods = pgTable('simulated_payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brand: varchar('brand', { length: 24 }).notNull(),
  displayName: varchar('display_name', { length: 80 }).notNull(),
  holderName: varchar('holder_name', { length: 180 }).notNull(),
  token: varchar('token', { length: 80 }).notNull().unique(),
  lastFour: varchar('last_four', { length: 4 }).notNull(),
  expiryMonth: smallint('expiry_month').notNull(),
  expiryYear: smallint('expiry_year').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
}, (table) => [index('simulated_payment_methods_user_idx').on(table.userId, table.isActive)]);

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull().default({}),
  isPublic: boolean('is_public').notNull().default(false),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userProcedureId: uuid('user_procedure_id').references(() => userProcedures.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 60 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  status: notificationStatus('status').notNull().default('pending'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('notifications_user_status_idx').on(table.userId, table.status, table.createdAt)]);

export const procedureMessages = pgTable('procedure_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProcedureId: uuid('user_procedure_id').notNull().references(() => userProcedures.id, { onDelete: 'cascade' }),
  senderUserId: uuid('sender_user_id').notNull().references(() => users.id),
  recipientUserId: uuid('recipient_user_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('procedure_messages_case_created_idx').on(table.userProcedureId, table.createdAt), index('procedure_messages_recipient_read_idx').on(table.recipientUserId, table.readAt)]);

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 32 }),
  topic: varchar('topic', { length: 40 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('received'),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id, { onDelete: 'set null' }),
  handledAt: timestamp('handled_at', { withTimezone: true }),
  deliveryProvider: varchar('delivery_provider', { length: 40 }),
  deliveryMessageId: varchar('delivery_message_id', { length: 255 }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  ipHash: varchar('ip_hash', { length: 64 }),
  userAgent: text('user_agent'),
  sourcePath: varchar('source_path', { length: 500 }),
  metadata: jsonb('metadata').notNull().default({}),
  ...timestamps,
}, (table) => [index('contact_messages_status_created_idx').on(table.status, table.createdAt), index('contact_messages_user_idx').on(table.userId, table.createdAt), index('contact_messages_assignee_idx').on(table.assignedToUserId, table.status)]);

export const contactMessageNotes = pgTable('contact_message_notes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  contactMessageId: uuid('contact_message_id').notNull().references(() => contactMessages.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  note: text('note').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('contact_message_notes_message_idx').on(table.contactMessageId, table.createdAt)]);

export const procedureStatusHistory = pgTable('procedure_status_history', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userProcedureId: uuid('user_procedure_id').notNull().references(() => userProcedures.id, { onDelete: 'cascade' }),
  changedBy: uuid('changed_by').references(() => users.id),
  previousStatus: userProcedureStatus('previous_status'),
  newStatus: userProcedureStatus('new_status').notNull(),
  reason: text('reason'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('procedure_status_history_case_idx').on(table.userProcedureId, table.createdAt)]);

export const auditEvents = pgTable('audit_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  userProcedureId: uuid('user_procedure_id').references(() => userProcedures.id, { onDelete: 'cascade' }),
  eventName: varchar('event_name', { length: 120 }).notNull(),
  eventData: jsonb('event_data').notNull().default({}),
  ipHash: varchar('ip_hash', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('audit_events_case_idx').on(table.userProcedureId, table.createdAt)]);
