-- Pre-rotation refresh tokens have no family: discard them (users sign in again).
DELETE FROM "refresh_tokens";--> statement-breakpoint
-- Emails are stored lowercase from now on.
UPDATE "users" SET "email" = lower("email") WHERE "email" <> lower("email");--> statement-breakpoint
DROP INDEX "users_email_lower_uq";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "family_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "replaced_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_refresh_tokens_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "public"."refresh_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_ck" CHECK ("users"."email" = lower("users"."email"));