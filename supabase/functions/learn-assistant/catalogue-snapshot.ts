/**
 * Server-side mirror of apps/mobile/src/features/learn/model/catalogue-snapshot.ts —
 * Deno edge functions can't import from the Expo app's source tree, so this is a
 * deliberate, small, hand-kept-in-sync duplicate (10 sources, 7 institutions, 9
 * products as of 2026-07-18). Keep the ids identical to the client copy: the
 * client's own KNOWN_SOURCE_IDS grounding check already trusts these ids, and
 * this function's grounding check is validated against CATALOGUE_SOURCE_IDS
 * below — a mismatch here would mean the client either rejects a real citation
 * or (worse) the server would accept one the client doesn't recognize.
 *
 * This catalogue is real but thin — only what's been manually reviewed and
 * cited. The system prompt built from it must never be treated as exhaustive;
 * the instructions explicitly tell the model to say so for anything outside it.
 */

export const CATALOGUE_SOURCE_IDS = [
  'cbj-banking-guide',
  'jib-housing',
  'jib-murabaha',
  'hbtf-automated-personal',
  'hbtf-rates-2026',
  'jib-car-financing',
  'hbtf-auto-loan',
  'boj-auto-loan',
  'safwa-car-financing',
  'ahli-finance-and-go',
] as const

interface CatalogueEntry {
  readonly institutionEn: string
  readonly institutionAr: string
  readonly bankingModel: 'conventional' | 'islamic' | 'mixed'
  readonly productEn: string
  readonly productAr: string | null
  readonly category: string
  readonly structure: string
  readonly rateSummary: string
  readonly salaryTransfer: string
  readonly completeness: string
  readonly sourceId: string
  readonly sourceUrl: string
}

