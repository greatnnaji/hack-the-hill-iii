// 2024 tax year estimate. Every number here is sourced in VERIFIED_SOURCES.md.
// Assumes all income is employment income and ignores credits other than the ones below.

type Bracket = { upTo: number; rate: number }

export type TaxEstimate = { federal: number; provincial: number; total: number; effectiveRate: number }

type Payroll = { pensionDeduction: number; payrollCredits: number }

type ProvinceRules = {
  brackets: Bracket[]
  basicPersonalAmount: number | ((netIncome: number) => number)
  claimsPayrollCredits: boolean // false for Quebec, which gives no provincial credit for QPP/EI/QPIP
  claimsEmploymentAmount?: boolean // only Yukon mirrors the federal Canada employment amount
  adjust?: (basicTax: number, taxable: number) => number // surtaxes, premiums and low-income reductions
}

const federalBrackets: Bracket[] = [
  { upTo: 55_867, rate: 0.15 },
  { upTo: 111_733, rate: 0.205 },
  { upTo: 173_205, rate: 0.26 },
  { upTo: 246_752, rate: 0.29 },
  { upTo: Infinity, rate: 0.33 },
]

// The federal basic personal amount shrinks from max to min between these two incomes.
const federalBpa = { max: 15_705, min: 14_156, phaseStart: 173_205, phaseEnd: 246_752 }
const canadaEmploymentAmount = 1_433
const quebecAbatement = 0.165 // Quebec residents get 16.5% off basic federal tax

// Pension is charged on earnings between the exemption and the YMPE; the second additional part between the YMPE and the YAMPE.
// The base part becomes a credit, the first and second additional parts come off income.
const cpp = { exemption: 3_500, ympe: 68_500, yampe: 73_200, baseRate: 0.0495, firstAdditionalRate: 0.01, secondAdditionalRate: 0.04 }
const qpp = { ...cpp, baseRate: 0.054 }
const ei = { rate: 0.0166, quebecRate: 0.0132, maxInsurable: 63_200 }
const qpip = { rate: 0.00494, maxInsurable: 94_000 }

/**
 * Purpose:
 *	Keep a number inside a range.
 *
 * Args:
 *	- value: the number to limit
 *	- min: the lowest allowed value
 *	- max: the highest allowed value
 *
 * Returns:
 *	number: value, raised to min or lowered to max if it falls outside the range
 */
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Purpose:
 *	Apply progressive brackets, where each rate only taxes the slice of income inside its bracket.
 *
 * Args:
 *	- income: taxable income in dollars
 *	- brackets: brackets sorted from lowest to highest, the last one ending at Infinity
 *
 * Returns:
 *	number: tax in dollars before any credits
 */
function taxFromBrackets(income: number, brackets: Bracket[]) {
  let tax = 0
  let lower = 0
  for (const { upTo, rate } of brackets) {
    tax += Math.max(0, Math.min(income, upTo) - lower) * rate
    lower = upTo
  }
  return tax
}

/**
 * Purpose:
 *	Work out the pension (CPP or QPP), EI and QPIP an employee pays, split by how each one lowers income tax.
 *
 * Args:
 *	- income: yearly employment income in dollars
 *	- province: two-letter province or territory code; 'QC' switches to QPP, the lower EI rate and QPIP
 *
 * Returns:
 *	Payroll: pensionDeduction (additional pension parts, come off income) and payrollCredits (base pension + EI + QPIP, become credits)
 */
function payrollContributions(income: number, province: string): Payroll {
  const inQuebec = province === 'QC'
  const pension = inQuebec ? qpp : cpp
  const pensionable = clamp(income, pension.exemption, pension.ympe) - pension.exemption
  const eiPremium = Math.min(income, ei.maxInsurable) * (inQuebec ? ei.quebecRate : ei.rate)
  const qpipPremium = inQuebec ? Math.min(income, qpip.maxInsurable) * qpip.rate : 0
  return {
    pensionDeduction: pensionable * pension.firstAdditionalRate + (clamp(income, pension.ympe, pension.yampe) - pension.ympe) * pension.secondAdditionalRate,
    payrollCredits: pensionable * pension.baseRate + eiPremium + qpipPremium,
  }
}

/**
 * Purpose:
 *	Get the federal basic personal amount, which shrinks for high incomes. Yukon uses the same amount.
 *
 * Args:
 *	- income: net income in dollars (after the CPP/QPP deduction), which is what the phase-out is based on
 *
 * Returns:
 *	number: the basic personal amount in dollars, between 14,156 and 15,705
 */
function federalBasicPersonalAmount(income: number) {
  const phase = clamp((income - federalBpa.phaseStart) / (federalBpa.phaseEnd - federalBpa.phaseStart), 0, 1)
  return federalBpa.max - (federalBpa.max - federalBpa.min) * phase
}

