import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string): string => readFileSync(`${root}/${path}`, 'utf8')
const json = (path: string): any => JSON.parse(read(path))

describe('0.1.3 release parameterization', () => {
  it('derives release version, tarball and evidence paths instead of hardcoding them', () => {
    const pkg = json('package.json')
    expect(pkg.scripts['release:prepare']).toBe('node scripts/release-prepare.mjs')
    for (const file of [
      'scripts/release-checks.mjs',
      'scripts/release-prepare.mjs',
      'scripts/release-evidence.mjs',
      'scripts/prepublish-check.mjs',
      'scripts/verify-published.mjs',
      'scripts/release-lib.mjs',
    ].filter((path) => path !== 'scripts/release-checks.mjs')) {
      expect(read(file), file).not.toMatch(/dsh-livery-\d+\.\d+\.\d+\.tgz/)
    }
    const workflow = read('.github/workflows/release.yml')
    expect(workflow).not.toMatch(/dsh-livery-0\.\d+\.\d+\.tgz/)
    expect(workflow).toContain('node scripts/release-evidence-list.mjs')
    expect(workflow).toContain('verify-published.mjs')
    expect(workflow).toContain('SHA256SUMS')
    expect(workflow).toContain('gh release upload')
    // Every job must run on the exact triggering SHA, never a moving branch.
    expect([...workflow.matchAll(/ref: \$\{\{ github\.sha \}\}/g)]).toHaveLength(4)
    expect(pkg.scripts.verify).toContain('scripts/acceptance/selftest.mjs')
    const evidenceGate = read('scripts/release-evidence.mjs')
    expect(evidenceGate).toContain('REQUIRED_WEB_CHECKS')
    expect(evidenceGate).toContain('REQUIRED_DESKTOP_CHECKS')
  })

  it('uses the formal matrix for evidence and exact certification claims', () => {
    const matrix = json('contracts/dsh/support-matrix.json')
    expect(matrix.schemaVersion).toBe(2)
    const byVersion = new Map(matrix.entries.map((entry: any) => [entry.hostVersion, entry]))
    const web = byVersion.get('0.2.1-rc.2') as any
    const preview = byVersion.get('0.2.1-rc.4') as any
    const desktop = byVersion.get('0.2.1-rc.3') as any
    expect(web.claimTier).toBe('stable')
    expect(web.distributionChannel).toBe('latest')
    expect(web.certifiedBrowserVersions).toEqual(['156.0.8078.48'])
    expect(web.certifiedRuntimeVersions).toEqual(['22.23.1'])
    expect(web.upstream).toEqual({ githubTag: 'dsh-v0.2.1-rc.2', npmVersion: '0.2.1-rc.2' })
    expect(preview.claimTier).toBe('preview')
    expect(preview.distributionChannel).toBe('next')
    expect(preview.upstream.githubTag).toBeNull()
    expect(desktop.certifiedBrowserVersions).toEqual(['152.0.7977.130'])
    expect(desktop.certifiedRuntimeVersions).toEqual(['24.21.0'])
    for (const entry of matrix.entries) {
      expect(entry.evidence).toEqual([`contracts/dsh/evidence/0.1.3/${entry.hostVersion}-${entry.hostVersion === '0.2.1-rc.3' ? 'desktop-macos' : 'web-chrome'}.json`])
    }
  })

  it('ships only current docs and contracts, not historical archive/proposed support data', () => {
    const pkg = json('package.json')
    const files: string[] = pkg.files
    expect(files).toContain('docs/design')
    expect(files).toContain('docs/research/design-table.json')
    expect(files).toContain('contracts/dsh/0.2.1-rc.4')
    expect(files).not.toContain('docs')
    expect(files).not.toContain('contracts/dsh/support-matrix.proposed.json')
    expect(files).not.toContain('contracts/dsh/0.2.0-rc.2')
  })
})
