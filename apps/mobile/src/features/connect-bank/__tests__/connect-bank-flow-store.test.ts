import {
  __resetConnectBankFlowForTest,
  getConnectBankFlow,
  markSignedIn,
  resetConnectBankFlow,
  selectBank,
  setRetrievedRecords,
  toggleSelected,
} from '../connect-bank-flow-store'
import type { RawProviderRecord } from '@eltizamati/demo-data'
import { toLocalDate } from '@eltizamati/domain'

const record: RawProviderRecord = {
  productType: 'creditCard',
  externalId: 'test-card-1',
  institutionName: 'Test Bank',
  currency: 'JOD',
  openedDate: toLocalDate('2026-01-01'),
  creditLimit: '1000',
  currentBalance: '100',
  purchaseAprPercent: '20',
  minimumPaymentPercent: '3',
  minimumPaymentFloor: '10',
}

describe('connect-bank-flow-store', () => {
  beforeEach(() => __resetConnectBankFlowForTest())

  it('selectBank resets prior selection/records/sign-in state for a new bank', () => {
    selectBank('arab-bank')
    markSignedIn()
    setRetrievedRecords([record])
    toggleSelected(record.externalId)
    expect(getConnectBankFlow().selectedExternalIds.size).toBe(1)

    selectBank('housing-bank')
    const state = getConnectBankFlow()
    expect(state.bankId).toBe('housing-bank')
    expect(state.signedIn).toBe(false)
    expect(state.records).toHaveLength(0)
    expect(state.selectedExternalIds.size).toBe(0)
  })

  it('markSignedIn is a no-op until a bank has been selected', () => {
    markSignedIn()
    expect(getConnectBankFlow().signedIn).toBe(false)
  })

  it('setRetrievedRecords replaces records and clears any stale selection', () => {
    selectBank('arab-bank')
    setRetrievedRecords([record])
    toggleSelected(record.externalId)
    setRetrievedRecords([record])
    expect(getConnectBankFlow().selectedExternalIds.size).toBe(0)
  })

  it('toggleSelected adds then removes an id', () => {
    selectBank('arab-bank')
    setRetrievedRecords([record])
    toggleSelected(record.externalId)
    expect(getConnectBankFlow().selectedExternalIds.has(record.externalId)).toBe(true)
    toggleSelected(record.externalId)
    expect(getConnectBankFlow().selectedExternalIds.has(record.externalId)).toBe(false)
  })

  it('resetConnectBankFlow returns to the initial state (restart-at-picker policy)', () => {
    selectBank('arab-bank')
    markSignedIn()
    setRetrievedRecords([record])
    toggleSelected(record.externalId)

    resetConnectBankFlow()

    expect(getConnectBankFlow()).toEqual({
      bankId: undefined,
      signedIn: false,
      records: [],
      selectedExternalIds: new Set(),
    })
  })
})
