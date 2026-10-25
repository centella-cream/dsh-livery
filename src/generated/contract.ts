/**
 * GENERATED — do not edit by hand.
 *
 * Frozen adapter registry for every certified DSH host build. Compatibility
 * is decided by exact version + adapter id + contract hash; unknown versions
 * fail closed to stock. Regenerate with
 * `pnpm contract:regenerate` after adding or refreshing a contract snapshot.
 */
import type { CapabilityMap } from '../core/types.js'

/** One certified host build. */
export interface AdapterRecord {
  /** Exact DSH version (no range, no wildcard). */
  readonly hostVersion: string
  /** Adapter identity: `dsh-<version>-r<rev>`. */
  readonly adapterId: string
  /** sha256 over the six class hashes + node range + client target. */
  readonly contractHash: string
  readonly loaderAbiHash: string
  readonly hostApiHash: string
  readonly clientApiHash: string
  readonly tokenHash: string
  readonly layoutHash: string
  readonly profileSchemaHash: string
  readonly nodeRange: string
  readonly nodeRangeSource: string
  readonly clientTarget: string
  /** Exact module table seeded by this host build. */
  readonly platformModules: readonly string[]
  /** Capability facts for this host build. */
  readonly capabilities: CapabilityMap
  /** Catalog profile id: versions sharing it render byte-identical CSS. */
  readonly catalogProfile: string
  /** `installed-package` (npm/CLI) or `packaged-app` (Electron app.asar). */
  readonly sourceKind: 'installed-package' | 'packaged-app'
  readonly sourceEvidence: readonly string[]
  readonly capturedAt: string
}

/** Every certified host build, ascending by version. */
export const ADAPTERS: readonly AdapterRecord[] = [
  {
    "hostVersion": "0.2.0-rc.2",
    "adapterId": "dsh-0.2.0-rc.2-r1",
    "contractHash": "sha256:42abf8ebc5ec1df1e6abd6760680ec82fd062db650036e5e9f2a052138b6b2ce",
    "loaderAbiHash": "sha256:5c76bff1b599be25d9194e209a8caaefc5d73d6d91e5b5a52078fa1c0948ca67",
    "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
    "clientApiHash": "sha256:756129bac3ef1aec3d3f319de071b41ac22cff3983b36dc5411d0d9e74dff3f3",
    "tokenHash": "sha256:7f6bd7901e23003faa24839b7eb61c7acf20d641f0d1627596e1b51824514b64",
    "layoutHash": "sha256:6e655bc5dab78e3466e4fdf1188c8e5e2494ec3d7c87586dbdd50a7a85439d7c",
    "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
    "nodeRange": "^22.23.1",
    "nodeRangeSource": "target-declares-none; certified on node v22.23.1",
    "clientTarget": "chrome120",
    "platformModules": [
      "react",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "@deepseek-ai/cordis",
      "@deepseek-ai/dsh-client-store",
      "@deepseek-ai/dsh-client-ui-slots",
      "@deepseek-ai/dsh-client-ui-primitives",
      "@deepseek-ai/dsh-client-ui-dockkit"
    ],
    "capabilities": {
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
      "host-font-role-hooks": {
        "id": "host-font-role-hooks",
        "available": false,
        "provenance": "absent",
        "required": false,
        "detail": "No documented font role hooks; host fonts are changed through the --dsw-font-family token pair."
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
    },
    "catalogProfile": "sha256:4c5ee1a20f2974a53037a2ee4d2daa71f9f4600c9f004f0b35592b1ff413d602",
    "sourceKind": "installed-package",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-5SrrfWpU.js"
    ],
    "capturedAt": "2026-10-24T15:52:48.230Z"
  },
  {
    "hostVersion": "0.2.1-rc.2",
    "adapterId": "dsh-0.2.1-rc.2-r1",
    "contractHash": "sha256:fc5ccff8885eccb6f947e729b10b8f0d6355a36be6ad5ebbb3a91b7577921b1d",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
    "clientApiHash": "sha256:756129bac3ef1aec3d3f319de071b41ac22cff3983b36dc5411d0d9e74dff3f3",
    "tokenHash": "sha256:3896d0f8150fc8576b1213d6f790c42b6ead6c77e63018606c83d1372af6d4f4",
    "layoutHash": "sha256:9a206b43972eae44b5361ed1f13cd5bd1dd7b2a611565105667f02040a5dbb23",
    "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
    "nodeRange": "^22.23.1",
    "nodeRangeSource": "target-declares-none; certified on node v22.23.1",
    "clientTarget": "chrome120",
    "platformModules": [
      "react",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "@deepseek-ai/cordis",
      "zod",
      "@tanstack/react-virtual",
      "@deepseek-ai/dsh-client-store",
      "@deepseek-ai/dsh-client-ui-slots",
      "@deepseek-ai/dsh-client-ui-primitives",
      "@deepseek-ai/dsh-client-ui-dockkit"
    ],
    "capabilities": {
      "theme-css": {
        "id": "theme-css",
        "available": true,
        "provenance": "documented",
        "required": true,
        "detail": "Host token sheets declare 403 --dsw-* tokens over 176 consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity."
      },
      "host-font-family": {
        "id": "host-font-family",
        "available": true,
        "provenance": "documented",
        "required": true,
        "detail": "Host design tokens expose --dsw-font-family and the --dsw-font-markdown-* ladder; body-scoped declarations override stock."
      },
      "host-font-role-hooks": {
        "id": "host-font-role-hooks",
        "available": true,
        "provenance": "documented",
        "required": false,
        "detail": "Documented host font role hooks (--dsh-font-family-text, --dsh-font-family-code) are present; themes set the hook, never the composite ladder."
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
    },
    "catalogProfile": "sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50",
    "sourceKind": "installed-package",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-CN7NIWNw.js"
    ],
    "capturedAt": "2026-10-25T03:30:29.571Z"
  },
  {
    "hostVersion": "0.2.1-rc.3",
    "adapterId": "dsh-0.2.1-rc.3-r1",
    "contractHash": "sha256:d246181d261323398733ed0975f362d9dfe702f1256b1097397e794db38fdd60",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
    "clientApiHash": "sha256:756129bac3ef1aec3d3f319de071b41ac22cff3983b36dc5411d0d9e74dff3f3",
    "tokenHash": "sha256:3896d0f8150fc8576b1213d6f790c42b6ead6c77e63018606c83d1372af6d4f4",
    "layoutHash": "sha256:8fa63c1877a7bf5be42d03897d333ac7c6ec0a6607715a7e85192e89edd39415",
    "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
    "nodeRange": "^24.21.0",
    "nodeRangeSource": "target-declares-none; certified on node 24.21.0",
    "clientTarget": "chrome120",
    "platformModules": [
      "react",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "@deepseek-ai/cordis",
      "zod",
      "@tanstack/react-virtual",
      "@deepseek-ai/dsh-client-store",
      "@deepseek-ai/dsh-client-ui-slots",
      "@deepseek-ai/dsh-client-ui-primitives",
      "@deepseek-ai/dsh-client-ui-dockkit"
    ],
    "capabilities": {
      "theme-css": {
        "id": "theme-css",
        "available": true,
        "provenance": "documented",
        "required": true,
        "detail": "Host token sheets declare 403 --dsw-* tokens over 176 consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity."
      },
      "host-font-family": {
        "id": "host-font-family",
        "available": true,
        "provenance": "documented",
        "required": true,
        "detail": "Host design tokens expose --dsw-font-family and the --dsw-font-markdown-* ladder; body-scoped declarations override stock."
      },
      "host-font-role-hooks": {
        "id": "host-font-role-hooks",
        "available": true,
        "provenance": "documented",
        "required": false,
        "detail": "Documented host font role hooks (--dsh-font-family-text, --dsh-font-family-code) are present; themes set the hook, never the composite ladder."
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
    },
    "catalogProfile": "sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50",
    "sourceKind": "packaged-app",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-BXV-oxvX.js"
    ],
    "capturedAt": "2026-10-25T03:30:29.679Z"
  }
]

