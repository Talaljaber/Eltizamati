import AsyncStorage from '@react-native-async-storage/async-storage'
import { brandId, err, makeError, ok, type ConsentRepository } from '@eltizamati/domain'
import {
  acknowledgeLocalConsent,
  CURRENT_CONSENT_DOC_TYPE,
  CURRENT_CONSENT_VERSION,
  ensurePersonalConsent,
  generateConsentId,
  isCurrentLocalConsent,
  readLocalConsent,
} from '../consent-policy'

const userId = brandId<'user'>('user-1')

function makeRepository() {
  return {
    status: jest.fn(),
    acknowledge: jest.fn(),
  } as jest.Mocked<ConsentRepository>
}

describe('central consent policy', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    jest.clearAllMocks()
  })

  it('generates a PostgreSQL-compatible UUID for consent records', () => {
    expect(generateConsentId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('persists an affirmative local acknowledgement with version, locale, and timestamp', async () => {
    const result = await acknowledgeLocalConsent('ar', new Date('2026-07-14T10:00:00.000Z'))
    const stored = await readLocalConsent()

    expect(result.ok).toBe(true)
    expect(stored).toEqual({
      ok: true,
      value: {
        docType: CURRENT_CONSENT_DOC_TYPE,
        version: CURRENT_CONSENT_VERSION,
        locale: 'ar',
        acknowledgedAt: '2026-07-14T10:00:00.000Z',
      },
    })
  })

  it('does not permit personal entry without current affirmative local consent', async () => {
    const repository = makeRepository()

    const result = await ensurePersonalConsent(userId, repository)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('consent')
    expect(repository.status).not.toHaveBeenCalled()
  })

  it('does not repeatedly write when the current server record already exists', async () => {
    await acknowledgeLocalConsent('en')
    const repository = makeRepository()
    repository.status.mockResolvedValue(
      ok([
        {
          id: brandId<'consentRecord'>('consent-1'),
          userId,
          docType: CURRENT_CONSENT_DOC_TYPE,
          version: CURRENT_CONSENT_VERSION,
          locale: 'en',
          acknowledgedAt: '2026-07-14T10:00:00.000Z',
        },
      ]),
    )

    const result = await ensurePersonalConsent(userId, repository)

    expect(result.ok).toBe(true)
    expect(repository.acknowledge).not.toHaveBeenCalled()
  })

  it('appends the current server version after a local re-acknowledgement', async () => {
    await acknowledgeLocalConsent('en', new Date('2026-07-14T10:00:00.000Z'))
    const repository = makeRepository()
    repository.status.mockResolvedValue(
      ok([
        {
          id: brandId<'consentRecord'>('old-consent'),
          userId,
          docType: CURRENT_CONSENT_DOC_TYPE,
          version: 'v0',
          locale: 'en',
          acknowledgedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    )
    repository.acknowledge.mockImplementation(async (record) => ok(record))

    const result = await ensurePersonalConsent(userId, repository)

    expect(result.ok).toBe(true)
    expect(repository.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        version: CURRENT_CONSENT_VERSION,
        acknowledgedAt: '2026-07-14T10:00:00.000Z',
      }),
    )
    expect(
      isCurrentLocalConsent({
        docType: CURRENT_CONSENT_DOC_TYPE,
        version: 'v0',
        locale: 'en',
        acknowledgedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('propagates server status failures without inventing consent', async () => {
    await acknowledgeLocalConsent('en')
    const repository = makeRepository()
    repository.status.mockResolvedValue(err(makeError('connectivity')))

    const result = await ensurePersonalConsent(userId, repository)

    expect(result.ok).toBe(false)
    expect(repository.acknowledge).not.toHaveBeenCalled()
  })
})
