import type { UserInputs } from "./types";

const key = "where-does-my-tax-go:user-inputs";
export const defaultUserInputs: UserInputs = { income: 75_000, province: "ON", postalCode: "", incomeIsTypical: false };
const fallback = defaultUserInputs;
const listeners = new Set<() => void>();
let cachedInputs: UserInputs | undefined;

export function readUserInputs(): UserInputs {
  try {
    const value = sessionStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveUserInputs(inputs: UserInputs): void {
  cachedInputs = inputs;
  try {
    sessionStorage.setItem(key, JSON.stringify(inputs));
  } catch {
    // Storage can be unavailable in private browsing or during server rendering.
  }
  listeners.forEach((listener) => listener());
}

export function getUserInputsSnapshot(): UserInputs {
  cachedInputs ??= readUserInputs();
  return cachedInputs;
}

export function getUserInputsServerSnapshot(): UserInputs {
  return fallback;
}

export const getServerUserInputsSnapshot = getUserInputsServerSnapshot;

export function subscribeToUserInputs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setUserInputs(inputs: UserInputs): void {
  saveUserInputs(inputs);
}

// Called on logout so the next person using this tab doesn't see these numbers.
export function clearUserInputs(): void {
  cachedInputs = undefined;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing.
  }
  listeners.forEach((listener) => listener());
}
