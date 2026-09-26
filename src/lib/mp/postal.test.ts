import { describe, expect, it } from "vitest";
import { normalizePostal } from "./postal";

describe("normalizePostal", () => {
  it("uppercases and removes spaces", () => {
    expect(normalizePostal(" k1p 1a4 ")).toBe("K1P1A4");
  });

  it("rejects codes that are not A1A1A1", () => {
    expect(normalizePostal("K1P1A")).toBeNull();
    expect(normalizePostal("11P1A4")).toBeNull();
    expect(normalizePostal("")).toBeNull();
  });
});
