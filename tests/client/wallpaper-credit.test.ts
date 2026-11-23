/**
 * Wallpaper credit resolution + legacy attribution migration tests (0.2.2).
 *
 * The persisted remote selection's provenance is authoritative; recent history
 * is a display mirror with optional URL fields. The retired panel-owned
 * `dsh-livery.wallpaper.attribution.v1` key is migrated once and then removed —
 * these tests also prove the migration never writes that key again.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  LEGACY_ATTRIBUTION_STORAGE_KEY,
  legacyAttributionProvenance,
  migrateLegacyAttribution,
  parseLegacyAttribution,
  resolveWallpaperCredit,
  wallpaperCreditLinks,
} from '../../src/client/ui/wallpaper-credit.js'
import type { WallpaperCredit } from '../../src/client/ui/wallpaper-credit.js'
import type { RecentWallpaperEntry } from '../../src/client/wallpaper/history.js'
import type { WallpaperSelection } from '../../src/client/wallpaper.js'

/** In-memory storage that records every write/remove. */
class MemoryStorage {
  readonly map = new Map<string, string>()
  readonly writes: string[] = []
  readonly removes: string[] = []
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.writes.push(key)
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.removes.push(key)
    this.map.delete(key)
  }
}

/** One recent-history mirror entry. */
function recentEntry(patch: Partial<RecentWallpaperEntry> = {}): RecentWallpaperEntry {
  return { url: 'https://cdn.example.org/photo.jpg', addedAt: 1, ...patch }
}

/** One remote selection with optional provenance. */
function remoteSelection(recentUrl = 'https://cdn.example.org/photo.jpg'): WallpaperSelection {
  return { kind: 'remote', url: recentUrl }
}

describe('resolveWallpaperCredit', () => {
  it('returns no credit for built-in/upload/style/none selections', () => {
    const recent = [recentEntry()]
    expect(resolveWallpaperCredit(undefined, recent)).toBeUndefined()
    expect(resolveWallpaperCredit({ kind: 'builtin', id: 'paper' }, recent)).toBeUndefined()
    expect(resolveWallpaperCredit({ kind: 'upload', key: 'upload-1-a' }, recent)).toBeUndefined()
    expect(resolveWallpaperCredit({ kind: 'style', variant: 'mesh' }, recent)).toBeUndefined()
  })

  it('prefers the selection provenance over the history mirror', () => {
    const selection: WallpaperSelection = {
      kind: 'remote',
      url: 'https://cdn.example.org/photo.jpg',
      provenance: {
        providerId: 'openverse',
        title: 'Live title',
        creator: 'Live creator',
        creatorUrl: 'https://example.org/creator',
        license: 'CC BY',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        source: 'Openverse',
        sourceUrl: 'https://openverse.org/image/1',
      },
    }
    const credit = resolveWallpaperCredit(selection, [
      recentEntry({ title: 'Mirror title', creator: 'Mirror creator', license: 'CC0', source: 'mirror.example' }),
    ])
    expect(credit).toMatchObject({
      providerId: 'openverse',
      title: 'Live title',
      creator: 'Live creator',
      creatorUrl: 'https://example.org/creator',
      license: 'CC BY',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      source: 'Openverse',
      sourceUrl: 'https://openverse.org/image/1',
    })
  })

  it('falls back field-by-field to the matching history entry for legacy records', () => {
    const credit = resolveWallpaperCredit(remoteSelection(), [
      recentEntry({
        title: 'Legacy title',
        creator: 'Legacy creator',
        license: 'CC0',
        source: 'openverse.org',
        sourceUrl: 'https://openverse.org/image/9',
      }),
      recentEntry({ url: 'https://cdn.example.org/other.jpg', title: 'Other', addedAt: 2 }),
    ])
    expect(credit?.title).toBe('Legacy title')
    expect(credit?.creator).toBe('Legacy creator')
    expect(credit?.license).toBe('CC0')
    expect(credit?.source).toBe('openverse.org')
    expect(credit?.sourceUrl).toBe('https://openverse.org/image/9')
    expect(credit?.providerId).toBeUndefined()
  })

  it('drops invalid or private attribution URLs', () => {
    const credit = resolveWallpaperCredit(remoteSelection(), [
      recentEntry({
        creatorUrl: 'javascript:alert(1)',
        licenseUrl: 'http://example.org/licence',
        sourceUrl: 'https://127.0.0.1/internal',
      }),
    ])
    expect(credit).toBeUndefined()
    expect(wallpaperCreditLinks(credit)).toEqual([])
  })

  it('returns undefined when neither provenance nor history knows the image', () => {
    expect(resolveWallpaperCredit(remoteSelection(), [])).toBeUndefined()
    expect(resolveWallpaperCredit(remoteSelection(), [recentEntry({ url: 'https://other.example/x.jpg' })])).toBeUndefined()
  })
})

