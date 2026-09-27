import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listCampaigns } from "@/lib/campaigns/campaigns";
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

  // One campaign per person per story: if they already started one here, open it instead of an empty form.
  const user = await requireUser();
  const mine = (await listCampaigns({ storyId: story.id, viewerId: user.id })).find((campaign) => campaign.isStarter);
  if (mine) redirect(`/petition/${mine.id}/live`);

  return <StartCampaign story={{ id: story.id, title: story.title }} />;
}
