import { loadDraft } from "../../loadDraft";
import { SponsorStep } from "../../_components/SponsorStep";
import { StepHeader } from "../../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

export default async function SponsorPage({ params }: Props) {
  const draft = await loadDraft(params);
  return (
    <main>
      <StepHeader step={2} backHref={`/petition/${draft.id}`} />
      <SponsorStep draft={draft} />
    </main>
  );
}
