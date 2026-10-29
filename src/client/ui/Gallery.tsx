/**
 * The visual-style gallery: search, style-family filters, optional tag filters
 * and family-grouped cards with one global roving focus.
 *
 * Cards are `role="option"` members of a single `role="listbox"`; the family
 * sections are presentation-only `role="group"` wrappers, so ArrowLeft/Right,
 * ArrowUp/Down, Home/End and Enter/Space keep working across section boundaries
 * exactly as they did in the flat grid. The actions that mutate state
 * (apply / cancel / restore) are real `<button>` elements owned by the page.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, Ref } from 'react'
import type { CompiledLivery } from '../../core/types.js'
import { formatNumber } from '../../i18n/index.js'
import { Button, Input, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  collectTagIds,
  filterLiveries,
  liveryAvailability,
  localizedDescription,
  localizedName,
  previewSeeds,
  previewUrl,
  sortLiveries,
  tagLabel,
} from '../model.js'
import type { LiveryFilter, LiveryRuntimeSnapshot, PreviewLocaleChoice, TagLabels } from '../model.js'
import type { LiveryTranslate } from '../platform.js'
import {
  cardKeyTarget,
  familyLabelKey,
  flattenGroups,
  groupByFamily,
  STYLE_FAMILIES,
} from './families.js'
import type { StyleFamilyId } from './families.js'

/** Props of the gallery region. */
export interface GalleryProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
  readonly filter: LiveryFilter
  readonly onFilterChange: (filter: LiveryFilter) => void
  readonly onPreview: (id: string) => void
  /** Locale whose preview SVGs are shown; `follow` resolves to the host locale. */
  readonly previewLocaleChoice: PreviewLocaleChoice
  readonly previewLocale: 'zh' | 'en'
  readonly onPreviewLocaleChange: (choice: PreviewLocaleChoice) => void
  /** Initial family selection (deep links/tests); `undefined` = All. */
  readonly initialFamily?: StyleFamilyId | undefined
  /** Start with the tag-filter row revealed (deep links/tests). */
  readonly initialMoreFiltersOpen?: boolean | undefined
}

/** Visual state recorded on each card for diagnostics and black-box tests. */
function cardState(
  snapshot: LiveryRuntimeSnapshot,
  livery: CompiledLivery,
  applicable: boolean,
): 'active' | 'preview' | 'idle' | 'incompatible' {
  if (!applicable) return 'incompatible'
  if (snapshot.previewId === livery.id) return 'preview'
  if (snapshot.phase !== 'previewing' && snapshot.confirmedId === livery.id) return 'active'
  return 'idle'
}

/** Tag labels of the active locale, keyed by stable tag id. */
export function tagLabels(t: LiveryTranslate): TagLabels {
  const labels: Record<string, string> = {}
  const keys = [
    'calm', 'cool', 'warm', 'muted', 'deep', 'elegant',
    'neutral', 'contrast', 'classic', 'playful',
    'retro', 'paper', 'ink', 'neon', 'organic', 'tech',
  ] as const
  for (const tag of keys) labels[tag] = t(`tag.${tag}`)
  return labels
}

/** One card: thumbnail (with token-swatch fallback), name, description, badges. */
function SkinCard({
  t,
  livery,
  labelById,
  locale,
  previewLocale,
  mode,
  previewsBase,
  index,
  focusIndex,
  selected,
  state,
  cardRef,
  onKeyDown,
  onFocus,
  onPreview,
}: {
  readonly t: LiveryTranslate
  readonly livery: CompiledLivery
  readonly labelById: TagLabels
  readonly locale: 'zh' | 'en'
  readonly previewLocale: 'zh' | 'en'
  readonly mode: 'light' | 'dark'
  readonly previewsBase: string
  readonly index: number
  readonly focusIndex: number
  readonly selected: boolean
  readonly state: ReturnType<typeof cardState>
  readonly cardRef: Ref<HTMLDivElement>
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>, index: number) => void
  readonly onFocus: (index: number) => void
  readonly onPreview: (id: string) => void
}): JSX.Element {
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const name = localizedName(livery, locale)
  const description = localizedDescription(livery, locale)
  const applicable = state !== 'incompatible'
  const seeds = previewSeeds(livery, mode)
  const mockStyle = {
    '--livery-accent': seeds.accent,
    '--livery-secondary': seeds.secondary,
    '--livery-surface': seeds.surface,
    '--livery-text': seeds.text,
  } as CSSProperties

  return (
    <div
      ref={cardRef}
      role="option"
      aria-selected={selected}
      aria-label={name}
      aria-disabled={applicable ? undefined : true}
      tabIndex={index === focusIndex ? 0 : -1}
      className="livery-card"
      data-testid="livery-card"
      data-livery-id={livery.id}
      data-state={state}
      onClick={() => {
        if (applicable) onPreview(livery.id)
      }}
      onKeyDown={event => onKeyDown(event, index)}
      onFocus={() => onFocus(index)}
    >
      <span className="livery-thumb">
        {thumbnailFailed
          ? <span className="livery-thumb__fallback" style={mockStyle} aria-hidden="true" />
          : (
            <img
              className="livery-thumb__img"
              data-testid="livery-thumb"
              src={previewUrl(previewsBase, livery.id, previewLocale, mode)}
              alt={t('card.thumbnailAlt', {
                name,
                mode: t(mode === 'dark' ? 'mode.dark' : 'mode.light'),
              })}
              decoding="async"
              onError={() => setThumbnailFailed(true)}
            />
          )}
        {thumbnailFailed && <span className="livery-thumb__error">{t('card.thumbnailError')}</span>}
      </span>
      <span className="livery-card__body">
        <span className="livery-card__name">{name}</span>
        {description.length > 0 && <span className="livery-card__desc">{description}</span>}
        <span className="livery-card__meta">
          {applicable
            ? livery.meta.tags.slice(0, 3).map(tag => (
              <Tag key={tag} tone="quiet">{tagLabel(tag, labelById)}</Tag>
            ))
            : <Tag tone="danger">{t('card.unavailable')}</Tag>}
        </span>
      </span>
      {state === 'active' && <span className="livery-card__badge">{t('card.current')}</span>}
      {state === 'preview' && <span className="livery-card__previewbadge">{t('card.previewing')}</span>}
      {state === 'incompatible' && <span className="livery-sr">{t('card.unavailableHint')}</span>}
    </div>
  )
}

