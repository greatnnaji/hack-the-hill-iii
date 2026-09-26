import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearUserInputs, getUserInputsSnapshot, readUserInputs, saveUserInputs, setUserInputs, subscribeToUserInputs } from "./userInputs";

const fallback = { income: 75_000, province: "ON", postalCode: "", incomeIsTypical: false };

describe("tax journey user inputs", () => {
  let values: Map<string, string>;

  beforeEach(() => {
    values = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("returns defaults when there are no saved preferences", () => {
    expect(readUserInputs()).toEqual(fallback);
  });

  it("restores preferences saved for the current browser session", () => {
    saveUserInputs({ income: 92_000, province: "BC", postalCode: "V6B 1A1", incomeIsTypical: false });

    expect(readUserInputs()).toEqual({
      income: 92_000,
      province: "BC",
      postalCode: "V6B 1A1",
      incomeIsTypical: false,
    });
  });

  it("falls back safely when saved preferences are malformed", () => {
    values.set("where-does-my-tax-go:user-inputs", "{");

    expect(readUserInputs()).toEqual(fallback);
  });

  it("updates the shared snapshot and notifies mounted screens", () => {
    let notifications = 0;
    const unsubscribe = subscribeToUserInputs(() => notifications++);
    const next = { income: 88_000, province: "QC", postalCode: "H2Y 1C6", incomeIsTypical: false };

    setUserInputs(next);

    expect(getUserInputsSnapshot()).toEqual(next);
    expect(notifications).toBe(1);
    unsubscribe();
  });

  it("forgets saved preferences on logout", () => {
    let notifications = 0;
    const unsubscribe = subscribeToUserInputs(() => notifications++);
    setUserInputs({ income: 92_000, province: "BC", postalCode: "V6B 1A1", incomeIsTypical: false });

    clearUserInputs();

    expect(values.size).toBe(0);
    expect(getUserInputsSnapshot()).toEqual(fallback);
    expect(notifications).toBe(2);
    unsubscribe();
  });
});
