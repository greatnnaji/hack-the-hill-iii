import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPetition, normalizePetitionNumber, parseHouseDate, parsePetitionPage, PetitionFetchError, petitionUrl } from "./ourcommons";

// Trimmed copy of the real page for e-4701 (closed, presented, response tabled).
const E4701 = readFileSync(path.join(__dirname, "__fixtures__", "e-4701.html"), "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parsePetitionPage", () => {
  it("reads signatures, sponsor and every History date from a real page", () => {
    expect(parsePetitionPage("e-4701", E4701)).toEqual({
      number: "e-4701",
      signatures: 387487,
      sponsorName: "Michelle Ferreri",
      sponsorRiding: "Peterborough—Kawartha",
      openedAt: new Date("2023-11-24T19:09:00Z"),
      closesAt: new Date("2023-12-24T19:09:00Z"),
      presentedAt: new Date("2024-01-31T05:00:00Z"),
      responseTabledAt: new Date("2024-03-18T04:00:00Z"),
    });
  });

  it("returns null when the page isn't that petition", () => {
    expect(parsePetitionPage("e-9999", E4701)).toBeNull();
    expect(parsePetitionPage("e-4701", "<html><h1>Search - Petitions</h1></html>")).toBeNull();
  });
});

describe("parseHouseDate", () => {
  it("reads Ottawa times with and without a time of day", () => {
    expect(parseHouseDate("June 3, 2026, at 9:05 a.m. (EDT)")).toEqual(new Date("2026-06-03T13:05:00Z"));
    expect(parseHouseDate("January 5, 2026, at 12:30 p.m. (EST)")).toEqual(new Date("2026-01-05T17:30:00Z"));
    expect(parseHouseDate("nothing here")).toBeNull();
  });
});

describe("normalizePetitionNumber", () => {
  it("accepts the ways people type it and rejects other text", () => {
    expect(normalizePetitionNumber(" E-7203 ")).toBe("e-7203");
    expect(normalizePetitionNumber("e7203")).toBe("e-7203");
    expect(normalizePetitionNumber("7203")).toBeNull();
    expect(normalizePetitionNumber("e-72a")).toBeNull();
    expect(petitionUrl("e-7203")).toBe("https://www.ourcommons.ca/petitions/en/Petition/Details?Petition=e-7203");
  });
});

describe("fetchPetition", () => {
  it("downloads and parses the details page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(E4701)));
    expect((await fetchPetition("e-4701"))?.signatures).toBe(387487);
  });

  it("returns null for a 404 and throws when the site can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    expect(await fetchPetition("e-4701")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await expect(fetchPetition("e-4701")).rejects.toBeInstanceOf(PetitionFetchError);
  });
});
