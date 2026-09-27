import Link from "next/link";
import { fullRequest } from "@/lib/petition";
import { loadDraft } from "../../loadDraft";
import { CopyField } from "../../_components/CopyField";
import { StepHeader } from "../../_components/StepHeader";

const OURCOMMONS_CREATE_URL = "https://www.ourcommons.ca/petitions/en/Petitioner/Save";

type Props = { params: Promise<{ id: string }> };

export default async function SubmitPage({ params }: Props) {
  const draft = await loadDraft(params);
  const sponsor = draft.mp?.name ?? "your MP";

  return (
    <main className="mx-auto max-w-2xl">
      <StepHeader step={3} backHref={`/petition/${draft.id}/sponsor`} />
      <h1 className="text-2xl font-semibold">Submit it on ourcommons.ca</h1>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
        <li>Log in or create an account on ourcommons.ca and start a new e-petition.</li>
        <li>Paste in the title, the issue and the requested action below.</li>
        <li>Name {sponsor} as your sponsor once they agree.</li>
        <li>Five supporters confirm by email, then the MP authorizes it.</li>
      </ol>

      <div className="mt-6 space-y-3">
        <CopyField label="Title" text={draft.title} />
        <CopyField label="The issue" text={draft.issue} />
        <CopyField label="Requested action" text={fullRequest(draft.request)} />
      </div>

      <a
        href={OURCOMMONS_CREATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block rounded-lg bg-ink px-4 py-3 text-center text-sm font-medium text-paper"
      >
        Open ourcommons.ca
      </a>
      <Link href="/dev/petition" className="mt-4 block text-center text-sm text-accent underline">
        Back to spending
      </Link>
    </main>
  );
}
