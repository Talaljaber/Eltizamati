/**
 * AppError taxonomy tests — ADR-0014.
 */
import { describe, it, expect } from 'vitest'
import { makeError, ok, err, isOk, isErr, mapResult } from '../errors/app-error.js'

describe('AppError', () => {
  it('makeError produces correct properties for validation code', () => {
    const e = makeError('validation', { safeMetadata: { field: 'installment' } })
    expect(e.code).toBe('validation')
    expect(e.retryable).toBe(false)
    expect(e.severity).toBe('warning')
    expect(e.safeMetadata?.['field']).toBe('installment')
  })

  it('makeError: storage is retryable', () => {
    const e = makeError('storage')
    expect(e.retryable).toBe(true)
  })

  it('makeError: migration is critical', () => {
    const e = makeError('migration')
    expect(e.severity).toBe('critical')
  })
})

describe('Result', () => {
  it('ok() is ok', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    expect(isErr(r)).toBe(false)
    expect(r.value).toBe(42)
  })

  it('err() is err', () => {
    const r = err(makeError('notFound'))
    expect(isErr(r)).toBe(true)
    expect(isOk(r)).toBe(false)
    expect(r.error.code).toBe('notFound')
  })

  it('mapResult transforms ok value', () => {
    const r = ok(10)
    const mapped = mapResult(r, (v) => v * 2)
    expect(isOk(mapped) && mapped.value).toBe(20)
  })

  it('mapResult passes through err', () => {
    const r = err(makeError('notFound'))
    const mapped = mapResult(r, (v: number) => v * 2)
    expect(isErr(mapped)).toBe(true)
  })
})
