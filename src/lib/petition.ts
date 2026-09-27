// Petition text rules shared by the form (screen 05), the campaigns API and the MP letter.

export const REQUEST_PREFIX = "We, the undersigned, call upon the Government of Canada to";

export const LIMITS = {
  title: 250,
  issue: 4000,
  request: 2000,
} as const;

export function fullRequest(request: string): string {
  return `${REQUEST_PREFIX} ${request}`;
}
