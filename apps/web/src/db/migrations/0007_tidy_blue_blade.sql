ALTER TABLE "task_shares" ADD COLUMN "visibility" text DEFAULT 'organization' NOT NULL;--> statement-breakpoint
CREATE INDEX "task_shares_visibility_idx" ON "task_shares" USING btree ("visibility");