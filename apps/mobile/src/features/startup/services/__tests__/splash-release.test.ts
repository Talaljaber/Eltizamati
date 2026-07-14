import { makeError } from '@eltizamati/domain'
import { releaseNativeSplash, __resetSplashReleaseForTest } from '../splash-release'

const mockHideAsync = jest.fn()
jest.mock('expo-splash-screen', () => ({ hideAsync: () => mockHideAsync() }))
jest.mock('@/core/config/runtime-environment', () => ({ isExpoGo: false }))

describe('releaseNativeSplash', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetSplashReleaseForTest()
  })

  it('calls hideAsync once for truly concurrent release requests', async () => {
    let resolveHide: (() => void) | undefined
    mockHideAsync.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveHide = resolve
      }),
    )

    // Both requests are made before the single hide resolves.
    const first = releaseNativeSplash()
    const second = releaseNativeSplash()
    expect(mockHideAsync).toHaveBeenCalledTimes(1)

    resolveHide?.()
    await Promise.all([first, second])
    expect(mockHideAsync).toHaveBeenCalledTimes(1)
  })

  it('no-ops after a successful release', async () => {
    mockHideAsync.mockResolvedValue(undefined)
    await releaseNativeSplash()
    await releaseNativeSplash()
    expect(mockHideAsync).toHaveBeenCalledTimes(1)
  })

  it('clears the in-flight promise on failure so a later attempt can retry', async () => {
    mockHideAsync.mockRejectedValueOnce(makeError('unexpected')).mockResolvedValueOnce(undefined)

    await expect(releaseNativeSplash()).rejects.toBeTruthy()
    await expect(releaseNativeSplash()).resolves.toBeUndefined()
    expect(mockHideAsync).toHaveBeenCalledTimes(2)
  })
})
