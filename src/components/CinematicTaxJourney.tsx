import type { ReactNode } from 'react'

export type TaxJourneyChapter = {
  id: 'start' | 'federal-tax' | 'programs' | 'story' | 'continue'
  eyebrow: string
  title: string
  description: string
  visualState: string
}

export type TaxJourneyData = {
  incomeLabel: string
  federalTaxLabel: string
  provinceLabel: string
  featuredProgram?: {
    name: string
    amount: string
    percent: number
    color: string
  }
}

export type CinematicTaxJourneyProps = {
  data: TaxJourneyData
  onContinue: () => void
  children?: ReactNode
}

export function CinematicTaxJourney({ data, children }: CinematicTaxJourneyProps) {
  return (
    <section className="cash-journey" aria-labelledby="cash-journey-title">
      <div className="cash-copy">
        <p className="cash-eyebrow">Start with your income · 01</p>
        <h1 id="cash-journey-title">Follow the note.</h1>
        <p className="cash-lede">See how your tax contribution moves through the country—and into the services around you.</p>
        {children}
        <div className="cash-footnote">
          <span className="cash-footnote-line" aria-hidden="true" />
          <span>Illustrative estimate · sources shown throughout</span>
        </div>
      </div>

      <CashStage data={data} />
    </section>
  )
}

function CashStage({ data }: { data: TaxJourneyData }) {
  return (
    <div className="cash-stage flow-stage" aria-labelledby="flow-stage-title">
      <p className="cash-stage-label" id="flow-stage-title">Follow the money</p>
          <div className="money-flow-scene">
            <MoneyStack incomeLabel={data.incomeLabel} />
            <MoneyStream />
            <TaxStream federalTaxLabel={data.federalTaxLabel} />
            <FederalGovernmentEndpoint />
      </div>
      <AccessibleMoneyFlowSummary federalTaxLabel={data.federalTaxLabel} provinceLabel={data.provinceLabel} />
    </div>
  )
}

function MoneyStack({ incomeLabel }: { incomeLabel: string }) {
  return <div className="money-stack" aria-hidden="true"><div className="flow-label flow-label-income">YOUR INCOME</div><div className="stack-bills"><i /><i /><i /><i /><i /><i /></div><div className="stack-face"><span>INCOME</span><b>{incomeLabel.replace(/\.00$/, '')}</b></div></div>
}

function MoneyStream() {
  return (
    <div className="money-stream" aria-hidden="true">
      <svg className="money-stream-desktop" viewBox="0 0 560 125" preserveAspectRatio="xMidYMid meet">
        <path className="stream-route" d="M4 62 C150 62 260 62 556 62" />
        <path className="stream-pulse" d="M4 62 C150 62 260 62 556 62" />
      </svg>
      <svg className="money-stream-mobile" viewBox="0 0 150 210" preserveAspectRatio="xMidYMid meet">
        <path className="stream-route" d="M75 4 C75 60 75 145 75 206" />
        <path className="stream-pulse" d="M75 4 C75 60 75 145 75 206" />
      </svg>
      <span className="stream-bill stream-bill-one">$</span>
      <span className="stream-bill stream-bill-two">$</span>
      <span className="stream-bill stream-bill-three">$</span>
    </div>
  );
}

function TaxStream({ federalTaxLabel }: { federalTaxLabel: string }) {
  return <div className="tax-stream" aria-hidden="true"><span className="tax-marker" /><div className="tax-stream-label"><span>TAX</span><strong>{federalTaxLabel}</strong><small>federal contribution</small></div></div>
}

function FederalGovernmentEndpoint() {
  return (
    <div className="federal-endpoint">
      <div className="temple-building" aria-hidden="true">
        <span className="temple-pediment" />
        <span className="temple-entablature temple-entablature-top" />
        <span className="temple-entablature temple-entablature-bottom" />
        <div className="temple-columns">
          <span /><span /><span /><span /><span /><span />
        </div>
        <span className="temple-step temple-step-top" />
        <span className="temple-step temple-step-bottom" />
      </div>
      <strong>FEDERAL GOVERNMENT</strong>
    </div>
  )
}

function AccessibleMoneyFlowSummary({ federalTaxLabel, provinceLabel }: { federalTaxLabel: string; provinceLabel: string }) {
  return <p className="flow-accessible-summary">Your estimated income enters the tax stream. The federal tax amount is {federalTaxLabel} for {provinceLabel}, and the stream continues to the federal government.</p>
}
