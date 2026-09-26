/** Uppercases and strips spaces; returns null unless the result looks like A1A1A1. */
export function normalizePostal(input: string): string | null {
  const code = input.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code) ? code : null;
}
