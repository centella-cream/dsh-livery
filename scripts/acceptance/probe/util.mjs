/**
 * Shared utilities for the DSH Livery Web-profile acceptance harness.
 *
 * This directory is dependency-free (Node builtins + a local `playwright-core`),
 * so the harness also runs in a checkout that has not installed dev dependencies
 * yet.
 */

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

/** Absolute path of the repository root (…/dsh-livery). */
export const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** Everything the harness may create lives under `<repo>/.tmp/acceptance`. */
export const TMP_ROOT = path.join(WORKSPACE_ROOT, '.tmp', 'acceptance')

/** Default artifact directory for acceptance evidence. */
export const DEFAULT_ARTIFACTS = path.join(WORKSPACE_ROOT, 'artifacts', 'acceptance')

/** Default isolated Harness home (never the user's `~/.dsh`). */
export const DEFAULT_DSH_HOME = path.join(TMP_ROOT, 'dsh-home')

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const nowIso = () => new Date().toISOString()

/** Shrink a long string for log lines. */
export function oneLine(text, max = 400) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** Redact launch tokens and cookie values from anything we persist. */
export function redact(text) {
  return String(text ?? '')
    .replace(/([?&]token=)[\w.~-]+/g, '$1<redacted>')
    .replace(/^(token=)[\w.~-]+/gm, '$1<redacted>')
}

export function tail(text, lines = 20) {
  return String(text ?? '').split('\n').slice(-lines).join('\n')
}

export function durationMs(start) {
  return Math.round((typeof start === 'bigint' ? Number(process.hrtime.bigint() - start) / 1e6 : Date.now() - start))
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true })
  return dir
}

export async function writeJson(file, value) {
  await ensureDir(path.dirname(file))
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  return file
}

export async function writeText(file, text) {
  await ensureDir(path.dirname(file))
  await writeFile(file, text, 'utf8')
  return file
}

export async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

/** Remove one of our own disposable directories, refusing anything outside `.tmp/`. */
export async function safeRemoveTree(target) {
  const resolved = path.resolve(target)
  const allowed = `${TMP_ROOT}${path.sep}`
  if (resolved !== TMP_ROOT && !resolved.startsWith(allowed)) {
    throw new Error(`refusing to remove ${resolved}: outside the harness temp root (${TMP_ROOT})`)
  }
  await rm(resolved, { recursive: true, force: true })
}

/**
 * Directories that may host the bundled Desktop runtime's Harness home.
 *
 * The Desktop app bundles pnpm 11, which discovers a parent pnpm workspace if
 * the home lives inside this repository (store-dir mismatch); those runs use a
 * system temp directory instead. Only paths carrying the harness prefix under a
 * system temp root are accepted — the user's real home never is.
 */
function isExternalTempHome(resolved) {
  if (!path.basename(resolved).startsWith('dsh-livery-')) return false
  return [path.resolve('/tmp'), path.resolve(os.tmpdir())].some((root) => resolved.startsWith(`${root}${path.sep}`))
}

/** Assert a path may be used as an isolated Harness home. */
export function assertIsolatedHome(home) {
  const resolved = path.resolve(home)
  const userHome = path.resolve(os.homedir(), '.dsh')
  if (resolved === userHome) throw new Error(`refusing to use the user's real Harness home (${userHome}) as DSH_HOME`)
  if (resolved.startsWith(`${TMP_ROOT}${path.sep}`)) return resolved
  if (isExternalTempHome(resolved)) return resolved
  throw new Error(
    `isolated DSH_HOME must live under ${TMP_ROOT} or a system temp dir named dsh-livery-* (Desktop runtime); got ${resolved}`,
  )
}

/** Remove a disposable isolated home wherever it lives (never the real one). */
export async function removeIsolatedHome(home) {
  const resolved = assertIsolatedHome(home)
  if (resolved.startsWith(`${TMP_ROOT}${path.sep}`)) return safeRemoveTree(resolved)
  const { rm } = await import('node:fs/promises')
  await rm(resolved, { recursive: true, force: true })
}

