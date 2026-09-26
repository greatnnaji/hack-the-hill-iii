import { describe, expect, it } from "vitest";
import type { Mp } from "./types";
import { MAX_RESULTS, searchMps } from "./search";

function mp(name: string, riding: string): Mp {
  return {
    name,
    riding,
    party: null,
    email: null,
    photoUrl: null,
    profileUrl: null,
    hillPhone: null,
    ridingPhone: null,
  };
}

const MPS = [
  mp("Yasir Naqvi", "Ottawa Centre"),
  mp("Jim Bélanger", "Sudbury East—Manitoulin—Nickel Belt"),
  mp("Élisabeth Brière", "Sherbrooke"),
];

describe("searchMps", () => {
  it("matches names case-insensitively", () => {
    expect(searchMps(MPS, "NAQVI").map((m) => m.name)).toEqual(["Yasir Naqvi"]);
  });

  it("ignores accents in either direction", () => {
    expect(searchMps(MPS, "belanger").map((m) => m.name)).toEqual(["Jim Bélanger"]);
    expect(searchMps(MPS, "élisabeth").map((m) => m.name)).toEqual(["Élisabeth Brière"]);
  });

  it("matches ridings", () => {
    expect(searchMps(MPS, "sherbrooke").map((m) => m.name)).toEqual(["Élisabeth Brière"]);
  });

  it("returns nothing for a blank query", () => {
    expect(searchMps(MPS, "   ")).toEqual([]);
  });

  it("caps results", () => {
    const many = Array.from({ length: 30 }, (_, i) => mp(`Member ${i}`, "Somewhere"));
    expect(searchMps(many, "member")).toHaveLength(MAX_RESULTS);
  });
});
