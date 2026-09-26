import { breakdown, yourShare } from '../shared/breakdown'
import { categoryById, receiptCategories, spendingById, spendingItems } from '../shared/fixtures'
import { howWeCalculate } from '../shared/howWeCalculate'
import { estimateTax } from '../shared/tax'
import type { SpendingItem, UserInputs } from '../shared/types'

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const federalTax = (inputs: UserInputs) => estimateTax(inputs.income, inputs.province).federal
const shareOf = (tax: number, amount: number) => cents.format(yourShare(tax, amount))
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))

export function ReceiptScreen({ inputs, navigate }: { inputs: UserInputs; navigate: (path: string) => void }) {
  const tax = federalTax(inputs)
  // With no federal tax to split, show how every $100 of federal spending is split instead.
  const perHundred = tax === 0
  const base = perHundred ? 100 : tax
  const rows = breakdown.items.map((item) => ({ ...item, personal: yourShare(base, item.amount) }))
  const programs = rows.slice(0, -1)
  const topPercent = (programs.reduce((sum, row) => sum + row.amount, 0) / breakdown.total_federal_spending) * 100
  const biggestPercent = Math.max(...programs.map((row) => row.percent))

  return (
    <section className="tracker-page receipt-page" aria-labelledby="receipt-title">
      <div className="tracker-heading">
        <div><p className="screen-kicker">02 · YOUR FEDERAL RECEIPT</p><h1 id="receipt-title">Here is where<br />your money goes.</h1></div>
        <button className="text-action" onClick={() => navigate('/')}>Edit inputs ↗</button>
      </div>
      <div className="receipt-layout">
        <article className="tax-receipt">
          <div className="receipt-header"><span>WHERE DOES MY TAX GO?</span><span>{breakdown.fiscal_year.replace('-', '–')}</span></div>
          <div className="receipt-rule" />
          <p className="receipt-small">{perHundred ? 'HOW EVERY $100 OF FEDERAL SPENDING IS SPLIT' : 'ESTIMATED FEDERAL INCOME TAX'}</p>
          <strong className="receipt-total">{money.format(base)}</strong>
          <p className="receipt-subtitle">{perHundred ? `No federal income tax on ${money.format(inputs.income)} income · ${inputs.province}` : `Based on ${money.format(inputs.income)} income · ${inputs.province}`}</p>
          <div className="receipt-rule receipt-rule-dashed" />
          <div className="receipt-lines">{rows.map((row, index) => <div className="receipt-line" key={row.name} style={{ '--line-delay': `${index * 60}ms` } as React.CSSProperties}><span title={row.official_name || undefined}>{row.name}</span><strong>{money.format(row.personal)}</strong><span aria-hidden="true">·</span></div>)}</div>
          <div className="receipt-rule" />
          <p className="receipt-method">Estimate. Your federal income tax, split in the same proportions as total federal spending.</p>
          <div className="receipt-footer"><span>DATA: FISCAL YEAR {breakdown.fiscal_year.replace('-', '–')}</span><a href={breakdown.source.url} target="_blank" rel="noreferrer">OFFICIAL SOURCE ↗</a></div>
        </article>
        <aside className="receipt-insight">
          <p className="section-label">A closer look</p>
          <div className="receipt-stat"><strong>{topPercent.toFixed(1)}%</strong><span>goes to just {programs.length} of the {breakdown.program_count.toLocaleString('en-CA')} federal programs.</span></div>
          <div className="receipt-bars">{programs.slice(0, 6).map((row) => <div key={row.name} className="mini-bar"><span>{row.name}</span><i><b style={{ width: `${(row.percent / biggestPercent) * 100}%` }} /></i><em>{row.percent}%</em></div>)}</div>
          <button className="text-action receipt-explore" onClick={() => navigate(`/category/${categoryOptions()[0].id}`)}>Browse spending records ↗</button>
          <details className="how-we-calculate">
            <summary>How we calculate</summary>
            {howWeCalculate.map((section) => <section key={section.title}><h3>{section.title}</h3>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</section>)}
          </details>
          <p className="source-note">Source: {breakdown.source.label}, actual spending for fiscal year {breakdown.fiscal_year.replace('-', '–')}. Tax estimate uses Canada Revenue Agency 2024 rates.</p>
        </aside>
      </div>
    </section>
  )
}