/**
 * Purpose:
 *	Get the Nova Scotia basic personal amount, which is $3,000 higher for incomes up to $25,000 and phases down to $8,481 by $75,000.
 *
 * Args:
 *	- income: net income in dollars (after the CPP/QPP deduction), which is what the phase-out is based on
 *
 * Returns:
 *	number: the basic personal amount in dollars, between 8,481 and 11,481
 */
function novaScotiaBasicPersonalAmount(income: number) {
  return 11_481 - clamp(income - 25_000, 0, 50_000) * 0.06
}

/**
 * Purpose:
 *	Add Ontario's surtax and health premium, then subtract the Ontario low-income tax reduction.
 *
 * Args:
 *	- basicTax: Ontario tax after credits, before surtax
 *	- taxable: taxable income in dollars
 *
 * Returns:
 *	number: Ontario tax including surtax, reduction and health premium
 */
function ontarioAdjustments(basicTax: number, taxable: number) {
  const surtax = 0.2 * Math.max(0, basicTax - 5_554) + 0.36 * Math.max(0, basicTax - 7_108)
  const withSurtax = basicTax + surtax
  const reduction = Math.min(withSurtax, Math.max(0, 2 * 286 - withSurtax))
  return withSurtax - reduction + ontarioHealthPremium(taxable)
}

/**
 * Purpose:
 *	Compute the Ontario Health Premium, which steps up with income to a maximum of $900.
 *
 * Args:
 *	- taxable: taxable income in dollars
 *
 * Returns:
 *	number: the premium in dollars, between 0 and 900
 */
function ontarioHealthPremium(taxable: number) {
  if (taxable <= 20_000) return 0
  if (taxable <= 36_000) return Math.min(300, 0.06 * (taxable - 20_000))
  if (taxable <= 48_000) return Math.min(450, 300 + 0.06 * (taxable - 36_000))
  if (taxable <= 72_000) return Math.min(600, 450 + 0.25 * (taxable - 48_000))
  if (taxable <= 200_000) return Math.min(750, 600 + 0.25 * (taxable - 72_000))
  return Math.min(900, 750 + 0.25 * (taxable - 200_000))
}

/**
 * Purpose:
 *	Subtract the British Columbia low-income tax reduction, worth up to $547 and gone by $39,703.
 *
 * Args:
 *	- basicTax: BC tax after credits
 *	- taxable: taxable income in dollars
 *
 * Returns:
 *	number: BC tax after the reduction, never below 0
 */
function britishColumbiaAdjustments(basicTax: number, taxable: number) {
  const reduction = Math.max(0, 547 - Math.max(0, taxable - 24_338) * 0.0356)
  return Math.max(0, basicTax - reduction)
}

