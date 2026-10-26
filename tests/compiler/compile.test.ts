/**
 * End-to-end multi-version compiler tests: per-profile determinism, adapter-group
 * byte identity, catalog shape, emitted previews/artifacts, check-mode drift
 * detection and CLI behaviour (all against isolated repo-shaped fixtures under
 * .tmp/ so the working tree is never mutated).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CAP, LIVERY_VERSION } from '../../src/core/types.js'
import type { LiveryManifest } from '../../src/core/types.js'
import type { AdapterRecord } from '../../src/generated/contract.js'
import { ADAPTERS, DEFAULT_ADAPTER, adapterForVersion } from '../../src/generated/contract.js'
import { FONT_STACKS } from '../../src/core/registry.js'
import { stockForVersion } from '../../src/generated/stock.js'
import {
  ARTIFACT_DIR,
  CATALOG_MODULE_PATH,
  MANAGED_DIRS,
  PREVIEW_DIR,
  SUMMARY_PATH,
  compareGeneratedFiles,
  compileCatalog,
  compileFromDisk,
  deriveCompiledAt,
  findRepoRoot,
  groupAdaptersByProfile,
  loadManifestSources,
  pruneGeneratedDirs,
  serializeCatalogModule,
  writeGeneratedFiles,
} from '../../src/compiler/compile.js'
import {
  isAllowedTokenValue,
  isHostileTokenValue,
  isMetricFontToken,
  isStyleTokenName,
  tokenSetsFor,
} from '../../src/compiler/audit.js'
import { main } from '../../src/compiler/cli.js'
import { REPO_ROOT, createFixtureRoot, liveryIds, readManifest } from './helpers.js'

const compileOnce = () => compileFromDisk(findRepoRoot(REPO_ROOT))

function collectLogs(): {
  readonly lines: string[]
  readonly errors: string[]
  readonly log: (line: string) => void
  readonly error: (line: string) => void
} {
  const lines: string[] = []
  const errors: string[] = []
  return { lines, errors, log: (line) => lines.push(line), error: (line) => errors.push(line) }
}

const first = compileOnce()
/** Shipped livery count (10 today, will grow; tests must never hardcode it). */
const LIVERY_COUNT = liveryIds().length
const PREVIEW_COUNT = LIVERY_COUNT * 4
const FILES_PER_PROFILE = PREVIEW_COUNT + 1 + 4 // svgs + index + 4 audit artifacts
const TOTAL_FILES = 1 + first.profileCount * FILES_PER_PROFILE + 1 // catalog + profiles + summary
const profileById = (id: string) => first.profiles.find((profile) => profile.profile.profileId === id)

