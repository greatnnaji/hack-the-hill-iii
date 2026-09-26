import type { Category, SpendingItem } from './types'

const officialSource = { label: 'Government of Canada · mock source', url: 'https://www.canada.ca/en.html' }

export const receiptCategories: Category[] = [
  { id: 'seniors', name: "Seniors' pensions", amount: 1503, percent: 15.8, description: 'Income support for seniors through Old Age Security and related benefits.', drillable: false, source: officialSource },
  { id: 'health', name: 'Health transfers', amount: 894, percent: 9.4, description: 'Federal transfers that help provinces and territories fund health care.', drillable: false, source: officialSource },
  { id: 'other-transfers', name: 'Other transfers to provinces', amount: 842, percent: 8.9, description: 'Transfers that support provincial and territorial programs and priorities.', drillable: false, source: officialSource },
  { id: 'children', name: "Children's benefits", amount: 552, percent: 5.8, description: 'Benefits that support families raising children.', drillable: false, source: officialSource },
  { id: 'employment-insurance', name: 'Employment Insurance', amount: 466, percent: 4.9, description: 'Income support and employment services for eligible workers.', drillable: false, source: officialSource },
  { id: 'debt', name: 'Interest on the national debt', amount: 941, percent: 9.9, description: 'Interest paid on the Government of Canada’s outstanding debt.', drillable: false, source: officialSource },
  { id: 'defence', name: 'National defence', amount: 590, percent: 6.2, description: 'Defence operations, personnel, equipment, and support.', drillable: true, source: officialSource },
  { id: 'grants', name: 'Grants and communities', amount: 675, percent: 7.1, description: 'Grants and contributions to organizations and communities across Canada.', drillable: true, source: officialSource },
  { id: 'departments', name: 'Running federal departments', amount: 1107, percent: 11.6, description: 'The people, services, contracts, and operations that keep federal programs running.', drillable: true, source: officialSource },
  { id: 'other', name: 'Other', amount: 2430, percent: 20.4, description: 'Other federal programs and public services in the illustrative breakdown.', drillable: false, source: officialSource },
]

export const spendingItems: SpendingItem[] = [
  {
    id: 'digital-services-platform', title: 'Digital services platform modernization', summary: 'A multi-year contract to modernize shared digital services used by federal departments.', amount: 185_000_000, date: '2025-02-14', fiscal_year: '2024-25', department: 'Shared Services Canada', dept_code: 'SSC', program_code: 'SSC-OPS', source_type: 'data', level: 'federal', sources: [officialSource], image_url: '', petition: null, recipient: 'Northstar Digital Systems Inc.', originalValue: 92_000_000, currentValue: 185_000_000, amendmentCount: 2, competitive: false, ministerResponsible: 'Minister of Public Services and Procurement', ministerAsOf: '2025-03-31', contextLinks: [{ label: 'Shared Services Canada mandate', url: 'https://www.canada.ca/en/shared-services.html' }], dataAsOf: '2025-03-31', isHero: true,
  },
  {
    id: 'community-housing-grant', title: 'Community housing retrofit grant', summary: 'Funding to improve energy efficiency and accessibility in community housing.', amount: 48_500_000, date: '2024-11-06', fiscal_year: '2024-25', department: 'Canada Mortgage and Housing Corporation', dept_code: 'CMHC', program_code: 'CH-RETROFIT', source_type: 'data', level: 'federal', sources: [officialSource], image_url: '', petition: null, recipient: 'Neighbourhood Housing Alliance', originalValue: 48_500_000, currentValue: 48_500_000, amendmentCount: 0, competitive: true, ministerResponsible: 'Minister of Housing, Infrastructure and Communities', ministerAsOf: '2025-03-31', contextLinks: [{ label: 'Housing programs', url: 'https://www.canada.ca/en/services/housing.html' }], dataAsOf: '2025-03-31', isHero: true,
  },
  {
    id: 'coastal-monitoring', title: 'Coastal monitoring and response equipment', summary: 'Equipment and support for monitoring coastal conditions and coordinating emergency response.', amount: 31_200_000, date: '2024-08-19', fiscal_year: '2024-25', department: 'Department of National Defence', dept_code: 'DND', program_code: 'DND-MARINE', source_type: 'data', level: 'federal', sources: [officialSource], image_url: '', petition: { number: 'e-0001', title: 'Support transparent reporting for major federal procurements', signatures: 1285, closes: '2025-12-31', url: 'https://petitions.ourcommons.ca/' }, recipient: 'Harbourline Technologies Ltd.', originalValue: 31_200_000, currentValue: 31_200_000, amendmentCount: 0, competitive: true, ministerResponsible: 'Minister of National Defence', ministerAsOf: '2025-03-31', contextLinks: [{ label: 'National Defence reports', url: 'https://www.canada.ca/en/department-national-defence/corporate/reports-publications.html' }], dataAsOf: '2025-03-31', isHero: true,
  },
  {
    id: 'northern-community-grant', title: 'Northern community resilience fund', summary: 'A contribution supporting local resilience planning and community-led infrastructure work.', amount: 18_750_000, date: '2024-06-28', fiscal_year: '2024-25', department: 'Crown-Indigenous Relations and Northern Affairs Canada', dept_code: 'CIRNAC', program_code: 'NCRF', source_type: 'data', level: 'federal', sources: [officialSource], image_url: '', petition: null, recipient: 'Northern Communities Partnership', originalValue: 18_750_000, currentValue: 18_750_000, amendmentCount: 0, competitive: true, ministerResponsible: 'Minister of Crown-Indigenous Relations', ministerAsOf: '2025-03-31', contextLinks: [], dataAsOf: '2025-03-31', isHero: false,
  },
  {
    id: 'public-health-research', title: 'Public health research support', summary: 'Research funding for community health data and prevention programs.', amount: 12_400_000, date: '2024-05-21', fiscal_year: '2024-25', department: 'Public Health Agency of Canada', dept_code: 'PHAC', program_code: 'PHAC-RES', source_type: 'data', level: 'federal', sources: [officialSource], image_url: '', petition: null, recipient: 'Canadian Health Research Network', originalValue: 12_400_000, currentValue: 12_400_000, amendmentCount: 0, competitive: true, ministerResponsible: 'Minister of Health', ministerAsOf: '2025-03-31', contextLinks: [], dataAsOf: '2025-03-31', isHero: false,
  },
]

export const categoryById = (id: string) => receiptCategories.find((category) => category.id === id)
export const spendingById = (id: string) => spendingItems.find((item) => item.id === id)
