import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { canClaimTintParity, isParityVerified } from '../../src/contract/sidebar-path.js'

const root = process.cwd()

describe('sidebar path facts', () => {
  it('is derived from frozen sidebar token surfaces for every supported host', () => {
    const facts = JSON.parse(readFileSync(join(root, 'contracts/dsh/sidebar-paths.json'), 'utf8')) as Record<string, { supportsSidebarTintToken: boolean; supportsSidebarFillToken: boolean }>
    for (const [version, value] of Object.entries(facts)) {
      const contract = JSON.parse(readFileSync(join(root, 'contracts/dsh', version, 'contract.json'), 'utf8')) as { tokens?: { tokens?: unknown[]; consumed?: string[]; undeclaredButRead?: string[] } }
      const names = new Set<string>([
        ...(contract.tokens?.consumed ?? []),
        ...(contract.tokens?.undeclaredButRead ?? []),
        ...(contract.tokens?.tokens ?? []).flatMap((entry) => typeof entry === 'string' ? [entry] : typeof entry === 'object' && entry !== null && 'name' in entry && typeof entry.name === 'string' ? [entry.name] : []),
      ])
      expect(value.supportsSidebarFillToken).toBe(names.has('--dsw-specific-sidebar-fill'))
      expect(value.supportsSidebarTintToken).toBe(names.has('--dsw-specific-sidebar-tint'))
    }
  })

  it('does not claim tint parity without both the tint token fact and the observed tint path', () => {
    expect(canClaimTintParity({ supportsSidebarTintToken: false, supportsSidebarFillToken: true }, 'macos-ordinary-tint')).toBe(false)
    expect(canClaimTintParity({ supportsSidebarTintToken: true, supportsSidebarFillToken: true }, 'macos-drawer-fill')).toBe(false)
    expect(canClaimTintParity({ supportsSidebarTintToken: true, supportsSidebarFillToken: true }, 'macos-ordinary-tint')).toBe(true)
  })

  it('requires an observed alpha within tolerance', () => {
    const base = { hostVersion: '0.2.2-rc.3', profile: 'desktop' as const, platform: 'macos' as const, path: 'macos-ordinary-tint' as const, containerWidth: 1440, tolerance: 0.01, screenshot: 'x.png' }
    expect(isParityVerified({ ...base, computedAlpha: 0.65, mainSurfaceComposite: 0.65 })).toBe(true)
    expect(isParityVerified({ ...base, computedAlpha: 0.5, mainSurfaceComposite: 0.65 })).toBe(false)
  })
})
