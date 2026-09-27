import { redirect } from "next/navigation";
import { loadCampaign } from "../loadCampaign";
import { EditCampaign } from "../_components/EditCampaign";
import { ProcessExplainer } from "../_components/ProcessExplainer";
import { StepHeader } from "../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

// Edit your campaign's text. Only until someone else joins; after that, go to its live page.
export default async function EditPetitionPage({ params }: Props) {
  const campaign = await loadCampaign(params);
  if (!campaign.canEdit) redirect(`/petition/${campaign.id}/live`);
  return (
    <main>
      <StepHeader step={1} backHref={`/petition/${campaign.id}/live`} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <EditCampaign
          id={campaign.id}
          storyTitle={campaign.storyTitle}
          initial={{ title: campaign.title, issue: campaign.issue, request: campaign.request }}
        />
        <ProcessExplainer />
      </div>
    </main>
  );
}
