# Historical archive

These documents are preserved for engineering history. They are **not
authoritative** and may describe removed behavior, old DSH versions, abandoned
compatibility modes or pre-release designs. For current behavior use:

- [Documentation index](../README.md)
- [Verification](../verification.md)
- [Interfaces and architecture](../design/interfaces.md)
- [Multi-version policy](../design/multi-version.md)
- [`contracts/dsh/support-matrix.json`](../../contracts/dsh/support-matrix.json)

| File | Historical context |
|---|---|
| `design-notes-v3-audit.md` | Pre-v3 audit of the previous skin plugin and the design direction. |
| `implementation-plan-0.1.0.md` | Original 0.1.0 implementation plan and phase list; superseded by shipped code and current docs. |
| `visual-system-v2-rounds-7-13.md` | Design record for rounds 7–13, including a compatibility-mode proposal that was later removed. |
| `host-contract-0.2.0-rc.2.md` | Host-side contract research pinned to DSH `0.2.0-rc.2`. |
| `client-contract-0.2.0-rc.2.md` | Client-side contract research pinned to DSH `0.2.0-rc.2`. |
| `tokens-0.2.0-rc.2.md` | Token inventory extracted from DSH `0.2.0-rc.2`. |

Current contract truth lives in `contracts/dsh/<version>/contract.json` and the
generated registry in `src/generated/contract.ts`.
