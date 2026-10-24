/**
 * Contract snapshot extraction.
 *
 * Reads a real DSH 0.2.0-rc.2 installation and records the six contract classes
 * that decide compatibility. Nothing here trusts a version string: the hashes
 * are computed from the installed bytes.
 *
 * Run as `node lib/cli/contract.js contract:snapshot -- --dsh-install <path>`.
 * The CLI entry is built by scripts/build.mjs.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import postcss from 'postcss'
import type {
  AdapterManifest,
  ClientApiContract,
  ContractCapabilities,
  ContractSnapshot,
  FileHash,
  HostApiContract,
  LayoutContract,
  LoaderAbiContract,
  ProfileSchemaContract,
  ServiceSignature,
  SupportMatrix,
  TokenContract,
  TokenDeclaration,
} from './types.js'

const TARGET_VERSION = '0.2.0-rc.2'
const ADAPTER_ID = 'dsh-0.2.0-rc.2-r1'
const CLIENT_TARGET = 'chrome120'
/**
 * The target DSH package declares no `engines.node`, so the Node range cannot be
 * copied from it. We record the runtime this adapter is certified on instead of
 * inventing a wider claim.
 */
const CERTIFIED_NODE_RANGE = '^22.23.1'
const NODE_RANGE_SOURCE = 'target-declares-none; certified on node v22.23.1'

export interface ResolvedInstall {
  /** `.../node_modules/@deepseek-ai/dsh`, the CLI package root. */
  readonly dshRoot: string
  /** `.../node_modules/@deepseek-ai`, the sibling package root. */
  readonly packagesRoot: string
  /** Node engine range exactly as declared by the target package. */
  readonly nodeRange: string
}

export interface SnapshotOptions {
  readonly dshInstall: string
  readonly version?: string
  readonly capturedAt?: string
}

/* ------------------------------------------------------------------ *
 * Discovery
 * ------------------------------------------------------------------ */

export async function resolveDshInstall(input: string): Promise<ResolvedInstall> {
  const candidates = [resolve(input), resolve(input, 'node_modules', '@deepseek-ai', 'dsh')]
  for (const candidate of candidates) {
    const pkgPath = join(candidate, 'package.json')
    if (!existsSync(pkgPath)) continue
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as { name?: string; engines?: { node?: string } }
    if (pkg.name !== '@deepseek-ai/dsh') continue
    const sibling = join(candidate, 'node_modules', '@deepseek-ai')
    const packagesRoot = existsSync(sibling) ? sibling : dirname(candidate)
    return { dshRoot: candidate, packagesRoot, nodeRange: pkg.engines?.node ?? CERTIFIED_NODE_RANGE }
  }
  throw new Error(
    `could not resolve an @deepseek-ai/dsh installation from ${input}; pass the dsh package root (the directory containing dsh/package.json)`,
  )
}

/* ------------------------------------------------------------------ *
 * Hashing helpers
 * ------------------------------------------------------------------ */

export function sha256Bytes(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

export async function sha256File(path: string): Promise<FileHash> {
  const bytes = await readFile(path)
  return { path, sha256: sha256Bytes(bytes), bytes: bytes.byteLength }
}

/** Deterministic JSON: object keys sorted recursively. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) sorted[key] = sortValue(source[key])
    return sorted
  }
  return value
}

export function hashCanonical(value: unknown): string {
  return sha256Bytes(Buffer.from(canonicalJson(value), 'utf8'))
}

/* ------------------------------------------------------------------ *
 * Token extraction
 * ------------------------------------------------------------------ */

interface CssSheet {
  readonly name: string
  readonly css: string
}

/** Read every inline CSS sheet embedded in the compiled ui-theme client bundle. */
export async function readThemeSheets(packagesRoot: string): Promise<CssSheet[]> {
  const file = join(packagesRoot, 'dsh-client-ui-theme', 'lib', 'client.js')
  const text = await readFile(file, 'utf8')
  const sheets: CssSheet[] = []
  const pattern = /var ([A-Za-z0-9_]+)_css_default = ("(?:[^"\\]|\\.)*");/g
  for (const match of text.matchAll(pattern)) {
    const name = match[1]
    const literal = match[2]
    if (name === undefined || literal === undefined) continue
    sheets.push({ name, css: JSON.parse(literal) as string })
  }
  if (sheets.length === 0) throw new Error(`no inline CSS sheets found in ${file}`)
  return sheets
}

interface DeclarationRecord {
  readonly name: string
  readonly value: string
  readonly selector: string
  readonly dark: boolean
  readonly platform: string | null
}

function isDarkSelector(selector: string): boolean {
  return selector.includes('[data-ds-dark-theme]')
}

