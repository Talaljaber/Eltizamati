/**
 * Banks licensed to operate in Jordan (FR-AUTH — "main bank" at sign-up must
 * be picked from a fixed list, never free-typed). Includes globally-known
 * banks that hold only a small local branch presence in Jordan alongside the
 * Jordan-headquartered ones, plus Jordan's licensed digital-only banks.
 * Cross-checked against the Arabic Wikipedia list of banks operating in
 * Jordan (https://ar.wikipedia.org/wiki/قائمة_البنوك_في_الأردن) — still
 * worth a periodic refresh against the Central Bank of Jordan's own
 * register rather than treated as permanently exhaustive. The Central Bank
 * of Jordan itself is the regulator, not a retail bank, and is deliberately
 * excluded.
 */
export interface JordanBank {
  readonly id: string
  readonly name: string
  readonly nameAr: string
}

export const JORDAN_BANKS: readonly JordanBank[] = [
  { id: 'arab-bank', name: 'Arab Bank', nameAr: 'البنك العربي' },
  {
    id: 'arab-banking-corporation-jordan',
    name: 'Arab Banking Corporation (Jordan)',
    nameAr: 'المؤسسة العربية المصرفية (الأردن)',
  },
  {
    id: 'housing-bank',
    name: 'Housing Bank for Trade and Finance',
    nameAr: 'بنك الإسكان للتجارة والتمويل',
  },
  { id: 'jordan-kuwait-bank', name: 'Jordan Kuwait Bank', nameAr: 'بنك الكويت الأردني' },
  { id: 'jordan-ahli-bank', name: 'Jordan Ahli Bank', nameAr: 'البنك الأهلي الأردني' },
  { id: 'cairo-amman-bank', name: 'Cairo Amman Bank', nameAr: 'بنك القاهرة عمان' },
  { id: 'bank-of-jordan', name: 'Bank of Jordan', nameAr: 'بنك الأردن' },
  { id: 'jordan-islamic-bank', name: 'Jordan Islamic Bank', nameAr: 'البنك الإسلامي الأردني' },
  {
    id: 'islamic-international-arab-bank',
    name: 'Islamic International Arab Bank',
    nameAr: 'البنك العربي الإسلامي الدولي',
  },
  {
    id: 'capital-bank',
    name: 'Capital Bank of Jordan',
    nameAr: 'بنك المال الأردني (كابيتال بنك)',
  },
  {
    id: 'societe-generale-jordanie',
    name: 'Société Générale de Banque – Jordanie',
    nameAr: 'بنك سوسيتيه جنرال – الأردن',
  },
  {
    id: 'ajib',
    name: 'Arab Jordan Investment Bank',
    nameAr: 'بنك الاستثمارات الأردني العربي',
  },
  { id: 'invest-bank', name: 'Invest Bank', nameAr: 'بنك الاستثمار' },
  { id: 'safwa-islamic-bank', name: 'Safwa Islamic Bank', nameAr: 'بنك صفوة الإسلامي' },
  { id: 'bank-al-etihad', name: 'Bank al Etihad', nameAr: 'بنك الاتحاد' },
  { id: 'jordan-commercial-bank', name: 'Jordan Commercial Bank', nameAr: 'البنك التجاري الأردني' },
  {
    id: 'egyptian-arab-land-bank',
    name: 'Egyptian Arab Land Bank',
    nameAr: 'البنك العقاري المصري العربي',
  },
  { id: 'rafidain-bank', name: 'Rafidain Bank (Jordan branch)', nameAr: 'مصرف الرافدين' },
  {
    id: 'national-bank-of-kuwait-jordan',
    name: 'National Bank of Kuwait – Jordan',
    nameAr: 'بنك الكويت الوطني',
  },
  {
    id: 'standard-chartered-jordan',
    name: 'Standard Chartered Bank (Jordan branch)',
    nameAr: 'ستاندرد تشارترد',
  },
  { id: 'citibank-jordan', name: 'Citibank (Jordan branch)', nameAr: 'سيتي بنك' },
  { id: 'blom-bank-jordan', name: 'Blom Bank (Jordan branch)', nameAr: 'بنك بلوم' },
  { id: 'audi-bank-jordan', name: 'Audi Bank (Jordan branch)', nameAr: 'بنك عودة' },
  { id: 'al-rajhi-bank-jordan', name: 'Al Rajhi Bank (Jordan branch)', nameAr: 'مصرف الراجحي' },
  { id: 'blink', name: 'Blink (digital bank)', nameAr: 'بنك بلينك' },
  { id: 'reflect', name: 'Reflect (digital bank)', nameAr: 'ريفلكت' },
  { id: 'ila-bank', name: 'ila Bank (digital bank)', nameAr: 'إيلا' },
] as const
