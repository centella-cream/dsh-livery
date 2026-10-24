import { describe, expect, it } from 'vitest'
import {
  HOST_CONTRACT_CAPABILITIES,
  NO_FALLBACK,
  evaluateCapabilities,
  fallbackForCapability,
  isLiveryUsable,
  unavailableRequiredCapabilities,
} from '../../src/core/capabilities.js'
import { CAP, type CapabilityId, type ContractCapabilityFacts, type LiveryManifest } from '../../src/core/types.js'
import { HOST_CAPABILITIES } from '../../src/generated/contract.js'
import { makeManifest } from './fixtures.js'

const SEEDS_LIGHT = { accent: '#4f7a52', secondary: '#93b394', surface: '#f4f8f3', text: '#1c2b1d' }
const SEEDS_DARK = { accent: '#83b886', secondary: '#6d9a70', surface: '#141f15', text: '#edf4ec' }

function capabilityFacts(
  unavailable: readonly string[] = [],
  available: readonly string[] = [],
): ContractCapabilityFacts {
  const facts: Record<string, ContractCapabilityFacts[string]> = {}
  for (const [id, fact] of Object.entries(HOST_CAPABILITIES)) {
    facts[id] = { ...fact, available: available.includes(id) ? true : unavailable.includes(id) ? false : fact.available }
  }
  return facts
}

describe('evaluateCapabilities', () => {
  it('serves the frozen host facts and degrades missing layout recipes', () => {
    const manifest = makeManifest('fixture-caps', SEEDS_LIGHT, SEEDS_DARK, {
      density: 'comfortable',
      conversationWidth: 'wide',
      messageFlow: 'separated',
      surfaceStyle: 'glass',
    })
    const result = evaluateCapabilities(HOST_CAPABILITIES, manifest)
    expect(result.map).toEqual(HOST_CAPABILITIES)
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
    const reasons = result.degraded.map((entry) => entry.reason).join(' ')
    expect(reasons).toContain('density')
    expect(isLiveryUsable(result.degraded)).toBe(true)
  })

  it('keeps surfaceStyle=soft/glass when the material capability exists', () => {
    const manifest = makeManifest('fixture-caps-soft', SEEDS_LIGHT, SEEDS_DARK, { surfaceStyle: 'soft' })
    const result = evaluateCapabilities(HOST_CAPABILITIES, manifest)
    expect(result.effectiveLayout.surfaceStyle).toBe('soft')
  })

  it('falls back surfaceStyle to solid when the material capability is gone', () => {
    const manifest = makeManifest('fixture-caps-solid', SEEDS_LIGHT, SEEDS_DARK, { surfaceStyle: 'glass' })
    const result = evaluateCapabilities(capabilityFacts([CAP.surfaceMaterial]), manifest)
    expect(result.effectiveLayout.surfaceStyle).toBe('solid')
    expect(result.degraded).toContainEqual(expect.objectContaining({ id: CAP.surfaceMaterial, fallback: 'solid' }))
  })

  it('marks a livery unusable when a required capability is unavailable', () => {
    const manifest = makeManifest('fixture-caps-required', SEEDS_LIGHT, SEEDS_DARK)
    const result = evaluateCapabilities(capabilityFacts([CAP.themeCss]), manifest)
    const required = unavailableRequiredCapabilities(result.degraded)
    expect(required).toHaveLength(1)
    expect(required[0]?.id).toBe(CAP.themeCss)
    expect(required[0]?.fallback).toBe(NO_FALLBACK)
    expect(isLiveryUsable(result.degraded)).toBe(false)
  })

  it('marks a livery usable when every declared capability is available', () => {
    const manifest = makeManifest('fixture-caps-ok', SEEDS_LIGHT, SEEDS_DARK, {
      required: [CAP.themeCss, CAP.hostFontFamily],
      optional: [CAP.surfaceMaterial, CAP.forcedColors],
    })
    const result = evaluateCapabilities(HOST_CAPABILITIES, manifest)
    expect(result.degraded).toEqual([])
    expect(isLiveryUsable(result.degraded)).toBe(true)
  })

  it('does not depend on hard-coded DSH versions (facts drive the result)', () => {
    const manifest = makeManifest('fixture-caps-future', SEEDS_LIGHT, SEEDS_DARK, {
      density: 'compact',
      conversationWidth: 'focused',
      messageFlow: 'separated',
    })
    const futureFacts = capabilityFacts([], [CAP.hostDensity, CAP.hostTranscriptWidth, CAP.hostMessageFlow])
    const result = evaluateCapabilities(futureFacts, manifest)
    expect(result.effectiveLayout).toEqual(manifest.layout)
    expect(result.degraded).toEqual([])
  })

  it('reports unknown manifest capability ids as unavailable required', () => {
    const manifest = makeManifest('fixture-caps-unknown', SEEDS_LIGHT, SEEDS_DARK, {
      required: ['wallpaper-layer'] as unknown as CapabilityId[],
    })
    const result = evaluateCapabilities(HOST_CAPABILITIES, manifest)
    expect(result.degraded).toContainEqual(expect.objectContaining({ id: 'wallpaper-layer', fallback: NO_FALLBACK }))
    expect(isLiveryUsable(result.degraded)).toBe(false)
  })

  it('applies the documented fallbacks for generic optional capabilities', () => {
    expect(fallbackForCapability(CAP.hostDensity, false)).toBe('host')
    expect(fallbackForCapability(CAP.hostTranscriptWidth, false)).toBe('host')
    expect(fallbackForCapability(CAP.hostMessageFlow, false)).toBe('stock')
    expect(fallbackForCapability(CAP.surfaceMaterial, false)).toBe('solid')
    expect(fallbackForCapability(CAP.reducedTransparency, false)).toBe('solid')
    expect(fallbackForCapability(CAP.hostFontFamily, true)).toBe(NO_FALLBACK)
    expect(fallbackForCapability(CAP.themeCss, true)).toBe(NO_FALLBACK)
  })

  it('is deterministic', () => {
    const manifest: LiveryManifest = makeManifest('fixture-caps-deterministic', SEEDS_LIGHT, SEEDS_DARK)
    const first = evaluateCapabilities(HOST_CAPABILITIES, manifest)
    const second = evaluateCapabilities(HOST_CAPABILITIES, manifest)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(HOST_CONTRACT_CAPABILITIES).toBe(HOST_CAPABILITIES)
  })
})
