DROP INDEX "refresh_tokens_family_idx";--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP COLUMN "family";--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP COLUMN "used_at";