export function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export async function sha256File(file) {
  const { createHash: create } = await import('node:crypto')
  const { createReadStream } = await import('node:fs')
  return new Promise((resolve, reject) => {
    const hash = create('sha256')
    const stream = createReadStream(file)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Chrome serializes the `BlinkMacSystemFont` system-font keyword as
 * `system-ui`; compare font stacks after normalizing that and all quoting.
 */
export function normalizeFontStack(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/["']/g, '')
    .replace(/\bblinkmacsystemfont\b/g, 'system-ui')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

export function fontStackStartsWith(computed, expected) {
  const actualParts = normalizeFontStack(computed).split(', ')
  const expectedParts = normalizeFontStack(expected).split(', ')
  const n = Math.min(2, expectedParts.length)
  return expectedParts.slice(0, n).every((part, index) => actualParts[index] === part)
}

/** First concrete (non-generic) family from a stack, for document.fonts.check. */
export function firstConcreteFamily(stack) {
  const generic = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace'])
  const parts = String(stack ?? '')
    .split(',')
    .map((part) => part.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean)
  return parts.find((part) => !generic.has(part.toLowerCase())) ?? null
}

/** Extract the 4-byte IDAT payload of a PNG and inflate it. */
function inflatePng(data) {
  let offset = 8
  const idat = []
  let width = 0
  let height = 0
  let bitDepth = 8
  let colorType = 6
  while (offset + 8 <= data.length) {
    const length = data.readUInt32BE(offset)
    const type = data.toString('ascii', offset + 4, offset + 8)
    const body = data.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      bitDepth = body[8]
      colorType = body[9]
    } else if (type === 'IDAT') idat.push(body)
    else if (type === 'IEND') break
    offset += 12 + length
  }
  if (!width || !height) return null
  if (bitDepth !== 8) return null
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0
  if (!channels) return null
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = Buffer.alloc(width * height * channels)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? line[i - channels] : 0
      const up = prev[i]
      const upLeft = i >= channels ? prev[i - channels] : 0
      let value = line[i]
      if (filter === 1) value = (value + left) & 0xff
      else if (filter === 2) value = (value + up) & 0xff
      else if (filter === 3) value = (value + ((left + up) >> 1)) & 0xff
      else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
        value = (value + predictor) & 0xff
      }
      line[i] = value
    }
    line.copy(pixels, y * stride)
    prev = line
  }
  return { width, height, channels, pixels }
}

/**
 * Average colour of a PNG screenshot, plus a 3×3 grid of averages. Returns
 * `null` for images we cannot decode (only 8-bit PNG is supported, the format
 * Playwright emits).
 */
export function pngColorStats(fileBuffer) {
  const image = inflatePng(fileBuffer)
  if (!image) return null
  const { width, height, channels, pixels } = image
  const at = (x, y) => {
    const i = (y * width + x) * channels
    return [pixels[i], pixels[i + 1], pixels[i + 2]]
  }
  const average = (x0, y0, x1, y1) => {
    let r = 0
    let g = 0
    let b = 0
    let count = 0
    const stepX = Math.max(1, Math.floor((x1 - x0) / 24))
    const stepY = Math.max(1, Math.floor((y1 - y0) / 24))
    for (let y = y0; y < y1; y += stepY) {
      for (let x = x0; x < x1; x += stepX) {
        const [pr, pg, pb] = at(x, y)
        r += pr
        g += pg
        b += pb
        count += 1
      }
    }
    if (!count) return null
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
  }
  const cells = []
  for (let gy = 0; gy < 3; gy += 1) {
    for (let gx = 0; gx < 3; gx += 1) {
      cells.push(average(Math.floor((gx * width) / 3), Math.floor((gy * height) / 3), Math.floor(((gx + 1) * width) / 3), Math.floor(((gy + 1) * height) / 3)))
    }
  }
  return { width, height, average: average(0, 0, width, height), cells }
}

/** TCP probe: resolves true when nothing listens on 127.0.0.1:<port>. */
export function isPortClosed(port, timeoutMs = 750) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    let settled = false
    const done = (closed) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(closed)
    }
    socket.setTimeout(timeoutMs)
    socket.on('connect', () => done(false))
    socket.on('timeout', () => done(true))
    socket.on('error', () => done(true))
  })
}

export async function waitPortClosed(port, { timeoutMs = 8000, intervalMs = 100 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await isPortClosed(port)) return { closed: true, waitedMs: Date.now() - started }
    await sleep(intervalMs)
  }
  return { closed: false, waitedMs: Date.now() - started }
}

/** A structured pass/fail/skip/warn result collector. */
export class CheckRunner {
  constructor() {
    this.checks = []
  }

  add(status, id, title, detail, evidence) {
    const check = {
      id,
      title,
      status,
      detail: detail === undefined ? undefined : oneLine(typeof detail === 'string' ? detail : JSON.stringify(detail), 1200),
      evidence,
      at: nowIso(),
    }
    this.checks.push(check)
    return check
  }

  pass(id, title, detail, evidence) {
    return this.add('pass', id, title, detail, evidence)
  }

  fail(id, title, detail, evidence) {
    return this.add('fail', id, title, detail, evidence)
  }

  skip(id, title, detail) {
    return this.add('skip', id, title, detail)
  }

  warn(id, title, detail, evidence) {
    return this.add('warn', id, title, detail, evidence)
  }

  async guard(id, title, fn, { critical = false } = {}) {
    try {
      const result = await fn()
      if (result === false) return false
      if (result && typeof result === 'object' && 'ok' in result && result.ok === false) return false
      return true
    } catch (error) {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
      this.fail(id, title, message)
      if (critical) throw error
      return false
    }
  }

  get summary() {
    const summary = { pass: 0, fail: 0, skip: 0, warn: 0, total: this.checks.length }
    for (const check of this.checks) summary[check.status] = (summary[check.status] ?? 0) + 1
    return summary
  }

  get ok() {
    return this.checks.every((check) => check.status !== 'fail')
  }
}

/** Cheap CLI flag parser so the harness has no commander/yargs dependency. */
export function parseArgs(argv, { booleans = [], strings = [], aliases = {} } = {}) {
  const values = {}
  const booleanSet = new Set(booleans)
  const stringSet = new Set(strings)
  const resolveName = (name) => aliases[name] ?? name
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      ;(values.positional ??= []).push(token)
      continue
    }
    let name = resolveName(token.slice(2))
    let raw = undefined
    const equals = name.indexOf('=')
    if (equals !== -1) {
      raw = name.slice(equals + 1)
      name = name.slice(0, equals)
    }
    if (booleanSet.has(name)) {
      values[name] = raw === undefined ? true : raw !== 'false'
      continue
    }
    if (stringSet.has(name)) {
      if (raw === undefined) {
        i += 1
        raw = argv[i]
      }
      if (raw === undefined) throw new Error(`missing value for --${name}`)
      values[name] = raw
      continue
    }
    throw new Error(`unknown argument --${name}`)
  }
  return values
}
