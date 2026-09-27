import { z } from "zod";

// House of Commons e-petition rules that a campaign's text must follow. No database code here,
// so the "Start a campaign" form can import it to check the text as the user types.

export const PETITION_OPENING = "We, the undersigned, call upon the Government of Canada to";
export const MAX_TITLE_CHARS = 250;
export const MAX_PETITION_WORDS = 250;
export const SIGNATURES_NEEDED = 500;

const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|ca|org|net|gov|gc\.ca|io|info|news)\b/i;

export type CampaignText = { title: string; issue: string; request: string };

/**
 * Purpose:
 *	Count words the way a reader would: runs of non-space characters.
 *
 * Args:
 *	- text: any text
 *
 * Returns:
 *	number: how many words it has (0 for empty text)
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Purpose:
 *	Check a campaign's text against the petition rules, for the live checks in the form and for the API.
 *
 * Args:
 *	- text: title, issue ("Whereas…") and requested action (the part after PETITION_OPENING)
 *
 * Returns:
 *	object: words (issue + opening + request), maxWords, and problems, a list of messages to show; empty when the text is fine
 */
export function checkCampaignText(text: CampaignText) {
  const title = text.title.trim();
  const issue = text.issue.trim();
  const request = text.request.trim();
  const words = countWords(issue) + countWords(PETITION_OPENING) + countWords(request);
  const problems: string[] = [];

  if (!title) problems.push("Add a title.");
  if (title.length > MAX_TITLE_CHARS) problems.push(`The title must be ${MAX_TITLE_CHARS} characters or fewer.`);
  if (!/^whereas\b/i.test(issue)) problems.push('The issue must start with "Whereas".');
  if (!request) problems.push("Add the action you are asking for.");
  if (words > MAX_PETITION_WORDS) problems.push(`The petition must be ${MAX_PETITION_WORDS} words or fewer (now ${words}).`);
  if ([title, issue, request].some((part) => LINK.test(part))) problems.push("Petitions can't include links.");

  return { words, maxWords: MAX_PETITION_WORDS, problems };
}

const text = { title: z.string().max(MAX_TITLE_CHARS + 50), issue: z.string().max(5000), request: z.string().max(5000) };
const postalCode = z.string().trim().max(10).optional();

// Request shapes only. The petition rules are checked separately with checkCampaignText(), so the API can
// answer 400 invalid_text with the same messages the form shows.

// POST /api/campaigns
export const createCampaignSchema = z.object({ storyId: z.string().min(1).max(200), ...text, postalCode, consent: z.literal(true) });

// PATCH /api/campaigns/:id (starter only, before anyone else joins)
export const updateCampaignSchema = z.object({ title: text.title.optional(), issue: text.issue.optional(), request: text.request.optional() });

// POST /api/campaigns/:id/members
export const joinCampaignSchema = z.object({ postalCode, consent: z.literal(true) });

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
