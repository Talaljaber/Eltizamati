import * as Sentry from '@sentry/react-native'
import { logger, sanitizeMetadata } from '../logger'

describe('sanitizeMetadata', () => {
  it('passes through metadata with only safe, coarse keys', () => {
    const metadata = { stage: 'save', code: 'validation', httpStatus: 400 }
    expect(sanitizeMetadata('test', metadata)).toEqual(metadata)
  })

  it('returns undefined when no metadata is given', () => {
    expect(sanitizeMetadata('test', undefined)).toBeUndefined()
  })

  it.each([
    'email',
    'phone',
    'fullName',
    'balance',
    'currentBalance',
    'amount',
    'principal',
    'payment',
    'institution',
    'token',
    'password',
    'iban',
    'cardNumber',
  ])('drops a metadata key that looks like C2/C3 data: %s', (key) => {
    const metadata = { [key]: 'sensitive-value', code: 'validation' }
    const result = sanitizeMetadata('test-stage', metadata)
    expect(result).toBeDefined()
    expect(result).not.toHaveProperty(key)
    expect(result).toHaveProperty('code', 'validation')
  })
})

describe('logger (test env — non-dev branch, forwards to Sentry)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('forwards error-level events to Sentry.captureMessage with sanitized metadata', () => {
    logger.error({
      stage: 'obligationSave',
      code: 'validation',
      safeMetadata: { httpStatus: 500, email: 'should-be-dropped@example.com' },
    })

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
    const [, options] = (Sentry.captureMessage as jest.Mock).mock.calls[0]
    expect(options.level).toBe('error')
    expect(options.extra).toEqual({ httpStatus: 500 })
    expect(options.extra).not.toHaveProperty('email')
  })

  it('forwards warn-level events to Sentry.captureMessage as a warning', () => {
    logger.warn({ stage: 'providerSync', code: 'providerUnavailable' })

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
    const [, options] = (Sentry.captureMessage as jest.Mock).mock.calls[0]
    expect(options.level).toBe('warning')
  })

  it('forwards info-level events to Sentry.addBreadcrumb, not captureMessage', () => {
    logger.info({ stage: 'screenView', message: 'obligation-detail' })

    expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1)
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('never throws even when given a forbidden metadata key (release-path drops instead of crashing)', () => {
    expect(() => logger.error({ stage: 'x', safeMetadata: { balance: '900 JOD' } })).not.toThrow()
  })
})
