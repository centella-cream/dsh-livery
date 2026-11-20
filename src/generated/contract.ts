/**
 * GENERATED — do not edit by hand.
 *
 * Shipped adapter registry: only host builds whose FORMAL support-matrix
 * (`contracts/dsh/support-matrix.json`) entry is `g6-approved` or `released`
 * are generated here. Historical contract snapshots stay on disk for audit
 * and diff, but they never become runtime adapters. Compatibility is exact
 * version + adapter id + contract hash; unknown versions fail closed to
 * stock. Regenerate with `pnpm contract:regenerate`.
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
  /** True for a reviewed cross-token-contract profile reuse (compatibility mode). */
  readonly sharedProfile?: boolean
  /** `installed-package` (npm/CLI) or `packaged-app` (Electron app.asar). */
  readonly sourceKind: 'installed-package' | 'packaged-app'
  readonly sourceEvidence: readonly string[]
  readonly capturedAt: string
}

/** Every shipped host build (formal matrix approved/released), ascending. */
export const ADAPTERS: readonly AdapterRecord[] = [
  {
    "hostVersion": "0.2.1-rc.2",
    "adapterId": "dsh-0.2.1-rc.2-r1",
    "contractHash": "sha256:478c25e6ea37d18789f4514bbf569f2b534c97505f4967dc3f1379b7176679b0",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
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
    "catalogProfile": "sha256:a4161f075483a629a57fab83a2e2258167681f2eb7fa0767fbef758b2f5c551a",
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
    "contractHash": "sha256:47b5cf24e19b5194676be7f037d7315dccab5d666cfc63350ae4f6ff11d6067b",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
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
    "catalogProfile": "sha256:ac0a36e31c128ac65a0c52e1feb4e4827e548274b5c76734c351afa85ea5cf19",
    "sourceKind": "packaged-app",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-BXV-oxvX.js"
    ],
    "capturedAt": "2026-10-25T03:30:29.679Z"
  },
  {
    "hostVersion": "0.2.1-rc.4",
    "adapterId": "dsh-0.2.1-rc.4-r1",
    "contractHash": "sha256:9e2320f31fe145945ac1f836c5468b5f5c3113f97e80cea7b1ab3976a079346f",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
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
    "catalogProfile": "sha256:d126b90736df71222c4175c8181d1ea828779f2894edc77c0e6cb994d460235f",
    "sourceKind": "installed-package",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-BXV-oxvX.js"
    ],
    "capturedAt": "2026-10-27T08:06:30.352Z"
  },
  {
    "hostVersion": "0.2.1-rc.5",
    "adapterId": "dsh-0.2.1-rc.5-r1",
    "contractHash": "sha256:846aa7d51a291e5364def3a386aba19d3d9f5229354cd8030adf48b9c3f1b470",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:8fc77b1ae32ebe8dee3968c38809fcccdb9e0996b235a0190c53696bcac0a3e1",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
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
    "catalogProfile": "sha256:4de94fefc9d6f52eb2f798810b9267d1bc009aaf33ad4b846202e5707c0b3d82",
    "sourceKind": "installed-package",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-BXV-oxvX.js"
    ],
    "capturedAt": "2026-10-30T10:52:04.930Z"
  },
  {
    "hostVersion": "0.2.2-rc.1",
    "adapterId": "dsh-0.2.2-rc.1-r1",
    "contractHash": "sha256:51e8eb37e1f9e0205ef33bd088dd8b36129de6432d36ada346ead8ad0346bca2",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:1ce1640532781607b87af31de39b4d324deb237e1991ac30179c908cc0f36570",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
    "tokenHash": "sha256:5d5e1b48a3dac234286c0c320da6093a8b1277f2591dcf4d59897f1557c4d434",
    "layoutHash": "sha256:38b64bc0e6a21944ac0904326392366825d16a1bea448e9c2dddbcf613f65d43",
    "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
    "nodeRange": ">=24.9.0",
    "nodeRangeSource": "declared",
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
        "detail": "Host token sheets declare 414 --dsw-* tokens over 188 consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity."
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
    "catalogProfile": "sha256:35b832dedbd84f2d45bea53210cd6c336646c08032ddd1671469f8a73385df40",
    "sourceKind": "installed-package",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-BgUyXZcc.js"
    ],
    "capturedAt": "2026-11-04T17:05:13.273Z"
  },
  {
    "hostVersion": "0.2.2-rc.2",
    "adapterId": "dsh-0.2.2-rc.2-r1",
    "contractHash": "sha256:495f83fd4154adf11d739ebaf04fbfce14aaea07d91d30d14f1279599505d678",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:1ce1640532781607b87af31de39b4d324deb237e1991ac30179c908cc0f36570",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
    "tokenHash": "sha256:b21122ac214e9a2c1768ef19047df45ed63ed19ccedeb795ce5a2bf345236565",
    "layoutHash": "sha256:48075c6e98c1780e74b41b4b4417af5fad8448c8b241ae0f37d680681590ac6b",
    "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
    "nodeRange": ">=24.9.0",
    "nodeRangeSource": "declared",
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
        "detail": "Host token sheets declare 441 --dsw-* tokens over 205 consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity."
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
    "catalogProfile": "sha256:59870c7f712922c0dbe1085220faa92e7fb9401695b4ad6deed99a54979cf077",
    "sourceKind": "installed-package",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-ghOpC9uV.js"
    ],
    "capturedAt": "2026-11-12T12:50:42.394Z"
  },
  {
    "hostVersion": "0.2.2-rc.3",
    "adapterId": "dsh-0.2.2-rc.3-r1",
    "contractHash": "sha256:0f583969a24ec4f76277ec1d52485335c3d58cca653b5e3c680977faecb80f94",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:1ce1640532781607b87af31de39b4d324deb237e1991ac30179c908cc0f36570",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
    "tokenHash": "sha256:f90b02b7152366bd6887065d5b80783c8ce84b7fb9ad55e01307addee78a57a0",
    "layoutHash": "sha256:422d14c6ef755114b4ed175539b85a48736406ff52806e2764e9b7c7d3570c09",
    "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
    "nodeRange": ">=24.9.0",
    "nodeRangeSource": "declared",
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
        "detail": "Host token sheets declare 441 --dsw-* tokens over 205 consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity."
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
    "catalogProfile": "sha256:46ccd3f3724998c44a995d1cef2009f97f34d1e87efaa89ec347cb1824bd51ef",
    "sourceKind": "packaged-app",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-Ciz7DZxv.js"
    ],
    "capturedAt": "2026-11-16T10:39:19.738Z"
  },
  {
    "hostVersion": "0.2.2-rc.5",
    "adapterId": "dsh-0.2.2-rc.5-r1",
    "contractHash": "sha256:65ed78f3838c020ef3d4fdfab4786d54acc456623625d11dae79a1c92e16c4b3",
    "loaderAbiHash": "sha256:35f07f0944975c7e03de4e95f617efcf638247bf5e4af9fa4bd3da50032f8470",
    "hostApiHash": "sha256:1ce1640532781607b87af31de39b4d324deb237e1991ac30179c908cc0f36570",
    "clientApiHash": "sha256:d4685a9a85e7181a986e6f81be85830d0e27b17d6e75d51aab0850b27b88f2c8",
    "tokenHash": "sha256:f90b02b7152366bd6887065d5b80783c8ce84b7fb9ad55e01307addee78a57a0",
    "layoutHash": "sha256:48075c6e98c1780e74b41b4b4417af5fad8448c8b241ae0f37d680681590ac6b",
    "profileSchemaHash": "sha256:c69037ab42d16630c0d316b67c8461bdb11032c43cdd3143b107ec47610f5a72",
    "nodeRange": ">=24.9.0",
    "nodeRangeSource": "declared",
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
        "detail": "Host token sheets declare 441 --dsw-* tokens over 205 consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity."
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
    "catalogProfile": "sha256:8bb88619f79476035460096193003e16de096bde72d963d8060b33c9a6a1c037",
    "sourceKind": "installed-package",
    "sourceEvidence": [
      "dsh-client-modules/lib/client.js",
      "dsh-client-modules/lib/index.js",
      "dsh-web-frontend/dist/assets/index-Ciz7DZxv.js"
    ],
    "capturedAt": "2026-11-19T17:51:12.459Z"
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
  /** True for a reviewed cross-token-contract profile reuse (compatibility mode). */
  readonly sharedProfile?: boolean
}

