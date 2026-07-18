import type { Breadcrumb, ErrorEvent } from '@sentry/react-native'
import { scrubBreadcrumb, scrubEvent, isSentryConfigured } from '../sentry'

describe('scrubEvent', () => {
  it('strips user and request data even though sendDefaultPii:false should already prevent them', () => {
    const event = {
      user: { id: 'user-1', email: 'a@b.com' },
      request: { headers: { authorization: 'Bearer secret' } },
      extra: { httpStatus: 500 },
    } as unknown as ErrorEvent

    const result = scrubEvent(event)

    expect(result.user).toBeUndefined()
    expect(result.request).toBeUndefined()
  })

  it('drops C2/C3-shaped keys from event.extra', () => {
    const event = {
      extra: { httpStatus: 500, balance: '900 JOD', email: 'a@b.com', code: 'validation' },
    } as unknown as ErrorEvent

    const result = scrubEvent(event)

    expect(result.extra).toEqual({ httpStatus: 500, code: 'validation' })
  })

  it('drops C2/C3-shaped keys from event.tags', () => {
    const event = {
      tags: { code: 'validation', institution: 'Bank of Amman' },
    } as unknown as ErrorEvent

    const result = scrubEvent(event)

    expect(result.tags).toEqual({ code: 'validation' })
  })
})

describe('scrubBreadcrumb', () => {
  it('keeps only the destination screen name for navigation breadcrumbs, dropping params', () => {
    const breadcrumb: Breadcrumb = {
      category: 'navigation',
      data: { to: 'obligation/[id]', params: { id: 'obl-123' } },
    }

    const result = scrubBreadcrumb(breadcrumb)

    expect(result?.data).toEqual({ to: 'obligation/[id]' })
  })

  it('drops the whole data object for a navigation breadcrumb with no "to" field', () => {
    const breadcrumb: Breadcrumb = { category: 'navigation', data: { params: { id: 'obl-123' } } }

    const result = scrubBreadcrumb(breadcrumb)

    expect(result?.data).toBeUndefined()
  })

  it('drops C2/C3-shaped keys from non-navigation breadcrumb data', () => {
    const breadcrumb: Breadcrumb = {
      category: 'http',
      data: { url: '/api/x', accountNumber: '12345' },
    }

    const result = scrubBreadcrumb(breadcrumb)

    expect(result?.data).toEqual({ url: '/api/x' })
  })
})

describe('isSentryConfigured', () => {
  it('is false in the Jest/test environment (no DSN, __DEV__ semantics aside)', () => {
    expect(isSentryConfigured()).toBe(false)
  })
})
