"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";
import type { CampaignText } from "@/lib/campaigns/rules";
import { PetitionForm } from "./PetitionForm";
import { ProcessExplainer } from "./ProcessExplainer";
import { PublishStep, type PublishChoices } from "./PublishStep";
import { StepHeader } from "./StepHeader";

// What to show for each POST /api/campaigns error code (docs/campaigns-api.md).
function messageFor(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "";
  switch (code) {
    case "invalid_text":
      return ((error as ApiError).details.problems as string[] | undefined)?.join(" ") ?? "Check the petition text.";
    case "invalid_postal":
      return "Enter a postal code like K1P 1A4.";
    case "riding_required":
      return "Enter your postal code so we can find your riding.";
    case "riding_not_found":
      return "We couldn't find that postal code.";
    case "lookup_failed":
      return "Couldn't reach the MP directory. Try again in a minute.";
    case "email_required":
      return "Your account has no email address. Add one to your login, then try again.";
    case "story_not_found":
      return "That spending story no longer exists.";
    default:
      return "We couldn't publish your campaign. Try again.";
  }
}

// Steps 1 and 2 of Start a campaign, on one page. Nothing is saved until Publish.
export function StartCampaign({ story }: { story: { id: string; title: string } }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [text, setText] = useState<CampaignText | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish(choices: PublishChoices) {
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const { id } = await apiFetch<{ id: string }>("/api/campaigns", {
        method: "POST",
        body: { storyId: story.id, ...text, ...choices, consent: true },
      });
      router.push(`/petition/${id}/live`);
    } catch (caught) {
      // One campaign per person per story: open the one they already started.
      if (caught instanceof ApiError && caught.code === "already_started" && typeof caught.details.campaignId === "string") {
        router.push(`/petition/${caught.details.campaignId}/live`);
        return;
      }
      setError(messageFor(caught));
      setBusy(false);
    }
  }

  if (step === 2 && text) {
    return (
      <main>
        <StepHeader step={2} onBack={() => setStep(1)} />
        <PublishStep storyTitle={story.title} text={text} busy={busy} error={error} onPublish={publish} />
      </main>
    );
  }

  return (
    <main>
      <StepHeader step={1} backHref="/dev/petition" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PetitionForm
          storyTitle={story.title}
          initial={text ?? undefined}
          submitLabel="Next: publish to the app"
          onSubmit={(values) => {
            setText(values);
            setStep(2);
          }}
        />
        <ProcessExplainer />
      </div>
    </main>
  );
}
