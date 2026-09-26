import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
