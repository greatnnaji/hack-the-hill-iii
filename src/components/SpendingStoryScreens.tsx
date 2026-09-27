"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useTaxInputs } from "@/components/TaxTrackerShell";
import { useSpending, useSpendingDetail } from "@/components/useSpending";
import { useBreakdown } from "@/components/useBreakdown";
import type { Story } from "@/lib/stories";
import type { CampaignSummary, StoryWithCampaigns } from "@/lib/campaigns/campaigns";
import { yourShare } from "@/shared/breakdown";
import { estimateTax } from "@/shared/tax";

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value.includes("T") ? value : `${value}T12:00:00`));

function typeLabel(story: Story) {
  return story.source_type === "news" ? "NEWS ARTICLE" : "PUBLIC RECORD";
}

function shareFor(story: Story, tax: number, total: number | null) {
  return total ? cents.format(yourShare(tax, story.amount, total)) : "…";
}

export function SpendingFeedScreen({ department }: { department?: string }) {
  const router = useRouter();
  const state = useSpending(department ?? null);
  const breakdown = useTaxBreakdown();
  const { inputs } = useTaxInputs();
  const tax = estimateTax(inputs.income, inputs.province).federal;

  return (
    <section className="tracker-page feed-page" aria-labelledby="feed-title">
      <button className="back-action" onClick={() => router.push("/receipt")}>← Back to receipt</button>
      <div className="tracker-heading spending-heading">
        <div><p className="screen-kicker">03 · SPENDING STORIES</p><h1 id="feed-title">The decisions<br />behind the numbers.</h1></div>
        <aside className="spending-context"><span>YOUR FEDERAL TAX</span><strong>{money.format(tax)}</strong><small>follow it into the public record</small></aside>
      </div>
      {state.status === "loading" && <p className="feed-status" role="status">Loading spending stories…</p>}
      {state.status === "error" && <div className="empty-state" role="alert"><strong>Spending data is unavailable.</strong><p>Check your connection and try again.</p><button className="text-action" onClick={() => window.location.reload()}>Try again ↻</button></div>}
      {state.status === "ready" && <>
        <nav className="department-filter" aria-label="Filter spending stories by department">
          <Link aria-current={!department ? "page" : undefined} className={`filter-chip ${!department ? "active" : ""}`} href="/spending">All stories <span>{state.stories.length}</span></Link>
          {state.departments.map((item) => <Link aria-current={department === item.dept_code ? "page" : undefined} key={item.dept_code} className={`filter-chip ${department === item.dept_code ? "active" : ""}`} href={`/spending?department=${encodeURIComponent(item.dept_code)}`}>{item.name} <span>{item.count}</span></Link>)}
        </nav>
        <p className="feed-status" aria-live="polite">{state.stories.length} {state.stories.length === 1 ? "story" : "stories"} · newest first</p>
        {!state.stories.length && <div className="empty-state"><strong>No stories match this department.</strong><p>Try another department to keep following the money.</p></div>}
        <div className="story-list">
          {state.stories.map((story, index) => <StoryCard key={story.id} story={story} total={breakdown.total} tax={tax} featured={index === 0} onOpen={() => router.push(`/spending/${encodeURIComponent(story.id)}`)} />)}
        </div>
      </>}
    </section>
  );
}

function StoryCard({ story, total, tax, featured, onOpen }: { story: StoryWithCampaigns; total: number | null; tax: number; featured: boolean; onOpen: () => void }) {
  return <article className={`story-card ${featured ? "story-card-featured" : ""} story-card-accent-${story.source_type}`}>
    <div className="story-card-top"><span className={`story-type ${story.source_type === "news" ? "story-type-news" : ""}`}>{typeLabel(story)}</span><span>{story.fiscal_year} · {dateLabel(story.date)}</span></div>
    <StoryImage story={story} />
    <ImageCredit story={story} />
    <button className="story-card-link" onClick={onOpen}><h2>{story.title}</h2><span className="decision-arrow" aria-hidden="true">↗</span></button>
    <p>{story.summary}</p>
    <div className="story-card-facts"><span><b>Department</b>{story.department}</span><span><b>Public amount</b>{money.format(story.amount)}</span><span className="story-share"><b>Your share</b><strong>{shareFor(story, tax, total)}</strong></span></div>
    {campaignsBlock(story.campaigns)}
    {story.sources[0] && <a className="story-source" href={story.sources[0].url} target="_blank" rel="noreferrer">Source: {story.sources[0].label} ↗</a>}
  </article>;
}

const stageLabels: Record<string, string> = { gathering: "Gathering members", in_review: "In review", mp_asked: "MP asked", mp_agreed: "MP agreed", live: "Live", closed: "Closed" };

function campaignsBlock(campaigns: CampaignSummary[]) {
  if (!campaigns.length) return <p className="story-campaign-empty">No campaign attached yet.</p>;
  return <div className="campaign-rows" aria-label="Campaigns for this story">{campaigns.slice(0, 3).map((campaign) => <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="campaign-row"><span><b>{campaign.title}</b><small>{campaign.memberCount.toLocaleString("en-CA")} members · {stageLabels[campaign.stage] ?? campaign.stage}{campaign.joined ? " · Joined" : ""}</small></span><span aria-hidden="true">↗</span></Link>)}</div>;
}

