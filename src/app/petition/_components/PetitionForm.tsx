"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { LIMITS, REQUEST_PREFIX, type Draft } from "@/lib/petition";

type Field = "title" | "issue" | "request";
type Props = { story: { id: string; title: string }; draft?: Draft };

const inputClass =
  "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink focus:outline-none";

function validate(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const field of ["title", "issue", "request"] as const) {
    const value = values[field].trim();
    if (!value || (field === "issue" && value === "Whereas")) {
      errors[field] = "This is required.";
    } else if (value.length > LIMITS[field]) {
      errors[field] = `Keep this under ${LIMITS[field]} characters.`;
    }
  }
  return errors;
}

export function PetitionForm({ story, draft }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    title: draft?.title ?? "",
    issue: draft?.issue ?? "Whereas ",
    request: draft?.request ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      const saved = draft
        ? await apiFetch<Draft>(`/api/me/drafts/${draft.id}`, { method: "PATCH", body: values })
        : await apiFetch<Draft>("/api/me/drafts", {
            method: "POST",
            body: { storyId: story.id, storyTitle: story.title, ...values },
          });
      router.push(`/petition/${saved.id}/sponsor`);
    } catch {
      setSaveError("We couldn't save your draft. Try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-2xl font-semibold">Write your petition</h1>
      <p className="mt-1 text-sm text-muted">
        Linked to: <span className="font-medium text-ink">{story.title}</span>
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-semibold">Title</span>
        <input className={inputClass} value={values.title} onChange={set("title")} />
      </label>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-danger">{errors.title}</span>
        <span className="text-muted">
          {values.title.length} / {LIMITS.title}
        </span>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">The issue</span>
        <span className="block text-xs text-muted">
          State facts, not opinions. Each point starts with &ldquo;Whereas&rdquo;.
        </span>
        <textarea className={`${inputClass} min-h-32`} value={values.issue} onChange={set("issue")} />
      </label>
      <p className="mt-1 text-xs text-danger">{errors.issue}</p>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Requested action</span>
        <span className="block text-xs text-muted">{REQUEST_PREFIX}…</span>
        <textarea className={`${inputClass} min-h-24`} value={values.request} onChange={set("request")} />
      </label>
      <p className="mt-1 text-xs text-danger">{errors.request}</p>

      {saveError && <p className="mt-4 text-sm text-danger">{saveError}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-6 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-60"
      >
        {saving ? "Saving…" : "Next: find an MP sponsor"}
      </button>
    </form>
  );
}
