#!/usr/bin/env node
/**
 * Validate the committed provider access-gate record.
 *
 * `docs/research/provider-access-gate.json` is the legal/API/CORS decision record
 * behind the keyless wallpaper provider registry. It is a repository artifact
 * only (the package ships only the two named design-reference files from
 * `docs/research`), but a release must not ship a provider that lacks a complete
 * accepted record.
 *
 * Usage:
 *   node scripts/verify-provider-gate.mjs
 *   node scripts/verify-provider-gate.mjs --file <path>
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const GATE_PATH = 'docs/research/provider-access-gate.json'

/** Decisions accepted by the validator. */
const DECISIONS = new Set(['accepted', 'rejected', 'deferred'])
/** Failure shapes a provider record must be able to explain. */
const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/

/**
 * Read one JSON file, or undefined with the error message.
 * @param {string} path absolute path.
 * @returns {{value: unknown} | {error: string}}
 */
function readJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (error) {
    return { error: `${path}: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Check the shape and internal consistency of the gate record.
 * @param {unknown} value parsed JSON.
 * @param {string} expectedRelease package version the record must target.
 * @returns {string[]} problems; empty means valid.
 */
export function validateProviderGate(value, expectedRelease) {
  const problems = []
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return ['gate record is not an object']
  }
  const record = value
  if (record.schemaVersion !== 2) problems.push('schemaVersion must be 2')
  if (record.release !== expectedRelease) {
    problems.push(`release must be ${expectedRelease} (got ${String(record.release)})`)
  }
  if (typeof record.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.retrievedAt)) {
    problems.push('retrievedAt must be an ISO date (YYYY-MM-DD)')
  }
  if (typeof record.reviewer !== 'string' || record.reviewer.trim().length === 0) {
    problems.push('reviewer must be a non-empty string')
  }
  if (!Array.isArray(record.providers) || record.providers.length === 0) {
    problems.push('providers must be a non-empty array')
    return problems
  }
  const seen = new Set()
  for (const [index, provider] of record.providers.entries()) {
    const at = `providers[${index}]`
    if (typeof provider !== 'object' || provider === null) {
      problems.push(`${at} is not an object`)
      continue
    }
    if (typeof provider.id !== 'string' || !PROVIDER_ID_PATTERN.test(provider.id)) {
      problems.push(`${at}.id must be kebab-case`)
    } else if (seen.has(provider.id)) {
      problems.push(`${at}.id duplicates ${provider.id}`)
    } else {
      seen.add(provider.id)
    }
    if (!DECISIONS.has(provider.decision)) {
      problems.push(`${at}.decision must be accepted/rejected/deferred`)
    }
    if (typeof provider.role !== 'string' || provider.role.trim().length === 0) {
      problems.push(`${at}.role must be a non-empty string`)
    }
    const api = provider.api
    if (typeof api !== 'object' || api === null) {
      problems.push(`${at}.api must be an object`)
    } else {
      for (const key of ['baseUrl', 'docsUrl', 'termsUrl']) {
        if (typeof api[key] !== 'string' || !/^https:\/\//.test(api[key])) {
          problems.push(`${at}.api.${key} must be an https URL`)
        }
      }
    }
    if (provider.auth !== 'keyless' && provider.auth !== 'keyed') {
      problems.push(`${at}.auth must be keyless or keyed`)
    }
    const cors = provider.cors
    if (typeof cors !== 'object' || cors === null) {
      problems.push(`${at}.cors must be an object`)
    }
    const rateLimits = provider.rateLimits
    if (typeof rateLimits !== 'object' || rateLimits === null) {
      problems.push(`${at}.rateLimits must be an object`)
    }
    const pagination = provider.pagination
    if (typeof pagination !== 'object' || pagination === null) {
      problems.push(`${at}.pagination must be an object`)
    }
    const license = provider.license
    if (typeof license !== 'object' || license === null) {
      problems.push(`${at}.license must be an object`)
    }
    if (!Array.isArray(provider.imageHosts)) {
      problems.push(`${at}.imageHosts must be an array`)
    }
    const redirects = provider.redirects
    if (typeof redirects !== 'object' || redirects === null) {
      problems.push(`${at}.redirects must be an object`)
    }
    if (typeof provider.decisionReason !== 'string' || provider.decisionReason.trim().length === 0) {
      problems.push(`${at}.decisionReason must be a non-empty string`)
    }
    if (provider.decision === 'accepted') {
      if (provider.auth !== 'keyless') {
        problems.push(`${at}: an accepted provider must be keyless in 0.2.3`)
      }
      if (provider.delivery !== 'cached' && provider.delivery !== 'direct') {
        problems.push(`${at}: an accepted provider needs delivery cached|direct`)
      }
      if (provider.delivery === 'direct') {
        const probe = provider.browserImageProbe
        if (typeof probe !== 'object' || probe === null || probe.status !== 'pass') {
          problems.push(`${at}: a direct provider needs a passed browserImageProbe`)
        }
      }
      if (license?.wallpaperUseAllowed !== true) {
        problems.push(`${at}: accepted provider must record wallpaperUseAllowed: true`)
      }
      if (typeof license?.termsClauseQuote !== 'string' || license.termsClauseQuote.trim().length === 0) {
        problems.push(`${at}: accepted provider needs a terms clause quote`)
      }
      if (cors?.allowOrigin === undefined || cors?.allowOrigin === null || cors?.allowOrigin === 'unverified') {
        problems.push(`${at}: accepted provider needs a verified CORS allowOrigin`)
      }
      if (!Array.isArray(provider.imageHosts) || provider.imageHosts.length === 0) {
        problems.push(`${at}: accepted provider needs imageHosts`)
      }
      if (provider.delivery !== 'direct'
        && (typeof cors?.imageHostCors !== 'string' || cors.imageHostCors === 'unverified')) {
        problems.push(`${at}: a cached accepted provider needs verified image-host CORS`)
      }
      if (provider.delivery === 'direct'
        && (typeof cors?.imageHostCors !== 'string' || !cors.imageHostCors.startsWith('absent'))) {
        problems.push(`${at}: a direct accepted provider must record absent image-host CORS`)
      }
    }
    if (provider.requiredNotice !== undefined) {
      const notice = provider.requiredNotice
      if (typeof notice !== 'object' || notice === null
        || typeof notice.key !== 'string' || notice.key.length === 0
        || typeof notice.scope !== 'string' || notice.scope.length === 0
        || typeof notice.text !== 'string' || notice.text.length === 0) {
        problems.push(`${at}.requiredNotice must carry key/scope/text`)
      }
    }
  }
  return problems
}

/** Read the reviewed provider manifest data. */
function readManifestDocument(root) {
  const read = readJson(join(root, 'src/provider-manifests.json'))
  return 'error' in read ? undefined : read.value
}

/**
 * Read the shipped provider ids: the two compiled providers plus the Host-served
 * manifest providers. This is derived data, not a TypeScript source regex.
 * @param {string} root repository root.
 * @returns {string[]} provider ids.
 */
export function readRegistryProviderIds(root) {
  const ids = ['openverse', 'wikimedia']
  const manifest = readManifestDocument(root)
  if (manifest !== undefined && Array.isArray(manifest.providers)) {
    for (const provider of manifest.providers) {
      if (typeof provider?.id === 'string') ids.push(provider.id)
    }
  }
  return ids
}

/**
 * Validate the committed gate file against the code registry and manifest data.
 * @param {string} root repository root.
 * @param {string} expectedRelease package version.
 * @returns {string[]} problems; empty means valid.
 */
export function verifyProviderGate(root, expectedRelease) {
  const path = join(root, GATE_PATH)
  const read = readJson(path)
  if ('error' in read) return [`cannot read ${GATE_PATH}: ${read.error}`]
  const problems = validateProviderGate(read.value, expectedRelease)
  if (problems.length > 0) return problems
  const accepted = new Map((read.value.providers ?? [])
    .filter(provider => provider?.decision === 'accepted')
    .map(provider => [provider.id, provider]))
  const shipped = new Set(readRegistryProviderIds(root))
  for (const id of accepted.keys()) {
    if (!shipped.has(id)) problems.push(`accepted gate provider ${id} is not shipped by the registry`)
  }
  for (const id of shipped) {
    if (!accepted.has(id)) problems.push(`shipped provider ${id} has no accepted gate record`)
  }
  const manifest = readManifestDocument(root)
  if (manifest === undefined || manifest.schemaVersion !== 1 || !Array.isArray(manifest.providers)) {
    problems.push('src/provider-manifests.json is missing or malformed')
  } else {
    const seen = new Set()
    for (const provider of manifest.providers) {
      const id = provider?.id
      if (typeof id !== 'string' || seen.has(id)) {
        problems.push(`manifest provider id ${String(id)} is missing/duplicate`)
        continue
      }
      seen.add(id)
      const gate = accepted.get(id)
      if (gate === undefined) {
        problems.push(`manifest provider ${id} has no accepted gate record`)
        continue
      }
      if (gate.delivery !== provider.delivery) {
        problems.push(`manifest provider ${id} delivery ${String(provider.delivery)} != gate ${String(gate.delivery)}`)
      }
      if (provider.auth !== 'keyless') problems.push(`manifest provider ${id} must be keyless`)
      const gateHosts = Array.isArray(gate.imageHosts) ? [...gate.imageHosts].sort() : []
      const manifestHosts = Array.isArray(provider.imageHosts) ? [...provider.imageHosts].sort() : []
      if (JSON.stringify(gateHosts) !== JSON.stringify(manifestHosts)) {
        problems.push(`manifest provider ${id} imageHosts do not match the gate record`)
      }
      const gateHost = (() => {
        try { return new URL(gate.api.baseUrl).hostname } catch { return undefined }
      })()
      const manifestOrigin = (() => {
        try { return new URL(provider.api.origin).hostname } catch { return undefined }
      })()
      if (gateHost === undefined || gateHost !== manifestOrigin) {
        problems.push(`manifest provider ${id} API origin does not match the gate record`)
      }
      const openverseGate = read.value.providers.find(entry => entry.id === 'openverse')
      if (openverseGate?.requiredNotice === undefined) {
        problems.push('accepted Openverse gate row must carry requiredNotice')
      }
    }
  }
  return problems.filter(problem => !problem.startsWith('cannot read'))
}

/** CLI entry point. */
function main(argv) {
  const flag = name => {
    const index = argv.indexOf(name)
    return index === -1 ? undefined : argv[index + 1]
  }
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  const packageJson = readJson(join(root, 'package.json'))
  if ('error' in packageJson) {
    console.error(`verify-provider-gate: FAIL ${packageJson.error}`)
    return 1
  }
  const expectedRelease = flag('--release') ?? packageJson.value.version
  const problems = verifyProviderGate(root, expectedRelease)
  if (problems.length > 0) {
    for (const problem of problems) console.error(`verify-provider-gate: FAIL ${problem}`)
    return 1
  }
  console.log(`verify-provider-gate: OK ${GATE_PATH} for ${expectedRelease}`)
  return 0
}

const entry = process.argv[1]
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
