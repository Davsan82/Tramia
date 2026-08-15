CREATE TABLE "ai_chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"visitor_key_hash" varchar(64),
	"procedure_id" uuid,
	"user_procedure_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_chat_conversations_owner_check" CHECK ("ai_chat_conversations"."user_id" is not null or "ai_chat_conversations"."visitor_key_hash" is not null)
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"in_scope" boolean DEFAULT true NOT NULL,
	"model" varchar(80),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_chat_messages_role_check" CHECK ("ai_chat_messages"."role" in ('user', 'assistant'))
);
--> statement-breakpoint
ALTER TABLE "ai_chat_conversations" ADD CONSTRAINT "ai_chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_conversations" ADD CONSTRAINT "ai_chat_conversations_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_conversations" ADD CONSTRAINT "ai_chat_conversations_user_procedure_id_user_procedures_id_fk" FOREIGN KEY ("user_procedure_id") REFERENCES "public"."user_procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_conversation_id_ai_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_chat_conversations_user_idx" ON "ai_chat_conversations" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "ai_chat_conversations_visitor_idx" ON "ai_chat_conversations" USING btree ("visitor_key_hash","last_message_at");--> statement-breakpoint
CREATE INDEX "ai_chat_conversations_case_idx" ON "ai_chat_conversations" USING btree ("user_procedure_id","last_message_at");--> statement-breakpoint
CREATE INDEX "ai_chat_messages_conversation_idx" ON "ai_chat_messages" USING btree ("conversation_id","created_at");