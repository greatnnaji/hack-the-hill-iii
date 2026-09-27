import Link from "next/link";
import type { PetitionCard, PetitionStatus } from "@/lib/petitions/petitions";

const count = new Intl.NumberFormat("en-CA");
// Ottawa time, so the server and the browser print the same day.
const date = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "America/Toronto" });

const STATUS_LABELS: Record<PetitionStatus, string> = {
  open: "Open for signature",
  pending: "Opening soon",
  closed: "Closed",
  presented: "Presented to the House",
  response: "Government responded",
};

// The latest step in the House process, with its date.
function timeline(petition: PetitionCard): string {
  const on = (iso: string | null) => (iso ? ` ${date.format(new Date(iso))}` : "");
  switch (petition.status) {
    case "open":
      return petition.closesAt ? `Closes${on(petition.closesAt)}` : "Open for signature";
    case "pending":
      return "Waiting for the House of Commons to publish it.";
    case "closed":
      return `Closed for signature${on(petition.closesAt)}`;
    case "presented":
      return `Presented to the House${on(petition.presentedAt)}`;
    case "response":
      return `Government response tabled${on(petition.responseTabledAt)}`;
  }
}

export function PetitionItem({ petition }: { petition: PetitionCard }) {
  const percent = Math.min(100, Math.round((petition.signatures / petition.signaturesNeeded) * 100));

  return (
    <article className="rounded-xl border border-line bg-paper p-5">
      <p className="text-xs text-muted">
        {petition.number} · {STATUS_LABELS[petition.status]}
      </p>
      <h2 className="mt-2 font-semibold">{petition.title}</h2>

      <p className="mt-4 text-sm">
        {count.format(petition.signatures)} of {count.format(petition.signaturesNeeded)} signatures
      </p>
      <div className="mt-2 h-1.5 bg-line" aria-hidden="true">
        <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
      </div>

      <p className="mt-3 text-sm text-muted">{timeline(petition)}</p>
      {petition.sponsorName && (
        <p className="mt-1 text-sm text-muted">
          Sponsored by {petition.sponsorName}
          {petition.sponsorRiding ? ` (${petition.sponsorRiding})` : ""}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {/* ourcommons.ca has no page for it until the Clerk publishes it. */}
        {petition.status !== "pending" && (
          <a href={petition.url} target="_blank" rel="noreferrer" className="text-accent underline">
            {petition.status === "open" ? "Sign on ourcommons.ca ↗" : "Read it on ourcommons.ca ↗"}
          </a>
        )}
        <Link href={`/campaigns/${petition.campaignId}`} className="text-muted underline">
          Campaign: {petition.campaignTitle}
        </Link>
      </div>
    </article>
  );
}
