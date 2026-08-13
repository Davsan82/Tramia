CREATE TABLE "procedure_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_step_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_step_dependencies" (
	"step_id" uuid NOT NULL,
	"depends_on_step_id" uuid NOT NULL,
	CONSTRAINT "procedure_step_dependencies_step_id_depends_on_step_id_pk" PRIMARY KEY("step_id","depends_on_step_id")
);
--> statement-breakpoint
ALTER TABLE "procedure_sources" ADD COLUMN "status" varchar(30) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "procedure_sources" ADD COLUMN "next_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "step_type" varchar(30) DEFAULT 'required' NOT NULL;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "help_text" text;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "why_it_matters" text;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "next_step_hint" text;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "estimated_cost_text" varchar(160);--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "date_tracking_type" varchar(30);--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "date_tracking_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "reminder_offsets" text[];--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD COLUMN "applicability_rule" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "procedure_stages" ADD CONSTRAINT "procedure_stages_procedure_version_id_procedure_versions_id_fk" FOREIGN KEY ("procedure_version_id") REFERENCES "public"."procedure_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_step_checklist_items" ADD CONSTRAINT "procedure_step_checklist_items_step_id_procedure_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."procedure_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_step_dependencies" ADD CONSTRAINT "procedure_step_dependencies_step_id_procedure_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."procedure_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_step_dependencies" ADD CONSTRAINT "procedure_step_dependencies_depends_on_step_id_procedure_steps_id_fk" FOREIGN KEY ("depends_on_step_id") REFERENCES "public"."procedure_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_stages_position_uidx" ON "procedure_stages" USING btree ("procedure_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_step_checklist_position_uidx" ON "procedure_step_checklist_items" USING btree ("step_id","position");--> statement-breakpoint
ALTER TABLE "procedure_steps" ADD CONSTRAINT "procedure_steps_stage_id_procedure_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."procedure_stages"("id") ON DELETE set null ON UPDATE no action;