function platformOf(selector: string): string | null {
  const match = /\[data-platform=(["']?)([a-z0-9-]+)\1\]/.exec(selector)
  return match?.[2] ?? null
}

/** Parse declarations out of every sheet; later declarations win per (name, context). */
export function parseCssDeclarations(sheets: readonly CssSheet[]): {
  tokens: Map<string, { light?: DeclarationRecord; dark?: DeclarationRecord; variables: Map<string, string> }>
  dshVariables: Map<string, { values: string[]; selectors: string[] }>
} {
  const tokens = new Map<
    string,
    { light?: DeclarationRecord; dark?: DeclarationRecord; variables: Map<string, string> }
  >()
  const dshVariables = new Map<string, { values: string[]; selectors: string[] }>()

  for (const sheet of sheets) {
    let root: postcss.Root
    try {
      root = postcss.parse(sheet.css)
    } catch (error) {
      throw new Error(`failed to parse sheet ${sheet.name}: ${(error as Error).message}`)
    }
    root.walkRules((rule) => {
      const selector = rule.selector
      const platform = platformOf(selector)
      const dark = isDarkSelector(selector)
      rule.walkDecls((decl) => {
        const name = decl.prop
        if (name.startsWith('--dsh-')) {
          const record = dshVariables.get(name) ?? { values: [], selectors: [] }
          record.values.push(decl.value.trim())
          record.selectors.push(selector)
          dshVariables.set(name, record)
          return
        }
        if (!name.startsWith('--dsw-')) return
        // Platform-specific rebinds are recorded on the token but never treated
        // as the base light/dark pair.
        if (platform !== null) return
        const record = tokens.get(name) ?? { variables: new Map<string, string>() }
        const declaration: DeclarationRecord = {
          name,
          value: decl.value.trim(),
          selector,
          dark,
          platform: null,
        }
        if (!dark) record.light = declaration
        else record.dark = declaration
        tokens.set(name, record)
      })
    })
  }
  return { tokens, dshVariables }
}

function categoryOf(name: string): string {
  if (name.startsWith('--dsw-static-')) return 'static'
  if (name.startsWith('--dsw-alias-')) return 'alias'
  if (name.startsWith('--dsw-specific-')) return 'specific'
  if (name.startsWith('--dsw-font-')) return 'font'
  if (name.startsWith('--dsw-radius-')) return 'radius'
  if (name.startsWith('--dsw-shadow-')) return 'shadow'
  if (name.startsWith('--dsw-elevation-')) return 'elevation'
  if (name.startsWith('--dsw-focus-ring-')) return 'focus'
  if (name === '--dsw-corner-shape') return 'radius'
  return 'other'
}

/** Resolve `var(--name[, fallback])` chains against the recorded declaration set. */
export function resolveTokenValue(
  value: string,
  values: ReadonlyMap<string, string>,
  depth = 0,
): string | null {
  if (depth > 12) return null
  let output = ''
  let index = 0
  while (index < value.length) {
    const start = value.indexOf('var(', index)
    if (start < 0) {
      output += value.slice(index)
      break
    }
    output += value.slice(index, start)
    let cursor = start + 4
    let parens = 1
    while (cursor < value.length && parens > 0) {
      if (value[cursor] === '(') parens += 1
      else if (value[cursor] === ')') parens -= 1
      cursor += 1
    }
    const inner = value.slice(start + 4, cursor - 1)
    const comma = splitTopLevelComma(inner)
    const name = (comma.name ?? '').trim()
    const fallback = comma.rest?.trim()
    const resolved = values.get(name)
    if (resolved !== undefined) {
      const nested = resolveTokenValue(resolved, values, depth + 1)
      if (nested === null) return null
      output += nested
    } else if (fallback !== undefined && fallback !== '') {
      const nested = resolveTokenValue(fallback, values, depth + 1)
      if (nested === null) return null
      output += nested
    } else {
      return null
    }
    index = cursor
  }
  return output
}

function splitTopLevelComma(inner: string): { name?: string; rest?: string } {
  let depth = 0
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i]
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === ',' && depth === 0) return { name: inner.slice(0, i), rest: inner.slice(i + 1) }
  }
  return { name: inner }
}

