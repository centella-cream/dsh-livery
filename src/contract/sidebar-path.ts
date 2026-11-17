/** Structured Desktop sidebar capability/path model. Contract facts only; each
 * acceptance run records an observed path separately. */
export interface SidebarContractFacts {
  readonly supportsSidebarTintToken: boolean
  readonly supportsSidebarFillToken: boolean
}

export type ObservedSidebarPath =
  | 'macos-ordinary-tint'
  | 'macos-drawer-fill'
  | 'web-fill'
  | 'no-sidebar'

export interface SidebarParityObservation {
  readonly hostVersion: string
  readonly profile: 'web' | 'desktop'
  readonly platform: 'web' | 'macos'
  readonly path: ObservedSidebarPath
  readonly containerWidth: number
  readonly computedAlpha: number
  readonly mainSurfaceComposite: number
  readonly tolerance: number
  readonly screenshot: string
}

export function canClaimTintParity(facts: SidebarContractFacts, path: ObservedSidebarPath): boolean {
  return path === 'macos-ordinary-tint' && facts.supportsSidebarTintToken
}

export function isParityVerified(observation: SidebarParityObservation): boolean {
  if (observation.path === 'no-sidebar') return false
  return Number.isFinite(observation.computedAlpha)
    && Number.isFinite(observation.mainSurfaceComposite)
    && Math.abs(observation.computedAlpha - observation.mainSurfaceComposite) <= observation.tolerance
}
