import dataStories from "../../pipeline/stories.json";
import newsStories from "../../pipeline/news_stories.json";

// Shared story shape from TASKS.md. Stories are not in the database: Great's pipeline writes them to
// pipeline/stories.json (spending jumps) and pipeline/news_stories.json (news, refreshed by a GitHub Action),
// and a new deploy picks up each commit. GET /api/spending, /api/spending/:id and /api/departments read from here.
export type Story = {
  id: string;
  title: string;
  summary: string;
  amount: number;
  date: string;
  fiscal_year: string;
  department: string;
  dept_code: string;
  program_code: string | null;
  source_type: "data" | "news";
  level: "federal" | "provincial";
  sources: { label: string; url: string }[];
  image_url: string | null;
  // Campaigns are in the database, not here: the API routes add `campaigns` with withCampaigns (src/lib/campaigns.ts).
};

export type Department = { dept_code: string; name: string; count: number };

// Newest first; same-day stories keep the biggest amount first. Only federal items (TASKS.md ground rules).
const stories = ([...dataStories, ...newsStories] as Story[])
  .filter((story) => story.level === "federal")
  .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);

/**
 * Purpose:
 *	List the spending stories for the feed, newest first, optionally only one department's.
 *
 * Args:
 *	- filter.department: a department code such as "ND" (any case); omit it for every department
 *
 * Returns:
 *	Promise<Story[]>: data and news stories in the shared shape; empty when the department has none
 */
export async function listStories(filter: { department?: string } = {}): Promise<Story[]> {
  const department = filter.department?.trim().toUpperCase();
  return department ? stories.filter((story) => story.dept_code.toUpperCase() === department) : stories;
}

/**
 * Purpose:
 *	Find one story by its id, for the detail page and the petition flow.
 *
 * Args:
 *	- id: the story id, e.g. "data-fin-buv11-2024" or "news-95682aaf5c9c"
 *
 * Returns:
 *	Promise<Story | null>: the story, or null when no story has that id
 */
export async function getStory(id: string): Promise<Story | null> {
  return stories.find((story) => story.id === id) ?? null;
}

/**
 * Purpose:
 *	List the departments that have at least one story, for the feed's filter chips.
 *
 * Args:
 *	(none)
 *
 * Returns:
 *	Promise<Department[]>: code, name and story count, most stories first, then by name
 */
export async function listDepartments(): Promise<Department[]> {
  const byCode = new Map<string, Department>();
  for (const story of stories) {
    const entry = byCode.get(story.dept_code) ?? { dept_code: story.dept_code, name: story.department, count: 0 };
    entry.count += 1;
    byCode.set(story.dept_code, entry);
  }
  return [...byCode.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
