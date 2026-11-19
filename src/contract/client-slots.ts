/**
 * Client slots Livery actually consumes. This is a static contract identity:
 * the DSH contract snapshots do not yet expose owner/register/inject semantics
 * for every slot, so the runtime and profile identity use this frozen list.
 */

import { createHash } from 'node:crypto'

export interface ConsumedClientSlot {
  readonly key: string
  readonly scope: string
  /** DSH slot kind: single, list, keyed or factory. */
  readonly kind: 'single' | 'list' | 'keyed'
  readonly ownerProps: readonly string[]
  readonly register: string
  readonly inject: string
}

/**
 * The declarations below are copied from the certified DSH host source:
 * - `dsh-client-ui-layout/src/client/index.ts` declares `main` as keyed/root.
 * - `dsh-client-ui-sidebar/src/client/index.ts` declares `sidebar.panellist`
 *   as list/root under the `sidebar` factory owner.
 * - `dsh-client-ui-settings-general/src/client/index.ts` declares
 *   `settings.section` as list/root.
 * None of the three injects owner-only props; locale is injected separately by
 * the slot runtime, not by the host owner.
 */
export const CONSUMED_CLIENT_SLOTS: readonly ConsumedClientSlot[] = [
  { key: 'main', scope: 'root', kind: 'keyed', ownerProps: [], register: 'main', inject: 'main' },
  { key: 'sidebar.panellist', scope: 'root', kind: 'list', ownerProps: [], register: 'sidebar.panellist', inject: 'sidebar.panellist' },
  { key: 'settings.section', scope: 'root', kind: 'list', ownerProps: [], register: 'settings.section', inject: 'settings.section' },
]

export function canonicalClientSlots(): string {
  return JSON.stringify(CONSUMED_CLIENT_SLOTS)
}

export function clientSlotHash(): string {
  return `sha256:${createHash('sha256').update(canonicalClientSlots(), 'utf8').digest('hex')}`
}
