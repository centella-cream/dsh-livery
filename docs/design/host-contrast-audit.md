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
| Input send icon | `label-on-color` on `button-info-fill` | 3.01 | 3 |
| Attachment failure icon | `label-on-color` on `state-error-primary` | 3.04 | 3 |
| Question option number | `label-secondary` on `bg-overlay` | 4.52 | 4.5 |
| Business/user tag | `state-business-primary` on `state-business-tertiary` | 4.52 | 4.5 |
| Attempt badge | `label-secondary` on `bg-layer-3` | 4.57 | 4.5 |
| Preview badge | `label-primary-bluish` on `state-business-tertiary` | 4.53 | 4.5 |
| Code viewer | `label-secondary` on `bg-layer-2` | 5.09 | 4.5 |
| Sidebar section/time labels | `label-tertiary` on `sidebar-fill` | 4.52 | 4.5 |
| Attachment remove icon | `label-primary-inverted` on `button-contrast-fill` | 4.51 | 3 |
| Broken-plugin badge | `state-error-primary` on `bg-layer-3` | 3.04 | 3 |

The sidebar active accent now uses the stock-compatible tint recipe
(`accentMix(seeds, 0.06)`) instead of the raw accent. Host `badge` background is
therefore a pale accent, while the foreground repair keeps its label readable.

Livery's own selected chips, version chip, focal-position selection and
attribution links use `--lw-fg` rather than the accent as text, because the accent
is not guaranteed to reach 4.5:1 on its tinted surface.

## Result

`livery:compile` reports **3808 contrast assertions / 0 failures** across eight
profiles. A computed-style scan of the local conversation, Livery style page,
Wallpaper page and Plugins page reports no visible text below its WCAG AA
threshold. The Web acceptance run remains **309 passed / 0 failed / 7 skipped**.

## Known boundary

Host pairs that are below AA in the stock host (for example the approval warning
strip's `state-warn-primary` on `state-warn-tertiary`) are not repaired by this
change. They are recorded as host-owned defects, not as Livery regressions; the
static regression audit reports zero Livery-introduced regressions. Any future
host update that changes these pairs must re-run the audit and add the affected
pair here before release.
