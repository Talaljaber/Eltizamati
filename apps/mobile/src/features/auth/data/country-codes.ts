/**
 * Phone country-dial-code catalogue for sign-up (FR-AUTH — no user should
 * have to type their own "+962" by hand). Curated, not the full ITU list —
 * Jordan first (this app's home market), then the rest of the Middle East,
 * then major global codes with meaningful expatriate/diaspora populations in
 * the Gulf. Extend this list rather than replacing the picker if a market
 * outside this set turns out to matter.
 */
export interface CountryCode {
  readonly id: string
  readonly name: string
  readonly nameAr: string
  readonly dialCode: string
  readonly flag: string
}

export const COUNTRY_CODES: readonly CountryCode[] = [
  { id: 'jo', name: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴' },
  { id: 'sa', name: 'Saudi Arabia', nameAr: 'السعودية', dialCode: '+966', flag: '🇸🇦' },
  { id: 'ae', name: 'United Arab Emirates', nameAr: 'الإمارات', dialCode: '+971', flag: '🇦🇪' },
  { id: 'kw', name: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', flag: '🇰🇼' },
  { id: 'qa', name: 'Qatar', nameAr: 'قطر', dialCode: '+974', flag: '🇶🇦' },
  { id: 'bh', name: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', flag: '🇧🇭' },
  { id: 'om', name: 'Oman', nameAr: 'عمان', dialCode: '+968', flag: '🇴🇲' },
  { id: 'eg', name: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬' },
  { id: 'iq', name: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶' },
  { id: 'sy', name: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾' },
  { id: 'lb', name: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧' },
  { id: 'ps', name: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', flag: '🇵🇸' },
  { id: 'tr', name: 'Turkey', nameAr: 'تركيا', dialCode: '+90', flag: '🇹🇷' },
  { id: 'ye', name: 'Yemen', nameAr: 'اليمن', dialCode: '+967', flag: '🇾🇪' },
  { id: 'ly', name: 'Libya', nameAr: 'ليبيا', dialCode: '+218', flag: '🇱🇾' },
  { id: 'sd', name: 'Sudan', nameAr: 'السودان', dialCode: '+249', flag: '🇸🇩' },
  { id: 'ma', name: 'Morocco', nameAr: 'المغرب', dialCode: '+212', flag: '🇲🇦' },
  { id: 'tn', name: 'Tunisia', nameAr: 'تونس', dialCode: '+216', flag: '🇹🇳' },
  { id: 'dz', name: 'Algeria', nameAr: 'الجزائر', dialCode: '+213', flag: '🇩🇿' },
  { id: 'ir', name: 'Iran', nameAr: 'إيران', dialCode: '+98', flag: '🇮🇷' },
  { id: 'us', name: 'United States / Canada', nameAr: 'الولايات المتحدة / كندا', dialCode: '+1', flag: '🇺🇸' },
  { id: 'gb', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧' },
  { id: 'de', name: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', flag: '🇩🇪' },
  { id: 'fr', name: 'France', nameAr: 'فرنسا', dialCode: '+33', flag: '🇫🇷' },
  { id: 'in', name: 'India', nameAr: 'الهند', dialCode: '+91', flag: '🇮🇳' },
  { id: 'pk', name: 'Pakistan', nameAr: 'باكستان', dialCode: '+92', flag: '🇵🇰' },
  { id: 'bd', name: 'Bangladesh', nameAr: 'بنغلاديش', dialCode: '+880', flag: '🇧🇩' },
  { id: 'ph', name: 'Philippines', nameAr: 'الفلبين', dialCode: '+63', flag: '🇵🇭' },
  { id: 'lk', name: 'Sri Lanka', nameAr: 'سريلانكا', dialCode: '+94', flag: '🇱🇰' },
  { id: 'id', name: 'Indonesia', nameAr: 'إندونيسيا', dialCode: '+62', flag: '🇮🇩' },
] as const
