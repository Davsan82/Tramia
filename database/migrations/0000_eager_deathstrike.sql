CREATE TYPE "public"."account_status" AS ENUM('pending', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('reserved', 'active', 'completed', 'cancelled', 'reassigned');--> statement-breakpoint
CREATE TYPE "public"."completion_mode" AS ENUM('manual', 'evidence', 'form', 'external_check', 'payment');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'reviewed', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."delegation_status" AS ENUM('requested', 'quoted', 'awaiting_payment', 'paid', 'assigned', 'active', 'completed', 'cancelled', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."delegation_type" AS ENUM('full', 'partial', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'read', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'pending', 'authorized', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('government_fee', 'delegation_service', 'additional_service');--> statement-breakpoint
CREATE TYPE "public"."procedure_difficulty" AS ENUM('baja', 'media', 'alta');--> statement-breakpoint
CREATE TYPE "public"."procedure_modality" AS ENUM('virtual', 'presencial', 'mixta');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('pending', 'uploaded', 'validating', 'approved', 'rejected', 'expired', 'waived');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('locked', 'available', 'in_progress', 'in_review', 'completed', 'rejected', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."user_procedure_mode" AS ENUM('self_service', 'delegated', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."user_procedure_status" AS ENUM('draft', 'active', 'waiting_user', 'eligible_for_delegation', 'waiting_payment', 'waiting_assignment', 'delegated', 'in_progress', 'paused', 'completed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('pending', 'processing', 'approved', 'correction_required', 'error');--> statement-breakpoint
CREATE TABLE "advisor_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegation_request_id" uuid NOT NULL,
	"advisor_id" uuid NOT NULL,
	"status" "assignment_status" DEFAULT 'reserved' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" text
);
--> statement-breakpoint
CREATE TABLE "advisor_expertise" (
	"advisor_id" uuid NOT NULL,
	"expertise_id" uuid NOT NULL,
	"level" varchar(30) DEFAULT 'specialist' NOT NULL,
	"years_experience" smallint,
	"is_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "advisor_expertise_advisor_id_expertise_id_pk" PRIMARY KEY("advisor_id","expertise_id")
);
--> statement-breakpoint
CREATE TABLE "advisor_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"public_name" varchar(180) NOT NULL,
	"bio" text,
	"license_number" varchar(100),
	"verification_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"availability_status" varchar(30) DEFAULT 'offline' NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"completed_cases_count" integer DEFAULT 0 NOT NULL,
	"cancelled_cases_count" integer DEFAULT 0 NOT NULL,
	"active_cases_count" integer DEFAULT 0 NOT NULL,
	"max_active_cases" integer DEFAULT 10 NOT NULL,
	"base_fee_minor" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'PEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"user_procedure_id" uuid,
	"event_name" varchar(120) NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delegation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"requested_advisor_id" uuid,
	"status" "delegation_status" DEFAULT 'requested' NOT NULL,
	"quoted_amount_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'PEN' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delegation_requests_user_procedure_id_unique" UNIQUE("user_procedure_id")
);
--> statement-breakpoint
CREATE TABLE "document_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"validator_type" varchar(30) NOT NULL,
	"validator_user_id" uuid,
	"status" "validation_status" NOT NULL,
	"confidence_score" smallint,
	"observations" text,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expertise_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	CONSTRAINT "expertise_areas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_procedure_id" uuid,
	"type" varchar(60) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"due_at" timestamp with time zone,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(240) NOT NULL,
	"short_name" varchar(80),
	"organization_type" varchar(60) NOT NULL,
	"official_url" text,
	"logo_url" text,
	"country_code" varchar(2) DEFAULT 'PE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"delegation_request_id" uuid,
	"type" "payment_type" NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'PEN' NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_order_id" varchar(180),
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_orders_amount_check" CHECK ("payment_orders"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_order_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_transaction_id" varchar(180),
	"payment_method_type" varchar(40) NOT NULL,
	"card_brand" varchar(30),
	"card_last_four" varchar(4),
	"status" "payment_status" NOT NULL,
	"amount_minor" integer NOT NULL,
	"provider_response_code" varchar(80),
	"failure_reason" text,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"icon" varchar(80),
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "procedure_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "procedure_delegation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_version_id" uuid NOT NULL,
	"type" "delegation_type" DEFAULT 'partial' NOT NULL,
	"eligible_after_step_id" uuid,
	"requires_prior_steps_completed" boolean DEFAULT true NOT NULL,
	"requires_documents_approved" boolean DEFAULT true NOT NULL,
	"service_fee_minor" integer,
	"currency" varchar(3) DEFAULT 'PEN' NOT NULL,
	"cancellation_policy" text,
	"refund_policy" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "procedure_delegation_rules_procedure_version_id_unique" UNIQUE("procedure_version_id")
);
--> statement-breakpoint
CREATE TABLE "procedure_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_version_id" uuid NOT NULL,
	"name" varchar(240) NOT NULL,
	"description" text,
	"requirement_type" varchar(50) DEFAULT 'document' NOT NULL,
	"allowed_file_types" text[],
	"max_file_size_bytes" bigint DEFAULT 10485760 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"expires_after_days" integer,
	"validation_method" varchar(50) DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_version_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" varchar(300) NOT NULL,
	"url" text NOT NULL,
	"last_checked_at" timestamp with time zone NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_status_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"changed_by" uuid,
	"previous_status" "user_procedure_status",
	"new_status" "user_procedure_status" NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text NOT NULL,
	"completion_mode" "completion_mode" DEFAULT 'manual' NOT NULL,
	"modality" "procedure_modality",
	"estimated_duration_hours" numeric(8, 2),
	"official_url" text,
	"requires_user_presence" boolean DEFAULT false NOT NULL,
	"can_be_delegated" boolean DEFAULT true NOT NULL,
	"is_point_of_no_return" boolean DEFAULT false NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "procedure_steps_position_check" CHECK ("procedure_steps"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "procedure_tags" (
	"procedure_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "procedure_tags_procedure_id_tag_id_pk" PRIMARY KEY("procedure_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "procedure_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"full_description" text NOT NULL,
	"modality" "procedure_modality" NOT NULL,
	"difficulty" "procedure_difficulty" NOT NULL,
	"official_cost_min" numeric(12, 2),
	"official_cost_max" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'PEN' NOT NULL,
	"estimated_duration_min" integer,
	"estimated_duration_max" integer,
	"duration_unit" varchar(30) DEFAULT 'business_day' NOT NULL,
	"official_url" text,
	"source_verified_at" timestamp with time zone,
	"valid_from" date DEFAULT now() NOT NULL,
	"valid_until" date,
	"change_summary" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"category_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" varchar(280) NOT NULL,
	"short_description" varchar(500) NOT NULL,
	"procedure_type" varchar(60) DEFAULT 'government' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "procedures_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"reviewed_user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" varchar(1000),
	"rating_type" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_stars_check" CHECK ("ratings"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "step_requirements" (
	"step_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	CONSTRAINT "step_requirements_step_id_requirement_id_pk" PRIMARY KEY("step_id","requirement_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(120) NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "uploaded_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"user_procedure_requirement_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"storage_provider" varchar(40) NOT NULL,
	"storage_key" text NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum" varchar(128),
	"status" "validation_status" DEFAULT 'pending' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uploaded_documents_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "user_procedure_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"status" "requirement_status" DEFAULT 'pending' NOT NULL,
	"waived_reason" text,
	"approved_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_procedure_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"procedure_step_id" uuid NOT NULL,
	"status" "step_status" DEFAULT 'locked' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"completion_source" varchar(40),
	"notes" text,
	"due_at" timestamp with time zone,
	"locked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_code" varchar(40) NOT NULL,
	"user_id" uuid NOT NULL,
	"procedure_id" uuid NOT NULL,
	"procedure_version_id" uuid NOT NULL,
	"mode" "user_procedure_mode" DEFAULT 'self_service' NOT NULL,
	"status" "user_procedure_status" DEFAULT 'draft' NOT NULL,
	"current_step_id" uuid,
	"progress_percentage" smallint DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"expected_completion_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"non_return_reached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_procedures_tracking_code_unique" UNIQUE("tracking_code"),
	CONSTRAINT "user_procedures_progress_check" CHECK ("user_procedures"."progress_percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(160) NOT NULL,
	"document_type" varchar(24),
	"document_number_encrypted" text,
	"document_last_four" varchar(4),
	"birth_date" date,
	"gender" varchar(24),
	"address" text,
	"department" varchar(120),
	"province" varchar(120),
	"district" varchar(120),
	"avatar_url" text,
	"identity_verification_status" varchar(32) DEFAULT 'unverified' NOT NULL,
	"identity_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(32),
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advisor_assignments" ADD CONSTRAINT "advisor_assignments_delegation_request_id_delegation_requests_id_fk" FOREIGN KEY ("delegation_request_id") REFERENCES "public"."delegation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_assignments" ADD CONSTRAINT "advisor_assignments_advisor_id_advisor_profiles_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_expertise" ADD CONSTRAINT "advisor_expertise_advisor_id_advisor_profiles_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_expertise" ADD CONSTRAINT "advisor_expertise_expertise_id_expertise_areas_id_fk" FOREIGN KEY ("expertise_id") REFERENCES "public"."expertise_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_profiles" ADD CONSTRAINT "advisor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_requests" ADD CONSTRAINT "delegation_requests_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegation_requests" ADD CONSTRAINT "delegation_requests_requested_advisor_id_advisor_profiles_user_id_fk" FOREIGN KEY ("requested_advisor_id") REFERENCES "public"."advisor_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_validations" ADD CONSTRAINT "document_validations_document_id_uploaded_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."uploaded_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_validations" ADD CONSTRAINT "document_validations_validator_user_id_users_id_fk" FOREIGN KEY ("validator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_delegation_request_id_delegation_requests_id_fk" FOREIGN KEY ("delegation_request_id") REFERENCES "public"."delegation_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_delegation_rules" ADD CONSTRAINT "procedure_delegation_rules_procedure_version_id_procedure_versions_id_fk" FOREIGN KEY ("procedure_version_id") REFERENCES "public"."procedure_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_delegation_rules" ADD CONSTRAINT "procedure_delegation_rules_eligible_after_step_id_procedure_steps_id_fk" FOREIGN KEY ("eligible_after_step_id") REFERENCES "public"."procedure_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_requirements" ADD CONSTRAINT "procedure_requirements_procedure_version_id_procedure_versions_id_fk" FOREIGN KEY ("procedure_version_id") REFERENCES "public"."procedure_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_sources" ADD CONSTRAINT "procedure_sources_procedure_version_id_procedure_versions_id_fk" FOREIGN KEY ("procedure_version_id") REFERENCES "public"."procedure_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_sources" ADD CONSTRAINT "procedure_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_status_history" ADD CONSTRAINT "procedure_status_history_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_status_history" ADD CONSTRAINT "procedure_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD CONSTRAINT "procedure_steps_procedure_version_id_procedure_versions_id_fk" FOREIGN KEY ("procedure_version_id") REFERENCES "public"."procedure_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_tags" ADD CONSTRAINT "procedure_tags_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_tags" ADD CONSTRAINT "procedure_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_versions" ADD CONSTRAINT "procedure_versions_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_category_id_procedure_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."procedure_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_reviewed_user_id_users_id_fk" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_requirements" ADD CONSTRAINT "step_requirements_step_id_procedure_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."procedure_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_requirements" ADD CONSTRAINT "step_requirements_requirement_id_procedure_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."procedure_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_user_procedure_requirement_id_user_procedure_requirements_id_fk" FOREIGN KEY ("user_procedure_requirement_id") REFERENCES "public"."user_procedure_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedure_requirements" ADD CONSTRAINT "user_procedure_requirements_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedure_requirements" ADD CONSTRAINT "user_procedure_requirements_requirement_id_procedure_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."procedure_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedure_steps" ADD CONSTRAINT "user_procedure_steps_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedure_steps" ADD CONSTRAINT "user_procedure_steps_procedure_step_id_procedure_steps_id_fk" FOREIGN KEY ("procedure_step_id") REFERENCES "public"."procedure_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedure_steps" ADD CONSTRAINT "user_procedure_steps_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedures" ADD CONSTRAINT "user_procedures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedures" ADD CONSTRAINT "user_procedures_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedures" ADD CONSTRAINT "user_procedures_procedure_version_id_procedure_versions_id_fk" FOREIGN KEY ("procedure_version_id") REFERENCES "public"."procedure_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_procedures" ADD CONSTRAINT "user_procedures_current_step_id_procedure_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."procedure_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advisor_assignments_active_idx" ON "advisor_assignments" USING btree ("advisor_id","status");--> statement-breakpoint
CREATE INDEX "audit_events_case_idx" ON "audit_events" USING btree ("user_procedure_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_status_idx" ON "notifications" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payment_orders_case_idx" ON "payment_orders" USING btree ("user_procedure_id","created_at");--> statement-breakpoint
CREATE INDEX "procedure_status_history_case_idx" ON "procedure_status_history" USING btree ("user_procedure_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_steps_position_uidx" ON "procedure_steps" USING btree ("procedure_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_versions_number_uidx" ON "procedure_versions" USING btree ("procedure_id","version_number");--> statement-breakpoint
CREATE INDEX "procedures_category_active_idx" ON "procedures" USING btree ("category_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_direction_uidx" ON "ratings" USING btree ("user_procedure_id","reviewer_user_id","reviewed_user_id");--> statement-breakpoint
CREATE INDEX "uploaded_documents_case_idx" ON "uploaded_documents" USING btree ("user_procedure_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_procedure_requirements_uidx" ON "user_procedure_requirements" USING btree ("user_procedure_id","requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_procedure_steps_uidx" ON "user_procedure_steps" USING btree ("user_procedure_id","procedure_step_id");--> statement-breakpoint
CREATE INDEX "user_procedures_user_status_idx" ON "user_procedures" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree (lower("email"));