/**
 * Read the current column count of one family grid without caching layout.
 * Only runs on an arrow-key press while the panel is open.
 */
function columnCount(grid: HTMLElement | null): number {
  if (grid === null || typeof window === 'undefined') return 1
  const columns = window.getComputedStyle(grid).gridTemplateColumns
  const count = columns.split(' ').filter(part => part.length > 0).length
  return count > 0 ? count : 1
}

/**
 * Render the search/filter toolbar and the family-grouped card list.
 * @param props - gallery properties; see {@link GalleryProps}.
 * @returns the gallery region.
 */
export function Gallery({
  t, snapshot, filter, onFilterChange, onPreview,
  previewLocaleChoice, previewLocale, onPreviewLocaleChange,
  initialFamily, initialMoreFiltersOpen = false,
}: GalleryProps): JSX.Element {
  const allLiveries = useMemo(
    () => sortLiveries(snapshot.catalog?.liveries ?? []),
    [snapshot.catalog],
  )
  const tagIds = useMemo(() => collectTagIds(allLiveries), [allLiveries])
  const labelById = useMemo(() => tagLabels(t), [t])
  const filtered = useMemo(
    () => filterLiveries(allLiveries, filter, labelById),
    [allLiveries, filter, labelById],
  )
  const [activeFamily, setActiveFamily] = useState<StyleFamilyId | undefined>(initialFamily)
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(initialMoreFiltersOpen)
  const groups = useMemo(() => groupByFamily(filtered, activeFamily), [filtered, activeFamily])
  const flat = useMemo(() => flattenGroups(groups), [groups])
  const [focusIndex, setFocusIndex] = useState(0)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const familyIdBase = useId()

  useEffect(() => {
    if (focusIndex >= flat.length) setFocusIndex(0)
  }, [focusIndex, flat.length])

  const focusCard = (index: number): void => {
    const bounded = Math.max(0, Math.min(flat.length - 1, index))
    setFocusIndex(bounded)
    cardRefs.current[bounded]?.focus()
  }

  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      const livery = flat[index]
      if (livery === undefined) return
      event.preventDefault()
      if (liveryAvailability(livery, snapshot.capabilities).applicable) onPreview(livery.id)
      return
    }
    const grid = event.currentTarget.parentElement
    const target = cardKeyTarget(event.key, index, flat.length, columnCount(grid))
    if (target === undefined) return
    event.preventDefault()
    focusCard(target)
  }

  const countText = flat.length === 1
    ? t('gallery.countOne')
    : t('gallery.count', { count: formatNumber(snapshot.locale, flat.length) })
  const filtering = filter.query.trim().length > 0
    || filter.tagId !== undefined
    || activeFamily !== undefined

  const clearFilters = (): void => {
    onFilterChange({ query: '', tagId: undefined })
    setActiveFamily(undefined)
  }

  const toggleFamily = (family: StyleFamilyId | undefined): void => {
    setActiveFamily(previous => (family !== undefined && previous === family ? undefined : family))
  }

  const toggleMoreFilters = (): void => {
    setMoreFiltersOpen((open) => {
      // A tag filter that is about to become invisible would silently narrow the
      // gallery, so collapsing the row clears it.
      if (open && filter.tagId !== undefined) onFilterChange({ ...filter, tagId: undefined })
      return !open
    })
  }

  // Global card index across family sections: sections are presentation-only.
  let cursor = 0

  return (
    <>
      <div className="livery-gallery-toolbar" data-testid="livery-gallery-toolbar">
        <div className="livery-toolbar">
        <div className="livery-search livery-gallery-toolbar__search">
          <Input
            data-testid="livery-search"
            type="search"
            value={filter.query}
            aria-label={t('search.label')}
            placeholder={t('search.placeholder')}
            onChange={event => onFilterChange({ ...filter, query: event.target.value })}
          />
          {filter.query.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="livery-search__clear"
              aria-label={t('search.clear')}
              onClick={() => onFilterChange({ ...filter, query: '' })}
            >
              {t('search.clear')}
            </Button>
          )}
        </div>

        <div className="livery-filters livery-gallery-toolbar__filters" role="group" aria-label={t('filter.familyLabel')}>
          <button
            type="button"
            className="livery-chip"
            data-testid="livery-family-chip"
            data-family="all"
            aria-pressed={activeFamily === undefined}
            onClick={() => toggleFamily(undefined)}
          >
            {t('filter.all')}
          </button>
          {STYLE_FAMILIES.map(family => (
            <button
              key={family}
              type="button"
              className="livery-chip"
              data-testid="livery-family-chip"
              data-family={family}
              aria-pressed={activeFamily === family}
              onClick={() => toggleFamily(family)}
            >
              {t(familyLabelKey(family))}
            </button>
          ))}
          <button
            type="button"
            className="livery-chip livery-more-toggle"
            data-testid="livery-more-filters"
            aria-expanded={moreFiltersOpen}
            aria-controls="livery-more-tags"
            onClick={toggleMoreFilters}
          >
            {t(moreFiltersOpen ? 'filter.fewer' : 'filter.more')}
          </button>
        </div>

        {moreFiltersOpen && (
          <div
            id="livery-more-tags"
            className="livery-filters livery-gallery-toolbar__tags"
            role="group"
            aria-label={t('filter.label')}
          >
            <span className="livery-filters__label">{t('filter.label')}</span>
            {tagIds.map(tag => (
              <button
                key={tag}
                type="button"
                className="livery-chip"
                data-testid="livery-tag"
                data-tag={tag}
                aria-pressed={filter.tagId === tag}
                onClick={() => onFilterChange({ ...filter, tagId: filter.tagId === tag ? undefined : tag })}
              >
                {tagLabel(tag, labelById)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="livery-gallery-toolbar__locale livery-filters livery-locale-tab"
        role="group"
        aria-label={t('gallery.previewLanguage')}
        title={t('gallery.previewLanguageHint')}
        data-testid="livery-locale-tab"
      >
        <span className="livery-filters__label">{t('gallery.previewLanguage')}</span>
        {(['follow', 'zh', 'en'] as const).map(choice => (
          <button
            key={choice}
            type="button"
            className="livery-chip"
            data-testid={`livery-locale-${choice}`}
            aria-pressed={previewLocaleChoice === choice}
            onClick={() => onPreviewLocaleChange(choice)}
          >
            {choice === 'follow'
              ? t('gallery.followLocale')
              : choice === 'zh'
                ? t('gallery.localeZh')
                : t('gallery.localeEn')}
          </button>
        ))}
      </div>
      </div>

      <div className="livery-gallery-head">
        <h3 className="livery-gallery-head__title">{t('gallery.title')}</h3>
        <span className="livery-gallery-head__count">{countText}</span>
      </div>

      {flat.length === 0
        ? (
          <div className="livery-empty" data-testid="livery-empty">
            <span className="livery-empty__title">{t('empty.title')}</span>
            <span className="livery-empty__body">{t('empty.body')}</span>
            {filtering && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t('empty.action')}
              </Button>
            )}
          </div>
        )
        : (
          <div
            role="listbox"
            aria-label={t('gallery.aria')}
            className="livery-gallery-groups"
            data-testid="livery-gallery"
          >
            {groups.map(group => {
              const headingId = `${familyIdBase}-${group.family}`
              const sectionStart = cursor
              cursor += group.liveries.length
              return (
                <section
                  key={group.family}
                  className="livery-family"
                  data-testid={`livery-family-${group.family}`}
                  data-family={group.family}
                  role="group"
                  aria-labelledby={headingId}
                >
                  <h4 id={headingId} className="livery-family__head" data-testid="livery-family">
                    <span>{t(familyLabelKey(group.family))}</span>
                    <span className="livery-family__count">
                      {formatNumber(snapshot.locale, group.liveries.length)}
                    </span>
                  </h4>
                  <div className="livery-grid">
                    {group.liveries.map((livery, memberIndex) => {
                      const index = sectionStart + memberIndex
                      const availability = liveryAvailability(livery, snapshot.capabilities)
                      const state = cardState(snapshot, livery, availability.applicable)
                      const selected = snapshot.previewId === livery.id
                        || (snapshot.phase !== 'previewing' && snapshot.confirmedId === livery.id)
                      return (
                        <SkinCard
                          key={livery.id}
                          t={t}
                          livery={livery}
                          labelById={labelById}
                          locale={snapshot.locale}
                          previewLocale={previewLocale}
                          mode={snapshot.themeMode}
                          previewsBase={snapshot.catalog?.previewsBase ?? ''}
                          index={index}
                          focusIndex={focusIndex}
                          selected={selected}
                          state={state}
                          cardRef={(element) => { cardRefs.current[index] = element }}
                          onKeyDown={onCardKeyDown}
                          onFocus={setFocusIndex}
                          onPreview={onPreview}
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}

      <p className="livery-hint">{t('hint.keyboard')}</p>
    </>
  )
}
