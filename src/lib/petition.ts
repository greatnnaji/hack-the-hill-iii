import { z } from "zod";
import type { Mp } from "@/lib/mp/types";

export const REQUEST_PREFIX = "We, the undersigned, call upon the Government of Canada to";

export const LIMITS = {
  title: 250,
  issue: 4000,
  request: 2000,
  sponsorEmail: 5000,
} as const;

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const mpSchema = z.object({
  name: z.string().min(1),
  riding: z.string().min(1),
  party: z.string().nullable(),
  email: z.string().nullable(),
  photoUrl: z.string().nullable(),
  profileUrl: z.string().nullable(),
  hillPhone: z.string().nullable(),
  ridingPhone: z.string().nullable(),
});

export const createDraftSchema = z.object({
  storyId: z.string().min(1).max(200),
  storyTitle: z.string().min(1).max(500),
  title: requiredText(LIMITS.title),
  issue: requiredText(LIMITS.issue),
  request: requiredText(LIMITS.request),
});

export const updateDraftSchema = z.object({
  title: requiredText(LIMITS.title).optional(),
  issue: requiredText(LIMITS.issue).optional(),
  request: requiredText(LIMITS.request).optional(),
  mp: mpSchema.optional(),
  sponsorEmail: z.string().max(LIMITS.sponsorEmail).nullable().optional(),
  sponsorRequested: z.literal(true).optional(),
});

export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;

export type Draft = {
  id: string;
  storyId: string;
  storyTitle: string;
  title: string;
  issue: string;
  request: string;
  mp: Mp | null;
  sponsorEmail: string | null;
  sponsorRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function fullRequest(request: string): string {
  return `${REQUEST_PREFIX} ${request}`;
}
