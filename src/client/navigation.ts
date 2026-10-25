/**
 * Panel-navigation constants for the host's sidebar plugin-navigation pattern.
 *
 * DSH hosts expose it as a `sidebar.panellist` row selecting a keyed `main`
 * panel. Plugin activation order is not fixed across profiles (extra plugins and
 * the two shell plugins can be loaded in any order), so the entry must never
 * assume the slots are declared when `apply()` runs: registration goes through
 * `ctx.slots.inject(...)`, which fires whenever the declaration appears. The
 * legacy Settings page is only installed when no panel row has declared itself
 * after a short grace period (or when nav registration fails).
 *
 * Pure constants only — no Cordis, no DOM, no version strings.
 */
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'

/** Keyed `main` panel id, and the matching `sidebar.panellist` row id. */
export const PANEL_ID = 'livery' as MainPanelId

/** Sidebar row order: after plugins (0), schedule (10), context (20). */
export const PANEL_ROW_ORDER = 30

/** The two slots the panel-navigation pattern needs. */
export const PANEL_NAVIGATION_SLOTS = ['sidebar.panellist', 'main'] as const

/**
 * Grace period before installing the Settings fallback when the host has not
 * declared the panel row yet. Long enough to absorb activation-order skew on a
 * loaded profile, short enough that a genuinely old host still gets a usable
 * entry quickly; a row declared after this still replaces the fallback.
 */
export const PANEL_NAVIGATION_GRACE_MS = 1500
