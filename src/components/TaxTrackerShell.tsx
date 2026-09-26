"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUserInputsServerSnapshot, getUserInputsSnapshot, setUserInputs, subscribeToUserInputs } from "@/shared/userInputs";
import type { UserInputs } from "@/shared/types";

type TaxInputsContextValue = {
  inputs: UserInputs;
  updateInputs: (inputs: UserInputs) => void;
};

const TaxInputsContext = createContext<TaxInputsContextValue | null>(null);
const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

export function useTaxInputs(): TaxInputsContextValue {
  const value = useContext(TaxInputsContext);
  if (!value) throw new Error("useTaxInputs must be used inside TaxTrackerShell");
  return value;
}

export function TaxTrackerShell({ children, accountMenu }: { children: ReactNode; accountMenu?: ReactNode }) {
  const inputs = useSyncExternalStore(subscribeToUserInputs, getUserInputsSnapshot, getUserInputsServerSnapshot);
  const pathname = usePathname();
  const router = useRouter();
  const updateInputs = setUserInputs;
  const headerLabel = useMemo(
    () => pathname === "/" ? "A public money story" : `${money.format(inputs.income)} · ${inputs.province}`,
    [inputs, pathname],
  );

  return (
    <TaxInputsContext.Provider value={{ inputs, updateInputs }}>
      <div className="tax-app">
        <div className="app-shell">
          <header className="topbar">
            <button className="brand" onClick={() => router.push("/")} aria-label="Go to the start">
              <span className="brand-mark">$</span><span>Where Does My Tax Go?</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="header-meta max-sm:hidden">{headerLabel}</div>
              {accountMenu}
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer"><span>Where Does My Tax Go?</span><span>Estimate · fiscal year 2024–25</span></footer>
        </div>
      </div>
    </TaxInputsContext.Provider>
  );
}
