# DSH Livery

Contract-bound color, typography, surface and safe-layout liveries for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) **0.2.0-rc.2**.

DSH Livery is a style renderer, not a theme owner: it never registers a host
theme, never calls `setTheme`, never touches `data-ds-*` attributes, and never
redraws window chrome. It injects one scoped semantic token pair per livery
(`light`/`dark`) for the first frame, hands the same bytes to the client
presenter, and restores stock immediately when disabled.

* Target: DSH `0.2.0-rc.2` exactly (adapter `dsh-0.2.0-rc.2-r1`).
* Profiles: Web Profile verified in this repository; Desktop certification is
  tracked in `contracts/dsh/support-matrix.proposed.json` and is not claimed.
* Languages: `zh` / `en`.
* 10 built-in dual-mode liveries; the compiler derives full light/dark token
  pairs from four seed colors and gates every palette on a contrast matrix.

## Install (Web Profile)

```bash
pnpm build
npm pack                     # or: pnpm pack
dsh plugin --profile web add ./dsh-livery-0.1.0.tgz
dsh --profile web --no-open
```

Settings → Livery picks a livery (transactional preview, then one config
mutation), or restores stock.

## Develop

```bash
pnpm install
pnpm typecheck && pnpm test
pnpm liveries:compile
pnpm audit:css && pnpm audit:contrast && pnpm audit:tokens
pnpm build
pnpm pack:check
node scripts/acceptance-web.mjs --tgz ./dsh-livery-0.1.0.tgz
```

The Web-profile acceptance harness creates an isolated `DSH_HOME` under
`.tmp/acceptance/`, installs the packed tarball through the official
`dsh plugin --profile web add` path, boots an isolated server, drives Chrome via
Playwright, and archives screenshots + `probe.json` under
`artifacts/acceptance/`.

## Contract

See [docs/implementation/interfaces.md](docs/implementation/interfaces.md) and
`contracts/dsh/0.2.0-rc.2/`. Compatibility is decided by six frozen contract
hashes, not by a version range; an unknown or mismatching host fails closed to
stock with a structured diagnostic.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