export function SpendingStoryDetailScreen({ storyId }: { storyId: string }) {
  const router = useRouter();
  const state = useSpendingDetail(storyId);
  const breakdown = useTaxBreakdown();
  const { inputs } = useTaxInputs();
  const tax = estimateTax(inputs.income, inputs.province).federal;

  if (state.status === "loading") return <section className="tracker-page detail-page"><button className="back-action" onClick={() => router.push("/spending")}>← Back to spending</button><p className="feed-status" role="status">Loading this story…</p></section>;
  if (state.status === "error") return <section className="tracker-page detail-page"><button className="back-action" onClick={() => router.push("/spending")}>← Back to spending</button><div className="empty-state" role="alert"><strong>This story is unavailable.</strong><p>It may have moved or the link may be invalid.</p><button className="text-action" onClick={() => router.push("/spending")}>Return to spending ↗</button></div></section>;

  const story = state.story;
  return <section className="tracker-page detail-page" aria-labelledby="story-title">
    <button className="back-action" onClick={() => router.push("/spending")}>← Back to spending stories</button>
    <p className="screen-kicker">04 · {typeLabel(story)}</p>
    <div className="detail-hero"><div><h1 id="story-title">{story.title}</h1><p className="detail-recipient">{story.department} · {dateLabel(story.date)}</p></div><span className="detail-stamp">FEDERAL<br />RECORD</span></div>
    <StoryImage story={story} />
    <ImageCredit story={story} />
    <div className="detail-facts"><span><b>Department</b>{story.department}</span><span><b>Fiscal year</b>{story.fiscal_year}</span><span><b>Public amount</b>{money.format(story.amount)}</span></div>
    <section className="your-share"><p className="section-label">Your share of this story</p><strong>{shareFor(story, tax, breakdown.total)}</strong><p>An estimate based on your federal tax and this record&apos;s share of total federal spending for {story.fiscal_year}.</p></section>
    <section className="detail-section evidence-section"><p className="section-label">What the record says</p><h2>Follow the evidence.</h2><p>{story.summary}</p></section>
    <section className="detail-section"><p className="section-label">The source</p><h2>Read the public record.</h2><div className="context-links">{story.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div></section>
    <ActionSection story={story} />
    <footer className="detail-source"><span>DATA AS OF {story.date}</span>{story.sources[0] && <a href={story.sources[0].url} target="_blank" rel="noreferrer">VIEW ORIGINAL RECORD ↗</a>}</footer>
  </section>;
}

function StoryImage({ story }: { story: Story }) {
  const imageKey = `${story.id}:${story.image_url ?? ""}`;
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const failed = failedKey === imageKey;
  if (story.image_url && !failed) {
    const imageDescription = story.image_credit === "Editorial illustration"
      ? `Editorial illustration for ${story.title}`
      : `${story.image_credit ?? "Source"} image for ${story.title}`;
    return <div className="story-image story-image-photo"><Image src={story.image_url} alt={imageDescription} fill sizes="(max-width: 700px) 100vw, 900px" className="story-image-img" onError={() => setFailedKey(imageKey)} /></div>;
  }
  return <div className="story-image story-image-fallback" role="img" aria-label={`${typeLabel(story)} illustration`}><span>{story.source_type === "news" ? "NEWS" : "RECORD"}</span><small>{story.dept_code}</small></div>;
}

function ImageCredit({ story }: { story: Story }) {
  if (!story.image_credit) return null;
  return <small className="story-image-credit">{story.image_source_url ? <a href={story.image_source_url} target="_blank" rel="noreferrer">Image: {story.image_credit} ↗</a> : `Image: ${story.image_credit}`}</small>;
}

function ActionSection({ story }: { story: StoryWithCampaigns }) {
  const campaign = story.campaigns.find((candidate) => candidate.petition) ?? story.campaigns[0];
  const petition = campaign?.petition;
  return (
    <section className="civic-action">
      <p className="section-label">Now ask what happens next</p>
      {petition ? (
        <>
          <h2>This story has an official petition.</h2>
          <div className="petition-progress"><strong>{petition.signatures.toLocaleString("en-CA")}</strong><span>of {petition.signaturesNeeded.toLocaleString("en-CA")} signatures</span></div>
          <p className="action-copy">{petition.title}. Signatures count on the official House of Commons petition.</p>
          <div className="action-links"><a className="primary-action" href={petition.url} target="_blank" rel="noreferrer">Sign on ourcommons.ca ↗</a><Link className="text-action" href={`/campaigns/${campaign.id}`}>See the campaign ↗</Link></div>
          {petition.closesAt && <small>Closes {dateLabel(petition.closesAt)} · Confirm your email with the House of Commons.</small>}
        </>
      ) : (
        <>
          <h2 className="next-steps-title">What happens next?</h2>
          <p className="action-copy">Turn a question about this spending story into a campaign people can join, then move it toward an official petition.</p>
          <div className="action-links"><Link className="primary-action" href={`/campaigns/new?story=${encodeURIComponent(story.id)}`}>Start a campaign ↗</Link><Link className="text-action" href="/campaigns">Browse all campaigns ↗</Link></div>
          <small>Only federal spending stories can lead to a House of Commons e-petition.</small>
        </>
      )}
      {campaignsBlock(story.campaigns)}
    </section>
  );
}

function useTaxBreakdown() {
  const state = useBreakdown();
  return { total: state.status === "ready" ? state.breakdown.total_federal_spending : null };
}
