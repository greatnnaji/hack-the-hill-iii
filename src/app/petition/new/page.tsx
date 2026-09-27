import Link from "next/link";
import { getStory } from "@/lib/stories";
import { StartCampaign } from "../_components/StartCampaign";

type Props = { searchParams: Promise<{ story?: string | string[] }> };

export default async function NewPetitionPage({ searchParams }: Props) {
  const { story: storyId } = await searchParams;
  const story = typeof storyId === "string" ? await getStory(storyId) : null;

  if (!story) {
    return (
      <main>
        <h1 className="text-xl font-semibold">We couldn&rsquo;t find that spending story</h1>
        <Link href="/dev/petition" className="mt-4 inline-block text-sm text-accent underline">
          Back to spending
        </Link>
      </main>
    );
  }

  return <StartCampaign story={{ id: story.id, title: story.title }} />;
}
