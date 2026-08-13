CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(120) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(32),
	"topic" varchar(40) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(30) DEFAULT 'received' NOT NULL,
	"delivery_provider" varchar(40),
	"delivery_message_id" varchar(255),
	"delivered_at" timestamp with time zone,
	"failure_reason" text,
	"ip_hash" varchar(64),
	"user_agent" text,
	"source_path" varchar(500),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_messages_status_created_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_user_idx" ON "contact_messages" USING btree ("user_id","created_at");