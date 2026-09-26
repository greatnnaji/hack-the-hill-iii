import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { TaxTrackerShell } from "@/components/TaxTrackerShell";
import "./tax-journey.css";

export default function TaxTrackerLayout({ children }: { children: ReactNode }) {
  return <TaxTrackerShell accountMenu={<AccountMenu />}>{children}</TaxTrackerShell>;
}
