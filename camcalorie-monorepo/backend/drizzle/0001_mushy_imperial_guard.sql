CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "body_analyses" ALTER COLUMN "weight" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "body_analyses" ALTER COLUMN "height" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "mobile" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "skeletal_muscle_mass" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "visceral_fat_level" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "basal_metabolic_rate" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "body_water" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "protein_mass" text;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD COLUMN "mineral_mass" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "name_fa" text;--> statement-breakpoint
ALTER TABLE "personnel" ADD COLUMN "full_name_prefixed" text;--> statement-breakpoint
ALTER TABLE "personnel" ADD COLUMN "mobile" text;--> statement-breakpoint
ALTER TABLE "personnel" ADD COLUMN "birth_date" text;--> statement-breakpoint
ALTER TABLE "personnel" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_salt" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_salt" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_failures" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "body_analyses" DROP COLUMN IF EXISTS "muscle_mass";--> statement-breakpoint
ALTER TABLE "body_analyses" DROP COLUMN IF EXISTS "visceral_fat";