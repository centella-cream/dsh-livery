/**
 * Shared shape of the Host-served provider manifest document.
 *
 * The manifest is data: the Host bundles one reviewed JSON document, serves it
 * on an exact route, and the client builds a generic provider engine from it.
 * There is deliberately no provider-specific runtime module for Cleveland/Met.
 */

/** How wallpaper image bytes reach the browser. */
export type ProviderDelivery = 'cached' | 'direct'

/** One manifest API template. All paths are relative to `origin`. */
export interface ProviderManifestApi {
  /** https origin without a path. */
  readonly origin: string
  /** Absolute path under the origin, e.g. `/api/artworks/`. */
  readonly path: string
  /** Query parameter receiving the user search text. */
  readonly queryParam?: string
  /** Query parameter receiving the page size. */
  readonly pageSizeParam?: string
  /** Fixed query parameters appended to every request. */
  readonly extraParams?: Readonly<Record<string, string>>
  /** Query used for an empty browse/search box. */
  readonly defaultQuery?: string
}

/** Optional per-result detail request (Met search-then-object). */
export interface ProviderManifestDetail {
  /** Request path with `{id}` replaced by the encoded id. */
  readonly path: string
  /** Path in the list item that yields the id; `.` means the scalar item. */
  readonly id: string
}

/** One value filter applied after mapping the list/detail record. */
export interface ProviderManifestFilter {
  readonly path: string
  readonly equals: string | number | boolean
}

/** Static licence shown for every result of one provider. */
export interface ProviderManifestLicense {
  readonly name: string
  readonly url?: string
}

/** Mapping from a provider record to one wallpaper result. */
export interface ProviderManifestSelect {
  /** Path to the stable result id. */
  readonly id: string
  readonly title: string
  /** Optional path to the creator/artist display string. */
  readonly creator?: string
  /** Path to the provider/object page URL. */
  readonly sourceUrl: string
  /** Path to the full-size image URL. */
  readonly fullImage: string
  /** Path to the thumbnail image URL. */
  readonly thumbImage: string
  /** Static licence; omitted means `license: null` (non-selectable). */
  readonly license?: ProviderManifestLicense
  /** One record filter that must match before a result is accepted. */
  readonly filter?: ProviderManifestFilter
}

/** Capabilities truthfully declared by one provider. */
export interface ProviderManifestCapabilities {
  readonly search: boolean
  readonly random: boolean
  /** Whether Auto may try this provider. Met is pinned-only in 0.2.3. */
  readonly auto: boolean
}

/** One reviewed keyless provider manifest. */
export interface ProviderManifest {
  readonly id: string
  readonly labels: { readonly 'zh-CN': string; readonly 'en-US': string }
  readonly delivery: ProviderDelivery
  readonly auth: 'keyless'
  readonly capabilities: ProviderManifestCapabilities
  readonly api: ProviderManifestApi
  /** Path to the array of list results. */
  readonly list: string
  /** Optional per-list-item detail request. */
  readonly detail?: ProviderManifestDetail
  readonly select: ProviderManifestSelect
  readonly imageHosts: readonly string[]
  /** Items requested from the API (may exceed resultLimit). */
  readonly fetchLimit?: number
  /** Accepted result cap; defaults to 12. */
  readonly resultLimit?: number
}

/** Versioned document served at `/livery/api/providers`. */
export interface ProviderManifestDocument {
  readonly schemaVersion: 1
  readonly manifestHash?: string
  readonly providers: readonly ProviderManifest[]
}
