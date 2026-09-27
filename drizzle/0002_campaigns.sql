CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'gathering', 'review', 'sponsor_asked', 'official', 'closed');--> statement-breakpoint
CREATE TABLE "campaign_supporters" (
	"campaign_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"riding" text,
	"share_with_mp" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_supporters_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text NOT NULL,
	"started_by" text NOT NULL,
	"title" text NOT NULL,
	"issue" text NOT NULL,
	"request" text NOT NULL,
	"target" integer DEFAULT 1000 NOT NULL,
	"deadline" date,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_story_id_started_by_unique" UNIQUE("story_id","started_by")
);
--> statement-breakpoint
ALTER TABLE "campaign_supporters" ADD CONSTRAINT "campaign_supporters_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_supporters" ADD CONSTRAINT "campaign_supporters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_supporters_user_id_idx" ON "campaign_supporters" USING btree ("user_id");