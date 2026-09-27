import { redirect } from "next/navigation";
import { loadCampaign } from "../../loadCampaign";
import { PublishStep } from "../../_components/PublishStep";
import { StepHeader } from "../../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

export default async function PublishPage({ params }: Props) {
  const { campaign, story } = await loadCampaign(params);
  if (campaign.status !== "draft") redirect(`/petition/${campaign.id}/live`);
  return (
    <main>
      <StepHeader step={2} backHref={`/petition/${campaign.id}`} />
      <PublishStep campaign={campaign} storyTitle={story.title} />
    </main>
  );
}