const CATALOGUE: readonly CatalogueEntry[] = [
  {
    institutionEn: 'Jordan Islamic Bank',
    institutionAr: 'البنك الإسلامي الأردني',
    bankingModel: 'islamic',
    productEn: 'Housing and furniture Murabaha campaign',
    productAr: 'تمويل السكن والأثاث بالمرابحة',
    category: 'housing',
    structure: 'murabaha',
    rateSummary:
      'Profit rate from 1% (published minimum only; maximum not published). Term up to 84 months.',
    salaryTransfer: 'not published',
    completeness: 'partial',
    sourceId: 'jib-housing',
    sourceUrl: 'https://www.jordanislamicbank.com/en/housing-finance',
  },
  {
    institutionEn: 'Jordan Islamic Bank',
    institutionAr: 'البنك الإسلامي الأردني',
    bankingModel: 'islamic',
    productEn: 'Murabaha for purchase',
    productAr: 'مرابحة للآمر بالشراء',
    category: 'other',
    structure: 'murabaha',
    rateSummary:
      'Rate not published on the site; the bank’s own calculator labels its results as approximate.',
    salaryTransfer: 'not published',
    completeness: 'minimal',
    sourceId: 'jib-murabaha',
    sourceUrl: 'https://www.jordanislamicbank.com/ar/loan/murabaha',
  },
  {
    institutionEn: 'Jordan Islamic Bank',
    institutionAr: 'البنك الإسلامي الأردني',
    bankingModel: 'islamic',
    productEn: 'Islamic Car Financing — new & used vehicle Murabaha',
    productAr: 'تمويل السيارات الإسلامي بالمرابحة',
    category: 'vehicle',
    structure: 'murabaha',
    rateSummary:
      'Fixed profit rate 3.33% for transferred salaries, 3.99% for non-transferred salaries, for terms up to 84 months (7 years). This is a time-limited campaign, 2026-06-21 to 2026-08-31 — confirm it is still active before quoting it. Maximum vehicle age 20 years; financing up to 100% possible; 1% execution fee; maximum debt burden 50%.',
    salaryTransfer: 'not required (rate differs by transferred vs. non-transferred salary)',
    completeness: 'partial',
    sourceId: 'jib-car-financing',
    sourceUrl: 'https://www.jordanislamicbank.com/en/my-car-financing',
  },
  {
    institutionEn: 'Housing Bank for Trade and Finance',
    institutionAr: 'بنك الإسكان للتجارة والتمويل',
    bankingModel: 'conventional',
    productEn: 'Automated Personal Loan',
    productAr: null,
    category: 'personal',
    structure: 'conventional-loan',
    rateSummary:
      'Variable interest benchmarked to the Overnight Interbank rate plus a margin that varies by customer segment (margin itself not published). Maximum amount JOD 20,000. Requires salary transfer.',
    salaryTransfer: 'required',
    completeness: 'partial',
    sourceId: 'hbtf-automated-personal',
    sourceUrl: 'https://hbtf.com/en/automated-personal-loan',
  },
  {
    institutionEn: 'Housing Bank for Trade and Finance',
    institutionAr: 'بنك الإسكان للتجارة والتمويل',
    bankingModel: 'conventional',
    productEn: 'Auto Loan',
    productAr: null,
    category: 'vehicle',
    structure: 'conventional-loan',
    rateSummary:
      'Rate not published — page states it depends on income, income source, financing ratio, and customer classification. Amount JOD 3,000–150,000, up to 100% of car value. Term 12–96 months (up to 8 years including a grace period of up to 3 months). 1% loan commission (first year only).',
    salaryTransfer: 'not published (not stated as mandatory)',
    completeness: 'partial',
    sourceId: 'hbtf-auto-loan',
    sourceUrl: 'https://hbtf.com/en/retail/loans/auto-loan',
  },
  {
    institutionEn: 'Bank of Jordan PLC',
    institutionAr: 'بنك الأردن',
    bankingModel: 'conventional',
    productEn: '50/50 Auto Loan',
    productAr: null,
    category: 'vehicle',
    structure: 'conventional-loan',
    rateSummary:
      'Rate not published. Structure: bank finances up to 50% of the car value (i.e. an implicit ~50% down payment), up to JOD 100,000, terms up to 60 months. 1% one-time processing fee. Explicitly no salary transfer or guarantor required.',
    salaryTransfer: 'not required',
    completeness: 'partial',
    sourceId: 'boj-auto-loan',
    sourceUrl: 'https://bankofjordan.com/en/loans/auto-loans',
  },
  {
    institutionEn: 'Safwa Islamic Bank',
    institutionAr: 'بنك صفوة الإسلامي',
    bankingModel: 'islamic',
    productEn: 'Cars Financing (Murabaha)',
    productAr: null,
    category: 'vehicle',
    structure: 'murabaha',
    rateSummary:
      'Page states the profit rate is fixed for the financing period but does not disclose the percentage. Amount JOD 2,000–100,000, financing up to 100% of car value, terms up to 84 months (8 years). Explicitly no salary transfer required. Car mortgage required as collateral.',
    salaryTransfer: 'not required',
    completeness: 'minimal',
    sourceId: 'safwa-car-financing',
    sourceUrl: 'https://www.safwabank.com/en/product/cars/',
  },
  {
    institutionEn: 'Jordan Ahli Bank',
    institutionAr: 'البنك الأهلي الأردني',
    bankingModel: 'conventional',
    productEn: 'Finance & Go — Auto Loan',
    productAr: null,
    category: 'vehicle',
    structure: 'conventional-loan',
    rateSummary:
      'Fixed flat rate "starting from" 3.625% (actual rate may be higher depending on the applicant). New cars up to JOD 100,000, used cars up to JOD 75,000. Term 12–96 months (up to 8 years). Salary transfer required for 100% financing of salaried employees; professionals/expatriates/self-employed can finance up to 90% without it.',
    salaryTransfer: 'required for 100% financing (salaried); optional otherwise, at a lower financing cap',
    completeness: 'partial',
    sourceId: 'ahli-finance-and-go',
    sourceUrl: 'https://ahli.com/personal/auto-loans/finance-and-go/',
  },
  {
    institutionEn: 'Arab Bank PLC',
    institutionAr: 'البنك العربي',
    bankingModel: 'conventional',
    productEn: 'Consumer financing — published details pending review',
    productAr: 'تمويل للأفراد — تفاصيل منشورة قيد المراجعة',
    category: 'personal',
    structure: 'conventional-loan',
    rateSummary: 'No published rate has been reviewed and confirmed yet.',
    salaryTransfer: 'not published',
    completeness: 'minimal',
    sourceId: 'cbj-banking-guide',
    sourceUrl: 'https://www.cbj.gov.jo/EN/Pages/Bankingsectorguide',
  },
] as const

const OTHER_KNOWN_INSTITUTIONS_NO_PRODUCT_DATA = [
  { en: 'Cairo Amman Bank', ar: 'بنك القاهرة عمان', status: 'pending review' },
] as const

/** Rendered once per request and injected into the system prompt as grounding context. */
export function renderCataloguePromptSection(): string {
  const products = CATALOGUE.map(
    (p) =>
      `- ${p.institutionEn} (${p.institutionAr}), ${p.bankingModel} bank — "${p.productEn}" ` +
      `[category: ${p.category}, structure: ${p.structure}]. ${p.rateSummary} ` +
      `Salary transfer: ${p.salaryTransfer}. Data completeness: ${p.completeness}. ` +
      `Cite as sourceId "${p.sourceId}" (${p.sourceUrl}).`,
  ).join('\n')
  const others = OTHER_KNOWN_INSTITUTIONS_NO_PRODUCT_DATA.map(
    (i) => `- ${i.en} (${i.ar}): ${i.status}.`,
  ).join('\n')
  return [
    'Verified catalogue (the ONLY institution/product facts you may state as confirmed; cite the given sourceId whenever you use one of these):',
    products,
    '',
    'Known institutions with no reviewed product data yet (name them only as existing, never invent their rates or terms):',
    others,
    '',
    'For any institution, product, or figure not listed above, say plainly that verified data is not available in the catalogue, and suggest the user confirm directly with the institution. Never estimate or infer a rate for something not listed. When a rate above is described as a time-limited campaign, mention that it may have expired and should be reconfirmed.',
  ].join('\n')
}
