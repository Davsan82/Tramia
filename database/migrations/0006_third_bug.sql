CREATE TABLE "contact_message_notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"contact_message_id" uuid NOT NULL,
	"author_user_id" uuid,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_message_notes" ADD CONSTRAINT "contact_message_notes_contact_message_id_contact_messages_id_fk" FOREIGN KEY ("contact_message_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_message_notes" ADD CONSTRAINT "contact_message_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_message_notes_message_idx" ON "contact_message_notes" USING btree ("contact_message_id","created_at");--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_messages_assignee_idx" ON "contact_messages" USING btree ("assigned_to_user_id","status");