describe('wallpaperCreditLinks', () => {
  it('builds creator/licence/source links in a stable order', () => {
    const credit: WallpaperCredit = {
      providerId: 'wikimedia',
      title: 'Sea',
      creator: 'A photographer',
      creatorUrl: 'https://commons.wikimedia.org/wiki/User:A',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sea.jpg',
    }
    const links = wallpaperCreditLinks(credit)
    expect(links.map(link => link.kind)).toEqual(['creator', 'license', 'source'])
    expect(links.map(link => link.href)).toEqual([
      'https://commons.wikimedia.org/wiki/User:A',
      'https://creativecommons.org/licenses/by-sa/4.0/',
      'https://commons.wikimedia.org/wiki/File:Sea.jpg',
    ])
    expect(links[0]?.text).toBe('A photographer')
  })

  it('re-validates hrefs defensively and falls back to a hostname as text', () => {
    const links = wallpaperCreditLinks({
      providerId: undefined,
      title: undefined,
      creator: undefined,
      creatorUrl: 'http://insecure.example/x',
      license: undefined,
      licenseUrl: 'https://licences.example/by',
      source: undefined,
      sourceUrl: 'data:text/html,x',
    })
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({ kind: 'license', href: 'https://licences.example/by', text: 'licences.example' })
  })
})

describe('legacy attribution record parsing', () => {
  it('accepts the historical panel record and bounds its text', () => {
    const record = parseLegacyAttribution({
      identity: 'remote:https://cdn.example.org/photo.jpg',
      title: `  ${'t'.repeat(300)}  `,
      creator: 'Creator',
      license: 'CC0',
      source: 'openverse.org',
      context: 'online',
    })
    expect(record?.identity).toBe('remote:https://cdn.example.org/photo.jpg')
    expect(record?.title).toHaveLength(200)
    expect(record?.creator).toBe('Creator')
  })

  it('rejects corrupt/unknown records', () => {
    expect(parseLegacyAttribution(null)).toBeUndefined()
    expect(parseLegacyAttribution([])).toBeUndefined()
    expect(parseLegacyAttribution({ identity: 3, context: 'online' })).toBeUndefined()
    expect(parseLegacyAttribution({ identity: 'remote:x', context: 'other' })).toBeUndefined()
  })

  it('maps a record to normalized provenance', () => {
    const provenance = legacyAttributionProvenance({
      identity: 'remote:https://cdn.example.org/photo.jpg',
      title: 'Title',
      creator: 'Creator',
      license: 'CC0',
      source: 'openverse.org',
      context: 'online',
    })
    expect(provenance).toEqual({ title: 'Title', creator: 'Creator', license: 'CC0', source: 'openverse.org' })
    expect(legacyAttributionProvenance({
      identity: 'remote:x', title: '', creator: '', license: '', source: '', context: 'custom',
    })).toBeUndefined()
  })
})

