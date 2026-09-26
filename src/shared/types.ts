export type Source = { label: string; url: string };

export type UserInputs = {
  income: number;
  province: string;
  postalCode: string;
  incomeIsTypical: boolean;
};

export type SpendingItem = {
  id: string;
  title: string;
  summary: string;
  amount: number;
  date: string;
  fiscal_year: string;
  department: string;
  dept_code: string;
  program_code: string;
  source_type: "data" | "news";
  level: "federal";
  sources: Source[];
  image_url: string | null;
  petition: { number: string; title: string; signatures: number; closes: string; url: string } | null;
  recipient: string;
  originalValue: number;
  currentValue: number;
  amendmentCount: number;
  competitive: boolean | null;
  ministerResponsible: string;
  ministerAsOf: string;
  contextLinks: Source[];
  dataAsOf: string;
  isHero: boolean;
};

export type Category = {
  id: string;
  name: string;
  amount: number;
  percent: number;
  description: string;
  drillable: boolean;
  source: Source;
};
