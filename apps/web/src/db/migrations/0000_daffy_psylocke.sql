CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"target_type" integer NOT NULL,
	"target_id" text NOT NULL,
	"new_value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL
);
