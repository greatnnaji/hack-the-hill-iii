import { redirect } from "next/navigation";
import { loadCampaign } from "../loadCampaign";
import { PetitionForm } from "../_components/PetitionForm";
import { ProcessExplainer } from "../_components/ProcessExplainer";
import { StepHeader } from "../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

export default async function EditPetitionPage({ params }: Props) {
  const { campaign, story } = await loadCampaign(params);
  // Once published the text is fixed: people joined what it said.
  if (campaign.status !== "draft") redirect(`/petition/${campaign.id}/live`);
  return (
    <main>
      <StepHeader step={1} backHref="/dev/petition" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PetitionForm story={{ id: story.id, title: story.title }} campaign={campaign} />
        <ProcessExplainer />
      </div>
    </main>
  );
}
