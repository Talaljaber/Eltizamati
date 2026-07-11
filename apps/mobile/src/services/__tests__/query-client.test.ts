import { QueryClient } from '@tanstack/react-query'
import { createQueryClient } from '../query-client'

describe('createQueryClient', () => {
  it('returns a QueryClient instance', () => {
    expect(createQueryClient()).toBeInstanceOf(QueryClient)
  })

  it('returns a fresh instance on every call (no module-level singleton)', () => {
    expect(createQueryClient()).not.toBe(createQueryClient())
  })

  it('disables mutation retries — financial writes are never auto-resubmitted', () => {
    const client = createQueryClient()
    expect(client.getDefaultOptions().mutations?.retry).toBe(false)
  })

  it('enables a single query retry', () => {
    const client = createQueryClient()
    expect(client.getDefaultOptions().queries?.retry).toBe(1)
  })
})
