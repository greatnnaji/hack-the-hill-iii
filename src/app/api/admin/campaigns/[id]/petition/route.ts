import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { attachPetition } from "@/lib/campaigns/admin";
import { getCampaign } from "@/lib/campaigns/campaigns";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { jsonError, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

const bodySchema = z.object({ number: z.string().trim().min(1).max(20), title: z.string().trim().min(1).max(500) });

/**
 * Purpose:
 *	PUT /api/admin/campaigns/:id/petition: attach the official e-petition created on ourcommons.ca, and fetch it right away.
 *	Admins only. The campaign moves to "MP agreed", then "live" once ourcommons.ca shows it open.
 *
 * Args:
 *	- request: JSON { number: "e-7203", title }
 *	- context.params: resolves to { id }
 *
 * Returns:
 *	NextResponse: { sync: "synced" | "not_found" | "failed", campaign: CampaignDetail }; 400 invalid_body / invalid_petition_number,
 *	404 not_found, 409 petition_taken
 */
export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin();
    const id = (await params).id;
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    const { sync } = await attachPetition(id, parsed.data);
    return NextResponse.json({ sync, campaign: await getCampaign(id, admin.id) });
  } catch (error) {
    return campaignErrorResponse(error);
  }
}
