import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PetitionCard } from "@/lib/petitions/petitions";
import { PetitionItem } from "./PetitionItem";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children?: ReactNode; className?: string }) =>
    createElement("a", { href, className }, children),
}));

const petition = (overrides: Partial<PetitionCard>): PetitionCard => ({
  number: "e-7203",
  title: "Publish the full cost of ocean monitoring",
  url: "https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=e-7203",
  campaignId: "campaign-1",
  campaignTitle: "Ocean monitoring costs",
  storyId: "story-1",
  sponsorName: "Yasir Naqvi",
  sponsorRiding: "Ottawa Centre",
  signatures: 250,
  signaturesNeeded: 500,
  status: "open",
  openedAt: "2099-08-26T19:09:00.000Z",
  closesAt: "2099-12-24T19:09:00.000Z",
  presentedAt: null,
  responseTabledAt: null,
  syncedAt: "2099-09-26T12:00:00.000Z",
  ...overrides,
});

const render = (card: PetitionCard) => renderToStaticMarkup(createElement(PetitionItem, { petition: card }));

describe("PetitionItem", () => {
  it("shows an open petition's signatures, closing date, sponsor and where to sign", () => {
    const html = render(petition({}));
    expect(html).toContain("e-7203 · Open for signature");
    expect(html).toContain("Publish the full cost of ocean monitoring");
    expect(html).toContain("250 of 500 signatures");
    expect(html).toContain("width:50%");
    expect(html).toContain("Closes Dec 24, 2099");
    expect(html).toContain("Sponsored by Yasir Naqvi (Ottawa Centre)");
    expect(html).toContain('href="https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=e-7203"');
    expect(html).toContain("Sign on ourcommons.ca");
    expect(html).toContain('href="/campaigns/campaign-1"');
    expect(html).toContain("Ocean monitoring costs");
  });

  it("doesn't link to ourcommons.ca before the petition is published there", () => {
    const html = render(petition({ status: "pending", openedAt: null, closesAt: null, sponsorName: null, sponsorRiding: null }));
    expect(html).toContain("e-7203 · Opening soon");
    expect(html).toContain("Waiting for the House of Commons to publish it.");
    expect(html).not.toContain("ourcommons.ca/petitions");
    expect(html).not.toContain("Sponsored by");
  });

  it("points finished petitions to the government's response, with the bar capped at full", () => {
    const html = render(
      petition({
        status: "response",
        signatures: 387487,
        closesAt: "2023-12-24T19:09:00.000Z",
        presentedAt: "2024-01-31T05:00:00.000Z",
        responseTabledAt: "2024-03-18T04:00:00.000Z",
      }),
    );
    expect(html).toContain("e-7203 · Government responded");
    expect(html).toContain("387,487 of 500 signatures");
    expect(html).toContain("width:100%");
    expect(html).toContain("Government response tabled Mar 18, 2024");
    expect(html).toContain("Read it on ourcommons.ca");
    expect(html).not.toContain("Sign on ourcommons.ca");
  });
});