export const provinces: Record<string, ProvinceRules> = {
  NL: { basicPersonalAmount: 10_818, claimsPayrollCredits: true, brackets: [{ upTo: 43_198, rate: 0.087 }, { upTo: 86_395, rate: 0.145 }, { upTo: 154_244, rate: 0.158 }, { upTo: 215_943, rate: 0.178 }, { upTo: 275_870, rate: 0.198 }, { upTo: 551_739, rate: 0.208 }, { upTo: 1_103_478, rate: 0.213 }, { upTo: Infinity, rate: 0.218 }] },
  PE: { basicPersonalAmount: 13_500, claimsPayrollCredits: true, brackets: [{ upTo: 32_656, rate: 0.0965 }, { upTo: 64_313, rate: 0.1363 }, { upTo: 105_000, rate: 0.1665 }, { upTo: 140_000, rate: 0.18 }, { upTo: Infinity, rate: 0.1875 }] },
  NS: { basicPersonalAmount: novaScotiaBasicPersonalAmount, claimsPayrollCredits: true, brackets: [{ upTo: 29_590, rate: 0.0879 }, { upTo: 59_180, rate: 0.1495 }, { upTo: 93_000, rate: 0.1667 }, { upTo: 150_000, rate: 0.175 }, { upTo: Infinity, rate: 0.21 }] },
  NB: { basicPersonalAmount: 13_044, claimsPayrollCredits: true, brackets: [{ upTo: 49_958, rate: 0.094 }, { upTo: 99_916, rate: 0.14 }, { upTo: 185_064, rate: 0.16 }, { upTo: Infinity, rate: 0.195 }] },
  QC: { basicPersonalAmount: 18_056, claimsPayrollCredits: false, brackets: [{ upTo: 51_780, rate: 0.14 }, { upTo: 103_545, rate: 0.19 }, { upTo: 126_000, rate: 0.24 }, { upTo: Infinity, rate: 0.2575 }] },
  ON: { basicPersonalAmount: 12_399, claimsPayrollCredits: true, adjust: ontarioAdjustments, brackets: [{ upTo: 51_446, rate: 0.0505 }, { upTo: 102_894, rate: 0.0915 }, { upTo: 150_000, rate: 0.1116 }, { upTo: 220_000, rate: 0.1216 }, { upTo: Infinity, rate: 0.1316 }] },
  MB: { basicPersonalAmount: 15_780, claimsPayrollCredits: true, brackets: [{ upTo: 47_000, rate: 0.108 }, { upTo: 100_000, rate: 0.1275 }, { upTo: Infinity, rate: 0.174 }] },
  SK: { basicPersonalAmount: 18_491, claimsPayrollCredits: true, brackets: [{ upTo: 52_057, rate: 0.105 }, { upTo: 148_734, rate: 0.125 }, { upTo: Infinity, rate: 0.145 }] },
  AB: { basicPersonalAmount: 21_885, claimsPayrollCredits: true, brackets: [{ upTo: 148_269, rate: 0.10 }, { upTo: 177_922, rate: 0.12 }, { upTo: 237_230, rate: 0.13 }, { upTo: 355_845, rate: 0.14 }, { upTo: Infinity, rate: 0.15 }] },
  BC: { basicPersonalAmount: 12_580, claimsPayrollCredits: true, adjust: britishColumbiaAdjustments, brackets: [{ upTo: 47_937, rate: 0.0506 }, { upTo: 95_875, rate: 0.077 }, { upTo: 110_076, rate: 0.105 }, { upTo: 133_664, rate: 0.1229 }, { upTo: 181_232, rate: 0.147 }, { upTo: 252_752, rate: 0.168 }, { upTo: Infinity, rate: 0.205 }] },
  YT: { basicPersonalAmount: federalBasicPersonalAmount, claimsPayrollCredits: true, claimsEmploymentAmount: true, brackets: [{ upTo: 55_867, rate: 0.064 }, { upTo: 111_733, rate: 0.09 }, { upTo: 173_205, rate: 0.109 }, { upTo: 500_000, rate: 0.128 }, { upTo: Infinity, rate: 0.15 }] },
  NT: { basicPersonalAmount: 17_373, claimsPayrollCredits: true, brackets: [{ upTo: 50_597, rate: 0.059 }, { upTo: 101_198, rate: 0.086 }, { upTo: 164_525, rate: 0.122 }, { upTo: Infinity, rate: 0.1405 }] },
  NU: { basicPersonalAmount: 18_767, claimsPayrollCredits: true, brackets: [{ upTo: 53_268, rate: 0.04 }, { upTo: 106_537, rate: 0.07 }, { upTo: 173_205, rate: 0.09 }, { upTo: Infinity, rate: 0.115 }] },
}

/**
 * Purpose:
 *	Estimate 2024 federal and provincial income tax for an employee. Runs in the browser so income never leaves the device.
 *
 * Args:
 *	- income: yearly employment income in dollars
 *	- province: two-letter province or territory code, e.g. 'ON'
 *
 * Returns:
 *	TaxEstimate: federal, provincial and total tax in whole dollars, and effectiveRate as total ÷ income (0.17 = 17%)
 */
export function estimateTax(income: number, province: string): TaxEstimate {
  const rules = provinces[province]
  if (!rules) throw new Error(`Unknown province or territory "${province}"`)
  if (!(income > 0)) return { federal: 0, provincial: 0, total: 0, effectiveRate: 0 }

  const { pensionDeduction, payrollCredits } = payrollContributions(income, province)
  const taxable = income - pensionDeduction
  const employmentAmount = Math.min(canadaEmploymentAmount, income)

  // Non-refundable credits are worth the lowest bracket rate times the credit amount.
  const federalCredits = federalBrackets[0].rate * (federalBasicPersonalAmount(taxable) + employmentAmount + payrollCredits)
  const basicFederal = Math.max(0, taxFromBrackets(taxable, federalBrackets) - federalCredits)
  const federal = province === 'QC' ? basicFederal * (1 - quebecAbatement) : basicFederal

  const bpa = typeof rules.basicPersonalAmount === 'function' ? rules.basicPersonalAmount(taxable) : rules.basicPersonalAmount
  const creditBase = bpa + (rules.claimsPayrollCredits ? payrollCredits : 0) + (rules.claimsEmploymentAmount ? employmentAmount : 0)
  const basicProvincial = Math.max(0, taxFromBrackets(taxable, rules.brackets) - rules.brackets[0].rate * creditBase)
  const provincial = rules.adjust ? rules.adjust(basicProvincial, taxable) : basicProvincial

  const total = federal + provincial
  return { federal: Math.round(federal), provincial: Math.round(provincial), total: Math.round(total), effectiveRate: total / income }
}
