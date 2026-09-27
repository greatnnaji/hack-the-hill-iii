"use client";

import { useState, type FormEvent } from "react";
import { checkCampaignText, MAX_TITLE_CHARS, PETITION_OPENING, type CampaignText } from "@/lib/campaigns/rules";

type Props = {
  storyTitle: string;
  initial?: CampaignText;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: CampaignText) => void;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none";

// Step 1: write the petition. Checked live with the same rules the API uses (src/lib/campaigns/rules.ts).
export function PetitionForm({ storyTitle, initial, submitLabel, busy = false, error, onSubmit }: Props) {
  const [values, setValues] = useState<CampaignText>(initial ?? { title: "", issue: "Whereas ", request: "" });
  const [showProblems, setShowProblems] = useState(false);
  const { words, maxWords, problems } = checkCampaignText(values);

  const set = (field: keyof CampaignText) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    setShowProblems(true);
    if (problems.length === 0) onSubmit(values);
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-2xl font-semibold">Write your petition</h1>
      <p className="mt-1 text-sm text-muted">
        Linked to: <span className="font-medium text-ink">{storyTitle}</span>
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-semibold">Title</span>
        <input className={inputClass} value={values.title} onChange={set("title")} />
      </label>
      <p className="mt-1 text-right text-xs text-muted">
        {values.title.length} / {MAX_TITLE_CHARS}
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">The issue</span>
        <span className="block text-xs text-muted">
          State facts, not opinions. Each point starts with &ldquo;Whereas&rdquo;.
        </span>
        <textarea className={`${inputClass} min-h-32`} value={values.issue} onChange={set("issue")} />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Requested action</span>
        <span className="block text-xs text-muted">{PETITION_OPENING}…</span>
        <textarea className={`${inputClass} min-h-24`} value={values.request} onChange={set("request")} />
      </label>
      <p className={`mt-1 text-right text-xs ${words > maxWords ? "text-danger" : "text-muted"}`}>
        {words} / {maxWords} words
      </p>

      {showProblems && problems.length > 0 && (
        <ul role="alert" className="mt-4 list-disc pl-5 text-sm text-danger">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
