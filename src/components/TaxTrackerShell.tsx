"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
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

export function TaxTrackerShell({ children, accountMenu, childrenAreMain = false }: { children: ReactNode; accountMenu?: ReactNode; childrenAreMain?: boolean }) {
  const inputs = useSyncExternalStore(subscribeToUserInputs, getUserInputsSnapshot, getUserInputsServerSnapshot);
  const pathname = usePathname();
  const router = useRouter();
  const updateInputs = setUserInputs;
  const headerLabel = useMemo(
    () => pathname === "/" ? "A public money story" : `${money.format(inputs.income)} · ${inputs.province}`,
    [inputs, pathname],
  );
  const navigation = [
    { href: "/", label: "Start", active: pathname === "/" },
    { href: "/receipt", label: "Receipt", active: pathname === "/receipt" },
    { href: "/spending", label: "Stories", active: pathname.startsWith("/spending") },
    { href: "/campaigns", label: "Campaigns", active: pathname.startsWith("/campaigns") },
    { href: "/petitions", label: "Petitions", active: pathname.startsWith("/petitions") },
  ];

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
          <nav className="site-nav" aria-label="Primary navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className={`site-nav-link${item.active ? " active" : ""}`} aria-current={item.active ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          {childrenAreMain ? children : <main>{children}</main>}
          <footer className="site-footer"><span>Where Does My Tax Go?</span><span>Estimate · fiscal year 2024–25</span></footer>
        </div>
      </div>
    </TaxInputsContext.Provider>
  );
}
