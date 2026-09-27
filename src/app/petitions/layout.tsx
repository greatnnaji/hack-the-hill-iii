import type { Metadata } from "next";
import { AccountMenu } from "@/components/AccountMenu";
import { TaxTrackerShell } from "@/components/TaxTrackerShell";
import "../(tracker)/tax-journey.css";

export const metadata: Metadata = { title: "Petitions · wheredoesmytaxgo" };

export default function PetitionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <TaxTrackerShell accountMenu={<AccountMenu />} childrenAreMain>
      <div className="campaign-route-shell">{children}</div>
    </TaxTrackerShell>
  );
}
