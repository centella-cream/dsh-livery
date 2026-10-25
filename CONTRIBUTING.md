# Contributing to DSH Livery

Thanks for your interest. This project depends on a frozen host contract, so most
changes need more care than in a typical theme repo.

## Before you start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Search existing issues and pull requests before opening a new one.
- For security problems, **do not** open a public issue. Follow [SECURITY.md](SECURITY.md).

## Development setup

Requirements: Node `^22.23.1 || ^24.21.0`, pnpm 12.

```bash
pnpm install
pnpm verify      # typecheck + tests + generated-data check + audits + build + pack check
pnpm lint
pnpm test:loader-abi
pnpm adapter:check
```

The committed generated contracts, stock token snapshots and compiled catalogs let
`pnpm build` run without a local DSH installation.

## Repository conventions

- **Contract freeze.** The six contract hashes and the aggregate hash in
  `contracts/dsh/<version>/contract.json` are frozen. Do not edit generated files in
  `src/generated/` by hand; regenerate them with the documented scripts.
- **Token-only rendering.** The host and client may emit only scoped `--dsw-*` token
  declarations (plus the documented typography hooks). No component selectors, no
  `!important`, no remote URLs, no bundled fonts or images. The CSS audit enforces
  this. New style tokens must be registered in `src/core/registry.ts` with an
  allowlisted value shape.
- **Manifest changes** go through `schemas/livery.schema.json` and
  `liveries/<id>/manifest.json`, followed by `pnpm liveries:compile` and the audits.
- **Adding a style:** add an entry to [`docs/research/design-table.json`](docs/research/design-table.json),
  create the manifest (or regenerate it from the table), run `pnpm liveries:compile`,
  `pnpm audit:tokens`, `pnpm audit:css` and `pnpm audit:contrast`, then update
  [NOTICE.md](NOTICE.md) if the palette is inspired by another project.
- **Host adapters:** adding a host build requires a contract snapshot, adapter
  generation and acceptance evidence. See [docs/design/multi-version.md](docs/design/multi-version.md).
- **Commits:** one concise line in Conventional Commits style (`feat:`, `fix:`,
  `docs:`, `test:`, `chore:`). Avoid long bodies.
- **No local paths or generated evidence** in commits: `artifacts/`, `.tmp/`,
  `references/` and `*.tgz` are ignored. Keep personal absolute paths out of docs.

## Pull requests

Please include:

- [ ] A focused change with tests (unit, compiler, host or client as appropriate).
- [ ] `pnpm verify`, `pnpm lint`, `pnpm test:loader-abi` and `pnpm adapter:check` passing.
- [ ] Updated documentation (design docs, NOTICE attribution, verification summary).
- [ ] No personal paths, secrets, tarballs or generated evidence in the diff.
- [ ] A one-line conventional commit message.

## Licence

By contributing, you agree that your contributions are licensed under the
[MIT licence](LICENSE).
