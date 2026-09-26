import { boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { Mp } from "@/lib/mp/types";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: text("story_id").notNull(),
    storyTitle: text("story_title").notNull(),
    title: text("title").notNull(),
    issue: text("issue").notNull(),
    request: text("request").notNull(),
    mp: jsonb("mp").$type<Mp>(),
    sponsorEmail: text("sponsor_email"),
    sponsorRequestedAt: timestamp("sponsor_requested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("drafts_user_id_idx").on(t.userId)],
);

export type DraftRow = typeof drafts.$inferSelect;

// Campaigns (TASKS.md Great Task 3): the in-app part of a petition. People start one on a story and others join it;
// at the target the team takes it to an MP and ourcommons.ca. A story can have many campaigns, one per person.
// story_id points at a story in pipeline/*.json (stories are not in the database), so story ids never change.
export const campaignStatus = pgEnum("campaign_status", ["gathering", "review", "sponsor_asked", "official", "closed"]);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: text("story_id").notNull(),
    startedBy: text("started_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    issue: text("issue").notNull(),
    request: text("request").notNull(),
    // 1,000 = twice the 500 signatures ourcommons.ca needs, since about half of supporters sign officially.
    target: integer("target").notNull().default(1000),
    // 30 to 120 days out, the same window as an e-petition.
    deadline: date("deadline").notNull(),
    status: campaignStatus("status").notNull().default("gathering"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Also serves "list a story's campaigns", since story_id comes first.
  (t) => [unique("campaigns_story_id_started_by_unique").on(t.storyId, t.startedBy)],
);

export type CampaignRow = typeof campaigns.$inferSelect;

// One row per person per campaign. Joining is support, not a signature: everyone signs again on ourcommons.ca.
// Name, email and riding are copied at join time so the team can show an MP who the supporters are (with consent).
export const campaignSupporters = pgTable(
  "campaign_supporters",
  {
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    riding: text("riding"),
    shareWithMp: boolean("share_with_mp").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.userId] }), index("campaign_supporters_user_id_idx").on(t.userId)],
);

export type CampaignSupporterRow = typeof campaignSupporters.$inferSelect;

// GC InfoBase federal spending (open.canada.ca), loaded by `npm run db:load` (pipeline/load_db.mts).
// Sources are in VERIFIED_SOURCES.md. year 2024 = fiscal year April 2024 to March 2025.

// programs_spending.csv: actual spending per program per fiscal year.
export const programsSpending = pgTable(
  "programs_spending",
  {
    year: integer("year").notNull(),
    deptCode: text("dept_code").notNull(),
    programCode: text("program_code").notNull(),
    expenditure: numeric("expenditure", { mode: "number" }),
  },
  (t) => [primaryKey({ columns: [t.year, t.deptCode, t.programCode] })],
);

// programs.csv: program names. The same code can be both a program and a core responsibility, so type is in the key.
export const programs = pgTable(
  "programs",
  {
    year: integer("year").notNull(),
    deptCode: text("dept_code").notNull(),
    programCode: text("program_code").notNull(),
    type: text("type").notNull(),
    nameEn: text("name_en"),
  },
  (t) => [primaryKey({ columns: [t.year, t.deptCode, t.programCode, t.type] })],
);

// organizations.csv: one row per department, from its latest record.
export const organizations = pgTable("organizations", {
  deptCode: text("dept_code").primaryKey(),
  legalTitleEn: text("legal_title_en"),
  appliedTitleEn: text("applied_title_en"),
});

// Hand-written plain-English names for the biggest programs, shown on the receipt.
export const programLabels = pgTable(
  "program_labels",
  {
    deptCode: text("dept_code").notNull(),
    programCode: text("program_code").notNull(),
    plainName: text("plain_name").notNull(),
    description: text("description").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deptCode, t.programCode] })],
);
