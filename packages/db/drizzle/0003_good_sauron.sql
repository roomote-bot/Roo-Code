DELETE FROM "cloud_jobs";--> statement-breakpoint
ALTER TABLE "cloud_jobs" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud_jobs" ADD CONSTRAINT "cloud_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cloud_jobs_user_id_idx" ON "cloud_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cloud_jobs_user_org_idx" ON "cloud_jobs" USING btree ("user_id","organization_id");