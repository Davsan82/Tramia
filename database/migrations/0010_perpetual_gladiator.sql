CREATE TABLE "ai_search_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"original_query" varchar(300) NOT NULL,
	"search_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_category" varchar(160),
	"confidence" integer DEFAULT 0 NOT NULL,
	"mode" varchar(20) NOT NULL,
	"model" varchar(80),
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_search_events_confidence_check" CHECK ("ai_search_events"."confidence" between 0 and 100),
	CONSTRAINT "ai_search_events_mode_check" CHECK ("ai_search_events"."mode" in ('ai', 'fallback'))
);
--> statement-breakpoint
ALTER TABLE "ai_search_events" ADD CONSTRAINT "ai_search_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_search_events_created_idx" ON "ai_search_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_search_events_user_idx" ON "ai_search_events" USING btree ("user_id","created_at");