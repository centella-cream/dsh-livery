/**
 * Client slots Livery actually consumes. This is a static contract identity:
 * the DSH contract snapshots do not yet expose owner/register/inject semantics
 * for every slot, so the runtime and profile identity use this frozen list.
 */

import { createHash } from 'node:crypto'

export interface ConsumedClientSlot {
  readonly key: string
  readonly scope: string
  readonly ownerProps: readonly string[]
  readonly register: string
  readonly inject: string
}

export const CONSUMED_CLIENT_SLOTS: readonly ConsumedClientSlot[] = [
  { key: 'main', scope: 'plugin-panel', ownerProps: ['close', 't'], register: 'main', inject: 'main' },
  { key: 'sidebar.panellist', scope: 'plugin-panel', ownerProps: ['close', 't'], register: 'sidebar.panellist', inject: 'sidebar.panellist' },
  { key: 'settings.section', scope: 'settings', ownerProps: ['close', 't'], register: 'settings.section', inject: 'settings.section' },
]

export function canonicalClientSlots(): string {
  return JSON.stringify(CONSUMED_CLIENT_SLOTS)
}

export function clientSlotHash(): string {
  return `sha256:${createHash('sha256').update(canonicalClientSlots(), 'utf8').digest('hex')}`
}
