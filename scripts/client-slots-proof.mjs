#!/usr/bin/env node
/**
 * Per-host proof of the `plugins.detail.*` client-slot declarations.
 *
 * Livery contributes to three slots declared by the DSH plugin-manager client
 * package. The contract snapshots do not carry slot owner/kind metadata, so
 * this script reads the declaration source of each locally installed host tree
 * and records, per host: the plugin-manager package version, the sha256 of the
 * declaration source, and the declared key/kind/scope/ownerProps. It also
 * records the current `clientSlotHash()` (recomputed from
 * `src/contract/client-slots.ts`) so a contract change makes the committed
 * proof visibly stale.
 *
 * The output (`contracts/dsh/client-slot-declarations.json`) is a repository
 * artifact only: it is not a package file and never ships. It is not a
 * substitute for the runtime acceptance check on each scope — it is the static
 * declaration proof behind that check.
 *
 * Usage:
 *   node scripts/client-slots-proof.mjs                 # regenerate
 *   node scripts/client-slots-proof.mjs --check         # validate committed file
 *   node scripts/client-slots-proof.mjs --hosts-dir DIR # non-default host tree root
 *
 * Default host tree root: `/tmp/dsh-hosts/<version>/node_modules/@deepseek-ai/`.
 * A host declared by `contracts/dsh/support-matrix.json` whose local tree is
 * not installed is recorded under `missingHosts` with an explicit reason, not
 * silently skipped.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

/** Repository-relative path of the committed proof document. */
export const PROOF_PATH = 'contracts/dsh/client-slot-declarations.json'

/** Schema version of the proof document. */
export const PROOF_SCHEMA_VERSION = 1

/** Source of truth for consumed client slots. */
export const CONSUMED_SLOTS_SOURCE = 'src/contract/client-slots.ts'

/** Host package that declares the detail slots. */
export const PLUGIN_MANAGER_PACKAGE = '@deepseek-ai/dsh-client-ui-plugin-manager'

/** Repository-relative declaration source the proof reads inside that package. */
export const DECLARATION_SOURCE = 'lib/types/client/slot-contract.d.ts'

/** The three detail slots this plugin consumes, in frozen contract order. */
export const DETAIL_SLOT_KEYS = Object.freeze([
  'plugins.detail.actions',
  'plugins.detail.badge',
  'plugins.detail.section',
])

/** The declaration shape every inspected host must show for those keys. */
export const EXPECTED_DETAIL_DECLARATION = Object.freeze({
  kind: 'list',
  scope: 'root',
  ownerProps: Object.freeze(['subject']),
})

/** Default root of the locally installed host trees. */
export const DEFAULT_HOSTS_DIR = '/tmp/dsh-hosts'

/** One consumed-slot object literal inside `src/contract/client-slots.ts`. */
const CONSUMED_SLOT_PATTERN = /\{\s*key:\s*'([^']+)',\s*scope:\s*'([^']+)',\s*kind:\s*'([^']+)',\s*ownerProps:\s*\[([^\]]*)\],\s*register:\s*'([^']+)',\s*inject:\s*'([^']+)'\s*,?\s*\}/gu

/**
 * Escape one literal for use inside a RegExp.
 * @param value - literal text.
 * @returns the escaped text.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

/**
 * Parse the canonical object-literal list out of the consumed-slot contract.
 * @param source - text of `src/contract/client-slots.ts`.
 * @returns the consumed slots in declaration order, with the same field order
 * the contract canonicalizes.
 */
export function parseConsumedClientSlots(source) {
  const slots = []
  for (const match of source.matchAll(CONSUMED_SLOT_PATTERN)) {
    const [, key, scope, kind, rawOwnerProps, register, inject] = match
    slots.push({
      key,
      scope,
      kind,
      ownerProps: rawOwnerProps
        .split(',')
        .map(part => part.trim())
        .filter(part => part.length > 0)
        .map(part => {
          const quoted = /^'([^']*)'$/u.exec(part)
          return quoted === null ? part : quoted[1]
        }),
      register,
      inject,
    })
  }
  return slots
}

/**
 * Canonical hash of one consumed-slot list (the contract's own identity).
 * @param slots - consumed slots in declaration order.
 * @returns `sha256:<hex>`.
 */
