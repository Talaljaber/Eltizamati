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
  readonly dialCode: string
  readonly flag: string
}

export const COUNTRY_CODES: readonly CountryCode[] = [
  { id: 'jo', name: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
  { id: 'sa', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { id: 'ae', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { id: 'kw', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { id: 'qa', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { id: 'bh', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { id: 'om', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  { id: 'eg', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { id: 'iq', name: 'Iraq', dialCode: '+964', flag: '🇮🇶' },
  { id: 'sy', name: 'Syria', dialCode: '+963', flag: '🇸🇾' },
  { id: 'lb', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧' },
  { id: 'ps', name: 'Palestine', dialCode: '+970', flag: '🇵🇸' },
  { id: 'tr', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { id: 'ye', name: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
  { id: 'ly', name: 'Libya', dialCode: '+218', flag: '🇱🇾' },
  { id: 'sd', name: 'Sudan', dialCode: '+249', flag: '🇸🇩' },
  { id: 'ma', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { id: 'tn', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
  { id: 'dz', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
  { id: 'ir', name: 'Iran', dialCode: '+98', flag: '🇮🇷' },
  { id: 'us', name: 'United States / Canada', dialCode: '+1', flag: '🇺🇸' },
  { id: 'gb', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { id: 'de', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { id: 'fr', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { id: 'in', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { id: 'pk', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { id: 'bd', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { id: 'ph', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { id: 'lk', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { id: 'id', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
] as const
