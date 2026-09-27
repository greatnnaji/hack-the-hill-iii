import { date, index, integer, numeric, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  // The user's federal riding, found from a postal code when they first join a campaign. The postal code is never stored.
  riding: text("riding"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

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

// Campaigns: proposals people start on a story, which our team can turn into official House of Commons e-petitions.
// Stages, in order: gathering members -> in review -> MP asked -> MP agreed -> live (official petition open) -> closed.
export const CAMPAIGN_STAGES = ["gathering", "in_review", "mp_asked", "mp_agreed", "live", "closed"] as const;
export const campaignStage = pgEnum("campaign_stage", CAMPAIGN_STAGES);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: text("story_id").notNull(),
    storyTitle: text("story_title").notNull(),
    starterId: text("starter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    issue: text("issue").notNull(),
    request: text("request").notNull(),
    stage: campaignStage("stage").notNull().default("gathering"),
    // 1,000 = twice the 500 signatures ourcommons.ca needs, since about half of members sign officially.
    // Reaching it moves a gathering campaign to in_review.
    target: integer("target").notNull().default(1000),
    // Set when started: 30 to 120 days out, the same window as an e-petition.
    deadline: date("deadline").notNull(),
    teamNote: text("team_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One campaign per person per story.
    unique("campaigns_story_starter_unique").on(t.storyId, t.starterId),
    index("campaigns_story_id_idx").on(t.storyId),
    index("campaigns_stage_idx").on(t.stage),
  ],
);

// Everyone who joined a campaign, the starter included. Joining requires consent to share name, email and riding with the MP.
export const campaignMembers = pgTable(
  "campaign_members",
  {
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    riding: text("riding"),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.userId] }), index("campaign_members_user_id_idx").on(t.userId)],
);

// Official e-petitions on ourcommons.ca that our team created from a campaign. Refreshed from ourcommons.ca by the petition sync.
export const petitions = pgTable("petitions", {
  number: text("number").primaryKey(), // e.g. "e-7203"
  campaignId: uuid("campaign_id")
    .notNull()
    .unique()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sponsorName: text("sponsor_name"),
  sponsorRiding: text("sponsor_riding"),
  signatures: integer("signatures").notNull().default(0),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  presentedAt: timestamp("presented_at", { withTimezone: true }),
  responseTabledAt: timestamp("response_tabled_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CampaignRow = typeof campaigns.$inferSelect;
export type PetitionRow = typeof petitions.$inferSelect;
