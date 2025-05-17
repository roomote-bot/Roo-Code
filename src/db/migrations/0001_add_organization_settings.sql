CREATE TABLE "organization_settings" (
    "organization_id" text PRIMARY KEY NOT NULL,
    "version" integer NOT NULL DEFAULT 1,
    "default_settings" jsonb NOT NULL DEFAULT '{}',
    "allow_list" jsonb NOT NULL DEFAULT '{"allowAll": true, "providers": {}}'::jsonb,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);