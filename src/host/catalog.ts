/**
 * Catalog assembly and per-profile preview binding for the Host.
 *
 * Multi-version rule: one shipped plugin styles three exact host builds, so the
 * Host owns no identity of its own. Every catalog it serves is assembled for
 * *one resolved adapter*, with that adapter's identity fields, capability map
 * and catalog profile. Render-equivalent host versions share a profile and
 * therefore share the compiled liveries and preview set.
 *
 * Preview serving is a whitelist, never a path join: the only names that can be
 * served are the ones the generated index of the *active* profile declares, and
 * each name is resolved once to an absolute path inside that profile directory.
 * A request can therefore never name a path.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LIVERY_VERSION,
  PREVIEW_ROUTE_PREFIX,
  SCHEMA_VERSION,
  type CatalogProfileData,
  type CompiledLivery,
  type LiveryCatalog,
} from '../core/types.js'
import { type AdapterRecord } from '../generated/contract.js'
import { CATALOG_PROFILES, CATALOG_PROFILE_IDS } from '../generated/liveries.js'

/** Generated catalog document version: the schema every consumer parses. */
export const CATALOG_SCHEMA_VERSION = SCHEMA_VERSION

/** Directory name (one hop below the built module) holding per-profile previews. */
export const PREVIEWS_DIRECTORY = 'previews'

/**
 * One preview filename this route is willing to serve.
 *
 * Deliberately flat: the generated layout is `<id>-<zh|en>-<light|dark>.svg`
 * directly inside the profile directory, so a name carrying a separator is not
 * a preview name at all.
 */
const PREVIEW_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.svg$/

/**
 * Whether a generated catalog-profile id can safely appear in a route path and
 * a filesystem path. Generated ids are `sha256:<hex>`, so anything with a
 * separator, a traversal segment or a NUL is not a profile id.
 * @param profileId - candidate profile id.
 * @returns whether the id is safe to resolve.
 */
export function isSafeCatalogProfileId(profileId: string): boolean {
  return profileId !== ''
    && profileId.length <= 128
    && !profileId.includes('/')
    && !profileId.includes('\\')
    && !profileId.includes('\0')
    && !profileId.includes('..')
}

/**
 * Public base URL for one profile's preview assets.
 *
 * The trailing slash is part of the contract: the Client appends the filename
 * and always builds preview URLs from `catalog.previewsBase`.
 * @param profileId - catalog profile id.
 * @returns e.g. `/livery/assets/previews/sha256:4c5e…/`.
 */
export function previewsBaseFor(profileId: string): string {
  return `${PREVIEW_ROUTE_PREFIX}${profileId}/`
}

/**
 * The compiled catalog profile one adapter renders with.
 * @param adapter - certified adapter record.
 * @returns the generated profile, or `undefined` when the build has not emitted it.
 */
export function catalogProfileFor(adapter: AdapterRecord): CatalogProfileData | undefined {
  return CATALOG_PROFILES[adapter.catalogProfile]
}

/**
 * Build the catalog the Client fetches exactly once, for one resolved adapter.
 *
 * Identity fields come from the adapter record (not a build-wide constant), the
 * capability map is the adapter's own, and the liveries are the profile's
 * compiled set. `previewsBase` names the same profile directory the preview
 * route serves, so the Client never hardcodes an asset path. A missing profile
 * yields an empty livery list deterministically (the gate then fails closed)
 * instead of a thrown startup error.
 * @param adapter - certified adapter the current host resolved to.
 * @param profile - compiled profile override, defaulting to the generated one.
 * @returns the catalog document.
 */
export function buildCatalog(
  adapter: AdapterRecord,
  profile: CatalogProfileData | undefined = catalogProfileFor(adapter),
): LiveryCatalog {
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    compilerVersion: LIVERY_VERSION,
    adapterId: adapter.adapterId,
    hostVersion: adapter.hostVersion,
    contractHash: adapter.contractHash,
    catalogProfile: adapter.catalogProfile,
    capabilities: adapter.capabilities,
    previewsBase: previewsBaseFor(adapter.catalogProfile),
    liveries: profile?.liveries ?? [],
  }
}

/**
 * Serialize a catalog for the catalog route.
 *
 * The serialization is stable for a given catalog object, which is what lets
 * the route build it once per adapter and answer HEAD from the same bytes.
 * @param catalog - catalog document.
 * @returns compact JSON text.
 */
export function serializeCatalog(catalog: LiveryCatalog): string {
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
  /** Module URL used to resolve `./previews/<profile>/index.json`; defaults to this module's URL. */
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
 * Bind one profile's generated preview index to absolute file paths.
 *
 * Resolved relative to the *built* module (`lib/index.js`), not this source
 * file: the build copies `previews/<profileId>/` next to the host bundle. A
 * missing or invalid index yields a deterministic empty map — the gallery just
 * shows no previews — and a failure to resolve the module URL yields the same
 * empty map rather than a startup error.
 * @param profileId - catalog profile whose preview directory to bind.
 * @param options - module URL and file-reader seams.
 * @returns request filename → absolute file path (empty when unavailable).
 */
export function bindPreviews(
  profileId: string,
  options: PreviewBindingOptions = {},
): ReadonlyMap<string, string> {
  const bound = new Map<string, string>()
  if (!isSafeCatalogProfileId(profileId)) return bound
  const moduleUrl = options.moduleUrl
  let indexUrl: URL
  try {
    indexUrl = new URL(`./${PREVIEWS_DIRECTORY}/${profileId}/index.json`, moduleUrl ?? import.meta.url)
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

/** Options for {@link bindProfilePreviews}. */
export interface ProfilePreviewBindingOptions extends PreviewBindingOptions {
  /** Profile ids to bind; defaults to every generated profile. */
  readonly profileIds?: readonly string[]
}

/**
 * Bind every generated profile's preview index, keyed by profile id.
 *
 * The Host serves only the active adapter's profile, but binding all of them
 * keeps the route handler free of filesystem work at request time and lets the
 * startup cost stay a small, deterministic read of each generated index.
 * @param options - profile list and file-reader seams.
 * @returns profile id → (filename → absolute path).
 */
export function bindProfilePreviews(
  options: ProfilePreviewBindingOptions = {},
): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const bindings = new Map<string, ReadonlyMap<string, string>>()
  for (const profileId of options.profileIds ?? CATALOG_PROFILE_IDS) {
    bindings.set(profileId, bindPreviews(profileId, options))
  }
  return bindings
}
