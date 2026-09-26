"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CinematicTaxJourney } from "@/components/CinematicTaxJourney";
import { CategoryScreen, DecisionScreen, ReceiptScreen } from "@/components/TrackerScreens";
import { useTaxInputs } from "@/components/TaxTrackerShell";
import { estimateTax } from "@/shared/tax";

type Province = { code: string; name: string };

const provinces: Province[] = [
  { code: "AB", name: "Alberta" }, { code: "BC", name: "British Columbia" }, { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" }, { code: "NL", name: "Newfoundland and Labrador" }, { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" }, { code: "NU", name: "Nunavut" }, { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" }, { code: "QC", name: "Quebec" }, { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

export function TaxLandingRoute() {
  const { inputs, updateInputs } = useTaxInputs();
  const router = useRouter();
  const [postalError, setPostalError] = useState("");

  const updateIncome = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    const next = Number(digits);
    if (Number.isFinite(next)) {
      updateInputs({ ...inputs, income: Math.min(300_000, Math.max(0, next)), incomeIsTypical: false });
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const postalCode = inputs.postalCode.trim().toUpperCase();
    if (postalCode && !/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/.test(postalCode)) {
      setPostalError("Enter a Canadian postal code, such as K1A 0B1.");
      return;
    }
    setPostalError("");
    updateInputs({ ...inputs, postalCode });
    router.push("/receipt");
  };

  return (
    <CinematicTaxJourney
      data={{ incomeLabel: money.format(inputs.income), federalTaxLabel: money.format(estimateTax(inputs.income, inputs.province).federal), provinceLabel: inputs.province }}
      onContinue={() => router.push("/receipt")}
    >
      <form className="journey-income-form" onSubmit={submit}>
        <label className="field-label" htmlFor="income">Annual income <span>(before tax)</span></label>
        <div className="money-input"><span>$</span><input id="income" inputMode="numeric" value={inputs.income === 0 ? "" : String(inputs.income)} onChange={(event) => updateIncome(event.target.value)} /></div>
        <button type="button" className="typical-income" onClick={() => updateInputs({ ...inputs, income: 75_000, incomeIsTypical: true })}>Use a typical income <span>$75,000</span></button>
        <label className="field-label" htmlFor="province">Province or territory</label>
        <div className="select-wrap"><select id="province" value={inputs.province} onChange={(event) => updateInputs({ ...inputs, province: event.target.value })}>{provinces.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><span aria-hidden="true">⌄</span></div>
        <label className="field-label" htmlFor="postal">Postal code <span>(optional)</span></label>
        <input className="postal-input" id="postal" inputMode="text" maxLength={7} placeholder="K1A 0B1" value={inputs.postalCode} onChange={(event) => updateInputs({ ...inputs, postalCode: event.target.value.toUpperCase() })} aria-describedby={postalError ? "postal-error" : undefined} />
        {postalError && <p className="field-error" id="postal-error" role="alert">{postalError}</p>}
        <button className="primary-button" type="submit">See my receipt <span aria-hidden="true">→</span></button>
        <p className="privacy-note">Your income never leaves this device. Estimates use Canada Revenue Agency 2024 tax rates and actual federal spending for 2024–25.</p>
      </form>
    </CinematicTaxJourney>
  );
}

export function TaxReceiptRoute() {
  const { inputs } = useTaxInputs();
  const router = useRouter();
  return <ReceiptScreen inputs={inputs} navigate={(path) => router.push(path)} />;
}

export function TaxCategoryRoute({ categoryId }: { categoryId: string }) {
  const { inputs } = useTaxInputs();
  const router = useRouter();
  return <CategoryScreen categoryId={categoryId} inputs={inputs} navigate={(path) => router.push(path)} />;
}

export function TaxDecisionRoute({ itemId }: { itemId: string }) {
  const { inputs } = useTaxInputs();
  const router = useRouter();
  return <DecisionScreen itemId={itemId} inputs={inputs} navigate={(path) => router.push(path)} />;
}
