ALTER TABLE "organizations" ADD COLUMN "last_sync_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_sync_at" timestamp DEFAULT now() NOT NULL;