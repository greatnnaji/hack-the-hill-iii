import { describe, expect, it } from "vitest";
import { mpSchema } from "./petition";

const mp = {
  name: "Yasir Naqvi",
  riding: "Ottawa Centre",
  party: "Liberal",
  email: "yasir.naqvi@parl.gc.ca",
  photoUrl: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/45/NaqviYasir_Lib.jpg",
  profileUrl: "https://www.ourcommons.ca/Members/en/yasir-naqvi(110572)",
  hillPhone: "1 613 996-5322",
  ridingPhone: "1 613 946-8682",
};

describe("mpSchema", () => {
  it("accepts a real MP from Represent", () => {
    expect(mpSchema.safeParse(mp).success).toBe(true);
  });

  it("rejects oversized values", () => {
    expect(mpSchema.safeParse({ ...mp, name: "x".repeat(201) }).success).toBe(false);
    expect(mpSchema.safeParse({ ...mp, profileUrl: `https://x.ca/${"x".repeat(2048)}` }).success).toBe(false);
    expect(mpSchema.safeParse({ ...mp, hillPhone: "1".repeat(51) }).success).toBe(false);
  });
});
