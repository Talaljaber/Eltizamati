/**
 * Per-bank raw provider catalog for the "pull obligations from your bank"
 * onboarding flow (connect-plan.md Phase C).
 *
 * These are deliberately shaped like a raw bank feed record — plain decimal
 * strings and dates, a `productType` discriminant, no domain value objects —
 * NOT pre-built `Obligation` entities. That mirrors what a real open-banking
 * provider would hand back (arbitrary provider JSON needing classification),
 * which is the whole reason `MockConnectService.retrieve()`/`classify()` are
 * kept as separate steps. This package stays independent of the mobile app's
 * `MockConnectService` — it exports only these raw fixtures; classification
 * into domain entities happens in the mobile app's provider adapter.
 *
 * Deterministic (F-04 / seed-demo-data.md): anchored to `DEMO_DATE`, no
 * `Date.now()`, no `Math.random()`. Bank ids match `JORDAN_BANKS` ids
 * (apps/mobile/src/features/auth/data/jordan-banks.ts) by convention — this
 * package does not import that file, so the mapping is by string contract
 * only. A bank id with no entry here is a legitimate "this bank returned
 * zero obligations" case, not an error.
 */
import { addMonthsToLocalDate, type LocalDate } from '@eltizamati/domain'
import { DEMO_DATE } from './constants.js'

export interface RawCreditCardRecord {
  readonly productType: 'creditCard'
  readonly externalId: string
  readonly institutionName: string
  readonly currency: 'JOD'
  readonly openedDate: LocalDate
  readonly creditLimit: string
  readonly currentBalance: string
  readonly purchaseAprPercent: string
  readonly minimumPaymentPercent: string
  readonly minimumPaymentFloor: string
}

export interface RawConventionalLoanRecord {
  readonly productType: 'conventionalLoan'
  readonly externalId: string
  readonly institutionName: string
  readonly currency: 'JOD'
  readonly originalPrincipal: string
  readonly outstandingBalance: string
  readonly installment: string
  readonly annualRatePercent: string
  readonly rateType: 'fixed' | 'variable'
  readonly termMonths: number
  readonly startDate: LocalDate
  readonly maturityDate: LocalDate
  readonly firstPaymentDate: LocalDate
  readonly purpose: 'personal' | 'auto' | 'housing' | 'other'
}

export interface RawMurabahaRecord {
  readonly productType: 'murabaha'
  readonly externalId: string
  readonly institutionName: string
  readonly currency: 'JOD'
  readonly assetCost: string
  readonly disclosedProfit: string
  readonly totalSalePrice: string
  readonly installment: string
  readonly termMonths: number
  readonly startDate: LocalDate
  readonly profitRatePercent: string
}

export type RawProviderRecord =
  | RawCreditCardRecord
  | RawConventionalLoanRecord
  | RawMurabahaRecord

function loan(
  demoDate: LocalDate,
  fields: Omit<RawConventionalLoanRecord, 'productType' | 'currency'>,
): RawConventionalLoanRecord {
  return { productType: 'conventionalLoan', currency: 'JOD', ...fields }
}

function murabaha(
  fields: Omit<RawMurabahaRecord, 'productType' | 'currency'>,
): RawMurabahaRecord {
  return { productType: 'murabaha', currency: 'JOD', ...fields }
}

function card(fields: Omit<RawCreditCardRecord, 'productType' | 'currency'>): RawCreditCardRecord {
  return { productType: 'creditCard', currency: 'JOD', ...fields }
}

/**
 * Builds the catalog for a given anchor date. A function (not a constant)
 * for the same reason `buildDemoSeed` is — so it can be re-derived against a
 * different `demoDate` in tests without a stale module-level snapshot.
 */
