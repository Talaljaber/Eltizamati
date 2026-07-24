import { afterEach, describe, expect, it, vi } from 'vitest'

// Mutable env the mocked getDashboardEnv returns; each test sets what it needs.
let mockedEnv: { supabaseUrl: string; supabaseSecretKey: string; operatorDecryptToken?: string }
vi.mock('../env', () => ({
  getDashboardEnv: () => mockedEnv,
}))

const { createFieldDecryptor } = await import('./field-decryptor')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createFieldDecryptor', () => {
  it('calls operator-decrypt once with the token and returns aligned plaintext', async () => {
    mockedEnv = {
      supabaseUrl: 'https://proj.supabase.co',
      supabaseSecretKey: 'sb_secret_x',
      operatorDecryptToken: 'op-token',
    }
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ values: ['Talal Jaber', 'Cairo Amman Bank'] }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const decryptor = createFieldDecryptor()
    const result = await decryptor.decrypt([
      { userId: 'user-1', value: 'enc:v1:aaa' },
      { userId: 'user-1', value: 'enc:v1:bbb' },
    ])

    expect(result).toEqual(['Talal Jaber', 'Cairo Amman Bank'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://proj.supabase.co/functions/v1/operator-decrypt')
    expect((init.headers as Record<string, string>)['x-operator-token']).toBe('op-token')
    expect(JSON.parse(init.body as string)).toEqual({
      items: [
        { userId: 'user-1', value: 'enc:v1:aaa' },
        { userId: 'user-1', value: 'enc:v1:bbb' },
      ],
    })
  })

  it('short-circuits an empty batch without calling the network', async () => {
    mockedEnv = {
      supabaseUrl: 'https://proj.supabase.co',
      supabaseSecretKey: 'sb_secret_x',
      operatorDecryptToken: 'op-token',
    }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await createFieldDecryptor().decrypt([])).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes values through (ciphertext preserved) when the token is unset', async () => {
    mockedEnv = { supabaseUrl: 'https://proj.supabase.co', supabaseSecretKey: 'sb_secret_x' }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'warn').mockImplementation(vi.fn())

    const result = await createFieldDecryptor().decrypt([
      { userId: 'user-1', value: 'enc:v1:aaa' },
      { userId: 'user-1', value: null },
    ])

    expect(result).toEqual(['enc:v1:aaa', null])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('degrades to passthrough on a non-2xx response', async () => {
    mockedEnv = {
      supabaseUrl: 'https://proj.supabase.co',
      supabaseSecretKey: 'sb_secret_x',
      operatorDecryptToken: 'op-token',
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })))
    vi.spyOn(console, 'error').mockImplementation(vi.fn())

    const result = await createFieldDecryptor().decrypt([{ userId: 'u', value: 'enc:v1:aaa' }])
    expect(result).toEqual(['enc:v1:aaa'])
  })

  it('degrades to passthrough when the response batch length mismatches', async () => {
    mockedEnv = {
      supabaseUrl: 'https://proj.supabase.co',
      supabaseSecretKey: 'sb_secret_x',
      operatorDecryptToken: 'op-token',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ values: ['only-one'] }), { status: 200 })),
    )
    vi.spyOn(console, 'error').mockImplementation(vi.fn())

    const result = await createFieldDecryptor().decrypt([
      { userId: 'u', value: 'enc:v1:aaa' },
      { userId: 'u', value: 'enc:v1:bbb' },
    ])
    expect(result).toEqual(['enc:v1:aaa', 'enc:v1:bbb'])
  })

  it('degrades to passthrough when the network throws', async () => {
    mockedEnv = {
      supabaseUrl: 'https://proj.supabase.co',
      supabaseSecretKey: 'sb_secret_x',
      operatorDecryptToken: 'op-token',
    }
    vi.stubGlobal(
      'fetch',
      // A real fetch network failure rejects with a TypeError ("Failed to fetch").
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    vi.spyOn(console, 'error').mockImplementation(vi.fn())

    const result = await createFieldDecryptor().decrypt([{ userId: 'u', value: 'enc:v1:aaa' }])
    expect(result).toEqual(['enc:v1:aaa'])
  })
})
