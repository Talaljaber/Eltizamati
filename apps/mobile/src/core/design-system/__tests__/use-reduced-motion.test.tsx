/**
 * useReducedMotion tests — reads the OS "reduce motion" setting and updates on change.
 */
import { AccessibilityInfo } from 'react-native'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useReducedMotion } from '../use-reduced-motion'

describe('useReducedMotion', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reflects the initial reduce-motion setting', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never)

    const { result } = renderHook(() => useReducedMotion())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('defaults to false when motion is not reduced', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never)

    const { result } = renderHook(() => useReducedMotion())
    await waitFor(() => expect(result.current).toBe(false))
  })
})
