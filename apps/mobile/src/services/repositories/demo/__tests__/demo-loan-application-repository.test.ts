import { brandId, isOk } from '@eltizamati/domain'
import { DemoLoanApplicationRepository } from '../demo-loan-application-repository'

const userId = brandId<'user'>('demo-user-1')
const otherUserId = brandId<'user'>('demo-user-2')

const draft = {
  institutionName: 'Arab Bank',
  purpose: 'personal' as const,
  requestedAmount: '1200',
  requestedTermMonths: 12,
}

describe('DemoLoanApplicationRepository', () => {
  it('submits a pending application and lists it back for the same user', async () => {
    const repo = new DemoLoanApplicationRepository()
    const submitted = await repo.submit(userId, draft)
    expect(isOk(submitted)).toBe(true)
    if (!isOk(submitted)) return
    expect(submitted.value.status).toBe('pending')
    expect(submitted.value.requestedAmount).toBe('1200')

    const listed = await repo.list(userId)
    expect(isOk(listed)).toBe(true)
    if (!isOk(listed)) return
    expect(listed.value).toHaveLength(1)
    expect(listed.value[0]?.id).toBe(submitted.value.id)
  })

  it('never returns another users applications', async () => {
    const repo = new DemoLoanApplicationRepository()
    await repo.submit(userId, draft)
    const listed = await repo.list(otherUserId)
    expect(isOk(listed)).toBe(true)
    if (!isOk(listed)) return
    expect(listed.value).toHaveLength(0)
  })

  it('keeps an optional applicant note only when provided', async () => {
    const repo = new DemoLoanApplicationRepository()
    const withNote = await repo.submit(userId, { ...draft, applicantNote: 'Please review' })
    expect(isOk(withNote)).toBe(true)
    if (!isOk(withNote)) return
    expect(withNote.value.applicantNote).toBe('Please review')

    const withoutNote = await repo.submit(userId, draft)
    expect(isOk(withoutNote)).toBe(true)
    if (!isOk(withoutNote)) return
    expect('applicantNote' in withoutNote.value).toBe(false)
  })
})
