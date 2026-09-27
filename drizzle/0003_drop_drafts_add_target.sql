DROP TABLE "drafts" CASCADE;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "target" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "deadline" date NOT NULL;