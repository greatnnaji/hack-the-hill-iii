"use client";

import { useState, type FormEvent } from "react";
import { MAX_DAYS, MIN_DAYS, type CampaignText } from "@/lib/campaigns/rules";
import { normalizePostal } from "@/lib/mp/postal";
import { fullRequest } from "@/lib/petition";

const DAYS = [MIN_DAYS, 60, 90, MAX_DAYS];

export type PublishChoices = { postalCode?: string; days: number };

type Props = {
  storyTitle: string;
  text: CampaignText;
  busy: boolean;
  error: string | null;
  onPublish: (choices: PublishChoices) => void;
};

// Step 2: publish the campaign to its story. Nothing is saved until this step: publishing starts it, with the
// starter as its first member. Consent is required, the same as for everyone who joins.
export function PublishStep({ storyTitle, text, busy, error, onPublish }: Props) {
  const [postal, setPostal] = useState("");
  const [days, setDays] = useState(MAX_DAYS);
  const [consent, setConsent] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const code = postal.trim() ? normalizePostal(postal) : null;
    if (postal.trim() && !code) {
      setPostalError("Enter a postal code like K1P 1A4.");
      return;
    }
    setPostalError(null);
    onPublish({ days, ...(code ? { postalCode: code } : {}) });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="rounded-xl border border-line bg-paper p-5 text-sm">
        <p className="text-xs text-muted">On: {storyTitle}</p>
        <h2 className="mt-2 font-semibold">{text.title}</h2>
        <p className="mt-3 whitespace-pre-line">{text.issue}</p>
        <p className="mt-3">{fullRequest(text.request)}</p>
      </section>

      <form onSubmit={submit} noValidate>
        <h1 className="text-2xl font-semibold">Publish to the app</h1>
        <p className="mt-1 text-sm text-muted">
          Your campaign goes live on the story and you become its first member. Others can then join. Once it
          reaches 1,000 members, our team takes it to an MP and ourcommons.ca.
        </p>

        <label className="mt-6 block">
          <span className="text-sm font-semibold">Postal code</span>
          <span className="block text-xs text-muted">
            Finds your riding, so an MP can see members from theirs. Only the riding is saved. You can leave it
            empty if you&rsquo;ve given it before.
          </span>
          <input
            value={postal}
            onChange={(event) => setPostal(event.target.value)}
            placeholder="K1P 1A4"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </label>
        {postalError && <p className="mt-1 text-xs text-danger">{postalError}</p>}

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Gather support for</span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 flex gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>Email me about this campaign, and share my name, email and riding with the MP we ask to sponsor it.</span>
        </label>

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !consent}
          className="mt-6 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-60"
        >
          {busy ? "Publishing…" : "Publish campaign"}
        </button>
      </form>
    </div>
  );
}
