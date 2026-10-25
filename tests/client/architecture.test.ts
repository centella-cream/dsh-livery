/**
 * Architecture guards for the multi-version client:
 *
 * - no certified host version literal may appear in `src/client` (compatibility
 *   is decided by the generated adapter registry and capability facts, never by
 *   `if (version === …)` logic);
 * - the removed single-version build constants must not sneak back in;
 * - preview thumbnail URLs come from `catalog.previewsBase`, so only the
 *   handshake validator (which checks the host-declared base) may mention the
 *   route prefix in client code.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CLIENT_DIR = join(process.cwd(), 'src', 'client')

/** All client source files, relative to the package root. */
function clientSources(): string[] {
  return readdirSync(CLIENT_DIR, { recursive: true })
    .map(entry => String(entry))
    .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
    .map(entry => join('src', 'client', entry))
    .sort()
}

function read(entry: string): string {
  return readFileSync(join(process.cwd(), entry), 'utf8')
}

describe('multi-version architecture guards', () => {
  it('contains no hard-coded certified host version strings', () => {
    const offenders: string[] = []
    for (const file of clientSources()) {
      const source = read(file)
      const matches = source.match(/0\.2\.[0-9]+(?:-rc\.[0-9]+)?/g)
      if (matches !== null) offenders.push(`${file}: ${[...new Set(matches)].join(', ')}`)
    }
    expect(offenders).toEqual([])
  })

  it('does not import the removed single-version build constants', () => {
    const banned = /\b(?:ADAPTER_ID|DSH_VERSION|CONTRACT_HASH|HOST_CAPABILITIES)\b/
    const offenders: string[] = []
    for (const file of clientSources()) {
      if (banned.test(read(file))) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })

  it('uses only the generated lite identity registry for adapter selection', () => {
    const indexSource = read(join('src', 'client', 'index.tsx'))
    expect(indexSource).toContain('ADAPTER_IDENTITIES')
    expect(indexSource).not.toMatch(/\bADAPTERS\b/)
    expect(indexSource).not.toMatch(/adapterId\s*===/)
    const handshakeSource = read(join('src', 'client', 'handshake.ts'))
    expect(handshakeSource).toContain('findAdapter')
    expect(handshakeSource).toContain('AdapterIdentity')
    expect(handshakeSource).not.toContain('AdapterRecord')
  })

  it('imports no full adapter records (capability prose/source evidence) into the bundle', () => {
    const offenders: string[] = []
    for (const file of clientSources()) {
      const source = read(file)
      for (const match of source.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'[^']*generated\/contract\.js'/g)) {
        const names = match[1]!.split(',').map(name => name.trim()).filter(Boolean)
        for (const name of names) {
          const bare = name.replace(/^type\s+/, '')
          if (bare !== 'AdapterIdentity' && bare !== 'ADAPTER_IDENTITIES') {
            offenders.push(`${file}: ${bare}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('never builds a preview URL by concatenating the route prefix in the UI', () => {
    const offenders = clientSources().filter(file => file.startsWith(join('src', 'client', 'ui'))
      && read(file).includes('PREVIEW_ROUTE_PREFIX'))
    expect(offenders).toEqual([])
    const gallery = read(join('src', 'client', 'ui', 'Gallery.tsx'))
    expect(gallery).toContain('previewsBase')
    expect(gallery).toContain('previewUrl(')
  })

  it('imports shell slot contracts type-only (no runtime require of layout/sidebar/slots)', () => {
    const valueImport = /import\s*\{[^}]*\}\s*from\s*'(?:@deepseek-ai\/dsh-client-ui-(?:layout|sidebar|slots)|@deepseek-ai\/dsh-client-store)(?:\/client)?'/
    const offenders = clientSources().filter(file => valueImport.test(read(file)))
    expect(offenders).toEqual([])
    const panelDeps = ['@deepseek-ai/dsh-client-ui-layout/client', '@deepseek-ai/dsh-client-ui-sidebar/client']
    for (const file of clientSources()) {
      const source = read(file)
      for (const dep of panelDeps) {
        if (!source.includes(dep)) continue
        expect(source, `${file} imports ${dep}`).toMatch(new RegExp(`import type[^\\n]*from '${dep.replace(/[/.]/g, '\\$&')}'`))
      }
    }
  })

  it('decides the contribution by inject + grace timer, never a synchronous slot probe', () => {
    const indexSource = read(join('src', 'client', 'index.tsx'))
    // inject is the source of truth: activation order differs across profiles.
    expect(indexSource).toContain("ctx.slots.inject('sidebar.panellist'")
    expect(indexSource).toContain("ctx.slots.inject('main'")
    expect(indexSource).toContain('PANEL_NAVIGATION_GRACE_MS')
    expect(indexSource).toContain('setTimeout(')
    expect(indexSource).not.toContain('panelNavigationAvailability')
    expect(indexSource).not.toMatch(/spec\?\.|slots\.spec/)
    const navigation = read(join('src', 'client', 'navigation.ts'))
    expect(navigation).toContain("'sidebar.panellist'")
    expect(navigation).toContain("'main'")
    expect(navigation).toContain('PANEL_NAVIGATION_GRACE_MS')
  })

  it('drives capability display/decisions from the catalog capability map', () => {
    const selfCheck = read(join('src', 'client', 'ui', 'SelfCheck.tsx'))
    expect(selfCheck).toContain('snapshot.capabilities')
    const runtime = read(join('src', 'client', 'runtime.ts'))
    expect(runtime).toContain('catalog.capabilities')
    expect(runtime).not.toMatch(/hostVersion\s*===/)
  })
})