export function clientSlotHashOf(slots) {
  return `sha256:${createHash('sha256').update(JSON.stringify(slots), 'utf8').digest('hex')}`
}

/**
 * Read the current consumed-slot list from the contract source.
 * @param root - repository root.
 * @returns the current consumed slots.
 */
export function readConsumedClientSlots(root) {
  return parseConsumedClientSlots(readFileSync(join(root, CONSUMED_SLOTS_SOURCE), 'utf8'))
}

/**
 * Read the declared host versions from the formal support matrix.
 * @param root - repository root.
 * @returns declared host versions in matrix order.
 */
export function readDeclaredHosts(root) {
  return readDeclaredHostClaims(root).map(entry => entry.hostVersion)
}

/**
 * Read the matrix host claims (hostVersion + claimTier) used to decide whether
 * a missing static proof needs an explicit waiver.
 * @param root - repository root.
 * @returns declared host claims in matrix order.
 */
export function readDeclaredHostClaims(root) {
  const matrix = JSON.parse(readFileSync(join(root, 'contracts', 'dsh', 'support-matrix.json'), 'utf8'))
  const entries = Array.isArray(matrix.entries) ? matrix.entries : []
  return entries
    .filter(entry => entry !== null && typeof entry === 'object' && typeof entry.hostVersion === 'string' && entry.hostVersion.length > 0)
    .map(entry => ({ hostVersion: entry.hostVersion, claimTier: typeof entry.claimTier === 'string' ? entry.claimTier : 'unknown' }))
}

/**
 * Read the `readonly` property names of one owner interface.
 * @param source - declaration source text.
 * @param interfaceName - interface name from the slot's `owner:` field.
 * @returns property names in declaration order (empty when not found).
 */
