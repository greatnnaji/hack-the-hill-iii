import { like } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignSupporters, users } from "@/db/schema";

// Demo campaigns for the pitch, loaded by `npm run db:seed` (pipeline/seed_campaigns.ts).
// Every demo user id starts with "demo|", so re-running replaces them and never touches real users.

const DEMO = "demo|";
const DAY_MS = 24 * 60 * 60 * 1000;
const RIDINGS = ["Ottawa Centre", "Toronto Centre", "Halifax", "Winnipeg Centre", "Vancouver Granville", "Edmonton Centre", "Laurier—Sainte-Marie"];
const FIRST = ["Ana", "Sam", "Priya", "Liam", "Chloé", "Omar", "Mei", "Noah", "Fatima", "Jack", "Sofia", "Ethan"];
const LAST = ["T.", "B.", "N.", "L.", "M.", "K.", "R.", "G."];

// Two campaigns on the homelessness story show "many campaigns per story"; the aircraft one is at the target.
export const DEMO_CAMPAIGNS = [
  {
    storyId: "data-nd-bur03-2024",
    starter: "Ana",
    title: "Publish the full cost of Canada's new military aircraft",
    issue: "Whereas spending on military aircraft purchases more than tripled in two years, to $3.3 billion in 2024–25, and taxpayers cannot see what each contract costs over its lifetime;",
    request: "We, the undersigned, citizens of Canada, call upon the Government of Canada to publish the lifetime cost of every military aircraft contract, updated each year.",
    supporters: 1000,
    status: "review",
    daysLeft: 41,
  },
  {
    storyId: "data-oicc-byb04-2024",
    starter: "Omar",
    title: "Report how many people federal homelessness funding houses",
    issue: "Whereas federal homelessness funding rose 54% in two years, to $750 million in 2024–25, but there is no public count of the people it helped find a home;",
    request: "We, the undersigned, citizens of Canada, call upon the Government of Canada to report each year how many people federal homelessness programs moved into stable housing.",
    supporters: 412,
    status: "gathering",
    daysLeft: 88,
  },
  {
    storyId: "data-oicc-byb04-2024",
    starter: "Mei",
    title: "Put more homelessness funding into permanent housing",
    issue: "Whereas federal homelessness funding rose 54% in two years, to $750 million in 2024–25;",
    request: "We, the undersigned, citizens of Canada, call upon the Government of Canada to direct at least half of new homelessness funding to permanent supportive housing.",
    supporters: 87,
    status: "gathering",
    daysLeft: 110,
  },
] as const;

/**
 * Purpose:
 *	Replace the demo campaigns: delete every "demo|" user (their campaigns and supporter rows go with them),
 *	then create each campaign with its starter as the first member and made-up supporters up to its count.
 *
 * Args:
 *	- today: the day deadlines count from (defaults to now)
 *
 * Returns:
 *	Promise<{ campaigns: number; supporters: number }>: how many rows were created
 */
export async function seedDemoCampaigns(today = new Date()) {
  const people = Math.max(...DEMO_CAMPAIGNS.map((c) => c.supporters));
  const demoUsers = Array.from({ length: people }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
    return { id: `${DEMO}${String(i + 1).padStart(4, "0")}`, name, email: `demo+${i + 1}@example.com`, riding: RIDINGS[i % RIDINGS.length] };
  });
  // Campaign n starts at person n × 100, so the starters are different people with the names in DEMO_CAMPAIGNS.
  DEMO_CAMPAIGNS.forEach((demo, n) => {
    const starter = demoUsers[n * 100];
    starter.name = `${demo.starter} ${starter.name.split(" ")[1]}`;
  });

  return db.transaction(async (tx) => {
    await tx.delete(users).where(like(users.id, `${DEMO}%`));
    await tx.insert(users).values(demoUsers.map(({ id, name, email }) => ({ id, name, email })));

    let supporters = 0;
    for (const [n, demo] of DEMO_CAMPAIGNS.entries()) {
      const members = [...demoUsers.slice(n * 100), ...demoUsers.slice(0, n * 100)].slice(0, demo.supporters);

      const [campaign] = await tx
        .insert(campaigns)
        .values({
          storyId: demo.storyId,
          startedBy: members[0].id,
          title: demo.title,
          issue: demo.issue,
          request: demo.request,
          deadline: new Date(today.getTime() + demo.daysLeft * DAY_MS).toISOString().slice(0, 10),
          status: demo.status,
        })
        .returning({ id: campaigns.id });
      await tx.insert(campaignSupporters).values(
        members.map((m, i) => ({
          campaignId: campaign.id,
          userId: m.id,
          name: m.name,
          email: m.email,
          riding: m.riding,
          shareWithMp: true,
          // Spread join times over the past weeks, starter first.
          joinedAt: new Date(today.getTime() - (members.length - i) * 30 * 60 * 1000),
        })),
      );
      supporters += members.length;
    }
    return { campaigns: DEMO_CAMPAIGNS.length, supporters };
  });
}
