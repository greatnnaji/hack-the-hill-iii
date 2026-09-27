"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";
import type { CampaignText } from "@/lib/campaigns/rules";
import { PetitionForm } from "./PetitionForm";

// The starter edits the text until someone else joins (then it's locked, so members never back changed text).
export function EditCampaign({ id, storyTitle, initial }: { id: string; storyTitle: string; initial: CampaignText }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(values: CampaignText) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${id}`, { method: "PATCH", body: values });
      router.push(`/petition/${id}/live`);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : "";
      setError(code === "locked" ? "Someone has joined, so the text can't change any more." : "We couldn't save your changes. Try again.");
      setBusy(false);
    }
  }

  return <PetitionForm storyTitle={storyTitle} initial={initial} submitLabel={busy ? "Saving…" : "Save changes"} busy={busy} error={error} onSubmit={save} />;
}