/**
 * Client-safe identity subset: the only four fields a browser bundle needs to
 * whitelist a boot payload/catalog. Kept separate so the client does not ship
 * capability prose, source evidence or class hashes.
 */
export interface AdapterIdentity {
  readonly hostVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly catalogProfile: string
}

export const ADAPTER_IDENTITIES: readonly AdapterIdentity[] = [
  {
    "hostVersion": "0.2.0-rc.2",
    "adapterId": "dsh-0.2.0-rc.2-r1",
    "contractHash": "sha256:42abf8ebc5ec1df1e6abd6760680ec82fd062db650036e5e9f2a052138b6b2ce",
    "catalogProfile": "sha256:4c5ee1a20f2974a53037a2ee4d2daa71f9f4600c9f004f0b35592b1ff413d602"
  },
  {
    "hostVersion": "0.2.1-rc.2",
    "adapterId": "dsh-0.2.1-rc.2-r1",
    "contractHash": "sha256:fc5ccff8885eccb6f947e729b10b8f0d6355a36be6ad5ebbb3a91b7577921b1d",
    "catalogProfile": "sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50"
  },
  {
    "hostVersion": "0.2.1-rc.3",
    "adapterId": "dsh-0.2.1-rc.3-r1",
    "contractHash": "sha256:d246181d261323398733ed0975f362d9dfe702f1256b1097397e794db38fdd60",
    "catalogProfile": "sha256:060e80efd4f553754718f622d840af24bf2ccd8e60f679e35eba93b084c2cc50"
  }
]

/** Exact allowlist of host versions this build may style (lite form). */
export const SUPPORTED_HOST_VERSIONS_LITE: readonly string[] = ["0.2.0-rc.2","0.2.1-rc.2","0.2.1-rc.3"]

/** Registry by exact host version. */
export const ADAPTER_BY_VERSION: Readonly<Record<string, AdapterRecord>> = Object.fromEntries(
  ADAPTERS.map((adapter) => [adapter.hostVersion, adapter]),
)

/** Registry by certified contract hash. */
export const ADAPTER_BY_CONTRACT_HASH: Readonly<Record<string, AdapterRecord>> = Object.fromEntries(
  ADAPTERS.map((adapter) => [adapter.contractHash, adapter]),
)

/** Exact allowlist of host versions this build may style. */
export const SUPPORTED_HOST_VERSIONS: readonly string[] = ADAPTERS.map((adapter) => adapter.hostVersion)

/** Newest certified adapter (used by build-time tooling defaults only). */
export const DEFAULT_ADAPTER: AdapterRecord = ADAPTERS[ADAPTERS.length - 1]!

/** Resolve an exact host version, or undefined when uncertified. */
export function adapterForVersion(version: string | undefined): AdapterRecord | undefined {
  return version === undefined ? undefined : ADAPTER_BY_VERSION[version]
}

/** Resolve a certified contract hash, or undefined when uncertified. */
export function adapterForContractHash(hash: string | undefined): AdapterRecord | undefined {
  return hash === undefined ? undefined : ADAPTER_BY_CONTRACT_HASH[hash]
}
