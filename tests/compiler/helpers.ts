/**
 * Shared helpers for compiler tests: repo discovery, manifest loading and a small
 * dependency-free XML well-formedness checker for the preview SVGs.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LiveryManifest } from '../../src/core/types.js'
import type { ManifestSource } from '../../src/compiler/validate.js'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** All `liveries/<id>/manifest.json` documents, sorted by directory name. */
export function loadManifestSources(rootDir: string = REPO_ROOT): ManifestSource[] {
  const liveriesDir = join(rootDir, 'liveries')
  return readdirSync(liveriesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((id) => ({
      file: `liveries/${id}/manifest.json`,
      raw: JSON.parse(readFileSync(join(liveriesDir, id, 'manifest.json'), 'utf8')) as unknown,
    }))
}

/** The shipped manifest ids, sorted. */
export function liveryIds(rootDir: string = REPO_ROOT): string[] {
  return readdirSync(join(rootDir, 'liveries'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

export function readManifest(id: string, rootDir: string = REPO_ROOT): LiveryManifest {
  return JSON.parse(readFileSync(join(rootDir, 'liveries', id, 'manifest.json'), 'utf8')) as LiveryManifest
}

export function cloneManifest(manifest: LiveryManifest): Record<string, unknown> {
  return structuredClone(manifest) as unknown as Record<string, unknown>
}

/** CJK text detector used to assert locale separation in previews. */
// eslint-disable-next-line no-control-regex
export const CJK_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/**
 * Minimal XML well-formedness check: balanced elements (one root), quoted
 * attributes, no stray `<`/`>`, and only known/numeric character references.
 * Returns a list of human-readable problems (empty = well formed).
 */
export function checkWellFormedXml(xml: string): string[] {
  const problems: string[] = []
  const stack: string[] = []
  let roots = 0
  let index = 0
  while (index < xml.length) {
    const lt = xml.indexOf('<', index)
    if (lt === -1) {
      checkText(xml.slice(index), problems)
      break
    }
    if (lt > index) checkText(xml.slice(index, lt), problems)
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt + 4)
      if (end === -1) {
        problems.push('unterminated comment')
        break
      }
      index = end + 3
      continue
    }
    if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt + 9)
      if (end === -1) {
        problems.push('unterminated CDATA')
        break
      }
      index = end + 3
      continue
    }
    if (xml.startsWith('<?', lt)) {
      const end = xml.indexOf('?>', lt + 2)
      if (end === -1) {
        problems.push('unterminated processing instruction')
        break
      }
      index = end + 2
      continue
    }
    if (xml.startsWith('<!', lt)) {
      problems.push(`unexpected declaration at ${lt}`)
      break
    }
    const gt = findTagEnd(xml, lt + 1)
    if (gt === -1) {
      problems.push(`unterminated tag at ${lt}`)
      break
    }
    const raw = xml.slice(lt + 1, gt)
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim()
      const current = stack.pop()
      if (current !== name) problems.push(`closing </${name}> does not match <${current ?? 'nothing'}>`)
    } else {
      const selfClosing = raw.endsWith('/')
      const body = selfClosing ? raw.slice(0, -1) : raw
      const nameMatch = /^([A-Za-z_][A-Za-z0-9_.:-]*)/.exec(body)
      if (nameMatch === null) {
        problems.push(`invalid tag name in <${body.slice(0, 20)}>`)
        break
      }
      const name = nameMatch[1] ?? ''
      checkAttributes(body.slice(name.length), problems)
      if (stack.length === 0 && !selfClosing) roots += 1
      if (!selfClosing) stack.push(name)
    }
    index = gt + 1
  }
  if (stack.length > 0) problems.push(`unclosed element(s): ${stack.join(' > ')}`)
  if (roots !== 1) problems.push(`expected exactly one root element, found ${roots}`)
  return problems
}

function findTagEnd(xml: string, from: number): number {
  let quote: string | null = null
  for (let index = from; index < xml.length; index += 1) {
    const char = xml[index]
    if (quote !== null) {
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '>') return index
  }
  return -1
}

function checkAttributes(source: string, problems: string[]): void {
  let index = 0
  while (index < source.length) {
    const char = source[index]
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      index += 1
      continue
    }
    const nameMatch = /^([A-Za-z_][A-Za-z0-9_.:-]*)/.exec(source.slice(index))
    if (nameMatch === null) {
      problems.push(`invalid attribute near "${source.slice(index, index + 20)}"`)
      return
    }
    index += nameMatch[1]?.length ?? 0
    while (index < source.length && /\s/.test(source[index] ?? '')) index += 1
    if (source[index] !== '=') {
      problems.push(`attribute "${nameMatch[1] ?? ''}" has no value`)
      return
    }
    index += 1
    while (index < source.length && /\s/.test(source[index] ?? '')) index += 1
    const quote = source[index]
    if (quote !== '"' && quote !== "'") {
      problems.push(`attribute "${nameMatch[1] ?? ''}" value is not quoted`)
      return
    }
    const end = source.indexOf(quote, index + 1)
    if (end === -1) {
      problems.push(`attribute "${nameMatch[1] ?? ''}" has an unterminated value`)
      return
    }
    checkText(source.slice(index + 1, end), problems)
    index = end + 1
  }
}

function checkText(text: string, problems: string[]): void {
  if (text.includes('<') || text.includes('>')) problems.push(`unescaped markup delimiter in text: "${text.slice(0, 40)}"`)
  const entityPattern = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g
  let match = entityPattern.exec(text)
  while (match !== null) {
    problems.push(`unescaped "&" near "${text.slice(Math.max(0, match.index - 10), match.index + 20)}"`)
    match = entityPattern.exec(text)
  }
}

export interface FixtureRoot {
  readonly dir: string
  readonly cleanup: () => void
}

/**
 * Create an isolated repo-shaped fixture under `.tmp/` with package.json,
 * schemas/livery.schema.json and copies of every livery manifest, so CLI
 * commands can run their full read/write/drift cycle without touching the repo.
 */
export function createFixtureRoot(): FixtureRoot {
  const base = join(REPO_ROOT, '.tmp')
  mkdirSync(base, { recursive: true })
  const dir = mkdtempSync(join(base, 'compiler-fixture-'))
  mkdirSync(join(dir, 'schemas'), { recursive: true })
  copyFileSync(join(REPO_ROOT, 'schemas', 'livery.schema.json'), join(dir, 'schemas', 'livery.schema.json'))
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ name: 'dsh-livery-fixture', version: '0.0.0' }, null, 2)}\n`)
  for (const id of liveryIds()) {
    mkdirSync(join(dir, 'liveries', id), { recursive: true })
    copyFileSync(join(REPO_ROOT, 'liveries', id, 'manifest.json'), join(dir, 'liveries', id, 'manifest.json'))
  }
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}
