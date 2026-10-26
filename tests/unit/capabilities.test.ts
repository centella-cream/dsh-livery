import { describe, expect, it } from 'vitest'
import {
  NO_FALLBACK,
  evaluateCapabilities,
  fallbackForCapability,
  hasFontRoleHooks,
  isLiveryUsable,
  unavailableRequiredCapabilities,
} from '../../src/core/capabilities.js'
import { CAP, type CapabilityId, type ContractCapabilityFacts, type LiveryManifest } from '../../src/core/types.js'
import { ADAPTERS } from '../../src/generated/contract.js'
import { makeManifest } from './fixtures.js'
import { ADAPTER_020, ADAPTER_021_RC2, ADAPTER_021_RC3 } from './helpers.js'

const SEEDS_LIGHT = { accent: '#4f7a52', secondary: '#93b394', surface: '#f4f8f3', text: '#1c2b1d' }
const SEEDS_DARK = { accent: '#83b886', secondary: '#6d9a70', surface: '#141f15', text: '#edf4ec' }

function capabilityFacts(
  baseline: ContractCapabilityFacts,
  overrides: Readonly<Record<string, boolean>> = {},
): ContractCapabilityFacts {
  const facts: Record<string, ContractCapabilityFacts[string]> = {}
  for (const [id, fact] of Object.entries(baseline)) {
    const override = overrides[id]
    facts[id] = { ...fact, available: override === undefined ? fact.available : override }
  }
  return facts
}

describe('adapter capability maps', () => {
  it('exposes the font role hook capability exactly where the host documents it', () => {
    expect(hasFontRoleHooks(ADAPTER_020.capabilities)).toBe(false)
    expect(hasFontRoleHooks(ADAPTER_021_RC2.capabilities)).toBe(true)
    expect(hasFontRoleHooks(ADAPTER_021_RC3.capabilities)).toBe(true)
    expect(ADAPTER_021_RC2.capabilities[CAP.hostFontRoleHooks]?.available).toBe(true)
    expect(ADAPTER_020.capabilities[CAP.hostFontRoleHooks]?.available).toBe(false)
  })

  it('is data-driven: a synthetic capability map flips the decision', () => {
    const synthetic = capabilityFacts(ADAPTER_020.capabilities, { [CAP.hostFontRoleHooks]: true })
    expect(hasFontRoleHooks(synthetic)).toBe(true)
    expect(hasFontRoleHooks(capabilityFacts(ADAPTER_021_RC2.capabilities, { [CAP.hostFontRoleHooks]: false }))).toBe(false)
  })

  it('ships exactly the formal-matrix approved host build while keeping historical fixtures', () => {
    // Generated ADAPTERS is the shipped set only (round-15 narrow scope).
    expect(ADAPTERS.map((adapter) => adapter.hostVersion)).toEqual(['0.2.1-rc.2'])
    // The historical fixtures stay version-explicit for derivation/render tests.
    expect(ADAPTER_020.hostVersion).toBe('0.2.0-rc.2')
    expect(ADAPTER_021_RC2.hostVersion).toBe('0.2.1-rc.2')
    expect(ADAPTER_021_RC3.hostVersion).toBe('0.2.1-rc.3')
    expect(ADAPTER_021_RC2.catalogProfile).toBe(ADAPTER_021_RC3.catalogProfile)
    expect(ADAPTER_020.catalogProfile).not.toBe(ADAPTER_021_RC2.catalogProfile)
  })
})

