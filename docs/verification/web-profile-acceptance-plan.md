# Web Profile acceptance runbook

Two-tier verification. Tier 1 is the reproducible, workspace-local harness; Tier 2 is
the real user Web Profile on this machine.

## Tier 1 — isolated Web Profile (no escalation, reproducible)

```bash
pnpm build && npm pack            # produces dsh-livery-0.1.0.tgz
node scripts/acceptance-web.mjs --tgz "$PWD/dsh-livery-0.1.0.tgz"
```

What the harness does:

1. `DSH_HOME=$PWD/.tmp/acceptance/dsh-home` — a workspace-local harness home. The
   profile is initialized from the shipped Web template by the official
   `dsh plugin --profile web add <tgz>` path; pnpm's store is redirected under
   `.tmp/` so the user's `~/.dsh` and `~/Library/pnpm/store` are untouched.
2. Boots `DSH_HOME=… dsh --profile web --no-open --port 0`, waits for the
   `dsh web: http://127.0.0.1:<port>/?token=<hex>` readiness line, and opens the
   token URL once so the browser acquires the session cookie.
3. Drives system Chrome through `playwright-core` (`channel: 'chrome'`, headless) and
   records `probe.json`, console/network logs, screenshots and a first-paint
   filmstrip under `artifacts/acceptance/`.
4. Verifies the checklist in §3 below, then uninstalls and restarts to prove zero
   residue.
5. Stops the server with SIGTERM and asserts the port is closed.

## Tier 2 — real Web Profile (requires filesystem escalation)

The real profile (`~/.dsh/profiles/web`) contains the user's own plugins
(`dsh-charter`, `dsh-context`, locale/theme overrides). It is backed up first and
restored exactly afterwards.

```bash
# 0. backup (workspace-local)
cp -R ~/.dsh/profiles/web .tmp/real-web-backup

# 1. install through the official plugin manager (escalated: writes ~/.dsh profile
#    and the pnpm store)
dsh plugin --profile web add file:$PWD/dsh-livery-0.1.0.tgz

# 2. compose proof: the bundle group must appear
dsh --profile web --dump-config | awk '/^# == dsh-livery/{f=1} f&&/^# == /&&!/dsh-livery/{exit} f'

# 3. boot an isolated instance of the real profile (escalated: rewrites cordis.yml,
#    writes ~/.dsh/sessions|storages)
dsh --profile web --no-open --port 0 > .tmp/real-web.log 2>&1 &
# readiness: the "dsh web: http://127.0.0.1:<port>/?token=…" line

# 4. read-only probe against the already-running instance
node scripts/acceptance-web.mjs --reuse "<printed url>" --json artifacts/acceptance/real-web/probe.json

# 5. stop the server (SIGTERM; exit 0) and verify the port is closed

# 6. uninstall and restore the backup exactly (escalated)
dsh plugin --profile web remove dsh-livery
# compare package.json / dsh.profile.bundles / cordis.patch.yml with .tmp/real-web-backup
```

The acceptance report records both tiers separately; the isolated tier is the
reproducible evidence, the real tier demonstrates the plugin coexists with the
user's installed plugin set (A-tier token compatibility: `dsh-charter`,
`dsh-context`).

## 3. Checklist (mapped to IMPLEMENTATION_PLAN.md §20)

| # | Criterion | Check |
|---|---|---|
| 1 | Exact host target `0.2.0-rc.2` + certified contract hash | `contract:verify`; boot payload `contractHash` equals build constant |
| 2 | Plugin loads in the Web Profile through the official manager | `dsh plugin add`, `--dump-config` group, `/plugins/dsh-livery/client.js` 200 |
| 3 | First frame correct, no stock flash | filmstrip frames after token URL show livery palette; `#dsh-livery-boot` present before app scripts |
| 4 | Client takeover hash equality (zero re-render) | computed hash == `data-dsh-livery-hash` == boot payload `cssHash` |
| 5 | Follows host light/dark, never changes preference | `data-ds-dark-theme` + `data-ds-theme-source` untouched; token values swap per mode |
| 6 | Host-level font-family applies, zh/en distinct | computed `font-family` of body/components on `html[lang=zh-CN]` vs `en` |
| 7 | A-tier compatibility (charter/context unaffected) | no page errors; their panels render; tokens inherited |
| 8 | Transactional preview / apply / restore stock | body attr + tokens change on preview, revert on cancel, persist on apply, removed on restore |
| 9 | Settings page bilingual, keyboard, states | gallery cards, search/tag filter, arrow-key focus, zh + en copies |
| 10 | Contrast matrix passes | every compiled livery audit `contrastFailures == 0`; self-check shows 0 |
| 11 | CSS safety | 0 `!important`, 0 hash selectors, 0 remote URLs, token declarations only in `body[data-dsh-livery]` blocks |
| 12 | Token coverage gap 0 (or versioned exemption) | `audit:tokens` passes for consumed A-tier token set |
| 13 | Lifecycle residue test | uninstall + restart: no attributes, no Livery styles, stock tokens |
| 14 | Unknown/mismatched host fails closed | bundle-level loader-ABI test + unit gate tests (no rows on mismatch) |
| 15 | Performance budget | host/client bundle sizes, boot CSS ≤12KB, per-livery CSS ≤12KB, single style batch on takeover |
| 16 | Layout capability gate | **open by host limitation**: density/transcript-width/message-flow unavailable; self-check reports it; no claim made |
| 17 | Desktop profiles | **not certified** in this environment; proposed matrix keeps them pending |
| 18 | Wallpaper | **removed** from schemaVersion 1 (Phase 0 decision, see `phase0-contract.md`) |

Criteria 16–18 are reported as explicit deviations; the Web Profile acceptance
statement covers criteria 1–15 only.