describe('compileCatalog — shipped adapters only', () => {
  it('compiles one catalog per distinct catalogProfile for the shipped adapter set', () => {
    expect(first.problems, JSON.stringify(first.problems, null, 2)).toEqual([])
    expect(first.ok).toBe(true)
    // Generated adapters are filtered by the formal support matrix: only the
    // approved 0.2.1-rc.2 adapter is shipped (historical snapshots stay on disk).
    const groups = groupAdaptersByProfile(ADAPTERS)
    expect(first.profileCount).toBe(groups.length)
    expect(first.adapterCount).toBe(ADAPTERS.length)
    expect(ADAPTERS.map((adapter) => adapter.hostVersion)).toEqual(['0.2.1-rc.2'])
    expect(first.profiles.map((profile) => profile.profile.profileId)).toEqual(groups.map((group) => group.profileId))
    for (const group of groups) {
      const compiled = profileById(group.profileId)
      expect(compiled).toBeDefined()
      expect(compiled?.profile.sourceAdapters).toEqual(group.adapters.map((adapter) => adapter.hostVersion))
      expect(compiled?.representative.hostVersion).toBe(group.adapters[0]?.hostVersion)
      expect(compiled?.profile.liveries).toHaveLength(LIVERY_COUNT)
      expect(compiled?.previewCount).toBe(PREVIEW_COUNT)
    }
  })

  it('ships only formal-matrix approved adapters (historical versions are not generated)', () => {
    expect(adapterForVersion('0.2.1-rc.2')?.adapterId).toBe('dsh-0.2.1-rc.2-r1')
    expect(adapterForVersion('0.2.0-rc.2')).toBeUndefined()
    expect(adapterForVersion('0.2.1-rc.3')).toBeUndefined()
    expect(ADAPTERS).toHaveLength(1)
    expect(DEFAULT_ADAPTER.hostVersion).toBe('0.2.1-rc.2')
    // The shipped adapter still points at a committed contract snapshot.
    expect(DEFAULT_ADAPTER.contractHash).toMatch(/^sha256:[0-9a-f]{64}$/u)
  })

  it('pins the shipped profile to its exact host token contract', () => {
    const shipped = first.profiles[0]
    if (shipped === undefined) throw new Error('profile missing')
    expect(shipped.stock.version).toBe('0.2.1-rc.2')
    expect(shipped.stock.tokenContractHash).toBe(adapterForVersion('0.2.1-rc.2')?.tokenHash)
    expect(shipped.report.counts.tokenConsumed).toBe(176)
    expect(shipped.report.counts.tokenRequired).toBe(144)
    expect(shipped.report.counts.tokenCovered).toBe(78)
  })

  it('is deterministic: same sources produce byte-identical outputs', () => {
    const second = compileOnce()
    expect(second.ok).toBe(true)
    for (const [index, profile] of first.profiles.entries()) {
      const twin = second.profiles[index]
      expect(twin?.report.sourceHash).toBe(profile.report.sourceHash)
      expect(twin?.report.compiledAt).toBe(profile.report.compiledAt)
      expect(twin?.profile.liveries).toEqual(profile.profile.liveries)
    }
    expect([...second.files.keys()].sort()).toEqual([...first.files.keys()].sort())
    for (const [file, content] of first.files) expect(second.files.get(file), file).toBe(content)
  })

  it('derives compiledAt from the per-profile source hash, never the wall clock', () => {
    for (const profile of first.profiles) {
      expect(profile.report.sourceHash).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(profile.report.compiledAt).toBe(deriveCompiledAt(profile.report.sourceHash))
    }
  })

  it('keeps every gate green for every profile', () => {
    for (const profile of first.profiles) {
      expect(profile.report.gates).toEqual({
        validation: true,
        contrast: true,
        tokenCoverage: true,
        cssSafety: true,
        sizeBudget: true,
        capabilities: true,
        adapterRenderIdentity: true,
        styleTokens: true,
      })
      expect(profile.report.counts.liveries).toBe(LIVERY_COUNT)
      expect(profile.report.counts.previews).toBe(PREVIEW_COUNT)
      expect(profile.report.counts.contrastFailures).toBe(0)
      expect(profile.report.counts.tokenMissing).toBe(0)
      expect(profile.report.counts.maxLiveryCssBytes).toBeLessThanOrEqual(12 * 1024)
      expect(profile.report.counts.maxBootCssBytes).toBeLessThanOrEqual(12 * 1024)
      expect(profile.contrast.pass).toBe(true)
      expect(profile.tokenCoverage.pass).toBe(true)
      expect(profile.cssSafety.pass).toBe(true)
    }
  })

  it('selects the typography strategy from capability facts, not from a version string', () => {
    // Synthesize a legacy-capability profile from the shipped adapter: same stock
    // snapshot, same profile-manifest set, only the documented font-role-hook
    // capability is absent. This isolates the strategy switch without needing a
    // historical stock snapshot to be shipped.
    const shipped = DEFAULT_ADAPTER
    const hookEntry = shipped.capabilities['host-font-role-hooks']
    const legacyCapabilities = {
      ...shipped.capabilities,
      'host-font-role-hooks': {
        id: 'host-font-role-hooks',
        available: false,
        provenance: 'absent' as const,
        required: false,
        detail: 'probe: legacy host without font role hooks',
      },
    }
    expect(hookEntry?.available).toBe(true)
    const legacyAdapter: AdapterRecord = {
      ...shipped,
      catalogProfile: 'sha256:legacy-probe-profile',
      capabilities: legacyCapabilities,
    }
    const result = compileCatalog({
      manifests: loadManifestSources(REPO_ROOT),
      adapters: [legacyAdapter, shipped],
    })
    expect(result.problems).toEqual([])
    expect(result.profiles).toHaveLength(2)
    const legacyProfile = result.profiles.find((profile) => profile.representative.catalogProfile === legacyAdapter.catalogProfile)
    const modernProfile = result.profiles.find((profile) => profile.representative.catalogProfile === shipped.catalogProfile)
    if (legacyProfile === undefined || modernProfile === undefined) throw new Error('profiles missing')
    const legacyFjord = legacyProfile.profile.liveries.find((livery) => livery.id === 'fjord')
    const modernFjord = modernProfile.profile.liveries.find((livery) => livery.id === 'fjord')
    if (legacyFjord === undefined || modernFjord === undefined) throw new Error('fjord missing')
    // Legacy strategy: --dsw-font-family token pair, never the host role hooks.
    expect(legacyFjord.css.typography).toContain('--dsw-font-family:')
    expect(legacyFjord.css.typography).not.toMatch(/--dsh-font-family-(text|code)\s*:/u)
    // Hook strategy: documented role hooks only, never the composite ladder.
    expect(modernFjord.css.typography).toContain('--dsh-font-family-text:')
    expect(modernFjord.css.typography).toContain('--dsh-font-family-code:')
    expect(modernFjord.css.typography).not.toContain('--dsw-font-')
    // Same palette semantics, different strategy → different bytes/hashes.
    expect(legacyFjord.css.tokens).toBe(modernFjord.css.tokens)
    expect(modernFjord.cssHash).not.toBe(legacyFjord.cssHash)
    expect(Buffer.byteLength(modernFjord.css.typography)).toBeLessThan(Buffer.byteLength(legacyFjord.css.typography))
  })

  it('honours explicit manifest token overrides even when the token is unconsumed', () => {
    const base = readManifest('fjord')
    const makeManifest = (id: string, order: number, withOverride: boolean): LiveryManifest => {
      const clone = structuredClone(base)
      return {
        ...clone,
        id,
        meta: { ...clone.meta, order },
        variants: {
          light: {
            seeds: clone.variants.light.seeds,
            ...(withOverride ? { tokens: { '--dsw-specific-tip': '#f2e8ee' } } : {}),
          },
          dark: {
            seeds: clone.variants.dark.seeds,
            ...(withOverride ? { tokens: { '--dsw-specific-tip': '#2b2027' } } : {}),
          },
        },
      }
    }
    const result = compileCatalog({
      manifests: [
        { file: 'liveries/override-probe/manifest.json', raw: makeManifest('override-probe', 9998, true) },
        { file: 'liveries/plain-probe/manifest.json', raw: makeManifest('plain-probe', 9999, false) },
      ],
    })
    expect(result.problems).toEqual([])
    expect(result.ok).toBe(true)
    for (const profile of result.profiles) {
      const overridden = profile.profile.liveries.find((livery) => livery.id === 'override-probe')
      if (overridden === undefined) throw new Error('override-probe missing')
      expect(overridden.light.tokens['--dsw-specific-tip']).toBe('#f2e8ee')
      expect(overridden.dark.tokens['--dsw-specific-tip']).toBe('#2b2027')
      expect(overridden.css.tokens).toContain('--dsw-specific-tip:#f2e8ee')
      const plain = profile.profile.liveries.find((livery) => livery.id === 'plain-probe')
      if (plain === undefined) throw new Error('plain-probe missing')
      expect(plain.css.tokens).not.toContain('--dsw-specific-tip')
      expect(overridden.cssHash).not.toBe(plain.cssHash)
    }
  })

  it('applies capability fallbacks to the effective layout and records degradation', () => {
    for (const profile of first.profiles) {
      for (const livery of profile.profile.liveries) {
        const declared = readManifest(livery.id)
        expect(livery.layout.density, livery.id).toBe('host')
        expect(livery.layout.conversationWidth, livery.id).toBe('host')
        expect(livery.layout.messageFlow, livery.id).toBe('stock')
        expect(livery.layout.surfaceStyle, livery.id).toBe(declared.layout.surfaceStyle)
        for (const degrade of livery.audit.degraded) {
          expect(degrade.fallback).not.toBe('none')
          if (degrade.id === CAP.hostDensity) expect(degrade.fallback).toBe('host')
          if (degrade.id === CAP.hostTranscriptWidth) expect(degrade.fallback).toBe('host')
          if (degrade.id === CAP.hostMessageFlow) expect(degrade.fallback).toBe('stock')
          if (degrade.id === CAP.hostFontRoleHooks) expect(degrade.fallback).toBe('legacy-font-tokens')
        }
      }
    }
  })

  it('emits resolved typography, concrete consumed tokens and safe CSS', () => {
    for (const profile of first.profiles) {
      const sets = tokenSetsFor(profile.stock)
      for (const livery of profile.profile.liveries) {
        const manifest = readManifest(livery.id)
        expect(livery.typography.ui['zh-CN']).toBe(FONT_STACKS[manifest.typography.ui['zh-CN']].stack)
        expect(livery.typography.ui['en-US']).toBe(FONT_STACKS[manifest.typography.ui['en-US']].stack)
        expect(livery.typography.content['zh-CN']).toBe(FONT_STACKS[manifest.typography.content['zh-CN']].stack)
        expect(livery.typography.code).toBe(FONT_STACKS[manifest.typography.code].stack)
        const explicit = new Set([
          ...Object.keys(manifest.variants.light.tokens ?? {}),
          ...Object.keys(manifest.variants.dark.tokens ?? {}),
        ])
        for (const variant of [livery.light, livery.dark]) {
          for (const [name, value] of Object.entries(variant.tokens)) {
            expect(
              sets.emissionAllowed.has(name) || explicit.has(name),
              `${profile.profile.profileId}/${livery.id}: ${name}`,
            ).toBe(true)
            if (isStyleTokenName(name) || isMetricFontToken(name)) {
              expect(isAllowedTokenValue(name, value), `${profile.profile.profileId}/${livery.id}: ${name}`).toBe(true)
            } else {
              expect(value, `${profile.profile.profileId}/${livery.id}: ${name}`).toMatch(/^(?:#[0-9a-f]{6,8}|rgba?\(|linear-gradient\(|var\(--livery-)/i)
              expect(isHostileTokenValue(value), `${profile.profile.profileId}/${livery.id}: ${name}`).toBe(false)
            }
          }
        }
        expect(livery.css.tokens).toContain(`body[data-dsh-livery="${livery.id}"]`)
        expect(livery.css.layout).toContain('@layer dsh-livery.compat')
        for (const fragment of [livery.css.tokens, livery.css.typography, livery.css.layout]) {
          expect(fragment).not.toContain('!important')
          expect(fragment).not.toContain('url(')
        }
        expect(livery.cssHash).toMatch(/^sha256:[0-9a-f]{64}$/)
        expect(livery.hash).toMatch(/^sha256:[0-9a-f]{64}$/)
        expect(livery.audit.contrastFailures).toBe(0)
        expect(livery.audit.tokenCoverage.missing).toEqual([])
      }
    }
  })

  it('keeps the catalog module free of the old single-profile exports', () => {
    const text = first.files.get(CATALOG_MODULE_PATH)
    if (text === undefined) throw new Error('generated catalog module missing')
    expect(text).toContain("import type { CatalogProfileData } from '../core/types.js'")
    expect(text).toContain('export type CatalogProfile = CatalogProfileData')
    expect(text).toContain('export const CATALOG_PROFILES: Readonly<Record<string, CatalogProfile>> = {')
    expect(text).toContain('export const CATALOG_PROFILE_IDS: readonly string[] = [')
    expect(text).not.toContain('export const LIVERIES')
    expect(text).not.toContain('CATALOG_META')
    expect(text).not.toMatch(/\bundefined\b/)
    expect(text.endsWith('\n')).toBe(true)
    // The serializer is deterministic and escapes any accidental comment terminator.
    expect(serializeCatalogModule(first.profiles.map((profile) => profile.profile))).toBe(text)
  })

  it('serializes one preview directory and one audit directory per profile', () => {
    for (const profile of first.profiles) {
      const profileId = profile.profile.profileId
      const previewFiles = [...first.files.keys()].filter((file) => file.startsWith(`${PREVIEW_DIR}/${profileId}/`))
      expect(previewFiles).toHaveLength(PREVIEW_COUNT + 1) // svg + index.json
      const index = JSON.parse(first.files.get(`${PREVIEW_DIR}/${profileId}/index.json`) ?? '{}') as {
        files: string[]
        count: number
      }
      expect(index.count).toBe(PREVIEW_COUNT)
      expect(index.files).toHaveLength(PREVIEW_COUNT)
      expect([...index.files].sort()).toEqual(index.files)
      for (const file of index.files) expect(first.files.has(`${PREVIEW_DIR}/${profileId}/${file}`)).toBe(true)

      for (const artifact of ['report.json', 'contrast.json', 'token-coverage.json', 'css-safety.json']) {
        const file = `${ARTIFACT_DIR}/${profileId}/${artifact}`
        expect(first.files.get(file), file).toBeDefined()
        const parsed = JSON.parse(first.files.get(file) ?? '{}') as { profileId: string; tokenContractHash: string }
        expect(parsed.profileId).toBe(profileId)
        expect(parsed.tokenContractHash).toBe(profile.stock.tokenContractHash)
      }
    }
    expect(first.files.get(SUMMARY_PATH)).toBeDefined()
    expect(first.files.size).toBe(TOTAL_FILES)
  })

  it('writes a cross-profile summary mapping adapters to profiles', () => {
    const summary = first.summary
    if (summary === null) throw new Error('summary missing')
    expect(summary.pass).toBe(true)
    expect(summary.counts).toEqual({
      profiles: first.profileCount,
      adapters: ADAPTERS.length,
      liveries: LIVERY_COUNT * first.profileCount,
      previews: PREVIEW_COUNT * first.profileCount,
    })
    expect(summary.adapters).toHaveLength(ADAPTERS.length)
    for (const adapter of ADAPTERS) {
      const entry = summary.adapters.find((candidate) => candidate.hostVersion === adapter.hostVersion)
      expect(entry, adapter.hostVersion).toBeDefined()
      expect(entry?.catalogProfile).toBe(adapter.catalogProfile)
      expect(entry?.adapterId).toBe(adapter.adapterId)
      expect(entry?.tokenContractHash).toBe(stockForVersion(adapter.hostVersion)?.tokenContractHash)
      expect(entry?.liveries).toBe(LIVERY_COUNT)
    }
    for (const profile of summary.profiles) {
      expect(profile.tokenCoverage.missing).toBe(0)
      expect(profile.contrast.failures).toBe(0)
      expect(profile.cssSafety.pass).toBe(true)
      expect(profile.gates.adapterRenderIdentity).toBe(true)
    }
    // The shipped 0.2.1 token contract declares 176 consumed tokens.
    expect(summary.profiles[0]?.tokenCoverage.consumed).toBe(176)
  })

  it('matches the committed src/generated/liveries.ts (committed catalog is current)', async () => {
    const generated = (await import('../../src/generated/liveries.js')) as {
      CATALOG_PROFILES: Readonly<Record<string, { profileId: string; liveries: unknown[]; sourceAdapters: string[]; compiledAt: string; sourceHash: string }>>
      CATALOG_PROFILE_IDS: readonly string[]
    }
    expect([...generated.CATALOG_PROFILE_IDS].sort()).toEqual(first.profiles.map((profile) => profile.profile.profileId).sort())
    for (const profile of first.profiles) {
      const committed = generated.CATALOG_PROFILES[profile.profile.profileId]
      expect(committed, profile.profile.profileId).toBeDefined()
      expect(committed?.sourceAdapters).toEqual(profile.profile.sourceAdapters)
      expect(committed?.sourceHash).toBe(profile.profile.sourceHash)
      expect(committed?.compiledAt).toBe(profile.profile.compiledAt)
      expect(committed?.liveries).toEqual(profile.profile.liveries)
    }
  })

  it('fails closed when a manifest does not validate for the certified hosts', () => {
    const bad: LiveryManifest = readManifest('fjord')
    const result = compileCatalog({
      manifests: [{ file: 'liveries/fjord/manifest.json', raw: { ...structuredClone(bad), id: 'Fjord!' } }],
    })
    expect(result.ok).toBe(false)
    expect(result.profiles).toEqual([])
    expect(result.files.size).toBe(0)
    expect(result.problems.length).toBeGreaterThan(0)
    expect(result.problems[0]?.code).toMatch(/^validation\./)
  })

  it('fails when an adapter group is not render-equivalent', () => {
    // Hijack the shipped adapter into a second, deliberately divergent profile:
    // same version/stock, but a capability map without font-role hooks renders a
    // different typography strategy. The build must fail the identity gate
    // instead of emitting a misleading catalog.
    const shipped = DEFAULT_ADAPTER
    const divergent: AdapterRecord = {
      ...shipped,
      catalogProfile: shipped.catalogProfile,
      capabilities: {
        ...shipped.capabilities,
        'host-font-role-hooks': {
          id: 'host-font-role-hooks',
          available: false,
          provenance: 'absent' as const,
          required: false,
          detail: 'probe: diverging capability map must fail the group identity gate',
        },
      },
    }
    const result = compileCatalog({
      manifests: loadManifestSources(REPO_ROOT),
      adapters: [shipped, divergent],
    })
    expect(result.ok).toBe(false)
    expect(result.problems.some((problem) => problem.code === 'profile.render-mismatch')).toBe(true)
    expect(result.profiles.every((profile) => profile.report.gates.adapterRenderIdentity === false)).toBe(true)
  })
})

describe('generated catalog and previews on disk', () => {
  it('has one preview directory per profile with 4 SVGs per livery', () => {
    for (const profile of first.profiles) {
      const index = JSON.parse(readFileSync(join(REPO_ROOT, PREVIEW_DIR, profile.profile.profileId, 'index.json'), 'utf8')) as {
        files: string[]
        count: number
      }
      expect(index.count).toBe(PREVIEW_COUNT)
      for (const file of index.files) {
        expect(existsSync(join(REPO_ROOT, PREVIEW_DIR, profile.profile.profileId, file)), file).toBe(true)
      }
    }
    expect(existsSync(join(REPO_ROOT, CATALOG_MODULE_PATH))).toBe(true)
    expect(existsSync(join(REPO_ROOT, SUMMARY_PATH))).toBe(true)
  })

  it('has no stale single-profile generated files', () => {
    // The old round emitted lib/previews/*.svg directly and artifacts/liveries/*.json.
    const legacyPreview = join(REPO_ROOT, PREVIEW_DIR, 'fjord-zh-light.svg')
    expect(existsSync(legacyPreview)).toBe(false)
    expect(existsSync(join(REPO_ROOT, ARTIFACT_DIR, 'report.json'))).toBe(false)
  })
})

describe('CLI compile / check drift detection', () => {
  it('compiles into an isolated fixture, then passes check, then detects multi-profile drift', async () => {
    const fixture = createFixtureRoot()
    try {
      const compileLogs = collectLogs()
      const compileCode = await main(['liveries:compile', '--version', '0.2.1-rc.2', '--dsh-install', '/nonexistent'], {
        cwd: fixture.dir,
        log: compileLogs.log,
        error: compileLogs.error,
      })
      expect(compileCode, compileLogs.errors.join('\n')).toBe(0)
      expect(compileLogs.errors).toEqual([])
      expect(compileLogs.lines.some((line) => line.startsWith('livery:compile:'))).toBe(true)
      expect(compileLogs.lines.some((line) => line.includes(`${first.profileCount} catalog profile(s) / ${ADAPTERS.length} adapter(s)`))).toBe(true)
      expect(existsSync(join(fixture.dir, CATALOG_MODULE_PATH))).toBe(true)
      for (const profile of first.profiles) {
        expect(existsSync(join(fixture.dir, PREVIEW_DIR, profile.profile.profileId, 'index.json'))).toBe(true)
        expect(existsSync(join(fixture.dir, ARTIFACT_DIR, profile.profile.profileId, 'report.json'))).toBe(true)
      }
      expect(existsSync(join(fixture.dir, SUMMARY_PATH))).toBe(true)

      const checkLogs = collectLogs()
      expect(await main(['liveries:check'], { cwd: fixture.dir, log: checkLogs.log, error: checkLogs.error })).toBe(0)
      expect(checkLogs.errors).toEqual([])
      expect(checkLogs.lines.some((line) => line.includes('match the manifests'))).toBe(true)

      // Byte drift in the generated catalog is detected.
      const catalogPath = join(fixture.dir, CATALOG_MODULE_PATH)
      writeFileSync(catalogPath, `${readFileSync(catalogPath, 'utf8')}\n// tampered\n`, 'utf8')
      const driftLogs = collectLogs()
      expect(await main(['check'], { cwd: fixture.dir, log: driftLogs.log, error: driftLogs.error })).toBe(1)
      expect(driftLogs.errors.some((line) => line.includes('DRIFT changed') && line.includes(CATALOG_MODULE_PATH))).toBe(true)

      // A deleted per-profile preview is drift; a stale file of the old layout is
      // reported as unexpected drift, and a fresh compile prunes it.
      const firstProfile = first.profiles[0]
      if (firstProfile === undefined) throw new Error('no profile')
      writeFileSync(join(fixture.dir, PREVIEW_DIR, firstProfile.profile.profileId, 'zzz-stale.svg'), '<svg/>', 'utf8')
      writeFileSync(join(fixture.dir, PREVIEW_DIR, 'legacy-root.svg'), '<svg/>', 'utf8')
      writeFileSync(join(fixture.dir, ARTIFACT_DIR, 'legacy-report.json'), '{}\n', 'utf8')
      const staleLogs = collectLogs()
      expect(await main(['check'], { cwd: fixture.dir, log: staleLogs.log, error: staleLogs.error })).toBe(1)
      expect(staleLogs.errors.some((line) => line.includes('unexpected') && line.includes('zzz-stale.svg'))).toBe(true)
      expect(staleLogs.errors.some((line) => line.includes('unexpected') && line.includes('legacy-root.svg'))).toBe(true)
      expect(staleLogs.errors.some((line) => line.includes('unexpected') && line.includes('legacy-report.json'))).toBe(true)

      const recompile = collectLogs()
      expect(await main(['compile'], { cwd: fixture.dir, log: recompile.log, error: recompile.error })).toBe(0)
      expect(recompile.lines.some((line) => line.includes('pruned'))).toBe(true)
      expect(existsSync(join(fixture.dir, PREVIEW_DIR, 'legacy-root.svg'))).toBe(false)
      expect(existsSync(join(fixture.dir, ARTIFACT_DIR, 'legacy-report.json'))).toBe(false)
      const finalCheck = collectLogs()
      expect(await main(['check'], { cwd: fixture.dir, log: finalCheck.log, error: finalCheck.error })).toBe(0)
    } finally {
      fixture.cleanup()
    }
  })

  it('returns usage error for an unknown command and exit 1 for invalid manifests', async () => {
    const fixture = createFixtureRoot()
    try {
      const usage = collectLogs()
      expect(await main(['nonsense'], { cwd: fixture.dir, log: usage.log, error: usage.error })).toBe(2)
      expect(usage.errors.some((line) => line.includes('unknown command'))).toBe(true)

      const manifestPath = join(fixture.dir, 'liveries', 'fjord', 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
      writeFileSync(manifestPath, JSON.stringify({ ...manifest, id: 'Fjord!' }, null, 2), 'utf8')
      const invalid = collectLogs()
      expect(await main(['compile'], { cwd: fixture.dir, log: invalid.log, error: invalid.error })).toBe(1)
      expect(invalid.errors.some((line) => line.includes('FAIL'))).toBe(true)
    } finally {
      fixture.cleanup()
    }
  })

  it('runs every audit command green across profiles and writes per-profile artifacts', async () => {
    const fixture = createFixtureRoot()
    try {
      const compileLogs = collectLogs()
      expect(await main(['compile'], { cwd: fixture.dir, log: compileLogs.log, error: compileLogs.error })).toBe(0)
      for (const command of ['audit:tokens', 'audit:css', 'audit:contrast'] as const) {
        const logs = collectLogs()
        const code = await main([command], { cwd: fixture.dir, log: logs.log, error: logs.error })
        expect(code, `${command}: ${logs.errors.join('\n')}`).toBe(0)
        expect(logs.lines.filter((line) => line.startsWith(`livery:${command}: profile`))).toHaveLength(first.profileCount)
      }
      for (const profile of first.profiles) {
        for (const file of ['token-coverage.json', 'css-safety.json', 'contrast.json']) {
          expect(existsSync(join(fixture.dir, ARTIFACT_DIR, profile.profile.profileId, file)), file).toBe(true)
        }
      }
      const contrast = JSON.parse(
        readFileSync(join(fixture.dir, ARTIFACT_DIR, first.profiles[0]?.profile.profileId ?? '', 'contrast.json'), 'utf8'),
      ) as { summary: { failures: number }; pass: boolean }
      expect(contrast.summary.failures).toBe(0)
      expect(contrast.pass).toBe(true)
    } finally {
      fixture.cleanup()
    }
  })
})

describe('emit / check helpers', () => {
  it('writeGeneratedFiles + compareGeneratedFiles + pruneGeneratedDirs are consistent', () => {
    const fixture = createFixtureRoot()
    try {
      writeGeneratedFiles(fixture.dir, first.files)
      expect(compareGeneratedFiles(fixture.dir, first.files)).toEqual([])
      expect(pruneGeneratedDirs(fixture.dir, first.files)).toEqual([])
      // Stale files under managed dirs are unexpected drift.
      writeFileSync(join(fixture.dir, PREVIEW_DIR, 'old-root.svg'), '<svg/>', 'utf8')
      writeFileSync(join(fixture.dir, ARTIFACT_DIR, 'old.json'), '{}\n', 'utf8')
      const drift = compareGeneratedFiles(fixture.dir, first.files)
      expect(drift.filter((entry) => entry.kind === 'unexpected').map((entry) => entry.file).sort()).toEqual([
        `${ARTIFACT_DIR}/old.json`,
        `${PREVIEW_DIR}/old-root.svg`,
      ])
      expect(pruneGeneratedDirs(fixture.dir, first.files).sort()).toEqual([
        `${ARTIFACT_DIR}/old.json`,
        `${PREVIEW_DIR}/old-root.svg`,
      ])
      expect(compareGeneratedFiles(fixture.dir, first.files)).toEqual([])
      expect(MANAGED_DIRS).toEqual([PREVIEW_DIR, ARTIFACT_DIR])
    } finally {
      fixture.cleanup()
    }
  })

  it('has valid per-profile generated catalog identities', () => {
    for (const profile of first.profiles) {
      expect(profile.report.schemaVersion).toBe(1)
      expect(profile.report.compilerVersion).toBe(LIVERY_VERSION)
      expect(profile.report.tokenContractHash).toBe(profile.stock.tokenContractHash)
      expect(profile.report.adapters.length).toBe(profile.adapters.length)
      expect(profile.report.liveries.map((livery) => livery.id).sort()).toEqual(liveryIds())
      for (const livery of profile.profile.liveries) {
        expect(livery.audit.tokenCoverage.missing).toEqual([])
        expect(livery.audit.cssSafety.pass).toBe(true)
      }
    }
  })

  it('emits token coverage artifacts keyed to each token contract', () => {
    for (const profile of first.profiles) {
      const artifact = profile.tokenCoverage
      expect(artifact.counts.consumed).toBe(profile.report.counts.tokenConsumed)
      expect(artifact.counts.required).toBe(profile.report.counts.tokenRequired)
      expect(artifact.counts.missing).toBe(0)
      expect(artifact.tokenContractHash).toBe(profile.stock.tokenContractHash)
      expect(artifact.exemptionVersion.length).toBeGreaterThan(0)
    }
    expect(first.profiles[0]?.tokenCoverage.counts.consumed).toBe(176)
  })
})