export const ADAPTER_IDENTITIES: readonly AdapterIdentity[] = [
  {
    "hostVersion": "0.2.1-rc.2",
    "adapterId": "dsh-0.2.1-rc.2-r1",
    "contractHash": "sha256:478c25e6ea37d18789f4514bbf569f2b534c97505f4967dc3f1379b7176679b0",
    "catalogProfile": "sha256:a4161f075483a629a57fab83a2e2258167681f2eb7fa0767fbef758b2f5c551a"
  },
  {
    "hostVersion": "0.2.1-rc.3",
    "adapterId": "dsh-0.2.1-rc.3-r1",
    "contractHash": "sha256:47b5cf24e19b5194676be7f037d7315dccab5d666cfc63350ae4f6ff11d6067b",
    "catalogProfile": "sha256:ac0a36e31c128ac65a0c52e1feb4e4827e548274b5c76734c351afa85ea5cf19"
  },
  {
    "hostVersion": "0.2.1-rc.4",
    "adapterId": "dsh-0.2.1-rc.4-r1",
    "contractHash": "sha256:9e2320f31fe145945ac1f836c5468b5f5c3113f97e80cea7b1ab3976a079346f",
    "catalogProfile": "sha256:d126b90736df71222c4175c8181d1ea828779f2894edc77c0e6cb994d460235f"
  },
  {
    "hostVersion": "0.2.1-rc.5",
    "adapterId": "dsh-0.2.1-rc.5-r1",
    "contractHash": "sha256:846aa7d51a291e5364def3a386aba19d3d9f5229354cd8030adf48b9c3f1b470",
    "catalogProfile": "sha256:4de94fefc9d6f52eb2f798810b9267d1bc009aaf33ad4b846202e5707c0b3d82"
  },
  {
    "hostVersion": "0.2.2-rc.1",
    "adapterId": "dsh-0.2.2-rc.1-r1",
    "contractHash": "sha256:51e8eb37e1f9e0205ef33bd088dd8b36129de6432d36ada346ead8ad0346bca2",
    "catalogProfile": "sha256:35b832dedbd84f2d45bea53210cd6c336646c08032ddd1671469f8a73385df40"
  },
  {
    "hostVersion": "0.2.2-rc.2",
    "adapterId": "dsh-0.2.2-rc.2-r1",
    "contractHash": "sha256:495f83fd4154adf11d739ebaf04fbfce14aaea07d91d30d14f1279599505d678",
    "catalogProfile": "sha256:59870c7f712922c0dbe1085220faa92e7fb9401695b4ad6deed99a54979cf077"
  },
  {
    "hostVersion": "0.2.2-rc.3",
    "adapterId": "dsh-0.2.2-rc.3-r1",
    "contractHash": "sha256:0f583969a24ec4f76277ec1d52485335c3d58cca653b5e3c680977faecb80f94",
    "catalogProfile": "sha256:46ccd3f3724998c44a995d1cef2009f97f34d1e87efaa89ec347cb1824bd51ef"
  },
  {
    "hostVersion": "0.2.2-rc.5",
    "adapterId": "dsh-0.2.2-rc.5-r1",
    "contractHash": "sha256:65ed78f3838c020ef3d4fdfab4786d54acc456623625d11dae79a1c92e16c4b3",
    "catalogProfile": "sha256:8bb88619f79476035460096193003e16de096bde72d963d8060b33c9a6a1c037"
  }
]

