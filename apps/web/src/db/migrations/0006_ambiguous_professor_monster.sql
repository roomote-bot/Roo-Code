CREATE TABLE "agent_request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time_ms" integer NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"last_used_at" timestamp,
	"total_requests" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_request_logs" ADD CONSTRAINT "agent_request_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_request_logs" ADD CONSTRAINT "agent_request_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_request_logs_agent_id_idx" ON "agent_request_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_request_logs_org_id_idx" ON "agent_request_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_request_logs_created_at_idx" ON "agent_request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agents_org_id_idx" ON "agents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agents_active_idx" ON "agents" USING btree ("is_active") WHERE "agents"."is_active" = 1;--> statement-breakpoint
CREATE INDEX "agents_last_used_idx" ON "agents" USING btree ("last_used_at");