describe('legacy attribution migration', () => {
  const legacyRecord = {
    identity: 'remote:https://cdn.example.org/photo.jpg',
    title: 'Legacy title',
    creator: 'Legacy creator',
    license: 'CC0',
    source: 'openverse.org',
    context: 'online' as const,
  }

  it('re-saves the matching remote selection with provenance and deletes the key', () => {
    const storage = new MemoryStorage()
    storage.map.set(LEGACY_ATTRIBUTION_STORAGE_KEY, JSON.stringify(legacyRecord))
    const save = vi.fn(() => true)
    const outcome = migrateLegacyAttribution({ storage, selection: remoteSelection(), save })
    expect(outcome).toBe('migrated')
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({
      kind: 'remote',
      url: 'https://cdn.example.org/photo.jpg',
      provenance: { title: 'Legacy title', creator: 'Legacy creator', license: 'CC0', source: 'openverse.org' },
    })
    // The retired key is removed, never written; no other storage writes happen.
    expect(storage.writes).toEqual([])
    expect(storage.removes).toEqual([LEGACY_ATTRIBUTION_STORAGE_KEY])
    expect(storage.getItem(LEGACY_ATTRIBUTION_STORAGE_KEY)).toBeNull()
  })

  it('does nothing when the identity does not match the current remote selection', () => {
    const storage = new MemoryStorage()
    storage.map.set(LEGACY_ATTRIBUTION_STORAGE_KEY, JSON.stringify(legacyRecord))
    const save = vi.fn(() => true)
    expect(migrateLegacyAttribution({
      storage,
      selection: { kind: 'remote', url: 'https://cdn.example.org/other.jpg' },
      save,
    })).toBe('none')
    expect(save).not.toHaveBeenCalled()
    expect(storage.getItem(LEGACY_ATTRIBUTION_STORAGE_KEY)).not.toBeNull()
  })

  it('does not migrate when the selection is not remote', () => {
    const storage = new MemoryStorage()
    storage.map.set(LEGACY_ATTRIBUTION_STORAGE_KEY, JSON.stringify(legacyRecord))
    const save = vi.fn(() => true)
    expect(migrateLegacyAttribution({ storage, selection: undefined, save })).toBe('none')
    expect(migrateLegacyAttribution({ storage, selection: { kind: 'builtin', id: 'ink' }, save })).toBe('none')
    expect(save).not.toHaveBeenCalled()
  })

  it('removes the obsolete key when the selection already carries provenance', () => {
    const storage = new MemoryStorage()
    storage.map.set(LEGACY_ATTRIBUTION_STORAGE_KEY, JSON.stringify(legacyRecord))
    const save = vi.fn(() => true)
    const outcome = migrateLegacyAttribution({
      storage,
      selection: { kind: 'remote', url: 'https://cdn.example.org/photo.jpg', provenance: { title: 'Live' } },
      save,
    })
    expect(outcome).toBe('removed')
    expect(save).not.toHaveBeenCalled()
    expect(storage.getItem(LEGACY_ATTRIBUTION_STORAGE_KEY)).toBeNull()
  })

  it('removes corrupt JSON and empty records without writing', () => {
    const storage = new MemoryStorage()
    storage.map.set(LEGACY_ATTRIBUTION_STORAGE_KEY, '{not json')
    expect(migrateLegacyAttribution({ storage, selection: remoteSelection(), save: () => true })).toBe('removed')
    expect(storage.removes).toEqual([LEGACY_ATTRIBUTION_STORAGE_KEY])

    const empty = new MemoryStorage()
    empty.map.set(LEGACY_ATTRIBUTION_STORAGE_KEY, JSON.stringify({
      identity: 'remote:https://cdn.example.org/photo.jpg',
      title: '', creator: '', license: '', source: '', context: 'online',
    }))
    expect(migrateLegacyAttribution({ storage: empty, selection: remoteSelection(), save: () => true })).toBe('removed')
    expect(empty.writes).toEqual([])
    expect(empty.getItem(LEGACY_ATTRIBUTION_STORAGE_KEY)).toBeNull()
  })

  it('keeps the key for a later mount when re-saving fails', () => {
    const storage = new MemoryStorage()
    storage.map.set(LEGACY_ATTRIBUTION_STORAGE_KEY, JSON.stringify(legacyRecord))
    const save = vi.fn(() => false)
    expect(migrateLegacyAttribution({ storage, selection: remoteSelection(), save })).toBe('none')
    expect(storage.getItem(LEGACY_ATTRIBUTION_STORAGE_KEY)).not.toBeNull()
    expect(storage.removes).toEqual([])
  })

  it('is a no-op without storage or a legacy key', () => {
    expect(migrateLegacyAttribution({ storage: undefined, selection: remoteSelection(), save: () => true })).toBe('none')
    expect(migrateLegacyAttribution({ storage: new MemoryStorage(), selection: remoteSelection(), save: () => true })).toBe('none')
  })
})
