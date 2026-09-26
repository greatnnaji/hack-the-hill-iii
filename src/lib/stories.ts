import storiesData from "../../pipeline/stories.json";

// Shared story shape from TASKS.md. Read from Great's pipeline output until Raphael's
// GET /spending/:id exists; then only these two functions change.
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
  petition: {
    number: string;
    title: string;
    signatures: number;
    closes: string;
    url: string;
  } | null;
};

const stories = storiesData as Story[];

export async function listStories(): Promise<Story[]> {
  return stories;
}

export async function getStory(id: string): Promise<Story | null> {
  return stories.find((story) => story.id === id) ?? null;
}
