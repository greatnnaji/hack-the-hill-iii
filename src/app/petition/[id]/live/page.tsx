import Link from "next/link";
import { loadCampaign } from "../../loadCampaign";
import { StepHeader } from "../../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

const count = new Intl.NumberFormat("en-CA");

// Step 3: the starter's campaign is live on its story.
export default async function LivePage({ params }: Props) {
  const campaign = await loadCampaign(params);

  return (
    <main className="mx-auto max-w-2xl">
      <StepHeader step={3} backHref="/dev/petition" />
      <h1 className="text-2xl font-semibold">Your campaign is live</h1>
      <p className="mt-1 text-sm text-muted">
        On: <span className="font-medium text-ink">{campaign.storyTitle}</span>
      </p>

      <div className="mt-6 rounded-xl border border-line bg-paper p-5">
        <p className="text-sm font-semibold">{campaign.title}</p>
        <p className="mt-2 text-sm">
          {count.format(campaign.memberCount)} of {count.format(campaign.target)} members
          <span className="text-muted"> · until {campaign.deadline}</span>
        </p>
        {campaign.canEdit && (
          <Link href={`/petition/${campaign.id}`} className="mt-3 inline-block text-sm text-accent underline">
            Edit the text (until someone else joins)
          </Link>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold">What happens next</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        <li>Others see it on the story and tap Join. Share the story to get there faster.</li>
        <li>At {count.format(campaign.target)} members, our team asks an MP to sponsor it.</li>
        <li>Once an MP agrees, our team opens the official e-petition on ourcommons.ca.</li>
        <li>Every member gets an email with the link. Signing there is what counts officially.</li>
      </ol>

      <Link href="/dev/petition" className="mt-8 block text-center text-sm text-accent underline">
        Back to spending
      </Link>
    </main>
  );
}
