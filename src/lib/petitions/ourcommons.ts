// Reads an official e-petition's public page on ourcommons.ca. The House of Commons has no JSON API for petitions,
// so this parses the details page: signature count, sponsor MP and the "History" dates.

const BASE = "https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=";
const TIMEOUT_MS = 10_000;

export type OurCommonsPetition = {
  number: string;
  signatures: number;
  sponsorName: string | null;
  sponsorRiding: string | null;
  openedAt: Date | null;
  closesAt: Date | null;
  presentedAt: Date | null;
  responseTabledAt: Date | null;
};

export class PetitionFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PetitionFetchError";
  }
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/**
 * Purpose:
 *	Check and normalise a petition number the way ourcommons.ca writes it.
 *
 * Args:
 *	- input: what the admin typed, e.g. "E-7203" or " e-7203 "
 *
 * Returns:
 *	string | null: "e-7203", or null when it isn't an e-petition number
 */
export function normalizePetitionNumber(input: string): string | null {
  const match = /^e-?(\d{1,6})$/i.exec(input.trim());
  return match ? `e-${match[1]}` : null;
}

/**
 * Purpose:
 *	Link to a petition's page on ourcommons.ca, where people sign it.
 *
 * Args:
 *	- number: a normalised petition number, e.g. "e-7203"
 *
 * Returns:
 *	string: the details page URL
 */
export function petitionUrl(number: string): string {
  return `${BASE}${encodeURIComponent(number)}`;
}

/**
 * Purpose:
 *	Turn a fragment of HTML into plain text: drop tags, decode common entities, collapse spaces.
 *
 * Args:
 *	- html: the HTML fragment
 *
 * Returns:
 *	string: the visible text
 */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Purpose:
 *	Read a date as ourcommons.ca writes it, in Ottawa time: "November 24, 2023, at 3:09 p.m. (EDT)" or "March 18, 2024".
 *
 * Args:
 *	- value: the text containing the date
 *
 * Returns:
 *	Date | null: the moment it describes (midnight Ottawa time when there is no time), or null if there is no date
 */
export function parseHouseDate(value: string): Date | null {
  const date = /([A-Za-z]+) (\d{1,2}), (\d{4})/.exec(value);
  if (!date) return null;
  const month = MONTHS.indexOf(date[1].toLowerCase());
  if (month < 0) return null;

  let hour = 0;
  let minute = 0;
  const time = /at (\d{1,2}):(\d{2}) ([ap])\.m\./i.exec(value);
  if (time) {
    hour = (Number(time[1]) % 12) + (time[3].toLowerCase() === "p" ? 12 : 0);
    minute = Number(time[2]);
  }
  // Ottawa is UTC-4 in summer (EDT) and UTC-5 in winter (EST). Without a label, assume EDT from March to October.
  const offset = /\(EST\)/.test(value) ? 5 : /\(EDT\)/.test(value) ? 4 : month >= 2 && month <= 9 ? 4 : 5;
  return new Date(Date.UTC(Number(date[3]), month, Number(date[2]), hour + offset, minute));
}

/**
 * Purpose:
 *	Pull the fields we show from a petition details page.
 *
 * Args:
 *	- number: the petition number the page is for
 *	- html: the whole details page
 *
 * Returns:
 *	OurCommonsPetition | null: the petition, or null when the page has no petition (not published yet, or wrong number)
 */
export function parsePetitionPage(number: string, html: string): OurCommonsPetition | null {
  if (!new RegExp(`<h1[^>]*>\\s*${number}\\b`, "i").test(html)) return null;

  const history = /class="[^"]*history-section[^"]*"[^>]*>([\s\S]*?)<\/dl>/.exec(html)?.[1] ?? "";
  const dates: Partial<Record<"openedAt" | "closesAt" | "presentedAt" | "responseTabledAt", Date | null>> = {};
  for (const [, label, value] of history.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
    const name = text(label).toLowerCase();
    // "Presented to the House" lists the MP first, then the date: read only the date part.
    const when = parseHouseDate(text(value).replace(/^[\s\S]*?(?=[A-Z][a-z]+ \d{1,2}, \d{4})/, ""));
    if (name.startsWith("open")) dates.openedAt = when;
    else if (name.startsWith("clos")) dates.closesAt = when;
    else if (name.startsWith("presented")) dates.presentedAt = when;
    else if (name.includes("response")) dates.responseTabledAt = when;
  }

  const member = /id="DetailsMember"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/.exec(html)?.[1] ?? "";
  const memberParts = [...member.matchAll(/<div>([\s\S]*?)<\/div>/g)].map((match) => text(match[1])).filter(Boolean);
  const signatures = /(\d[\d,]*)\s+signatures?\b/i.exec(text(/<h2[^>]*>\s*[\d,]+\s+signatures?[\s\S]*?<\/h2>/i.exec(html)?.[0] ?? ""));

  return {
    number,
    signatures: signatures ? Number(signatures[1].replace(/,/g, "")) : 0,
    sponsorName: memberParts[0] ?? null,
    sponsorRiding: memberParts[1] ?? null,
    openedAt: dates.openedAt ?? null,
    closesAt: dates.closesAt ?? null,
    presentedAt: dates.presentedAt ?? null,
    responseTabledAt: dates.responseTabledAt ?? null,
  };
}

/**
 * Purpose:
 *	Download and parse one petition from ourcommons.ca.
 *
 * Args:
 *	- number: a normalised petition number, e.g. "e-7203"
 *
 * Returns:
 *	Promise<OurCommonsPetition | null>: the petition, or null when ourcommons.ca has no petition with that number yet; throws PetitionFetchError if the site can't be reached
 */
export async function fetchPetition(number: string): Promise<OurCommonsPetition | null> {
  let response: Response;
  try {
    response = await fetch(petitionUrl(number), {
      headers: { "user-agent": "Mozilla/5.0 (compatible; WhereDoesMyTaxGo/1.0)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new PetitionFetchError(`Could not reach ourcommons.ca for ${number}`);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new PetitionFetchError(`ourcommons.ca answered ${response.status} for ${number}`);
  return parsePetitionPage(number, await response.text());
}
