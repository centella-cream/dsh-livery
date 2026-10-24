/**
 * Catalog assembly and preview-asset binding for the Host.
 *
 * The Host serves one read-only document — {@link LiveryCatalog} — and one
 * whitelisted set of preview files. Both are derived from build-time generated
 * artifacts, so this module owns no data of its own; it only validates shapes
 * while assembling them.
 *
 * Preview serving is a whitelist, never a path join: the only names that can be
 * served are the ones the generated index declares, and each name is resolved
 * once, at binding time, to an absolute path inside the preview directory. A
 * request can therefore never name a path.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ADAPTER_ID,
  DSH_VERSION,
  LIVERY_VERSION,
  SCHEMA_VERSION,
  type CapabilityMap,
  type CompiledLivery,
  type LiveryCatalog,
} from '../core/types.js'
import { HOST_CAPABILITIES, type ContractFacts, CONTRACT_FACTS } from '../generated/contract.js'
import { CATALOG_META, LIVERIES, type CatalogMeta } from '../generated/liveries.js'

/** Generated catalog document version: the schema every consumer parses. */
export const CATALOG_SCHEMA_VERSION = SCHEMA_VERSION

/** Relative location of the generated preview index beside the built module. */
export const PREVIEW_INDEX_RELATIVE = './previews/index.json'

/** Directory name (one hop below the built module) holding preview files. */
export const PREVIEWS_DIRECTORY = 'previews'

/**
 * Sources `buildCatalog` may be given. Production passes nothing; tests pass
 * deterministic fixtures.
 */
export interface CatalogInputs {
  readonly liveries?: readonly CompiledLivery[]
  readonly catalogMeta?: CatalogMeta
  readonly capabilities?: CapabilityMap
  readonly contractFacts?: ContractFacts
}

/**
 * Build the versioned catalog the Client fetches exactly once.
 *
 * `adapterId` and `hostVersion` are the frozen release-line constants the whole
 * build was type-checked against; the contract hash comes from the compiled
 * catalog metadata (the artifact that actually derived the liveries) and the
 * capability map from the generated contract facts, so the served document
 * names the same contract the boot gate compared. The generated metadata is
 * checked against those facts by the gate, not here — a mismatch must be a
 * diagnosis, not a thrown startup error. Pure: same inputs, same output.
 * @param inputs - optional overrides, defaulting to the generated artifacts.
 * @returns the catalog document.
 */
export function buildCatalog(inputs: CatalogInputs = {}): LiveryCatalog {
  const facts = inputs.contractFacts ?? CONTRACT_FACTS
  const catalogMeta = inputs.catalogMeta ?? CATALOG_META
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    compilerVersion: LIVERY_VERSION,
    adapterId: ADAPTER_ID,
    hostVersion: DSH_VERSION,
    contractHash: catalogMeta.contractHash === '' ? facts.contractHash : catalogMeta.contractHash,
    capabilities: inputs.capabilities ?? HOST_CAPABILITIES,
    liveries: inputs.liveries ?? LIVERIES,
  }
}

/**
 * Serialize a catalog for the catalog route.
 *
 * The serialization is stable for a given catalog object, which is what lets
 * the route build it once and answer HEAD from the same bytes.
 * @param catalog - catalog document, built from the generated artifacts by default.
 * @returns compact JSON text.
 */
export function serializeCatalog(catalog: LiveryCatalog = buildCatalog()): string {
  return JSON.stringify(catalog)
}

/**
 * The set of livery ids a catalog ships, for skin normalization.
 * @param liveries - compiled livery list.
 * @returns a set of ids.
 */
export function liveryIdsOf(liveries: readonly CompiledLivery[]): ReadonlySet<string> {
  return new Set(liveries.map((livery) => livery.id))
}

/**
 * One preview filename this route is willing to serve.
 *
 * Deliberately flat: the generated layout is `<id>-<zh|en>-<light|dark>.svg`
 * directly inside the previews directory, so a name carrying a separator is
 * not a preview name at all.
 */
const PREVIEW_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.svg$/

/**
 * Accept a candidate preview filename.
 * @param value - candidate from the generated index.
 * @returns the filename when it is a flat `.svg` name, else `undefined`.
 */
function asPreviewFileName(value: string): string | undefined {
  const trimmed = value.trim()
  return PREVIEW_FILE_NAME.test(trimmed) ? trimmed : undefined
}

/**
 * Collect every preview filename an index document mentions, whatever its
 * generated shape is.
 *
 * The index is a build artifact from the same repository, but the CLI that
 * writes it and the Host that reads it are separate pieces of code. Accepting
 * the filename as an array element or an object key, at any depth, keeps the
 * two from having to share an exact serialization for something that is only a
 * name whitelist. Anything that is not a flat `.svg` name is ignored, so no
 * traversal or absolute path can enter the whitelist.
 * @param parsed - `JSON.parse` output of the index document.
 * @returns sorted, unique filenames.
 */
export function collectPreviewFiles(parsed: unknown): string[] {
  const found = new Set<string>()
  const visit = (value: unknown, depth: number): void => {
    if (depth > 4 || value === null || value === undefined) return
    if (typeof value === 'string') {
      const name = asPreviewFileName(value)
      if (name !== undefined) found.add(name)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }
    if (typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      const name = asPreviewFileName(key)
      if (name !== undefined) found.add(name)
      visit(child, depth + 1)
    }
  }
  visit(parsed, 0)
  return [...found].sort()
}

/**
 * Parse the generated preview index text.
 * @param text - raw file contents.
 * @returns filenames, or `[]` when the document is absent/not JSON.
 */
export function parsePreviewsIndex(text: string): string[] {
  try {
    return collectPreviewFiles(JSON.parse(text) as unknown)
  } catch {
    return []
  }
}

/** Injection seams for {@link bindPreviews}; tests never touch the disk. */
export interface PreviewBindingOptions {
  /** Module URL used to resolve `./previews/index.json`; defaults to this module's URL. */
  readonly moduleUrl?: URL | string
  /** Read the index file at the given absolute path; defaults to synchronous fs. */
  readonly readIndexText?: (indexPath: string) => string
}

/**
 * Read one file as text, failing into the caller's fallback.
 * @param path - absolute path.
 * @returns file contents.
 */
function readTextFile(path: string): string {
  return readFileSync(path, 'utf8')
}

/**
 * Bind the generated preview index to absolute file paths.
 *
 * Resolved relative to the *built* module (`lib/index.js`), not this source
 * file: the build copies `previews/` next to the host bundle. A missing or
 * invalid index yields a deterministic empty map — the plugin still boots, the
 * gallery just shows no previews — and a failure to resolve the module URL
 * yields the same empty map rather than a startup error.
 * @param options - module URL and file-reader seams.
 * @returns request filename → absolute file path (empty when unavailable).
 */
export function bindPreviews(options: PreviewBindingOptions = {}): ReadonlyMap<string, string> {
  const bound = new Map<string, string>()
  const moduleUrl = options.moduleUrl
  let indexUrl: URL
  try {
    indexUrl = new URL(PREVIEW_INDEX_RELATIVE, moduleUrl ?? import.meta.url)
  } catch {
    return bound
  }
  let indexText: string
  try {
    const indexPath = fileURLToPath(indexUrl)
    indexText = (options.readIndexText ?? readTextFile)(indexPath)
  } catch {
    return bound
  }
  const names = parsePreviewsIndex(indexText)
  if (names.length === 0) return bound
  let directory: string
  try {
    directory = dirname(fileURLToPath(indexUrl))
  } catch {
    return bound
  }
  for (const name of names) bound.set(name, join(directory, name))
  return bound
}
