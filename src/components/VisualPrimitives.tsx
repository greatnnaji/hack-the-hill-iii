import type { ReactNode } from 'react'

type TaxTotalProps = { total: string; rate: string; federal: string; provincial: string; province: string }
type CategoryBarProps = { name: string; amount: string; percent: number; color: string }

export function TaxTotal({ total, rate, federal, provincial, province }: TaxTotalProps) {
  return (
    <div className="tax-total-panel">
      <p className="panel-label">YOUR ESTIMATED TOTAL INCOME TAX</p>
      <strong>{total}</strong>
      <div className="rate-line"><span>Effective rate</span><b>{rate}</b></div>
      <div className="tax-split"><span>Federal <b>{federal}</b></span><span>Provincial ({province}) <b>{provincial}</b></span></div>
    </div>
  )
}

export function CategoryBar({ name, amount, percent, color }: CategoryBarProps) {
  return (
    <div className="breakdown-row">
      <div className="breakdown-label"><span>{name}</span><strong>{amount}</strong></div>
      <div className="bar-track"><span style={{ width: `${Math.max(percent, 2)}%`, background: color }} /></div>
      <span className="breakdown-percent">{percent}%</span>
    </div>
  )
}

export function SourceLabel({ children }: { children: ReactNode }) {
  return <span className="source-label"><i />{children}</span>
}

export function FeaturedStory() {
  return (
    <aside className="featured-story">
      <div className="featured-story-top"><span className="story-number">03</span><SourceLabel>ILLUSTRATIVE STORY</SourceLabel></div>
      <p className="featured-story-eyebrow">A closer look at one line</p>
      <h3>Government spending becomes a story you can understand.</h3>
      <p>Explore the amount, the department, the source, and your estimated share — in that order.</p>
      <button className="story-link">Browse spending stories <span aria-hidden="true">→</span></button>
    </aside>
  )
}
