/**
 * Server-side mirror of apps/mobile/src/features/learn/model/catalogue-snapshot.ts —
 * Deno edge functions can't import from the Expo app's source tree, so this is a
 * deliberate, small, hand-kept-in-sync duplicate (5 sources, 5 institutions, 4
 * products as of 2026-07-15). Keep the ids identical to the client copy: the
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
  { en: 'Bank of Jordan PLC', ar: 'بنك الأردن', status: 'no public product data reviewed yet' },
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
    'For any institution, product, or figure not listed above — including any car/vehicle financing, since none is in this catalogue yet — say plainly that verified data is not available in the catalogue, and suggest the user confirm directly with the institution. Never estimate or infer a rate for something not listed.',
  ].join('\n')
}
