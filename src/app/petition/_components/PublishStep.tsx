"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";
import type { Campaign } from "@/lib/campaigns";
import { normalizePostal } from "@/lib/mp/postal";
import { fullRequest } from "@/lib/petition";

const DAYS = [30, 60, 90, 120] as const;

// Step 2: publish the draft to its story so others can join. The starter becomes its first member.
export function PublishStep({ campaign, storyTitle }: { campaign: Campaign; storyTitle: string }) {
  const router = useRouter();
  const [postal, setPostal] = useState("");
  const [shareWithMp, setShareWithMp] = useState(false);
  const [days, setDays] = useState<(typeof DAYS)[number]>(120);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const code = postal.trim() ? normalizePostal(postal) : null;
    if (postal.trim() && !code) {
      setError("Enter a postal code like K1P 1A4, or leave it empty.");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      await apiFetch<Campaign>(`/api/campaigns/${campaign.id}/publish`, {
        method: "POST",
        body: { days, shareWithMp, ...(code ? { postal: code } : {}) },
      });
      router.push(`/petition/${campaign.id}/live`);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "email_required"
          ? "Your account has no email address. Add one to your login, then try again."
          : "We couldn't publish your campaign. Try again.",
      );
      setPublishing(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="rounded-xl border border-line bg-paper p-5 text-sm">
        <p className="text-xs text-muted">On: {storyTitle}</p>
        <h2 className="mt-2 font-semibold">{campaign.title}</h2>
        <p className="mt-3 whitespace-pre-line">{campaign.issue}</p>
        <p className="mt-3">{fullRequest(campaign.request)}</p>
      </section>

      <form onSubmit={onSubmit} noValidate>
        <h1 className="text-2xl font-semibold">Publish to the app</h1>
        <p className="mt-1 text-sm text-muted">
          Your campaign goes live on the story and you become its first supporter. Others can then join. Once it
          reaches 1,000 supporters, our team takes it to an MP and ourcommons.ca.
        </p>

        <label className="mt-6 block">
          <span className="text-sm font-semibold">Postal code (optional)</span>
          <span className="block text-xs text-muted">Only used to find your riding, so an MP can see supporters from theirs.</span>
          <input
            value={postal}
            onChange={(event) => setPostal(event.target.value)}
            placeholder="K1P 1A4"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold">Gather support for</span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as (typeof DAYS)[number])}
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
          <input type="checkbox" checked={shareWithMp} onChange={(event) => setShareWithMp(event.target.checked)} />
          <span>Share my name, email and riding with the sponsoring MP so they can check supporters are real.</span>
        </label>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={publishing}
          className="mt-6 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-60"
        >
          {publishing ? "Publishing…" : "Publish campaign"}
        </button>
      </form>
    </div>
  );
}
