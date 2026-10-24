/**
 * The livery gallery: search + tag filters + a roving-focus card grid.
 *
 * Cards are `role="option"` members of one `role="listbox"`; the actions that
 * mutate state (apply / cancel / restore) are real `<button>` elements owned by
 * the page. Clicking or pressing Enter on a card previews it immediately.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { LiveryFilter, LiveryRuntimeSnapshot, TagLabels } from '../model.js'
import type { LiveryTranslate } from '../platform.js'

/** Props of the gallery region. */
export interface GalleryProps {
  readonly t: LiveryTranslate
  readonly snapshot: LiveryRuntimeSnapshot
  readonly filter: LiveryFilter
  readonly onFilterChange: (filter: LiveryFilter) => void
  readonly onPreview: (id: string) => void
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
  mode,
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
  readonly mode: 'light' | 'dark'
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
              src={previewUrl(livery.id, locale, mode)}
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
          <Tag tone="outline">{t('card.light')}</Tag>
          <Tag tone="outline">{t('card.dark')}</Tag>
          {applicable
            ? livery.meta.tags.map(tag => (
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
 * Read the current column count of the responsive grid without caching layout.
 * Only runs on an arrow-key press while the settings page is open.
 */
function columnCount(grid: HTMLElement | null): number {
  if (grid === null || typeof window === 'undefined') return 1
  const columns = window.getComputedStyle(grid).gridTemplateColumns
  const count = columns.split(' ').filter(part => part.length > 0).length
  return count > 0 ? count : 1
}

/**
 * Render the search/filter toolbar and the card grid.
 * @param props - gallery properties; see {@link GalleryProps}.
 * @returns the gallery region.
 */
export function Gallery({ t, snapshot, filter, onFilterChange, onPreview }: GalleryProps): JSX.Element {
  const allLiveries = useMemo(
    () => sortLiveries(snapshot.catalog?.liveries ?? []),
    [snapshot.catalog],
  )
  const tagIds = useMemo(() => collectTagIds(allLiveries), [allLiveries])
  const labelById = useMemo(() => tagLabels(t), [t])
  const visible = useMemo(
    () => filterLiveries(allLiveries, filter, labelById),
    [allLiveries, filter, labelById],
  )
  const [focusIndex, setFocusIndex] = useState(0)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    if (focusIndex >= visible.length) setFocusIndex(0)
  }, [focusIndex, visible.length])

  const focusCard = (index: number): void => {
    const bounded = Math.max(0, Math.min(visible.length - 1, index))
    setFocusIndex(bounded)
    cardRefs.current[bounded]?.focus()
  }

  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number): void => {
    const last = visible.length - 1
    const columns = columnCount(gridRef.current)
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = index + 1; break
      case 'ArrowLeft': next = index - 1; break
      case 'ArrowDown': next = index + columns; break
      case 'ArrowUp': next = index - columns; break
      case 'Home': next = 0; break
      case 'End': next = last; break
      case 'Enter':
      case ' ': {
        const livery = visible[index]
        if (livery === undefined) return
        event.preventDefault()
        if (liveryAvailability(livery, snapshot.capabilities).applicable) onPreview(livery.id)
        return
      }
      default: return
    }
    event.preventDefault()
    focusCard(next)
  }

  const countText = visible.length === 1
    ? t('gallery.countOne')
    : t('gallery.count', { count: formatNumber(snapshot.locale, visible.length) })
  const filtering = filter.query.trim().length > 0 || filter.tagId !== undefined

  return (
    <>
      <div className="livery-toolbar">
        <div className="livery-search">
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
        {tagIds.length > 0 && (
          <div className="livery-filters" role="group" aria-label={t('filter.label')}>
            <span className="livery-filters__label">{t('filter.label')}</span>
            <button
              type="button"
              className="livery-chip"
              aria-pressed={filter.tagId === undefined}
              onClick={() => onFilterChange({ ...filter, tagId: undefined })}
            >
              {t('filter.all')}
            </button>
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

      <div className="livery-gallery-head">
        <h3 className="livery-gallery-head__title">{t('gallery.title')}</h3>
        <span className="livery-gallery-head__count">{countText}</span>
      </div>

      {visible.length === 0
        ? (
          <div className="livery-empty" data-testid="livery-empty">
            <span className="livery-empty__title">{t('empty.title')}</span>
            <span className="livery-empty__body">{t('empty.body')}</span>
            {filtering && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFilterChange({ query: '', tagId: undefined })}
              >
                {t('empty.action')}
              </Button>
            )}
          </div>
        )
        : (
          <div
            ref={(element) => { gridRef.current = element }}
            role="listbox"
            aria-label={t('gallery.aria')}
            className="livery-grid"
            data-testid="livery-gallery"
          >
            {visible.map((livery, index) => {
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
                  mode={snapshot.themeMode}
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
        )}

      <p className="livery-hint">{t('hint.keyboard')}</p>
    </>
  )
}
