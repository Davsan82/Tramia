ALTER TABLE "procedure_versions" ADD COLUMN "data_classification" varchar(30) DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "procedure_versions" ADD COLUMN "verification_notes" text;