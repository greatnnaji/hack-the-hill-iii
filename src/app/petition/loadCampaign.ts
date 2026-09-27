import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCampaign, type Campaign } from "@/lib/campaigns";
import { getStory, type Story } from "@/lib/stories";

/** Loads one of the current user's own campaigns (and its story) for a page, or shows the not-found page. */
export async function loadCampaign(params: Promise<{ id: string }>): Promise<{ campaign: Campaign; story: Story }> {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await getCampaign(id, user.id);
  const story = campaign?.mine ? await getStory(campaign.story_id) : null;
  if (!campaign || !story) notFound();
  return { campaign, story };
}
