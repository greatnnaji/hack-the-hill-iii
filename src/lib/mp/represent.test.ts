import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import postcodeFixture from "./__fixtures__/postcode-K1P1A4.json";
import { listAllMps, LookupError, lookupMpByPostal, pickMp, toMp } from "./represent";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("pickMp", () => {
  it("returns the federal MP, skipping provincial and municipal members", () => {
    expect(pickMp(postcodeFixture)).toEqual({
      name: "Yasir Naqvi",
      riding: "Ottawa Centre",
      party: "Liberal",
      email: "yasir.naqvi@parl.gc.ca",
      photoUrl:
        "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/45/NaqviYasir_Lib.jpg",
      profileUrl: "https://www.ourcommons.ca/Members/en/yasir-naqvi(110572)",
      hillPhone: "1 613 996-5322",
      ridingPhone: "1 613 946-8682",
    });
  });

  it("returns null when there is no MP", () => {
    expect(pickMp({ representatives_centroid: [] })).toBeNull();
    expect(pickMp({})).toBeNull();
  });
});

describe("toMp", () => {
  it("turns empty strings and missing offices into null", () => {
    const councillor = postcodeFixture.representatives_centroid[2];
    expect(toMp({ ...councillor, offices: undefined })).toMatchObject({
      party: null,
      photoUrl: null,
      hillPhone: null,
      ridingPhone: null,
    });
  });
});

describe("lookupMpByPostal", () => {
  it("fetches the postcode and returns the MP", async () => {
    const fetchMock = stubFetch(Response.json(postcodeFixture));
    const mp = await lookupMpByPostal("K1P1A4");
    expect(mp?.name).toBe("Yasir Naqvi");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://represent.opennorth.ca/postcodes/K1P1A4/",
      expect.objectContaining({ next: { revalidate: 86400 } }),
    );
  });

  it("returns null when Represent does not know the postcode", async () => {
    stubFetch(new Response("Not found", { status: 404 }));
    expect(await lookupMpByPostal("Z9Z9Z9")).toBeNull();
  });

  it("throws LookupError on a server error", async () => {
    stubFetch(new Response("oops", { status: 503 }));
    await expect(lookupMpByPostal("K1P1A4")).rejects.toBeInstanceOf(LookupError);
  });

  it("throws LookupError on a timeout or network failure", async () => {
    stubFetch(new DOMException("timed out", "TimeoutError"));
    await expect(lookupMpByPostal("K1P1A4")).rejects.toBeInstanceOf(LookupError);
  });

  it("throws LookupError when the response isn't valid JSON", async () => {
    stubFetch(new Response("<html>maintenance</html>", { status: 200 }));
    await expect(lookupMpByPostal("K1P1A4")).rejects.toBeInstanceOf(LookupError);
  });

  it("logs failures without the postal code", async () => {
    stubFetch(new Response("oops", { status: 503 }));
    await expect(lookupMpByPostal("K1P1A4")).rejects.toBeInstanceOf(LookupError);
    expect(console.error).toHaveBeenCalledWith("Represent lookup failed", expect.any(Error));
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("K1P1A4");
  });
});

describe("listAllMps", () => {
  it("maps every House of Commons member", async () => {
    stubFetch(Response.json({ objects: [postcodeFixture.representatives_centroid[1]], meta: {} }));
    const mps = await listAllMps();
    expect(mps).toHaveLength(1);
    expect(mps[0].riding).toBe("Ottawa Centre");
  });
});