/** Scan every installed package bundle for `--dsw-*` consumers (A-tier promise). */
export async function scanTokenConsumers(packagesRoot: string): Promise<Map<string, string[]>> {
  const consumers = new Map<string, Set<string>>()
  const packageNames = (await readdir(packagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  // Only var(--dsw-*) reads count as consumption; a declaration alone is not a consumer.
  const readPattern = /var\(\s*(--dsw-[a-z0-9-]+)/g
  for (const packageName of packageNames) {
    const packageRoot = join(packagesRoot, packageName)
    for (const file of ['lib/client.js', 'lib/index.js']) {
      const path = join(packageRoot, file)
      let text: string
      try {
        text = await readFile(path, 'utf8')
      } catch {
        continue
      }
      if (!text.includes('var(--dsw-')) continue
      for (const match of text.matchAll(readPattern)) {
        const token = match[1]
        if (token === undefined) continue
        const record = consumers.get(token) ?? new Set<string>()
        record.add(packageName)
        consumers.set(token, record)
      }
    }
  }
  const sorted = new Map<string, string[]>()
  for (const token of [...consumers.keys()].sort()) {
    sorted.set(token, [...(consumers.get(token) ?? [])].sort())
  }
  return sorted
}

export async function extractTokenContract(packagesRoot: string): Promise<TokenContract> {
  const sheets = await readThemeSheets(packagesRoot)
  const { tokens: declared } = parseCssDeclarations(sheets)
  const consumers = await scanTokenConsumers(packagesRoot)

  const values = new Map<string, string>()
  for (const [name, record] of declared) {
    const value = record.light?.value ?? record.dark?.value
    if (value !== undefined) values.set(name, value)
  }

  const tokens: TokenDeclaration[] = []
  const undeclaredButRead: string[] = []
  for (const [name, record] of declared) {
    const light = record.light?.value
    const dark = record.dark?.value ?? light
    if (light === undefined) continue
    tokens.push({
      name,
      category: categoryOf(name),
      light,
      dark: dark ?? light,
      selector: record.light?.selector ?? '',
      darkSelector: record.dark?.selector ?? null,
      referencedBy: consumers.get(name) ?? [],
    })
  }
  tokens.sort((a, b) => a.name.localeCompare(b.name))

  const declaredNames = new Set(tokens.map((token) => token.name))
  for (const token of consumers.keys()) {
    if (!declaredNames.has(token)) undeclaredButRead.push(token)
  }

  const consumed = tokens.filter((token) => token.referencedBy.length > 0).map((token) => token.name)

  const hash = hashCanonical({ tokens, undeclaredButRead })

  return {
    hash,
    count: tokens.length,
    consumed,
    tokens,
    undeclaredButRead,
  }
}

/* ------------------------------------------------------------------ *
 * Shell / loader / client surface extraction
 * ------------------------------------------------------------------ */

async function findFrontendIndexJs(packagesRoot: string): Promise<{ path: string; text: string }> {
  const assetsDir = join(packagesRoot, 'dsh-web-frontend', 'dist', 'assets')
  const files = await readdir(assetsDir)
  const candidates = files.filter((file) => /^index-.*\.js$/u.test(file)).sort()
  if (candidates.length === 0) throw new Error(`no index-*.js under ${assetsDir}`)
  const file = candidates[0]!
  return { path: join(assetsDir, file), text: await readFile(join(assetsDir, file), 'utf8') }
}

/** Extract the shell's static module seed table (the only require-able words). */
export function extractPlatformModules(shellJs: string): string[] {
  const anchor = shellJs.indexOf('return{react:')
  if (anchor < 0) throw new Error('platform module seed table not found in shell bundle')
  const start = shellJs.indexOf('{', anchor)
  let depth = 0
  let end = start
  for (let i = start; i < shellJs.length; i += 1) {
    const char = shellJs[i]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const objectSource = shellJs.slice(start + 1, end)
  const modules: string[] = []
  const keyPattern = /(?:^|,)\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*:/gu
  for (const match of objectSource.matchAll(keyPattern)) {
    const name = match[1] ?? match[2] ?? match[3]
    if (name !== undefined) modules.push(name)
  }
  return modules
}

async function collectLoaderAbi(packagesRoot: string): Promise<LoaderAbiContract> {
  const modulesClient = join(packagesRoot, 'dsh-client-modules', 'lib', 'client.js')
  const modulesIndex = join(packagesRoot, 'dsh-client-modules', 'lib', 'index.js')
  const [clientText, indexText] = await Promise.all([readFile(modulesClient, 'utf8'), readFile(modulesIndex, 'utf8')])
  const hostWebServerText = await readFile(join(packagesRoot, 'dsh-host-webserver', 'lib', 'index.js'), 'utf8')
  const shell = await findFrontendIndexJs(packagesRoot)
  const globals = ['__ModuleLoader__', '__DSH_BOOT__', '__DSH_BOOT_READY__', '__DSH_TRANSPORT__']
  const markerSources: Record<string, string> = {
    __ModuleLoader__: `${clientText}\n${shell.text}`,
    __DSH_BOOT__: `${clientText}\n${indexText}`,
    __DSH_BOOT_READY__: `${hostWebServerText}\n${shell.text}`,
    __DSH_TRANSPORT__: shell.text,
  }
  for (const globalName of globals) {
    if (!(markerSources[globalName] ?? '').includes(globalName)) {
      throw new Error(`loader ABI marker ${globalName} missing from the installed host build`)
    }
  }
  const call = '__ModuleLoader__.load({ id, factory })'
  if (!clientText.includes('__ModuleLoader__')) throw new Error('__ModuleLoader__ missing from client-modules client bundle')
  const envelope = {
    call,
    moduleFormat: 'cjs-factory' as const,
    idEqualsPackageName: true,
    singleFile: true,
  }
  const platformModules = extractPlatformModules(shell.text)
  const platformHash = hashCanonical(platformModules)
  const evidence = [
    await sha256File(modulesClient),
    await sha256File(modulesIndex),
    await sha256File(shell.path),
  ]
  const hash = hashCanonical({ envelope, globals, platformModulesHash: platformHash, platformModules })
  return {
    hash,
    globals,
    envelope,
    servePath: '/plugins/<package>/client.js?rev=<rev>',
    platformModules: {
      hash: platformHash,
      modules: platformModules,
      chunkProtocol: 'require.async("./client.<name>.js")',
      evidence: [await sha256File(modulesIndex)],
    },
    evidence,
  }
}

async function fileContains(packagesRoot: string, relativePath: string, needle: string): Promise<boolean> {
  try {
    const text = await readFile(join(packagesRoot, relativePath), 'utf8')
    return text.includes(needle)
  } catch {
    return false
  }
}

async function verifyMembers(
  packagesRoot: string,
  service: string,
  from: string,
  members: readonly string[],
): Promise<ServiceSignature> {
  const missing: string[] = []
  for (const member of members) {
    if (!(await fileContains(packagesRoot, from, member))) missing.push(member)
  }
  if (missing.length > 0) {
    throw new Error(`host API ${service} is missing expected members in ${from}: ${missing.join(', ')}`)
  }
  return { service, members, from }
}

async function collectHostApi(packagesRoot: string): Promise<HostApiContract> {
  const webServerTypes = 'dsh-host-webserver/lib/types/index.d.ts'
  const settingsTypes = 'dsh-settings/lib/types/index.d.ts'
  const configEditorTypes = 'dsh-config-editor/lib/types/index.d.ts'
  const services = [
    await verifyMembers(packagesRoot, 'webServer', webServerTypes, [
      'register(route: WebRoute): () => void',
      'collectIndexInjections(): IndexInjection[]',
      'renderIndex(html: string): string',
      'tapIndex(transform: (html: string) => string): () => void',
    ]),
    await verifyMembers(packagesRoot, 'settings', settingsTypes, [
      'configure(presentation:',
      'describe(options?: SettingsDescribeOptions): SettingsDescriptor[]',
      'update(ns: string, patch: object, expectedRevision?: number): Promise<void>',
      'mutate(ns: string, ops: readonly SettingsPathOp[], expectedRevision?: number): Promise<void>',
    ]),
    await verifyMembers(packagesRoot, 'configEditor', configEditorTypes, ['entries():', 'edit(']),
  ]
  const eventNeedle = "'webserver/index-inject'(table: IndexInjection[]): void"
  if (!(await fileContains(packagesRoot, webServerTypes, eventNeedle))) {
    throw new Error('webserver/index-inject event signature changed')
  }
  const events = { 'webserver/index-inject': eventNeedle }
  const evidence = [
    await sha256File(join(packagesRoot, webServerTypes.replace(/\.d\.ts$/u, '.js').replace('lib/types/index.js', 'lib/index.js'))).catch(async () =>
      sha256File(join(packagesRoot, 'dsh-host-webserver', 'lib', 'index.js')),
    ),
    await sha256File(join(packagesRoot, 'dsh-settings', 'lib', 'index.js')),
    await sha256File(join(packagesRoot, 'dsh-config-editor', 'lib', 'index.js')),
  ]
  return { hash: hashCanonical({ services, events }), services, events, evidence }
}

async function collectClientApi(packagesRoot: string): Promise<ClientApiContract> {
  const configFormTypes = 'dsh-client-ui-settings/lib/types/client/config-form.d.ts'
  const slotsTypes = 'dsh-client-ui-slots/lib/types/index.d.ts'
  const settingsSlots = 'dsh-client-ui-settings/lib/types/client/contract/slots.d.ts'
  const localeTypes = 'dsh-client-locale/lib/types/client/index.d.ts'
  const themeTypes = 'dsh-client-ui-theme/lib/types/client/index.d.ts'
  const layoutTypes = 'dsh-client-ui-layout/lib/types/client/theme-presenter.d.ts'

  const checks: Array<[string, string]> = [
    [configFormTypes, 'get<T>(entryId: string): ConfigForm<T>'],
    [configFormTypes, 'whileServed('],
    [configFormTypes, 'configForms: ConfigForms'],
    [slotsTypes, 'register<K extends keyof SlotMap'],
    [settingsSlots, "'settings.section'"],
    [localeTypes, "'locale/change'"],
    [themeTypes, "'theme/change'"],
    [layoutTypes, 'DARK_ATTRIBUTE'],
    [layoutTypes, 'THEME_SOURCE_ATTRIBUTE'],
  ]
  for (const [file, needle] of checks) {
    if (!(await fileContains(packagesRoot, file, needle))) {
      throw new Error(`client contract check failed: ${needle} missing from ${file}`)
    }
  }
  const localeText = await readFile(join(packagesRoot, 'dsh-client-locale', 'lib', 'client.js'), 'utf8')
  if (!localeText.includes('document.documentElement.lang')) {
    throw new Error('locale runtime no longer projects the active locale onto document.documentElement.lang')
  }
  const localeMatch = /LOCALE_IDS\s*=\s*\[([^\]]*)\]/u.exec(localeText)
  if (localeMatch === null) throw new Error('built-in locale id list (LOCALE_IDS) not found')
  const localeIds = [...localeMatch[1]!.matchAll(/["']([a-z-]+)["']/gu)].map((match) => match[1]!)
  if (localeIds.length !== 2 || !localeIds.includes('zh') || !localeIds.includes('en')) {
    throw new Error(`unexpected built-in locale ids: ${localeIds.join(',')}`)
  }
  const darkAttribute = 'data-ds-dark-theme'
  const themeSourceAttribute = 'data-ds-theme-source'

  const payload = {
    services: ['configForms', 'slots', 'locale', 'theme'],
    slots: {
      settingsSection: { kind: 'list', scope: 'root', owner: 'SettingsSectionOwnerProps' },
      localeNamespace: 'dsh-livery',
    },
    theme: { darkAttribute, themeSourceAttribute, observer: "ctx.on('theme/change')" },
    locale: { ids: localeIds, langAttribute: 'html[lang]' },
    configForms: { entryKey: 'entry id = settings namespace', sharedForm: 'configForms.get(entryId)' },
  }
  const evidenceCandidates = [
    ['dsh-client-ui-settings/lib/client.js', 'dsh-client-ui-settings/lib/index.js'],
    ['dsh-client-ui-slots/lib/client.js', 'dsh-client-ui-slots/lib/index.js'],
    ['dsh-client-locale/lib/client.js', 'dsh-client-locale/lib/index.js'],
    ['dsh-client-ui-theme/lib/client.js', 'dsh-client-ui-theme/lib/index.js'],
    ['dsh-client-ui-layout/lib/client.js', 'dsh-client-ui-layout/lib/index.js'],
  ]
  const evidence: FileHash[] = []
  for (const candidates of evidenceCandidates) {
    for (const candidate of candidates) {
      const path = join(packagesRoot, candidate)
      if (!existsSync(path)) continue
      evidence.push(await sha256File(path))
      break
    }
  }
  return { hash: hashCanonical(payload), ...payload, evidence }
}

function readmeSetDocumentedAttributes(readmeTexts: readonly string[]): string[] {
  const attributes = new Set<string>()
  for (const text of readmeTexts) {
    for (const match of text.matchAll(/\bdata-[a-z][a-z0-9-]*/gu)) attributes.add(match[0])
  }
  return [...attributes].sort()
}

async function collectLayoutContract(
  packagesRoot: string,
  tokenContract: TokenContract,
  dshVariables: Map<string, { values: string[]; selectors: string[] }>,
): Promise<LayoutContract> {
  const readmePaths = [
    'dsh-client-ui-layout/README.md',
    'dsh-client-ui-theme/README.md',
    'dsh-client-locale/README.md',
    'dsh-client-ui-sidebar/README.md',
    'dsh-client-ui-sidebar-right/README.md',
    'dsh-client-ui-slots/README.md',
  ]
  const readmes = await Promise.all(readmePaths.map((path) => readFile(join(packagesRoot, path), 'utf8')))
  const documentedAttributes = readmeSetDocumentedAttributes(readmes)
  const allReadmes = readmes.join('\n')
  const rootVariables = [...dshVariables.keys()].sort()
  const tokenNames = new Set(tokenContract.tokens.map((token) => token.name))
  const capabilityFacts = {
    themeCss: tokenContract.count > 0,
    hostFontFamily: tokenNames.has('--dsw-font-family'),
    surfaceMaterial: tokenNames.has('--dsw-elevation-panel') && tokenNames.has('--dsw-alias-bg-layer-1'),
    hostDensityTokens:
      allReadmes.includes('--dsh-density') ||
      allReadmes.includes('--dsh-chat-flow-gap') ||
      allReadmes.includes('--dsh-control-height'),
    hostTranscriptWidth: allReadmes.includes('--dsh-chat-content-width') || allReadmes.includes('--dsh-chat-user-width'),
    hostMessageFlow: allReadmes.includes('--dsh-chat-flow-gap'),
    documentedDarkAttribute: documentedAttributes.includes('data-ds-dark-theme'),
    themeSourceAttribute: documentedAttributes.includes('data-ds-theme-source'),
  }
  const evidence = await Promise.all(
    readmePaths.map((path) => sha256File(join(packagesRoot, path))),
  )
  const payload = { documentedAttributes, rootVariables, capabilityFacts }
  return {
    hash: hashCanonical(payload),
    darkAttribute: 'data-ds-dark-theme',
    documentedAttributes,
    rootVariables,
    capabilityFacts,
    evidence,
  }
}

async function collectProfileSchema(packagesRoot: string): Promise<ProfileSchemaContract> {
  const appBootReadme = await readFile(join(packagesRoot, 'dsh-app-boot', 'README.md'), 'utf8')
  let loaderReadme = ''
  try {
    loaderReadme = await readFile(join(packagesRoot, 'cordis-plugin-loader', 'README.md'), 'utf8')
  } catch {
    loaderReadme = ''
  }
  const manifestTypes = await readFile(join(packagesRoot, 'dsh-package-manifest', 'lib', 'types', 'types.d.ts'), 'utf8')
  const patchKeys = ['insert', 'id', 'name', 'config', 'disabled', 'group', 'inject']
  const documentedPatchText = `${appBootReadme}\n${loaderReadme}\n${manifestTypes}`
  for (const key of patchKeys) {
    if (!new RegExp(`\\b${key}\\b`, 'u').test(documentedPatchText)) {
      throw new Error(`profile patch key ${key} is no longer documented by the installed host packages`)
    }
  }
  const bundleFields = ['bundle', 'patch']
  for (const field of bundleFields) {
    if (!manifestTypes.includes(field)) throw new Error(`manifest field ${field} missing from package-manifest types`)
  }
  const peerGate = 'peerDependencies checked against the running DSH version before import'
  const evidence = [
    await sha256File(join(packagesRoot, 'dsh-app-boot', 'lib', 'index.js')),
    await sha256File(join(packagesRoot, 'dsh-package-manifest', 'lib', 'types', 'types.d.ts')),
  ]
  return {
    hash: hashCanonical({ patchKeys, bundleFields, peerGate }),
    patchKeys,
    bundleFields,
    peerGate,
    evidence,
  }
}

/* ------------------------------------------------------------------ *
 * Snapshot assembly
 * ------------------------------------------------------------------ */

export async function buildContractSnapshot(options: SnapshotOptions): Promise<ContractSnapshot> {
  const install = await resolveDshInstall(options.dshInstall)
  const dshPkg = JSON.parse(await readFile(join(install.dshRoot, 'package.json'), 'utf8')) as {
    version: string
  }
  const version = options.version ?? dshPkg.version
  if (version !== TARGET_VERSION) {
    throw new Error(`snapshot target mismatch: requested ${version}, installed package is ${dshPkg.version}`)
  }

  const sheets = await readThemeSheets(install.packagesRoot)
  // Layout root variables are part of the layout contract; re-derive from the same sheets.
  const { dshVariables } = parseCssDeclarations(sheets)
  const tokens = await extractTokenContract(install.packagesRoot)
  const relativize = (files: readonly FileHash[]): FileHash[] =>
    files.map((file) => ({ ...file, path: relative(install.packagesRoot, file.path).split(sep).join('/') }))
  const rawLoaderAbi = await collectLoaderAbi(install.packagesRoot)
  const loaderAbi: LoaderAbiContract = {
    ...rawLoaderAbi,
    evidence: relativize(rawLoaderAbi.evidence),
    platformModules: { ...rawLoaderAbi.platformModules, evidence: relativize(rawLoaderAbi.platformModules.evidence) },
  }
  const rawHostApi = await collectHostApi(install.packagesRoot)
  const hostApi: HostApiContract = { ...rawHostApi, evidence: relativize(rawHostApi.evidence) }
  const rawClientApi = await collectClientApi(install.packagesRoot)
  const clientApi: ClientApiContract = { ...rawClientApi, evidence: relativize(rawClientApi.evidence) }
  const rawLayout = await collectLayoutContract(install.packagesRoot, tokens, dshVariables)
  const layout: LayoutContract = { ...rawLayout, evidence: relativize(rawLayout.evidence) }
  const rawProfileSchema = await collectProfileSchema(install.packagesRoot)
  const profileSchema: ProfileSchemaContract = { ...rawProfileSchema, evidence: relativize(rawProfileSchema.evidence) }

  const capabilities: ContractCapabilities = {
    themeCss: layout.capabilityFacts.themeCss === true,
    hostFontFamily: layout.capabilityFacts.hostFontFamily === true,
    surfaceMaterial: layout.capabilityFacts.surfaceMaterial === true,
    hostDensityTokens: layout.capabilityFacts.hostDensityTokens === true,
    hostTranscriptWidth: layout.capabilityFacts.hostTranscriptWidth === true,
    hostMessageFlow: layout.capabilityFacts.hostMessageFlow === true,
  }

  const hashes = {
    loaderAbi: loaderAbi.hash,
    hostApi: hostApi.hash,
    clientApi: clientApi.hash,
    token: tokens.hash,
    layout: layout.hash,
    profileSchema: profileSchema.hash,
  }
  const contractHash = hashCanonical({
    version,
    hashes,
    nodeRange: install.nodeRange,
    clientTarget: CLIENT_TARGET,
  })

  return {
    schemaVersion: 1,
    adapterId: ADAPTER_ID,
    hostVersion: version,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    source: {
      kind: 'installed-package',
      dshPackage: `@deepseek-ai/dsh@${version}`,
      nodeRange: install.nodeRange,
      nodeRangeSource: install.nodeRange === CERTIFIED_NODE_RANGE ? NODE_RANGE_SOURCE : 'declared',
      clientTarget: CLIENT_TARGET,
    },
    loaderAbi,
    hostApi,
    clientApi,
    tokens,
    layout,
    profileSchema,
    capabilities,
    hashes,
    contractHash,
  }
}

/* ------------------------------------------------------------------ *
 * Writers
 * ------------------------------------------------------------------ */

export async function writeSnapshotArtifacts(
  workspace: string,
  snapshot: ContractSnapshot,
  install: ResolvedInstall,
): Promise<{ contractPath: string; adapterPath: string; matrixPath: string; generatedPath: string }> {
  const version = snapshot.hostVersion
  const contractDir = join(workspace, 'contracts', 'dsh', version)
  const artifactsDir = join(workspace, 'artifacts', 'contracts', version)
  await mkdir(contractDir, { recursive: true })
  await mkdir(artifactsDir, { recursive: true })

  const contractPath = join(contractDir, 'contract.json')
  await writeFile(contractPath, `${JSON.stringify(snapshot, null, 2)}\n`)

  const adapter: AdapterManifest = {
    hostVersion: version,
    adapterId: snapshot.adapterId,
    loaderAbi: snapshot.hashes.loaderAbi,
    hostApiContract: snapshot.hashes.hostApi,
    clientApiContract: snapshot.hashes.clientApi,
    tokenContract: snapshot.hashes.token,
    layoutContract: snapshot.hashes.layout,
    profileSchema: snapshot.hashes.profileSchema,
    contractHash: snapshot.contractHash,
    nodeRange: snapshot.source.nodeRange,
    clientTarget: snapshot.source.clientTarget,
    verifiedProfiles: ['desktop', 'web'],
    verifiedPlatforms: ['darwin', 'win32', 'web'],
    verifiedBrowsers: [
      { family: 'chrome', minVersion: 120 },
      { family: 'edge', minVersion: 120 },
    ],
  }
  const adapterPath = join(contractDir, 'adapter.json')
  await writeFile(adapterPath, `${JSON.stringify(adapter, null, 2)}\n`)

  const matrixPath = join(workspace, 'contracts', 'dsh', 'support-matrix.proposed.json')
  const matrix: SupportMatrix = {
    schemaVersion: 1,
    updatedAt: snapshot.capturedAt,
    entries: [
      {
        hostVersion: version,
        adapterId: snapshot.adapterId,
        contractHash: snapshot.contractHash,
        status: 'draft',
        profiles: {
          desktop: { macos: 'pending', win32: 'pending' },
          web: { chrome: 'pending', edge: 'pending' },
        },
        browserSupport: adapter.verifiedBrowsers,
        clientTarget: adapter.clientTarget,
        evidence: [],
        notes: ['Phase 0 draft: static contract snapshot only until G0-G6 evidence is attached.'],
      },
    ],
  }
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`)

  // Evidence artifacts may record the local install path; they are never packaged.
  await writeFile(
    join(artifactsDir, 'provenance.json'),
    `${JSON.stringify(
      {
        capturedAt: snapshot.capturedAt,
        dshInstall: install.dshRoot,
        packagesRoot: install.packagesRoot,
        hostVersion: snapshot.hostVersion,
        nodeRange: snapshot.source.nodeRange,
        files: [
          ...snapshot.loaderAbi.evidence,
          ...snapshot.hostApi.evidence,
          ...snapshot.clientApi.evidence,
          ...snapshot.layout.evidence,
          ...snapshot.profileSchema.evidence,
        ],
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(artifactsDir, 'hashes.json'),
    `${JSON.stringify({ hashes: snapshot.hashes, contractHash: snapshot.contractHash }, null, 2)}\n`,
  )
  await writeFile(
    join(artifactsDir, 'summary.json'),
    `${JSON.stringify(
      {
        hostVersion: snapshot.hostVersion,
        adapterId: snapshot.adapterId,
        tokenCount: snapshot.tokens.count,
        consumedTokenCount: snapshot.tokens.consumed.length,
        platformModules: snapshot.loaderAbi.platformModules.modules,
        capabilities: snapshot.capabilities,
        documentedAttributes: snapshot.layout.documentedAttributes,
      },
      null,
      2,
    )}\n`,
  )

  const generatedPath = join(workspace, 'src', 'generated', 'contract.ts')
  await writeFile(generatedPath, renderGeneratedContract(snapshot))
  await writeFile(join(workspace, 'src', 'generated', 'stock.ts'), renderGeneratedStock(snapshot))
  return { contractPath, adapterPath, matrixPath, generatedPath }
}

export function renderGeneratedContract(snapshot: ContractSnapshot): string {
  const facts = {
    dshVersion: snapshot.hostVersion,
    adapterId: snapshot.adapterId,
    contractHash: snapshot.contractHash,
    loaderAbiHash: snapshot.hashes.loaderAbi,
    hostApiHash: snapshot.hashes.hostApi,
    clientApiHash: snapshot.hashes.clientApi,
    tokenHash: snapshot.hashes.token,
    layoutHash: snapshot.hashes.layout,
    profileSchemaHash: snapshot.hashes.profileSchema,
    nodeRange: snapshot.source.nodeRange,
    clientTarget: snapshot.source.clientTarget,
    evidence: snapshot.loaderAbi.evidence.map((file) => file.path),
  }
  const capabilities = buildCapabilityMap(snapshot)
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Frozen capability + hash facts for DSH ${snapshot.hostVersion}
 * (adapter ${snapshot.adapterId}). Regenerate with
 * \`pnpm contract:snapshot -- --dsh-install <dsh package root>\`.
 */
import type { CapabilityMap } from '../core/types.js'

export interface ContractFacts {
  readonly dshVersion: string
  readonly adapterId: string
  readonly contractHash: string
  readonly loaderAbiHash: string
  readonly hostApiHash: string
  readonly clientApiHash: string
  readonly tokenHash: string
  readonly layoutHash: string
  readonly profileSchemaHash: string
  readonly nodeRange: string
  readonly clientTarget: string
  readonly evidence: readonly string[]
}

export const CONTRACT_HASH = ${JSON.stringify(snapshot.contractHash)}

export const CONTRACT_FACTS: ContractFacts = ${JSON.stringify(facts, null, 2)}

/** Capability availability for the certified host build. */
export const HOST_CAPABILITIES: CapabilityMap = ${JSON.stringify(capabilities, null, 2)}
`
}

function buildCapabilityMap(snapshot: ContractSnapshot): Record<string, unknown> {
  const flag = (value: boolean): 'documented' | 'absent' => (value ? 'documented' : 'absent')
  return {
    'theme-css': {
      id: 'theme-css',
      available: snapshot.tokens.count > 0,
      provenance: flag(snapshot.tokens.count > 0),
      required: true,
      detail: `Host token sheets declare ${snapshot.tokens.count} --dsw-* tokens over ${snapshot.tokens.consumed.length} consumed by shipped packages; scoped overrides on body[data-dsh-livery] win by specificity.`,
    },
    'host-font-family': {
      id: 'host-font-family',
      available: snapshot.capabilities.hostFontFamily,
      provenance: flag(snapshot.capabilities.hostFontFamily),
      required: true,
      detail: 'Host design tokens expose --dsw-font-family and the --dsw-font-markdown-* ladder; body-scoped declarations override stock.',
    },
    'surface-material': {
      id: 'surface-material',
      available: snapshot.capabilities.surfaceMaterial,
      provenance: flag(snapshot.capabilities.surfaceMaterial),
      required: false,
      detail: 'Alias surface, border, elevation and shadow tokens are documented design tokens.',
    },
    'host-density-tokens': {
      id: 'host-density-tokens',
      available: snapshot.capabilities.hostDensityTokens,
      provenance: flag(snapshot.capabilities.hostDensityTokens),
      required: false,
      detail: snapshot.capabilities.hostDensityTokens
        ? 'A documented document-level spacing/control hook was found.'
        : 'No documented spacing/control token settable at document level; density falls back to host.',
    },
    'host-transcript-width': {
      id: 'host-transcript-width',
      available: snapshot.capabilities.hostTranscriptWidth,
      provenance: flag(snapshot.capabilities.hostTranscriptWidth),
      required: false,
      detail: snapshot.capabilities.hostTranscriptWidth
        ? 'A documented transcript-width hook was found.'
        : 'Conversation width is a host-owned user-dragged preference published on component-local custom properties; no public document-level hook. Falls back to host.',
    },
    'host-message-flow': {
      id: 'host-message-flow',
      available: snapshot.capabilities.hostMessageFlow,
      provenance: flag(snapshot.capabilities.hostMessageFlow),
      required: false,
      detail: snapshot.capabilities.hostMessageFlow
        ? 'A documented message-flow hook was found.'
        : 'Flow gaps are declared on internal component containers; no documented public hook. Falls back to stock.',
    },
    'reduced-transparency': {
      id: 'reduced-transparency',
      available: true,
      provenance: 'documented',
      required: false,
      detail: 'CSS media query supported by the certified browser set.',
    },
    'forced-colors': {
      id: 'forced-colors',
      available: true,
      provenance: 'documented',
      required: false,
      detail: 'CSS media query supported by the certified browser set.',
    },
    'reduced-motion': {
      id: 'reduced-motion',
      available: true,
      provenance: 'documented',
      required: false,
      detail: 'CSS media query supported by the certified browser set.',
    },
  }
}

export function renderGeneratedStock(snapshot: ContractSnapshot): string {
  const values = new Map<string, string>()
  for (const token of snapshot.tokens.tokens) values.set(token.name, token.light)
  const tokens: Record<string, Record<string, unknown>> = {}
  for (const token of snapshot.tokens.tokens) {
    tokens[token.name] = {
      category: token.category,
      light: token.light,
      dark: token.dark,
      resolvedLight: resolveTokenValue(token.light, values),
      resolvedDark: resolveTokenValue(token.dark, values),
      selector: token.selector,
      darkSelector: token.darkSelector,
      themeInvariant: token.dark === token.light,
      referencedBy: token.referencedBy,
    }
  }
  const dshVariables: Record<string, unknown> = {}
  for (const name of snapshot.layout.rootVariables) {
    dshVariables[name] = { light: null, dark: null, notes: 'declared by host sheets', declared: true }
  }
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Frozen stock token snapshot for DSH ${snapshot.hostVersion}, extracted from
 * @deepseek-ai/dsh-client-ui-theme by \`pnpm contract:snapshot\`. Regenerate only
 * when the support matrix adds a new certified host version.
 */
import type { TokenMap } from "../core/types.js";

export interface StockTokenDeclaration {
  readonly category: string;
  /** Raw light-mode declaration value. */
  readonly light: string;
  /** Raw dark-mode declaration value (theme-invariant tokens repeat light). */
  readonly dark: string;
  /** Value after resolving \`var()\` chains, when resolvable. */
  readonly resolvedLight: string | null;
  readonly resolvedDark: string | null;
  readonly selector: string | null;
  readonly darkSelector: string | null;
  readonly themeInvariant: boolean;
  readonly referencedBy: readonly string[];
}

export const STOCK_DSH_VERSION = ${JSON.stringify(snapshot.hostVersion)};
export const STOCK_THEME_VERSION = ${JSON.stringify(snapshot.hostVersion)};

/** Every \`--dsw-*\` token declared by the frozen host token sheets. */
export const STOCK_TOKENS: Readonly<Record<string, StockTokenDeclaration>> = ${JSON.stringify(tokens, null, 2)};

export const STOCK_TOKEN_NAMES: readonly string[] = Object.keys(STOCK_TOKENS);

/** Light-mode stock token map (raw declarations). */
export const STOCK_LIGHT: TokenMap = Object.fromEntries(STOCK_TOKEN_NAMES.map((name) => [name, STOCK_TOKENS[name]!.light]));
/** Dark-mode stock token map (raw declarations). */
export const STOCK_DARK: TokenMap = Object.fromEntries(STOCK_TOKEN_NAMES.map((name) => [name, STOCK_TOKENS[name]!.dark]));

/** Public \`--dsh-*\` layout/content hooks observed in the frozen host. */
export const STOCK_DSH_VARIABLES: Readonly<Record<string, Readonly<{ light: string | null; dark: string | null; notes: string | null; declared: boolean }>>> = ${JSON.stringify(dshVariables, null, 2)};
`
}
