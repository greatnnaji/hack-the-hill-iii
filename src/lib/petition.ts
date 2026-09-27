import { z } from "zod";
import { PETITION_OPENING } from "@/lib/campaigns/rules";

// Petition wording shared by the campaign screens and the MP sponsor letter. The text rules themselves
// (title length, "Whereas", 250 words, no links) live in src/lib/campaigns/rules.ts.

export const REQUEST_PREFIX = PETITION_OPENING;

export const LIMITS = {
  sponsorEmail: 5000,
} as const;

// Generous caps: real Represent values are far shorter, but the API shouldn't store unbounded text.
// Used by the admin page's MP ask.
export const mpSchema = z.object({
  name: z.string().min(1).max(200),
  riding: z.string().min(1).max(200),
  party: z.string().max(200).nullable(),
  email: z.string().max(254).nullable(),
  photoUrl: z.string().max(2048).nullable(),
  profileUrl: z.string().max(2048).nullable(),
  hillPhone: z.string().max(50).nullable(),
  ridingPhone: z.string().max(50).nullable(),
});

export function fullRequest(request: string): string {
  return `${REQUEST_PREFIX} ${request}`;
}
