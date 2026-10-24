/**
 * DSH Livery — capability evaluation.
 *
 * The frozen contract snapshot (`src/generated/contract.ts`) is the only place a
 * runtime learns which host capabilities exist. This module turns that data
 * plus a manifest's declared compatibility set into an effective layout and a
 * deterministic degradation report. No host version is ever hard-coded here.
 */

import type {
  CapabilityDegrade,
  CapabilityId,
  CapabilityMap,
  ContractCapabilityFacts,
  LiveryManifest,
} from './types.js'
import { CAP } from './types.js'
import { HOST_CAPABILITIES } from '../generated/contract.js'

/**
 * Fallback marker for a required capability that has no safe substitute: the
 * livery is not usable and the host/client must stay on stock.
 */
export const NO_FALLBACK = 'none' as const

/** The certified contract capability facts (also re-exported for convenience). */
export const HOST_CONTRACT_CAPABILITIES: CapabilityMap = HOST_CAPABILITIES

/** Result of combining contract facts with a manifest's declared capabilities. */
export interface CapabilityEvaluation {
  /** Contract facts indexed by capability id (callers copy, never mutate). */
  readonly map: CapabilityMap
  /** Manifest layout with per-recipe fallbacks applied. */
  readonly effectiveLayout: LiveryManifest['layout']
  /** Capabilities missing at runtime, with the fallback actually used. */
  readonly degraded: readonly CapabilityDegrade[]
}

interface RecipeGate {
  readonly capability: CapabilityId
  readonly recipe: keyof LiveryManifest['layout']
  readonly defaultValue: string
}

/** Recipe → capability mapping; this is the declared fallback contract. */
const RECIPE_GATES: readonly RecipeGate[] = [
  { capability: CAP.hostDensity, recipe: 'density', defaultValue: 'host' },
  { capability: CAP.hostTranscriptWidth, recipe: 'conversationWidth', defaultValue: 'host' },
  { capability: CAP.hostMessageFlow, recipe: 'messageFlow', defaultValue: 'stock' },
  { capability: CAP.surfaceMaterial, recipe: 'surfaceStyle', defaultValue: 'solid' },
]

/** Capabilities that are safe to lose without making a livery unusable. */
const GENERIC_OPTIONAL_FALLBACK: Record<string, string> = {
  [CAP.reducedTransparency]: 'solid',
  [CAP.forcedColors]: 'system-colors',
  [CAP.reducedMotion]: 'no-motion',
}

/** The fallback recorded when `capability` is unavailable. */
export function fallbackForCapability(capability: CapabilityId, required: boolean): string {
  if (required) return NO_FALLBACK
  const gate = RECIPE_GATES.find((candidate) => candidate.capability === capability)
  if (gate !== undefined) return gate.defaultValue
  return GENERIC_OPTIONAL_FALLBACK[capability] ?? 'stock'
}

function availability(contract: ContractCapabilityFacts, id: CapabilityId): boolean {
  return contract[id]?.available === true
}

function reasonFor(contract: ContractCapabilityFacts, id: CapabilityId): string {
  const fact = contract[id]
  if (fact === undefined) return `Capability ${id} is not present in the frozen contract snapshot.`
  return fact.detail
}

/**
 * Combine contract capability facts with a manifest:
 * - a declared required capability that is unavailable makes the livery
 *   unusable (degrade entry with fallback `NO_FALLBACK`; check with
 *   `isLiveryUsable`);
 * - an unavailable optional capability is recorded with the fallback used;
 * - layout recipes whose capability is unavailable degrade independently of the
 *   manifest's declared lists (density/conversationWidth → `host`,
 *   messageFlow → `stock`, surfaceStyle → `solid`).
 */
export function evaluateCapabilities(
  contract: ContractCapabilityFacts,
  manifest: LiveryManifest,
): CapabilityEvaluation {
  const map: CapabilityMap = { ...contract }
  const degraded: CapabilityDegrade[] = []
  const seen = new Set<CapabilityId>()

  const record = (id: CapabilityId, required: boolean): void => {
    if (seen.has(id)) return
    seen.add(id)
    degraded.push({ id, reason: reasonFor(contract, id), fallback: fallbackForCapability(id, required) })
  }

  for (const id of manifest.compat.requiredCapabilities) {
    if (!availability(contract, id)) record(id, true)
  }
  for (const id of manifest.compat.optionalCapabilities) {
    if (!availability(contract, id)) record(id, false)
  }

  const effectiveLayout: Record<keyof LiveryManifest['layout'], string> = { ...manifest.layout }
  for (const gate of RECIPE_GATES) {
    const requested = manifest.layout[gate.recipe]
    if (requested === gate.defaultValue) continue
    if (availability(contract, gate.capability)) continue
    ;(effectiveLayout as Record<string, string>)[gate.recipe] = gate.defaultValue
    record(gate.capability, false)
  }

  return {
    map,
    effectiveLayout: effectiveLayout as LiveryManifest['layout'],
    degraded,
  }
}

/**
 * True when every declared required capability is available. A required
 * capability degrade is marked with `fallback === NO_FALLBACK`, so callers must
 * fall back to stock when this returns false.
 */
export function isLiveryUsable(degraded: readonly CapabilityDegrade[]): boolean {
  return !degraded.some((entry) => entry.fallback === NO_FALLBACK)
}

/** Required capabilities that are unavailable (empty → livery is usable). */
export function unavailableRequiredCapabilities(
  degraded: readonly CapabilityDegrade[],
): readonly CapabilityDegrade[] {
  return degraded.filter((entry) => entry.fallback === NO_FALLBACK)
}
