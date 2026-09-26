import type { Mp } from "@/lib/mp/types";

export const MAX_RESULTS = 20;

/** Lowercases and strips accents so "belanger" matches "Bélanger". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function searchMps(mps: Mp[], query: string): Mp[] {
  const needle = fold(query.trim());
  if (!needle) return [];
  return mps
    .filter((mp) => fold(mp.name).includes(needle) || fold(mp.riding).includes(needle))
    .slice(0, MAX_RESULTS);
}