/** Exact allowlist of shipped host versions (lite form). */
export const SUPPORTED_HOST_VERSIONS_LITE: readonly string[] = ["0.2.1-rc.2","0.2.1-rc.3","0.2.1-rc.4","0.2.1-rc.5","0.2.2-rc.1","0.2.2-rc.2","0.2.2-rc.3","0.2.2-rc.5"]

/** Registry by exact host version. */
export const ADAPTER_BY_VERSION: Readonly<Record<string, AdapterRecord>> = Object.fromEntries(
  ADAPTERS.map((adapter) => [adapter.hostVersion, adapter]),
)

/** Registry by certified contract hash. */
export const ADAPTER_BY_CONTRACT_HASH: Readonly<Record<string, AdapterRecord>> = Object.fromEntries(
  ADAPTERS.map((adapter) => [adapter.contractHash, adapter]),
)

/** Exact allowlist of host versions this build may style (shipped only). */
export const SUPPORTED_HOST_VERSIONS: readonly string[] = ADAPTERS.map((adapter) => adapter.hostVersion)

/** Newest shipped adapter (used by build-time tooling defaults only). */
export const DEFAULT_ADAPTER: AdapterRecord = ADAPTERS[ADAPTERS.length - 1]!

/** Resolve an exact host version, or undefined when uncertified. */
export function adapterForVersion(version: string | undefined): AdapterRecord | undefined {
  return version === undefined ? undefined : ADAPTER_BY_VERSION[version]
}

/** Resolve a certified contract hash, or undefined when uncertified. */
export function adapterForContractHash(hash: string | undefined): AdapterRecord | undefined {
  return hash === undefined ? undefined : ADAPTER_BY_CONTRACT_HASH[hash]
}
