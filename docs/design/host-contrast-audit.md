# Host component contrast audit

Status: current for the 0.2.3 candidate. This note records why the contrast
matrix gained host-specific pairs and where its boundary is.

## Problem

The role/surface matrix checked Livery-owned label roles on page surfaces, but
host components also paint one host token on another. The user-question
“recommended” badge is the clearest example: its CSS uses
`--dsw-alias-button-info-fill` text on
`--dsw-specific-sidebar-nav-item-active-accent`. Several styles derived both from
the same accent, so the badge became a solid block and its label disappeared.

The same shape of pair exists elsewhere in shipped host CSS. A style can
therefore pass every role/surface assertion and still make native content
unreadable.

## Method

1. Extract literal `color: var(--token)` / `background: var(--token)` pairs from
   the shipped DSH Client CSS Modules (plus the local `dsh-charter` render
   fixture). Rules that use `color-mix()` or inherited backgrounds are covered by
   the live audit instead, not guessed by the static scan.
2. Resolve each pair against the compiled tokens for all 28 styles and both
   light/dark modes.
3. Compare the Livery result with the exact stock host snapshot
   (`0.2.2-rc.5`). **Only Livery-introduced regressions are asserted.** Host
   pairs that already fail WCAG in the stock host are left at their host
   semantics; a livery must not rewrite unrelated semantic roles to pretend it
   fixed a host defect.
4. Add the regressing pairs to `CONTRAST_CHECKS`, with a bounded foreground
   repair. The stock-derived parser is intentionally not shipped at runtime.

## Pairs added for 0.2.3

Minimum measured ratio across the 28 styles, light and dark:

| Host usage | Pair | Min | Required |
|---|---|---:|---:|
| Recommended question badge | `button-info-fill` on `sidebar-nav-item-active-accent` | 4.53 | 4.5 |
| Selected sidebar accent | `sidebar-nav-item-active-accent` on `sidebar-fill` | 1.28 | 1.25 |
| Input send icon | `label-on-color` on `button-info-fill` | 3.01 | 3 |
| Attachment failure icon | `label-on-color` on `state-error-primary` | 3.04 | 3 |
| Remove control | `label-primary-inverted` on `button-contrast-fill` | 4.51 | 4.5 |
| Question option number | `label-secondary` on `bg-overlay` | 4.52 | 4.5 |
| Business/user tag | `state-business-primary` on `state-business-tertiary` | 4.52 | 4.5 |
| Attempt badge | `label-secondary` on `bg-layer-3` | 4.57 | 4.5 |
| Preview badge | `label-primary-bluish` on `state-business-tertiary` | 4.53 | 4.5 |
| Code viewer | `label-secondary` on `bg-layer-2` | 5.09 | 4.5 |
| Sidebar section/time labels | `label-tertiary` on `sidebar-fill` | 4.53 | 4.5 |
| Broken-plugin badge | `state-error-primary` on `bg-layer-3` | 4.54 | 4.5 |
| Approval warning strip | `state-warn-primary` on `state-warn-tertiary` | 4.54 | 4.5 |
| Address rows | `label-tertiary` on `bg-layer-2` | 4.53 | 4.5 |
| Search caption | `label-caption` on `bg-layer-2` | 4.53 | 4.5 |
| Message tertiary | `label-tertiary` on `ghost-active-fill` | 4.51 | 4.5 |
| Warning label | `state-warn-label` on `bg-module-platform` | 4.52 | 4.5 |
| Diff meta caption | `label-caption` on `bg-module-platform` | 4.52 | 4.5 |
| Module tertiary | `label-tertiary` on `bg-module-platform` | 4.72 | 4.5 |
| Warn notice | `state-warn-label` on `state-warn-tertiary` | 4.62 | 4.5 |
| Instructions caption | `label-caption` on `code-block-banner` | 4.64 | 4.5 |
| Code body | `label-tertiary` on `code-block` | 4.85 | 4.5 |
| Success tag | `state-success-primary` on `state-success-tertiary` | 4.53 | 4.5 |
| Reply prompt | `label-dimmed` on `bg-layer-3` | 4.53 | 4.5 |

The selected sidebar accent uses an adaptive visible-accent derivation: it
searches accent/text mixes against the actual rail fill until the result is never
byte-equal to that fill and reaches at least 1.25:1 (stock baseline 1.127:1). A
dedicated matrix assertion and the acceptance `style.selected-state` check lock
this, so the selected row cannot silently collapse into the rail again.

Livery's own selected chips, version chip and focal-position selection use
foreground roles; attribution links use the already-audited
`--dsw-alias-link`.

## Result

`livery:compile` reports **4536 contrast assertions / 0 failures** across eight
profiles. The acceptance probe adds `style.selected-state`, and
`pnpm audit:live-contrast` wraps the repeatable computed-style scan for a running
carrier (`scripts/audit/live-contrast.mjs`). The Web acceptance run remains
**310 passed / 0 failed / 7 skipped**.

## Boundary

The audit covers literal `color`/`background` token pairs in the shipped DSH
Client CSS Modules and the local `dsh-charter` render fixture. Pairs expressed
through `color-mix()` or inherited backgrounds are covered by the live
computed-style scan instead. The matrix does not attempt to assert arbitrary
third-party CSS; plugin authors remain responsible for their own styles.
