import type { ReactNode } from "react";
import { TaxTrackerShell } from "@/components/TaxTrackerShell";
import "./tax-journey.css";

export default function TaxTrackerLayout({ children }: { children: ReactNode }) {
  return <TaxTrackerShell>{children}</TaxTrackerShell>;
}
