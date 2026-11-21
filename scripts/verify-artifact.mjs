#!/usr/bin/env node
/**
 * npm/pnpm inserts a bare `--` before forwarded flags. release-check reads its
 * own argv directly, so strip the separator and forward the remaining args.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const result = spawnSync(process.execPath, [fileURLToPath(new URL('./release-check.mjs', import.meta.url)), ...args], { stdio: 'inherit' })
process.exit(result.status ?? 1)