export function parseOwnerProps(source, interfaceName) {
  const block = new RegExp(`interface\\s+${escapeRegExp(interfaceName)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'u').exec(source)
  if (block === null) return []
  return [...block[1].matchAll(/readonly\s+([A-Za-z0-9_$]+)\??\s*:/gu)].map(match => match[1])
}

/**
 * Parse the `plugins.detail.*` declarations out of one host declaration source.
 * @param source - text of the plugin-manager slot-contract declaration file.
 * @returns one record per expected key: `{key, declared, kind, scope, ownerProps}`.
 */
export function inspectDetailDeclarations(source) {
  return DETAIL_SLOT_KEYS.map(key => {
    const block = new RegExp(`'${escapeRegExp(key)}'\\s*:\\s*\\{([^}]*)\\}`, 'u').exec(source)
    if (block === null) return { key, declared: false }
    const body = block[1]
    const kind = /kind:\s*'([^']+)'/u.exec(body)?.[1]
    const scope = /scope:\s*'([^']+)'/u.exec(body)?.[1]
    const owner = /owner:\s*([A-Za-z0-9_$]+)/u.exec(body)?.[1]
    const ownerProps = owner === undefined ? [] : parseOwnerProps(source, owner)
    const declared = kind !== undefined && scope !== undefined && owner !== undefined
    return {
      key,
      declared,
      ...(declared ? { kind, scope, ownerProps } : {}),
    }
  })
}

/**
 * Inspect one locally installed host tree.
 * @param hostsDir - root holding `<hostVersion>/node_modules/...` trees.
 * @param hostVersion - declared host version.
 * @param packageName - host client package to inspect.
 * @returns an inspected-host record, or `{hostVersion, reason}` when the tree
 * (or the package/declaration inside it) is not installed.
 */
export function inspectHostTree(hostsDir, hostVersion, packageName = PLUGIN_MANAGER_PACKAGE) {
  const packageRoot = join(hostsDir, hostVersion, 'node_modules', packageName)
  let packageJson
  try {
    packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  } catch {
    return { hostVersion, reason: 'plugin-manager package metadata not installed in the local host tree' }
  }
  const packageVersion = typeof packageJson.version === 'string' ? packageJson.version : ''
  if (packageVersion.length === 0) {
    return { hostVersion, reason: 'plugin-manager package version is missing from the local host tree' }
  }
  let source
  try {
    source = readFileSync(join(packageRoot, DECLARATION_SOURCE), 'utf8')
  } catch {
    return { hostVersion, reason: 'plugin-manager slot declaration source is missing from the local host tree' }
  }
  const sourceSha256 = `sha256:${createHash('sha256').update(source, 'utf8').digest('hex')}`
  return {
    hostVersion,
    packageName,
    packageVersion,
    source: `${packageName}/${DECLARATION_SOURCE}`,
    sourceSha256,
    slots: inspectDetailDeclarations(source),
  }
}

/**
 * Build the proof document from the contract source and the local host trees.
 * @param options - optional overrides (tests use a fixture host root).
 * @returns the proof document.
 */
export function generateClientSlotProof(options = {}) {
  const root = options.root ?? ROOT
  const hostsDir = options.hostsDir ?? DEFAULT_HOSTS_DIR
  const hostClaims = options.declaredHostClaims ?? readDeclaredHostClaims(root)
  const declaredHosts = options.declaredHosts ?? hostClaims.map(entry => entry.hostVersion)
  const claimByHost = new Map(hostClaims.map(entry => [entry.hostVersion, entry.claimTier]))
  const consumedClientSlots = readConsumedClientSlots(root)
  const inspectedHosts = []
  const missingHosts = []
  for (const hostVersion of declaredHosts) {
    const inspected = inspectHostTree(hostsDir, hostVersion, options.packageName)
    if (typeof inspected.reason === 'string') {
      const claimTier = claimByHost.get(hostVersion)
      missingHosts.push({
        hostVersion,
        reason: inspected.reason,
        ...(claimTier === undefined ? {} : { claimTier }),
        ...(claimTier === 'stable'
          ? { waiver: 'stable host tree unavailable for static proof; runtime detail coverage is recorded per scope, but Desktop has no runtime detail check yet — documented limitation, never a pass' }
          : {}),
      })
    } else inspectedHosts.push(inspected)
  }
  return {
    schemaVersion: PROOF_SCHEMA_VERSION,
    generator: 'scripts/client-slots-proof.mjs',
    scope: 'plugins.detail.*',
    clientSlotHash: clientSlotHashOf(consumedClientSlots),
    consumedClientSlots,
    expectedDetailDeclaration: {
      kind: EXPECTED_DETAIL_DECLARATION.kind,
      scope: EXPECTED_DETAIL_DECLARATION.scope,
      ownerProps: [...EXPECTED_DETAIL_DECLARATION.ownerProps],
    },
    declaredHosts: [...declaredHosts],
    inspectedHosts,
    missingHosts,
  }
}

/**
 * Validate one proof document against the current contract source and the
 * declared-host set.
 * @param document - parsed proof document.
 * @param options - optional overrides (tests use a fixture declared-host set).
 * @returns a list of problems; empty means the proof is current and complete.
 */
export function validateClientSlotProof(document, options = {}) {
  const problems = []
  const root = options.root ?? ROOT
  const declaredHostSet = options.declaredHosts ?? readDeclaredHosts(root)
  const consumedClientSlots = readConsumedClientSlots(root)
  const currentHash = clientSlotHashOf(consumedClientSlots)

  if (document === null || typeof document !== 'object') return ['proof document is not an object']
  if (document.schemaVersion !== PROOF_SCHEMA_VERSION) {
    problems.push(`proof schemaVersion must be ${PROOF_SCHEMA_VERSION}`)
  }
  if (document.generator !== 'scripts/client-slots-proof.mjs') {
    problems.push('proof generator must be scripts/client-slots-proof.mjs')
  }
  if (document.clientSlotHash !== currentHash) {
    problems.push(`proof clientSlotHash is stale: ${String(document.clientSlotHash)} vs current ${currentHash}`)
  }
  if (JSON.stringify(document.consumedClientSlots) !== JSON.stringify(consumedClientSlots)) {
    problems.push(`proof consumedClientSlots do not match ${CONSUMED_SLOTS_SOURCE}`)
  }
  const expectedDetailSlots = consumedClientSlots.filter(slot => DETAIL_SLOT_KEYS.includes(slot.key))
  if (expectedDetailSlots.length !== DETAIL_SLOT_KEYS.length) {
    problems.push('current consumed-slot contract is missing one or more plugins.detail.* keys')
  }
  if (JSON.stringify(document.expectedDetailDeclaration) !== JSON.stringify({
    kind: EXPECTED_DETAIL_DECLARATION.kind,
    scope: EXPECTED_DETAIL_DECLARATION.scope,
    ownerProps: [...EXPECTED_DETAIL_DECLARATION.ownerProps],
  })) {
    problems.push('proof expectedDetailDeclaration does not match kind=list, scope=root, ownerProps=[subject]')
  }

  const declaredHosts = Array.isArray(document.declaredHosts) ? document.declaredHosts : undefined
  const inspectedHosts = Array.isArray(document.inspectedHosts) ? document.inspectedHosts : undefined
  const missingHosts = Array.isArray(document.missingHosts) ? document.missingHosts : undefined
  if (declaredHosts === undefined) problems.push('proof declaredHosts must be an array')
  if (inspectedHosts === undefined) problems.push('proof inspectedHosts must be an array')
  if (missingHosts === undefined) problems.push('proof missingHosts must be an array')
  if (problems.length > 0) return problems

  if (JSON.stringify([...declaredHosts].sort()) !== JSON.stringify([...declaredHostSet].sort())) {
    problems.push(`proof declaredHosts must equal the support matrix hosts ${JSON.stringify([...declaredHostSet].sort())}`)
  }
  const covered = [...inspectedHosts.map(host => host.hostVersion), ...missingHosts.map(host => host.hostVersion)]
  if (new Set(covered).size !== covered.length) {
    problems.push('proof records a host more than once across inspectedHosts/missingHosts')
  }
  if (JSON.stringify([...covered].sort()) !== JSON.stringify([...declaredHosts].sort())) {
    problems.push('proof must record every declared host exactly once as inspected or missing')
  }
  const claims = options.declaredHostClaims ?? readDeclaredHostClaims(root)
  const claimByHost = new Map(claims.map(entry => [entry.hostVersion, entry.claimTier]))
  for (const host of missingHosts) {
    if (typeof host.hostVersion !== 'string' || host.hostVersion.length === 0) {
      problems.push('proof missingHosts entry has no hostVersion')
      continue
    }
    if (typeof host.reason !== 'string' || host.reason.length === 0) {
      problems.push(`proof missingHosts entry for ${host.hostVersion} has no explicit reason`)
    }
    if (claimByHost.get(host.hostVersion) === 'stable'
      && (typeof host.waiver !== 'string' || host.waiver.trim().length === 0)) {
      problems.push(`proof missing stable host ${host.hostVersion} needs an explicit waiver`)
    }
  }
  for (const host of inspectedHosts) {
    const label = typeof host.hostVersion === 'string' ? host.hostVersion : '<unknown host>'
    if (typeof host.hostVersion !== 'string' || host.hostVersion.length === 0) problems.push('proof inspected host has no hostVersion')
    if (host.packageName !== PLUGIN_MANAGER_PACKAGE) {
      problems.push(`proof inspected host ${label} does not name the plugin-manager package`)
    }
    if (typeof host.packageVersion !== 'string' || host.packageVersion.length === 0) {
      problems.push(`proof inspected host ${label} has no plugin-manager packageVersion`)
    } else if (host.packageVersion !== host.hostVersion) {
      problems.push(`proof inspected host ${label} has plugin-manager packageVersion ${host.packageVersion}; expected the host version`)
    }
    if (host.source !== `${PLUGIN_MANAGER_PACKAGE}/${DECLARATION_SOURCE}`) {
      problems.push(`proof inspected host ${label} does not name the plugin-manager declaration source`)
    }
    if (!/^sha256:[0-9a-f]{64}$/u.test(typeof host.sourceSha256 === 'string' ? host.sourceSha256 : '')) {
      problems.push(`proof inspected host ${label} has no valid sourceSha256`)
    }
    if (!Array.isArray(host.slots) || host.slots.length !== DETAIL_SLOT_KEYS.length) {
      problems.push(`proof inspected host ${label} must record exactly ${DETAIL_SLOT_KEYS.length} detail slots`)
      continue
    }
    const recordedKeys = host.slots.map(slot => slot.key)
    if (JSON.stringify(recordedKeys) !== JSON.stringify([...DETAIL_SLOT_KEYS])) {
      problems.push(`proof inspected host ${label} detail slots are not in the frozen order ${JSON.stringify([...DETAIL_SLOT_KEYS])}`)
    }
    for (const slot of host.slots) {
      if (slot.declared !== true) {
        problems.push(`proof inspected host ${label} is missing the ${String(slot.key)} declaration`)
        continue
      }
      if (slot.kind !== EXPECTED_DETAIL_DECLARATION.kind) {
        problems.push(`proof inspected host ${label} declares ${String(slot.key)} kind=${String(slot.kind)}, expected ${EXPECTED_DETAIL_DECLARATION.kind}`)
      }
      if (slot.scope !== EXPECTED_DETAIL_DECLARATION.scope) {
        problems.push(`proof inspected host ${label} declares ${String(slot.key)} scope=${String(slot.scope)}, expected ${EXPECTED_DETAIL_DECLARATION.scope}`)
      }
      if (JSON.stringify(slot.ownerProps) !== JSON.stringify([...EXPECTED_DETAIL_DECLARATION.ownerProps])) {
        problems.push(`proof inspected host ${label} declares ${String(slot.key)} ownerProps=${JSON.stringify(slot.ownerProps)}, expected ${JSON.stringify([...EXPECTED_DETAIL_DECLARATION.ownerProps])}`)
      }
    }
  }

  // A committed proof must stay sanitized: no absolute local host paths.
  const text = JSON.stringify(document)
  if (/(?:\/Users\/|\/home\/|\/tmp\/|[A-Za-z]:\\\\)/u.test(text)) {
    problems.push('proof must not contain absolute local paths')
  }
  return problems
}

/**
 * Read the committed proof document.
 * @param root - repository root.
 * @returns the parsed document, or undefined when it does not exist.
 */
export function readCommittedProof(root) {
  try {
    return JSON.parse(readFileSync(join(root, PROOF_PATH), 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * Regenerate and write the committed proof document.
 * @param options - generator options.
 * @returns the generated document.
 */
export function writeClientSlotProof(options = {}) {
  const root = options.root ?? ROOT
  const document = generateClientSlotProof({ ...options, root })
  writeFileSync(join(root, PROOF_PATH), `${JSON.stringify(document, null, 2)}\n`, 'utf8')
  return document
}

/**
 * CLI entry.
 * @param argv - arguments after the script name.
 * @returns process exit code.
 */
export function main(argv) {
  const check = argv.includes('--check')
  const hostsDirIndex = argv.indexOf('--hosts-dir')
  const hostsDir = hostsDirIndex === -1 ? undefined : argv[hostsDirIndex + 1]
  if (hostsDirIndex !== -1 && hostsDir === undefined) {
    console.error('client-slots-proof: --hosts-dir needs a directory')
    return 2
  }
  if (check) {
    const document = readCommittedProof(ROOT)
    if (document === undefined) {
      console.error(`client-slots-proof: FAIL missing ${PROOF_PATH}; run node scripts/client-slots-proof.mjs`)
      return 1
    }
    const problems = validateClientSlotProof(document)
    if (problems.length > 0) {
      for (const problem of problems) console.error(`client-slots-proof: FAIL ${problem}`)
      return 1
    }
    console.log(`client-slots-proof: OK ${PROOF_PATH} (${document.inspectedHosts.length} inspected, ${document.missingHosts.length} missing, ${document.clientSlotHash})`)
    return 0
  }
  const document = writeClientSlotProof(hostsDir === undefined ? {} : { hostsDir })
  console.log(`client-slots-proof: wrote ${PROOF_PATH} (${document.inspectedHosts.length} inspected, ${document.missingHosts.length} missing, ${document.clientSlotHash})`)
  for (const host of document.inspectedHosts) {
    console.log(`  inspected ${host.hostVersion}: plugin-manager ${host.packageVersion} ${host.sourceSha256}`)
  }
  for (const host of document.missingHosts) {
    console.log(`  missing ${host.hostVersion}: ${host.reason}`)
  }
  return 0
}

const entry = process.argv[1]
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
