import { breakdown } from '../../../shared/breakdown'

// The data only changes when the pipeline reruns, so build this once at build time.
export const dynamic = 'force-static'

/**
 * Purpose:
 *	GET /api/breakdown: total federal spending and the 7 biggest programs plus "All other programs".
 *
 * Args:
 *	(none)
 *
 * Returns:
 *	Response: JSON Breakdown (see src/shared/breakdown.ts)
 */
export function GET() {
  return Response.json(breakdown)
}
