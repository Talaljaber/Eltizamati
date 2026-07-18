import { isAllowedDeepLinkPath } from '../deep-link-allowlist'

describe('isAllowedDeepLinkPath — allowed routes', () => {
  it.each([
    '',
    '/',
    'obligations',
    'learn',
    'loans',
    '(tabs)',
    '(tabs)/obligations',
    '(tabs)/learn',
    '(tabs)/loans',
    'auth/sign-in',
    'auth/verify-code',
    'insights',
    'learn/assistant',
    'learn/compare',
    'learn/glossary',
    'learn/howLoansWork',
    'legal-doc',
    'loan-application/apply',
    'obligation/add',
    'obligation/obl-123',
    'obligation/obl-123/schedule',
    'obligation/obl-123/scenario',
    'obligation/obl-123/card-simulator',
    'onboarding/consent',
    'profile',
    'settings',
    'settings/data-status',
  ])('allows %s', (path) => {
    expect(isAllowedDeepLinkPath(path)).toBe(true)
  })

  it('allows a full scheme URL with query string, stripping both before matching', () => {
    expect(isAllowedDeepLinkPath('eltizamati://obligation/obl-123?ref=email')).toBe(true)
  })
})

describe('isAllowedDeepLinkPath — rejected routes (fuzz-style malformed input)', () => {
  it.each([
    'settings/danger-zone',
    'obligation/obl-123/../../settings',
    'obligation/obl-123/delete-everything',
    'obligation//schedule',
    "obligation/'; DROP TABLE obligations;--",
    'obligation/obl 123',
    'obligation/obl-123/edit/extra',
    '../../etc/passwd',
    'javascript:alert(1)',
    'admin',
    'obligation',
    `obligation/${'a'.repeat(200)}`,
  ])('rejects %s', (path) => {
    expect(isAllowedDeepLinkPath(path)).toBe(false)
  })
})