describe('evaluateCapabilities', () => {
  it('serves the adapter facts and degrades missing layout recipes', () => {
    const manifest = makeManifest('fixture-caps', SEEDS_LIGHT, SEEDS_DARK, {
      density: 'comfortable',
      conversationWidth: 'wide',
      messageFlow: 'separated',
      surfaceStyle: 'glass',
    })
    const result = evaluateCapabilities(ADAPTER_020.capabilities, manifest)
    expect(result.map).toEqual(ADAPTER_020.capabilities)
    expect(result.effectiveLayout).toEqual({
      density: 'host',
      conversationWidth: 'host',
      messageFlow: 'stock',
      surfaceStyle: 'glass',
    })
    expect(result.degraded.map((entry) => entry.id)).toEqual([
      CAP.hostDensity,
      CAP.hostTranscriptWidth,
      CAP.hostMessageFlow,
    ])
    expect(result.degraded.every((entry) => entry.fallback !== NO_FALLBACK)).toBe(true)
    expect(isLiveryUsable(result.degraded)).toBe(true)
  })

  it('keeps surfaceStyle=soft/glass when the material capability exists', () => {
    const manifest = makeManifest('fixture-caps-soft', SEEDS_LIGHT, SEEDS_DARK, { surfaceStyle: 'soft' })
    const result = evaluateCapabilities(ADAPTER_021_RC2.capabilities, manifest)
    expect(result.effectiveLayout.surfaceStyle).toBe('soft')
  })

  it('falls back surfaceStyle to solid when the material capability is gone', () => {
    const manifest = makeManifest('fixture-caps-solid', SEEDS_LIGHT, SEEDS_DARK, { surfaceStyle: 'glass' })
    const result = evaluateCapabilities(
      capabilityFacts(ADAPTER_020.capabilities, { [CAP.surfaceMaterial]: false }),
      manifest,
    )
    expect(result.effectiveLayout.surfaceStyle).toBe('solid')
    expect(result.degraded).toContainEqual(expect.objectContaining({ id: CAP.surfaceMaterial, fallback: 'solid' }))
  })

  it('marks a livery unusable when a required capability is unavailable', () => {
    const manifest = makeManifest('fixture-caps-required', SEEDS_LIGHT, SEEDS_DARK)
    const result = evaluateCapabilities(capabilityFacts(ADAPTER_020.capabilities, { [CAP.themeCss]: false }), manifest)
    const required = unavailableRequiredCapabilities(result.degraded)
    expect(required).toHaveLength(1)
    expect(required[0]?.id).toBe(CAP.themeCss)
    expect(required[0]?.fallback).toBe(NO_FALLBACK)
    expect(isLiveryUsable(result.degraded)).toBe(false)
  })

  it('records an unavailable optional font-role-hooks capability with the legacy fallback', () => {
    const manifest = makeManifest('fixture-caps-hooks', SEEDS_LIGHT, SEEDS_DARK, {
      optional: [CAP.hostFontRoleHooks],
    })
    const result = evaluateCapabilities(ADAPTER_020.capabilities, manifest)
    expect(result.degraded).toContainEqual(
      expect.objectContaining({ id: CAP.hostFontRoleHooks, fallback: 'legacy-font-tokens' }),
    )
    expect(isLiveryUsable(result.degraded)).toBe(true)
    const modern = evaluateCapabilities(ADAPTER_021_RC2.capabilities, manifest)
    expect(modern.degraded).toEqual([])
  })

  it('marks a livery usable when every declared capability is available', () => {
    const manifest = makeManifest('fixture-caps-ok', SEEDS_LIGHT, SEEDS_DARK, {
      required: [CAP.themeCss, CAP.hostFontFamily],
      optional: [CAP.surfaceMaterial, CAP.forcedColors, CAP.hostFontRoleHooks],
    })
    const result = evaluateCapabilities(ADAPTER_021_RC2.capabilities, manifest)
    expect(result.degraded).toEqual([])
    expect(isLiveryUsable(result.degraded)).toBe(true)
  })

  it('does not depend on hard-coded DSH versions (facts drive the result)', () => {
    const manifest = makeManifest('fixture-caps-future', SEEDS_LIGHT, SEEDS_DARK, {
      density: 'compact',
      conversationWidth: 'focused',
      messageFlow: 'separated',
    })
    const futureFacts = capabilityFacts(ADAPTER_020.capabilities, {
      [CAP.hostDensity]: true,
      [CAP.hostTranscriptWidth]: true,
      [CAP.hostMessageFlow]: true,
    })
    const result = evaluateCapabilities(futureFacts, manifest)
    expect(result.effectiveLayout).toEqual(manifest.layout)
    expect(result.degraded).toEqual([])
  })

  it('reports unknown manifest capability ids as unavailable required', () => {
    const manifest = makeManifest('fixture-caps-unknown', SEEDS_LIGHT, SEEDS_DARK, {
      required: ['wallpaper-layer'] as unknown as CapabilityId[],
    })
    const result = evaluateCapabilities(ADAPTER_020.capabilities, manifest)
    expect(result.degraded).toContainEqual(expect.objectContaining({ id: 'wallpaper-layer', fallback: NO_FALLBACK }))
    expect(isLiveryUsable(result.degraded)).toBe(false)
  })

  it('applies the documented fallbacks for generic optional capabilities', () => {
    expect(fallbackForCapability(CAP.hostDensity, false)).toBe('host')
    expect(fallbackForCapability(CAP.hostTranscriptWidth, false)).toBe('host')
    expect(fallbackForCapability(CAP.hostMessageFlow, false)).toBe('stock')
    expect(fallbackForCapability(CAP.surfaceMaterial, false)).toBe('solid')
    expect(fallbackForCapability(CAP.hostFontRoleHooks, false)).toBe('legacy-font-tokens')
    expect(fallbackForCapability(CAP.reducedTransparency, false)).toBe('solid')
    expect(fallbackForCapability(CAP.hostFontFamily, true)).toBe(NO_FALLBACK)
    expect(fallbackForCapability(CAP.themeCss, true)).toBe(NO_FALLBACK)
  })

  it('is deterministic', () => {
    const manifest: LiveryManifest = makeManifest('fixture-caps-deterministic', SEEDS_LIGHT, SEEDS_DARK)
    for (const adapter of [ADAPTER_020, ADAPTER_021_RC2, ADAPTER_021_RC3]) {
      const first = evaluateCapabilities(adapter.capabilities, manifest)
      const second = evaluateCapabilities(adapter.capabilities, manifest)
      expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    }
  })
})
