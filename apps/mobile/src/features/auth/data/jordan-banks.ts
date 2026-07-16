/**
 * Banks licensed to operate in Jordan (FR-AUTH — "main bank" at sign-up must
 * be picked from a fixed list, never free-typed). Includes globally-known
 * banks that hold only a small local branch presence in Jordan alongside the
 * Jordan-headquartered ones. Compiled from general public knowledge, not a
 * live feed from the Central Bank of Jordan's own register — treat this as a
 * good-faith list to review/refresh against CBJ's published register rather
 * than a guaranteed-exhaustive or guaranteed-current one.
 */
export interface JordanBank {
  readonly id: string
  readonly name: string
}

export const JORDAN_BANKS: readonly JordanBank[] = [
  { id: 'arab-bank', name: 'Arab Bank' },
  { id: 'housing-bank', name: 'Housing Bank for Trade and Finance' },
  { id: 'jordan-kuwait-bank', name: 'Jordan Kuwait Bank' },
  { id: 'jordan-ahli-bank', name: 'Jordan Ahli Bank' },
  { id: 'cairo-amman-bank', name: 'Cairo Amman Bank' },
  { id: 'bank-of-jordan', name: 'Bank of Jordan' },
  { id: 'jordan-islamic-bank', name: 'Jordan Islamic Bank' },
  { id: 'islamic-international-arab-bank', name: 'Islamic International Arab Bank' },
  { id: 'capital-bank', name: 'Capital Bank of Jordan' },
  { id: 'societe-generale-jordanie', name: 'Société Générale de Banque – Jordanie' },
  { id: 'ajib', name: 'Arab Jordan Investment Bank' },
  { id: 'invest-bank', name: 'Invest Bank' },
  { id: 'safwa-islamic-bank', name: 'Safwa Islamic Bank' },
  { id: 'bank-al-etihad', name: 'Bank al Etihad' },
  { id: 'egyptian-arab-land-bank', name: 'Egyptian Arab Land Bank' },
  { id: 'rafidain-bank', name: 'Rafidain Bank (Jordan branch)' },
  { id: 'national-bank-of-kuwait-jordan', name: 'National Bank of Kuwait – Jordan' },
  { id: 'standard-chartered-jordan', name: 'Standard Chartered Bank (Jordan branch)' },
] as const
