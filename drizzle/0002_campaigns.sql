CREATE TYPE "public"."campaign_stage" AS ENUM('gathering', 'in_review', 'mp_asked', 'mp_agreed', 'live', 'closed');--> statement-breakpoint
CREATE TABLE "campaign_members" (
	"campaign_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"riding" text,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_members_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"story_title" text NOT NULL,
	"starter_id" text NOT NULL,
	"title" text NOT NULL,
	"issue" text NOT NULL,
	"request" text NOT NULL,
	"stage" "campaign_stage" DEFAULT 'gathering' NOT NULL,
	"team_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_story_starter_unique" UNIQUE("story_id","starter_id")
);
--> statement-breakpoint
CREATE TABLE "petitions" (
	"number" text PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sponsor_name" text,
	"sponsor_riding" text,
	"signatures" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"presented_at" timestamp with time zone,
	"response_tabled_at" timestamp with time zone,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "petitions_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "riding" text;--> statement-breakpoint
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_starter_id_users_id_fk" FOREIGN KEY ("starter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_members_user_id_idx" ON "campaign_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaigns_story_id_idx" ON "campaigns" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "campaigns_stage_idx" ON "campaigns" USING btree ("stage");