import { describe, expect, it } from 'vitest'
import {
  PANEL_ID,
  PANEL_NAVIGATION_GRACE_MS,
  PANEL_NAVIGATION_SLOTS,
  PANEL_ROW_ORDER,
} from '../../src/client/navigation.js'

describe('panel navigation constants', () => {
  it('uses the stable panel/row id, order and slot names', () => {
    expect(PANEL_ID).toBe('livery')
    expect(PANEL_ROW_ORDER).toBe(30)
    expect(PANEL_NAVIGATION_SLOTS).toEqual(['sidebar.panellist', 'main'])
  })

  it('keeps a short, bounded grace period for activation-order skew', () => {
    expect(PANEL_NAVIGATION_GRACE_MS).toBe(1500)
    expect(PANEL_NAVIGATION_GRACE_MS).toBeLessThanOrEqual(3000)
  })
})
