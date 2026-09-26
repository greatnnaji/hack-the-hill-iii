import { loadDraft } from "../loadDraft";
import { PetitionForm } from "../_components/PetitionForm";
import { ProcessExplainer } from "../_components/ProcessExplainer";
import { StepHeader } from "../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

export default async function EditPetitionPage({ params }: Props) {
  const draft = await loadDraft(params);
  return (
    <main>
      <StepHeader step={1} backHref="/dev/petition" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PetitionForm story={{ id: draft.storyId, title: draft.storyTitle }} draft={draft} />
        <ProcessExplainer />
      </div>
    </main>
  );
}
