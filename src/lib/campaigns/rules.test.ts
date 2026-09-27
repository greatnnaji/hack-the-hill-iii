import { describe, expect, it } from "vitest";
import { checkCampaignText, countWords, createCampaignSchema, MAX_PETITION_WORDS, PETITION_OPENING } from "./rules";

const GOOD = { title: "Publish the aircraft contracts", issue: "Whereas military aircraft spending more than tripled;", request: "publish every contract." };

describe("checkCampaignText", () => {
  it("accepts text that follows the rules and counts the opening in the words", () => {
    const result = checkCampaignText(GOOD);
    expect(result.problems).toEqual([]);
    expect(result.words).toBe(countWords(GOOD.issue) + countWords(PETITION_OPENING) + countWords(GOOD.request));
    expect(result.maxWords).toBe(MAX_PETITION_WORDS);
  });

  it("needs the issue to start with Whereas", () => {
    expect(checkCampaignText({ ...GOOD, issue: "Spending tripled." }).problems).toContain('The issue must start with "Whereas".');
  });

  it("rejects web addresses anywhere in the text", () => {
    for (const link of ["see https://example.com", "see www.example.org", "see canada.ca"]) {
      expect(checkCampaignText({ ...GOOD, request: link }).problems).toContain("Petitions can't include links.");
    }
  });

  it("allows 250 words in total and not one more", () => {
    const free = MAX_PETITION_WORDS - countWords(PETITION_OPENING) - countWords(GOOD.request);
    const issue = `Whereas ${"word ".repeat(free - 1)}`;
    expect(checkCampaignText({ ...GOOD, issue }).problems).toEqual([]);
    expect(checkCampaignText({ ...GOOD, issue: `${issue} extra` }).problems[0]).toMatch(/250 words or fewer \(now 251\)/);
  });

  it("limits the title to 250 characters and needs a request", () => {
    expect(checkCampaignText({ ...GOOD, title: "x".repeat(251) }).problems).toContain("The title must be 250 characters or fewer.");
    expect(checkCampaignText({ ...GOOD, request: "  " }).problems).toContain("Add the action you are asking for.");
  });
});

describe("createCampaignSchema", () => {
  it("requires the consent box", () => {
    expect(createCampaignSchema.safeParse({ storyId: "s", ...GOOD }).success).toBe(false);
    expect(createCampaignSchema.safeParse({ storyId: "s", ...GOOD, consent: true }).success).toBe(true);
  });
});
