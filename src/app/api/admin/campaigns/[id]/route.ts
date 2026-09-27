import { NextResponse } from "next/server";
import { z } from "zod";
import { CAMPAIGN_STAGES } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { updateCampaignByAdmin } from "@/lib/campaigns/admin";
import { getCampaign } from "@/lib/campaigns/campaigns";
import { campaignErrorResponse } from "@/lib/campaigns/errors";
import { jsonError, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({ stage: z.enum(CAMPAIGN_STAGES).optional(), teamNote: z.string().max(2000).nullable().optional() })
  .refine((body) => body.stage !== undefined || body.teamNote !== undefined);

/**
 * Purpose:
 *	PATCH /api/admin/campaigns/:id: move a campaign to another stage and/or set the note members see. Admins only.
 *
 * Args:
 *	- request: JSON { stage?, teamNote? } (teamNote null removes it); at least one is required
 *	- context.params: resolves to { id }
 *
 * Returns:
 *	NextResponse: the updated CampaignDetail; 400 invalid_body, 404 not_found, 409 needs_petition (for "live" without a petition)
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin();
    const id = (await params).id;
    const parsed = bodySchema.safeParse(await readJson(request));
    if (!parsed.success) return jsonError("invalid_body", 400);
    await updateCampaignByAdmin(id, parsed.data);
    return NextResponse.json(await getCampaign(id, admin.id));
  } catch (error) {
    return campaignErrorResponse(error);
  }
}
