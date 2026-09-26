import { categoryById, receiptCategories, spendingById, spendingItems } from '../shared/fixtures'
import type { SpendingItem, UserInputs } from '../shared/types'

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const federalTax = (income: number) => Math.round(9510 * (income / 75_000))
const totalFederalSpending = 1_000_000_000_000
const shareOf = (tax: number, amount: number) => cents.format(tax * (amount / totalFederalSpending))
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))

export function ReceiptScreen({ inputs, navigate }: { inputs: UserInputs; navigate: (path: string) => void }) {
  const tax = federalTax(inputs.income)
  const rows = receiptCategories.map((category) => ({ ...category, personal: Math.round(tax * category.percent / 100) }))
  const operationalPercent = rows.filter((row) => row.id === 'departments' || row.id === 'defence').reduce((sum, row) => sum + row.percent, 0)

  return (
    <section className="tracker-page receipt-page" aria-labelledby="receipt-title">
      <div className="tracker-heading">
        <div><p className="screen-kicker">02 · YOUR FEDERAL RECEIPT</p><h1 id="receipt-title">Here is where<br />your money goes.</h1></div>
        <button className="text-action" onClick={() => navigate('/')}>Edit inputs ↗</button>
      </div>
      <div className="receipt-layout">
        <article className="tax-receipt">
          <div className="receipt-header"><span>WHERE DOES MY TAX GO?</span><span>2024–25</span></div>
          <div className="receipt-rule" />
          <p className="receipt-small">ESTIMATED FEDERAL INCOME TAX</p>
          <strong className="receipt-total">{money.format(tax)}</strong>
          <p className="receipt-subtitle">Based on {money.format(inputs.income)} income · {inputs.province}</p>
          <div className="receipt-rule receipt-rule-dashed" />
          <div className="receipt-lines">{rows.map((row, index) => <div className="receipt-line" key={row.id} style={{ '--line-delay': `${index * 60}ms` } as React.CSSProperties}><span>{row.name}</span><strong>{money.format(row.personal)}</strong><button onClick={() => row.drillable && navigate(`/category/${row.id}`)} disabled={!row.drillable} aria-label={row.drillable ? `Explore ${row.name}` : `${row.name} information`}>{row.drillable ? '↗' : '·'}</button></div>)}</div>
          <div className="receipt-rule" />
          <p className="receipt-method">Estimate. Your federal income tax, split in the same proportions as total federal spending.</p>
          <div className="receipt-footer"><span>DATA: FISCAL YEAR 2024–25</span><a href="https://www.canada.ca/en.html" target="_blank" rel="noreferrer">OFFICIAL SOURCE ↗</a></div>
        </article>
        <aside className="receipt-insight">
          <p className="section-label">A closer look</p>
          <div className="receipt-stat"><strong>{operationalPercent.toFixed(1)}%</strong><span>supports departments and defence—the part of the federal budget where contracts appear.</span></div>
          <div className="receipt-bars">{rows.slice(0, 6).map((row) => <div key={row.id} className="mini-bar"><span>{row.name}</span><i><b style={{ width: `${row.percent * 4.3}%` }} /></i><em>{row.percent}%</em></div>)}</div>
          <p className="source-note">Mock values for the visual phase. Each line will connect to the official Public Accounts data source when the API is available.</p>
        </aside>
      </div>
    </section>
  )
}

export function CategoryScreen({ categoryId, inputs, navigate }: { categoryId: string; inputs: UserInputs; navigate: (path: string) => void }) {
  const category = categoryById(categoryId) ?? receiptCategories.find((item) => item.drillable)!
  const items = spendingItems.filter((item) => categoryFor(item) === category.id).sort((a, b) => b.amount - a.amount)
  const tax = federalTax(inputs.income)
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
  const tax = federalTax(inputs.income)
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
