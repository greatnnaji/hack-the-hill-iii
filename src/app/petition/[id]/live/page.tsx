import Link from "next/link";
import { redirect } from "next/navigation";
import { loadCampaign } from "../../loadCampaign";
import { StepHeader } from "../../_components/StepHeader";

type Props = { params: Promise<{ id: string }> };

const count = new Intl.NumberFormat("en-CA");

export default async function LivePage({ params }: Props) {
  const { campaign, story } = await loadCampaign(params);
  if (campaign.status === "draft") redirect(`/petition/${campaign.id}/publish`);

  return (
    <main className="mx-auto max-w-2xl">
      <StepHeader step={3} backHref="/dev/petition" />
      <h1 className="text-2xl font-semibold">Your campaign is live</h1>
      <p className="mt-1 text-sm text-muted">
        On: <span className="font-medium text-ink">{story.title}</span>
      </p>

      <div className="mt-6 rounded-xl border border-line bg-paper p-5">
        <p className="text-sm font-semibold">{campaign.title}</p>
        <p className="mt-2 text-sm">
          {count.format(campaign.supporters)} of {count.format(campaign.target)} supporters
          {campaign.deadline && <span className="text-muted"> · until {campaign.deadline}</span>}
        </p>
      </div>

      <h2 className="mt-8 text-sm font-semibold">What happens next</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        <li>Others see it on the story and tap Join. Share the story to get there faster.</li>
        <li>At {count.format(campaign.target)} supporters, our team asks an MP to sponsor it.</li>
        <li>Once an MP agrees, our team opens the official e-petition on ourcommons.ca.</li>
        <li>Every supporter gets an email with the link. Signing there is what counts officially.</li>
      </ol>

      <Link href="/dev/petition" className="mt-8 block text-center text-sm text-accent underline">
        Back to spending
      </Link>
    </main>
  );
}
