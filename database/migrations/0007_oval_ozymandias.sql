CREATE TABLE "procedure_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_procedure_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "procedure_messages" ADD CONSTRAINT "procedure_messages_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_messages" ADD CONSTRAINT "procedure_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_messages" ADD CONSTRAINT "procedure_messages_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "procedure_messages_case_created_idx" ON "procedure_messages" USING btree ("user_procedure_id","created_at");--> statement-breakpoint
CREATE INDEX "procedure_messages_recipient_read_idx" ON "procedure_messages" USING btree ("recipient_user_id","read_at");