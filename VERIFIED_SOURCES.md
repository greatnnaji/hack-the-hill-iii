# Verified sources

Every number in the app comes from one of these. Checked on 2026-09-26.

## Spending data (GC InfoBase, Treasury Board of Canada Secretariat)

Dataset page: https://open.canada.ca/data/en/dataset/a35cf382-690c-4221-a971-cf0fd189a46f

Downloaded into `pipeline/data/` (gitignored, re-download with the links below):

| File | Used for | Download |
|---|---|---|
| `programs_spending.csv` | Actual spending per program per year (`expenditure` column) | https://open.canada.ca/data/dataset/a35cf382-690c-4221-a971-cf0fd189a46f/resource/55934650-3380-44d5-82c1-bb68f8cc5abb/download/programs_spending.csv |
| `programs.csv` | Program names. Join on `year` + `dept_code` + `program_code` | https://open.canada.ca/data/dataset/a35cf382-690c-4221-a971-cf0fd189a46f/resource/8d3cd22d-15b0-468a-bb75-c1e736107c45/download/programs.csv |
| `organizations.csv` | Department names. Join on `dept_code` | https://open.canada.ca/data/dataset/a35cf382-690c-4221-a971-cf0fd189a46f/resource/d9f87f7f-62f9-4baf-a803-2d8743f38e76/download/organizations.csv |

Notes:
- `year = 2024` means fiscal year April 2024 – March 2025 ("2024–25").
- Sum of `expenditure` for 2024 = **$472.5B** across 1,228 programs (built by `pipeline/build_breakdown.py`).
- "Fiscal Arrangements with Provinces and Territories" ($40.0B) = Equalization + Canada Social Transfer + Territorial Formula Financing, net of Quebec's tax-point recovery.
- CRA "Benefits" ($16.2B): which benefits it contains is **not yet verified**. It doesn't match any single CRA line (see below). Check before the pitch.
- Program structure changed in 2018; don't compare program codes across that year.

### Spending that is NOT in the GC InfoBase program data

This is why the dataset total ($472.5B) is below the government's official total expenses ($547.3B). Official 2024-25 figures:

| Item | 2024-25 | Source |
|---|---|---|
| Total federal expenses | $547.3B | Annual Financial Report 2024-25, Table 5 "Expenses" |
| Children's benefits (Canada Child Benefit) | $28.6B ($28,574M) | Annual Financial Report 2024-25, Table 5; CRA administered activities: "Canada benefit programs for children" $28,575M |
| Employment Insurance and support measures | $24.9B ($24,880M) | Annual Financial Report 2024-25, Table 5 |
| of which EI benefit payments | $23.1B | EI Monitoring and Assessment Report 2024-25 |
| Public debt charges (all interest) | $53.4B | Annual Financial Report 2024-25 (the dataset's "Market Debt" program shows $48.1B) |

Links:
- Annual Financial Report of the Government of Canada 2024-2025: https://www.canada.ca/en/department-finance/services/publications/annual-financial-report/2025.html
- EI Monitoring and Assessment Report 2024-25: https://www.canada.ca/en/employment-social-development/programs/ei/ei-list/reports/monitoring2025.html
- CRA Financial Statements, Administered Activities 2024-25: https://www.canada.ca/en/revenue-agency/corporate/about-canada-revenue-agency-cra/departmental-performance-reports/2024-25-departmental-results-report/2024-25-financial-statements/cra-fs-administered-activities.html

CRA-paid benefits in 2024-25 (same CRA statement), for checking the "Benefits" program: Canada Carbon Rebate $12,719M, Canada workers' benefit $5,242M, children's special allowances $430M, Canada dental benefit $26M.

## Tax calculation (2024 tax year, Canada Revenue Agency)

| What | Source |
|---|---|
| Federal brackets and rates, all years | https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/all-years.html |
| Basic personal amount, Canada employment amount, CPP, EI, Ontario brackets (T4032-ON, January 2024) | https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables-previous-years/t4032on-january-2024/t4032on-january-general-information.html |
| Basic personal amount explained | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-30000-basic-personal-amount.html |

2024 federal brackets (verified):

| Taxable income | Rate |
|---|---|
| $0 – $55,867 | 15% |
| $55,867 – $111,733 | 20.5% |
| $111,733 – $173,205 | 26% |
| $173,205 – $246,752 | 29% |
| over $246,752 | 33% |

2024 federal amounts (verified, T4032-ON January 2024):
- Basic personal amount: $15,705 (reduced to $14,156 for high incomes, between $173,205 and $246,752)
- Canada employment amount: $1,433
- CPP: 5.95% (base 4.95% + first additional 1%) on earnings $3,500 – $68,500; CPP2: 4% on $68,500 – $73,200
- EI: 1.66% up to $63,200 insurable earnings (max premium $1,049.12)

All provinces and territories except Quebec (verified, CRA T4127 Payroll Deductions Formulas, 119th edition, January 2024, tables 8.1 and 8.2): brackets, rates, basic personal amounts, Ontario surtax, Ontario health premium, Ontario and BC low-income tax reductions, Nova Scotia and Yukon basic personal amount rules.
https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/payroll-deductions-t4127-payroll-deductions-formulas/t4127-jan-119th-edition-effective-january-1-2024/t4127-jan-payroll-deductions-formulas-computer-programs.html
Every bracket was re-checked against the table's own "K" constants (no copy errors).

Quebec 2024:
- Brackets 14% to $51,780, 19% to $103,545, 24% to $126,000, 25.75% above; basic personal amount $18,056. Source: EY Tax Alert 2024 no. 15, https://www.ey.com/en_ca/technical/tax/tax-alerts/2024/tax-alert-2024-no-15 (Revenu Québec blocks automated fetches; official page: https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/)
- QPP 6.4% (base 5.4% + 1% first additional), EI 1.32% up to $63,200, QPIP 0.494% up to $94,000, federal abatement 16.5%. Source: CRA T4032-QC January 2024, https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables-previous-years/t4032qc-january-2024/t4032qc-january-general-information.html

Not modelled (small or situational): Quebec's deduction for workers and its other credits, low-income reductions outside ON and BC.

## Tax checks

Online 2024 calculators are gone (Wealthsimple and TaxTips now only offer 2025–2026), so the calculator is checked against CRA's own 2024 payroll tax tables:
- T4032-ON January 2024, monthly tables (claim code 1): https://www.canada.ca/content/dam/cra-arc/migration/cra-arc/tx/bsnss/tpcs/pyrll/t4032/2024/t4032on-1-12pp-24eng.pdf

| Income (≈) | Federal: ours / CRA | Ontario: ours / CRA |
|---|---|---|
| $30,108 | 1,633 / 1,634 | 1,085 / 1,085 |
| $49,884 | 4,374 / 4,375 | 2,320 / 2,321 |
| $75,000 | 8,920 / 8,958 | 4,562 / 4,579 |
| $100,140 | 14,074 / 14,112 | 7,019 / 7,040 |
| $150,456 | 26,472 / 26,521 | 15,271 / 15,305 |

Above $68,500 we are lower by exactly $188 × the marginal rate. $188 is the CPP2 contribution, which the payroll tables don't deduct but the tax return does (line 22215), so ours matches the return.
