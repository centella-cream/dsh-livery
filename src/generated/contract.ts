/**
 * GENERATED — do not edit by hand.
 *
 * Frozen capability + hash facts for DSH 0.2.0-rc.2
 * (adapter dsh-0.2.0-rc.2-r1). Regenerate with
 * `pnpm contract:snapshot -- --dsh-install <dsh package root>`.
 */
import type { CapabilityMap } from '../core/types.js'

export interface ContractFacts {
  readonly dshVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly loaderAbiHash: string
  readonly hostApiHash: string
  readonly clientApiHash: string
  readonly tokenHash: string
  readonly layoutHash: string
  readonly profileSchemaHash: string
  readonly nodeRange: string
  readonly clientTarget: string
  readonly evidence: readonly string[]
}

export const CONTRACT_HASH = "sha256:07588f7e671ea4c406b62ddd7dfcf3b63c7ee9fdd1f989d0db28f52b8ced5c66"

export const CONTRACT_FACTS: ContractFacts = {
  "dshVersion": "0.2.0-rc.2",
  "adapterId": "dsh-0.2.0-rc.2-r1",
  "contractHash": "sha256:07588f7e671ea4c406b62ddd7dfcf3b63c7ee9fdd1f989d0db28f52b8ced5c66",
  "loaderAbiHash": "sha256:5c76bff1b599be25d9194e209a8caaefc5d73d6d91e5b5a52078fa1c0948ca67",
  "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
  "clientApiHash": "sha256:756129bac3ef1aec3d3f319de071b41ac22cff3983b36dc5411d0d9e74dff3f3",
  "tokenHash": "sha256:7f6bd7901e23003faa24839b7eb61c7acf20d641f0d1627596e1b51824514b64",
  "layoutHash": "sha256:211505db73094ce64e6b5a9f69d9335ea87f98494e794eac7fb7e088c3b7e199",
  "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
  "nodeRange": "",
  "clientTarget": "chrome120",
  "evidence": [
    "/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/client.js",
    "/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/index.js",
    "/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-5SrrfWpU.js"
  ]
}

/** Capability availability for the certified host build. */
export const HOST_CAPABILITIES: CapabilityMap = {
  "theme-css": {
    "id": "theme-css",
    "available": true,
    "provenance": "documented",
    "required": true,
    "detail": "Host token sheets declare 403 --dsw-* tokens over 177 consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity."
  },
  "host-font-family": {
    "id": "host-font-family",
    "available": true,
    "provenance": "documented",
    "required": true,
    "detail": "Host design tokens expose --dsw-font-family and the --dsw-font-markdown-* ladder; body-scoped declarations override stock."
  },
  "surface-material": {
    "id": "surface-material",
    "available": true,
    "provenance": "documented",
    "required": false,
    "detail": "Alias surface, border, elevation and shadow tokens are documented design tokens."
  },
  "host-density-tokens": {
    "id": "host-density-tokens",
    "available": false,
    "provenance": "absent",
    "required": false,
    "detail": "No documented spacing/control token settable at document level; density falls back to host."
  },
  "host-transcript-width": {
    "id": "host-transcript-width",
    "available": false,
    "provenance": "absent",
    "required": false,
    "detail": "Conversation width is a host-owned user-dragged preference published on component-local custom properties; no public document-level hook. Falls back to host."
  },
  "host-message-flow": {
    "id": "host-message-flow",
    "available": false,
    "provenance": "absent",
    "required": false,
    "detail": "Flow gaps are declared on internal component containers; no documented public hook. Falls back to stock."
  },
  "reduced-transparency": {
    "id": "reduced-transparency",
    "available": true,
    "provenance": "documented",
    "required": false,
    "detail": "CSS media query supported by the certified browser set."
  },
  "forced-colors": {
    "id": "forced-colors",
    "available": true,
    "provenance": "documented",
    "required": false,
    "detail": "CSS media query supported by the certified browser set."
  },
  "reduced-motion": {
    "id": "reduced-motion",
    "available": true,
    "provenance": "documented",
    "required": false,
    "detail": "CSS media query supported by the certified browser set."
  }
}
