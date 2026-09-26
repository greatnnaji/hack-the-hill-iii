// "How we calculate" content for the link on screen 02 (TASKS.md Raphael Task 1, Phase 3).
// Numbers come from the data modules so this text can't drift from what the app shows.

import { breakdown, TOTAL_FEDERAL_SPENDING, yourShare } from './breakdown'
import { estimateTax } from './tax'
import type { Source } from './types'

export type HowWeCalculateSection = { title: string; body: string[]; sources: Source[] }

const cra2024Rates: Source = { label: 'Canada Revenue Agency: Tax rates and income brackets (all years)', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/all-years.html' }
const cra2024Formulas: Source = { label: 'Canada Revenue Agency: Payroll Deductions Formulas, January 2024', url: 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/payroll-deductions-t4127-payroll-deductions-formulas/t4127-jan-119th-edition-effective-january-1-2024/t4127-jan-payroll-deductions-formulas-computer-programs.html' }
const annualFinancialReport: Source = { label: 'Finance Canada: Annual Financial Report 2024–2025', url: 'https://www.canada.ca/en/department-finance/services/publications/annual-financial-report/2025.html' }

/**
 * Purpose:
 *	Format a dollar amount in billions for reading, e.g. 472529869720 to "$472.5 billion".
 *
 * Args:
 *	- dollars: the amount in dollars
 *
 * Returns:
 *	string: the amount in billions with one decimal
 */
function billions(dollars: number) {
  return `$${(dollars / 1e9).toFixed(1)} billion`
}

/**
 * Purpose:
 *	Format a dollar amount to the nearest dollar, e.g. 8920 to "$8,920".
 *
 * Args:
 *	- dollars: the amount in dollars
 *
 * Returns:
 *	string: the amount with a dollar sign and thousands separators
 */
function dollars(dollars: number) {
  return `$${Math.round(dollars).toLocaleString('en-CA')}`
}

const example = { income: 75_000, province: 'ON' }
const exampleTax = estimateTax(example.income, example.province).federal
const biggest = breakdown.items[0]

export const howWeCalculate: HowWeCalculateSection[] = [
  {
    title: 'Your tax',
    body: [
      "We estimate your 2024 income tax from your income and province, using the Canada Revenue Agency's 2024 tax brackets.",
      'It assumes all of your income comes from a job, and only counts the credits every employee gets: the basic personal amount, CPP or QPP contributions, Employment Insurance premiums and the Canada employment amount. If you have other income, deductions or credits, your real tax will be different.',
      'The calculation runs on your device. Your income is never sent anywhere.',
    ],
    sources: [cra2024Rates, cra2024Formulas],
  },
  {
    title: 'Why we only use your federal tax',
    body: [
      'Federal programs are paid for by federal tax. Your provincial tax pays for provincial services like hospitals and schools, so it is not part of this breakdown.',
    ],
    sources: [],
  },
  {
    title: 'Total federal spending',
    body: [
      `The federal government spent ${billions(TOTAL_FEDERAL_SPENDING)} on its ${breakdown.program_count.toLocaleString('en-CA')} programs in ${breakdown.fiscal_year} (April ${breakdown.fiscal_year.slice(0, 4)} to March ${Number(breakdown.fiscal_year.slice(0, 4)) + 1}). This is actual spending, not the budget.`,
      `We show the ${breakdown.items.length - 1} biggest programs by name and group the rest as "All other programs." Program names are rewritten in plain English; the official program name is kept with each one.`,
    ],
    sources: [breakdown.source],
  },
  {
    title: 'Your share',
    body: [
      'Your share of any spending item = your federal tax × (the item\'s cost ÷ total federal spending).',
      `Example: with a ${dollars(example.income)} income in Ontario, your federal tax is about ${dollars(exampleTax)}. ${biggest.name} cost ${billions(biggest.amount)}, so your share is ${dollars(exampleTax)} × (${billions(biggest.amount)} ÷ ${billions(TOTAL_FEDERAL_SPENDING)}) ≈ ${dollars(yourShare(exampleTax, biggest.amount))}.`,
      'In reality, taxes go into one pot along with other revenue and borrowing. Your share is a fair way to show scale, not a record of where each of your dollars went.',
    ],
    sources: [breakdown.source],
  },
  {
    title: "What isn't included",
    body: [
      'Some federal spending is not in the program data we use, so it is not in the breakdown. The biggest are the Canada Child Benefit ($28.6 billion in 2024–25) and Employment Insurance benefits ($24.9 billion including support measures).',
      "That is why our total is lower than the government's official total expenses of $547.3 billion for 2024–25.",
    ],
    sources: [annualFinancialReport],
  },
]
