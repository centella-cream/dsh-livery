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
 * - `dsh-client-ui-plugin-manager/src/client/slot-contract.ts` declares
 *   `plugins.detail.actions`, `plugins.detail.badge` and
 *   `plugins.detail.section` as list/root, each owned by `PluginDetailProps`
 *   (`subject`); the per-host proof is
 *   `contracts/dsh/client-slot-declarations.json`.
 * None of them injects owner-only props into the entry props beyond the
 * declared owner share; locale is injected separately by the slot runtime, not
 * by the host owner.
 *
 * The detail keys are appended in this frozen order: actions, badge, section.
 * Appending them changes `clientSlotHash()`.
 */
export const CONSUMED_CLIENT_SLOTS: readonly ConsumedClientSlot[] = [
  { key: 'main', scope: 'root', kind: 'keyed', ownerProps: [], register: 'main', inject: 'main' },
  { key: 'sidebar.panellist', scope: 'root', kind: 'list', ownerProps: [], register: 'sidebar.panellist', inject: 'sidebar.panellist' },
  { key: 'settings.section', scope: 'root', kind: 'list', ownerProps: [], register: 'settings.section', inject: 'settings.section' },
  { key: 'plugins.detail.actions', scope: 'root', kind: 'list', ownerProps: ['subject'], register: 'plugins.detail.actions', inject: 'plugins.detail.actions' },
  { key: 'plugins.detail.badge', scope: 'root', kind: 'list', ownerProps: ['subject'], register: 'plugins.detail.badge', inject: 'plugins.detail.badge' },
  { key: 'plugins.detail.section', scope: 'root', kind: 'list', ownerProps: ['subject'], register: 'plugins.detail.section', inject: 'plugins.detail.section' },
]

export function canonicalClientSlots(): string {
  return JSON.stringify(CONSUMED_CLIENT_SLOTS)
}

export function clientSlotHash(): string {
  return `sha256:${createHash('sha256').update(canonicalClientSlots(), 'utf8').digest('hex')}`
}
