import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCampaign, type CampaignDetail } from "@/lib/campaigns/campaigns";

/** Loads a campaign the current user started, for the starter's own pages, or shows the not-found page. */
export async function loadCampaign(params: Promise<{ id: string }>): Promise<CampaignDetail> {
  const { id } = await params;
  const user = await requireUser();
  const campaign = await getCampaign(id, user.id);
  if (!campaign?.isStarter) notFound();
  return campaign;
}