export function CategoryScreen({ categoryId, inputs, navigate }: { categoryId: string; inputs: UserInputs; navigate: (path: string) => void }) {
  const category = categoryById(categoryId) ?? receiptCategories.find((item) => item.drillable)!
  const items = spendingItems.filter((item) => categoryFor(item) === category.id).sort((a, b) => b.amount - a.amount)
  const tax = federalTax(inputs)
  return (
    <section className="tracker-page category-page" aria-labelledby="category-title">
      <button className="back-action" onClick={() => navigate('/receipt')}>← Back to receipt</button>
      <p className="screen-kicker">03 · CATEGORY EXPLORER</p>
      <h1 id="category-title">{category.name}.</h1>
      <p className="category-intro">{category.description} These are illustrative spending records, ordered by amount.</p>
      <div className="category-meta"><span>{category.percent}% of the federal breakdown</span><a href={category.source.url} target="_blank" rel="noreferrer">Source: {category.source.label} ↗</a></div>
      <div className="decision-list">{items.map((item) => <DecisionCard key={item.id} item={item} tax={tax} navigate={navigate} />)}</div>
      {!items.length && <div className="empty-state"><strong>This category is shown as a summary.</strong><p>Detailed spending records will appear here when the category data is connected.</p><a href={category.source.url} target="_blank" rel="noreferrer">Read the official source ↗</a></div>}
    </section>
  )
}

function DecisionCard({ item, tax, navigate }: { item: SpendingItem; tax: number; navigate: (path: string) => void }) {
  return <article className="decision-card"><div className="decision-card-top"><span className="source-dot">FEDERAL RECORD</span><span>{item.fiscal_year}</span></div><button className="decision-card-link" onClick={() => navigate(`/decision/${item.id}`)}><h2>{item.title}</h2><span className="decision-arrow">↗</span></button><p>{item.summary}</p><div className="decision-facts"><span><b>Recipient</b>{item.recipient}</span><span><b>Amount</b>{item.currentValue !== item.originalValue ? 'Up to ' : ''}{money.format(item.currentValue)}</span><span><b>Your share</b>{shareOf(tax, item.amount)}</span></div><div className="fact-badges">{item.competitive === false && <span>Awarded without competition</span>}{item.amendmentCount > 0 && <span>Cost grew {Math.round(item.currentValue / item.originalValue)}×</span>}</div></article>
}

export function DecisionScreen({ itemId, inputs, navigate }: { itemId: string; inputs: UserInputs; navigate: (path: string) => void }) {
  const item = spendingById(itemId) ?? spendingItems[0]
  const tax = federalTax(inputs)
  const growth = Math.round((item.currentValue / item.originalValue - 1) * 100)
  return (
    <section className="tracker-page detail-page" aria-labelledby="decision-title">
      <button className="back-action" onClick={() => navigate(`/category/${categoryFor(item)}`)}>← Back to category</button>
      <p className="screen-kicker">04 · SPENDING DECISION</p>
      <div className="detail-hero"><div><h1 id="decision-title">{item.title}</h1><p className="detail-recipient">Recipient: {item.recipient}</p></div><span className="detail-stamp">FEDERAL<br />RECORD</span></div>
      <div className="detail-facts"><span><b>Department</b>{item.department}</span><span><b>Date</b>{dateLabel(item.date)}</span><span><b>Amount</b>{item.currentValue !== item.originalValue ? `Up to ${money.format(item.currentValue)}` : money.format(item.currentValue)}</span></div>
      <section className="your-share"><p className="section-label">How this relates to you</p><strong>{shareOf(tax, item.amount)}</strong><p>Your estimated share of this spending item, based on your federal tax and the total federal spending pool for {item.fiscal_year}.</p></section>
      <div className="fact-badges detail-badges">{item.competitive === false && <span>Awarded without competition</span>}{item.amendmentCount > 0 && <span>Cost grew {Math.round(item.currentValue / item.originalValue)}× (+{growth}%)</span>}</div>
      <section className="detail-section"><p className="section-label">Plain-language summary</p><h2>What the record says</h2><p>{item.summary}</p><p className="ai-disclosure">AI summary — check the original record before drawing conclusions.</p></section>
      <section className="detail-section responsibility"><p className="section-label">Who is responsible</p><h2>{item.department}</h2><p>{item.ministerResponsible}</p><small>Responsible as of {dateLabel(item.ministerAsOf)}</small></section>
      {item.contextLinks.length > 0 && <section className="detail-section"><p className="section-label">Context</p><div className="context-links">{item.contextLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div></section>}
      <section className="civic-placeholder"><p className="section-label">Civic action</p><h2>Questions and actions coming soon.</h2><p>This spending page will later connect to factual questions and official civic pathways.</p></section>
      <footer className="detail-source"><span>DATA AS OF {item.dataAsOf}</span><a href={item.sources[0].url} target="_blank" rel="noreferrer">VIEW ORIGINAL RECORD ↗</a></footer>
    </section>
  )
}

function categoryFor(item: SpendingItem) {
  if (item.department === 'Department of National Defence') return 'defence'
  if (item.department.includes('Housing') || item.recipient.includes('Housing')) return 'grants'
  return 'departments'
}

export function categoryOptions() { return receiptCategories.filter((category) => category.drillable) }