export function buildBankCatalog(
  demoDate: LocalDate = DEMO_DATE,
): Readonly<Record<string, readonly RawProviderRecord[]>> {
  const autoStart = addMonthsToLocalDate(demoDate, -18)
  const housingStart = addMonthsToLocalDate(demoDate, -36)
  const murabahaStart = addMonthsToLocalDate(demoDate, -10)
  const capitalLoanStart = addMonthsToLocalDate(demoDate, -6)
  const capitalMurabahaStart = addMonthsToLocalDate(demoDate, -3)
  const arabPersonalLoanStart = addMonthsToLocalDate(demoDate, -8)
  const housingPersonalLoanStart = addMonthsToLocalDate(demoDate, -4)
  const jibMurabahaTwoStart = addMonthsToLocalDate(demoDate, -20)

  return {
    'arab-bank': [
      loan(demoDate, {
        externalId: 'arab-bank-auto-loan-v1',
        institutionName: 'Arab Bank',
        originalPrincipal: '12000',
        outstandingBalance: '8400',
        installment: '285',
        annualRatePercent: '6.5',
        rateType: 'fixed',
        termMonths: 48,
        startDate: autoStart,
        maturityDate: addMonthsToLocalDate(autoStart, 48),
        firstPaymentDate: addMonthsToLocalDate(autoStart, 1),
        purpose: 'auto',
      }),
      card({
        externalId: 'arab-bank-card-v1',
        institutionName: 'Arab Bank',
        openedDate: addMonthsToLocalDate(demoDate, -24),
        creditLimit: '2500',
        currentBalance: '640',
        purchaseAprPercent: '22',
        minimumPaymentPercent: '3',
        minimumPaymentFloor: '15',
      }),
      loan(demoDate, {
        externalId: 'arab-bank-personal-loan-v1',
        institutionName: 'Arab Bank',
        originalPrincipal: '4000',
        outstandingBalance: '2650',
        installment: '175',
        annualRatePercent: '8.25',
        rateType: 'fixed',
        termMonths: 24,
        startDate: arabPersonalLoanStart,
        maturityDate: addMonthsToLocalDate(arabPersonalLoanStart, 24),
        firstPaymentDate: addMonthsToLocalDate(arabPersonalLoanStart, 1),
        purpose: 'personal',
      }),
    ],
    'housing-bank': [
      loan(demoDate, {
        externalId: 'housing-bank-mortgage-v1',
        institutionName: 'Housing Bank for Trade and Finance',
        originalPrincipal: '65000',
        outstandingBalance: '54200',
        installment: '520',
        annualRatePercent: '5.75',
        rateType: 'variable',
        termMonths: 180,
        startDate: housingStart,
        maturityDate: addMonthsToLocalDate(housingStart, 180),
        firstPaymentDate: addMonthsToLocalDate(housingStart, 1),
        purpose: 'housing',
      }),
      loan(demoDate, {
        externalId: 'housing-bank-auto-loan-v1',
        institutionName: 'Housing Bank for Trade and Finance',
        originalPrincipal: '9500',
        outstandingBalance: '6200',
        installment: '245',
        annualRatePercent: '7.1',
        rateType: 'fixed',
        termMonths: 36,
        startDate: housingPersonalLoanStart,
        maturityDate: addMonthsToLocalDate(housingPersonalLoanStart, 36),
        firstPaymentDate: addMonthsToLocalDate(housingPersonalLoanStart, 1),
        purpose: 'auto',
      }),
      card({
        externalId: 'housing-bank-card-v1',
        institutionName: 'Housing Bank for Trade and Finance',
        openedDate: addMonthsToLocalDate(demoDate, -16),
        creditLimit: '2000',
        currentBalance: '410',
        purchaseAprPercent: '20',
        minimumPaymentPercent: '3',
        minimumPaymentFloor: '15',
      }),
    ],
    'jordan-islamic-bank': [
      murabaha({
        externalId: 'jordan-islamic-bank-auto-murabaha-v1',
        institutionName: 'Jordan Islamic Bank',
        assetCost: '11000',
        disclosedProfit: '2400',
        totalSalePrice: '13400',
        installment: '279',
        termMonths: 48,
        startDate: murabahaStart,
        profitRatePercent: '18',
      }),
      murabaha({
        externalId: 'jordan-islamic-bank-household-murabaha-v1',
        institutionName: 'Jordan Islamic Bank',
        assetCost: '3200',
        disclosedProfit: '640',
        totalSalePrice: '3840',
        installment: '160',
        termMonths: 24,
        startDate: jibMurabahaTwoStart,
        profitRatePercent: '16',
      }),
    ],
    'cairo-amman-bank': [
      card({
        externalId: 'cairo-amman-bank-card-v1',
        institutionName: 'Cairo Amman Bank',
        openedDate: addMonthsToLocalDate(demoDate, -30),
        creditLimit: '1800',
        currentBalance: '950',
        purchaseAprPercent: '25',
        minimumPaymentPercent: '3',
        minimumPaymentFloor: '10',
      }),
      murabaha({
        externalId: 'cairo-amman-bank-murabaha-v1',
        institutionName: 'Cairo Amman Bank',
        assetCost: '9000',
        disclosedProfit: '1980',
        totalSalePrice: '10980',
        installment: '229',
        termMonths: 48,
        startDate: addMonthsToLocalDate(demoDate, -14),
        profitRatePercent: '17.5',
      }),
    ],
    'capital-bank': [
      loan(demoDate, {
        externalId: 'capital-bank-personal-loan-v1',
        institutionName: 'Capital Bank of Jordan',
        originalPrincipal: '5000',
        outstandingBalance: '4100',
        installment: '215',
        annualRatePercent: '9.9',
        rateType: 'fixed',
        termMonths: 24,
        startDate: capitalLoanStart,
        maturityDate: addMonthsToLocalDate(capitalLoanStart, 24),
        firstPaymentDate: addMonthsToLocalDate(capitalLoanStart, 1),
        purpose: 'personal',
      }),
      card({
        externalId: 'capital-bank-card-v1',
        institutionName: 'Capital Bank of Jordan',
        openedDate: addMonthsToLocalDate(demoDate, -20),
        creditLimit: '3000',
        currentBalance: '1120',
        purchaseAprPercent: '21',
        minimumPaymentPercent: '3',
        minimumPaymentFloor: '15',
      }),
      murabaha({
        externalId: 'capital-bank-murabaha-v1',
        institutionName: 'Capital Bank of Jordan',
        assetCost: '7000',
        disclosedProfit: '1500',
        totalSalePrice: '8500',
        installment: '236',
        termMonths: 36,
        startDate: capitalMurabahaStart,
        profitRatePercent: '19',
      }),
    ],
  }
}
