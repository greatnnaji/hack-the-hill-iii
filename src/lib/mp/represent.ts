import type { Mp } from "@/lib/mp/types";

const REPRESENT_BASE = "https://represent.opennorth.ca";
const TIMEOUT_MS = 8000;
const ONE_DAY_SECONDS = 86400;

type RepresentOffice = { type?: string | null; tel?: string | null };

export type RepresentRep = {
  name: string;
  district_name: string;
  elected_office: string;
  party_name?: string | null;
  email?: string | null;
  photo_url?: string | null;
  url?: string | null;
  offices?: RepresentOffice[] | null;
};

export class LookupError extends Error {
  constructor() {
    super("lookup_failed");
    this.name = "LookupError";
  }
}

function orNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

function officePhone(rep: RepresentRep, type: string): string | null {
  return orNull(rep.offices?.find((office) => office.type === type)?.tel);
}

export function toMp(rep: RepresentRep): Mp {
  return {
    name: rep.name,
    riding: rep.district_name,
    party: orNull(rep.party_name),
    email: orNull(rep.email),
    photoUrl: orNull(rep.photo_url),
    profileUrl: orNull(rep.url),
    hillPhone: officePhone(rep, "legislature"),
    ridingPhone: officePhone(rep, "constituency"),
  };
}

/** Picks the federal MP out of a /postcodes/ response. */
export function pickMp(body: { representatives_centroid?: RepresentRep[] }): Mp | null {
  const rep = body.representatives_centroid?.find((r) => r.elected_office === "MP");
  return rep ? toMp(rep) : null;
}

/** GETs a Represent path. Returns null on 404; throws LookupError on anything else that isn't a readable 200. */
async function getRepresent<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${REPRESENT_BASE}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: ONE_DAY_SECONDS },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Represent returned HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    // The path can hold a postal code, which we never keep, so it stays out of the log.
    console.error("Represent lookup failed", error);
    throw new LookupError();
  }
}

export async function lookupMpByPostal(code: string): Promise<Mp | null> {
  const body = await getRepresent<{ representatives_centroid?: RepresentRep[] }>(
    `/postcodes/${code}/`,
  );
  return body ? pickMp(body) : null;
}

export async function listAllMps(): Promise<Mp[]> {
  const body = await getRepresent<{ objects: RepresentRep[] }>(
    "/representatives/house-of-commons/?limit=500",
  );
  if (!body) throw new LookupError();
  return body.objects.map(toMp);
}
