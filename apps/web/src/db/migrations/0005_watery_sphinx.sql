CREATE TABLE "task_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"share_token" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "task_shares" ADD CONSTRAINT "task_shares_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_shares" ADD CONSTRAINT "task_shares_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_shares_share_token_idx" ON "task_shares" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "task_shares_task_id_idx" ON "task_shares" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_shares_org_id_idx" ON "task_shares" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_shares_expires_at_idx" ON "task_shares" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "task_shares_created_by_user_id_idx" ON "task_shares" USING btree ("created_by_user_id");