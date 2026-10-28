/**
 * Livery client runtime: the state machine from implementation-plan.md §6.3.
 *
 * ```text
 * boot -> loading -> ready <-> previewing
 *                     |
 *                     +-> degraded -> disposed
 * ```
 *
 * The runtime owns reconciliation decisions (which skin is confirmed, when the
 * host first frame can be adopted with zero CSS writes, when to fall back to
 * stock) and delegates *every* DOM write to the presenter. It reads the
 * host-served catalog exactly once, waits for the first config-form snapshot
 * before touching the DOM, and never installs a document-wide observer.
 */
import type {
  BootPayload,
  CapabilityDegrade,
  CapabilityMap,
  CompiledLivery,
  LiveryCatalog,
} from '../core/types.js'
import { BODY_ATTRIBUTE, HASH_ATTRIBUTE, STOCK_ID } from '../core/types.js'
import type { BootCheck } from './handshake.js'
import { normalizeLocale } from './handshake.js'
import {
  bootMatchesExpected,
  canTransition,
  createInitialSnapshot,
  isStock,
  liveryAvailability,
  missingContractCapabilities,
  normalizeSkinId,
} from './model.js'
import type {
  LiveryLocaleId,
  LiveryMode,
  LiveryPhase,
  LiveryRuntimeApi,
  LiveryRuntimeSnapshot,
  RuntimeIdentity,
  StyleApplyOutcome,
  WriteFailure,
} from './model.js'
import type { Presenter, SkinCss } from './presenter.js'

/** Pure presentation functions injected so the runtime stays React/DOM free and testable. */
export interface CoreApi {
  /** Exact stylesheet bytes already rendered into the catalog livery. */
  styleTextOf(livery: CompiledLivery): string
  /** Content hash of {@link styleTextOf}'s result, compiled with the livery. */
  liveryCssHash(livery: CompiledLivery): string
  findLivery(catalog: LiveryCatalog, id: string): CompiledLivery | undefined
}

/** The subset of `ConfigForm<T>` the runtime consumes. */
export interface ConfigFormSnapshotLike {
  readonly status: 'loading' | 'ready' | 'unavailable'
  readonly value: unknown
  readonly revision: number | undefined
  readonly writable: boolean
  readonly mode: 'host' | 'memory'
}

/** The subset of `ctx.configForms.get(entryId)` the runtime consumes. */
export interface ConfigFormLike {
  getSnapshot(): ConfigFormSnapshotLike
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<boolean>
}

/** Read-only locale face (wired from `ctx.locale`). */
export interface LocaleSource {
  getLocale(): string
  subscribe(listener: (locale: string) => void): () => void
}

/** Read-only theme face (wired from `ctx.theme`; optional in foreign compositions). */
export interface ThemeSource {
  getMode(): LiveryMode
  subscribe(listener: (mode: LiveryMode) => void): () => void
}

/** Everything the runtime needs from its host composition. */
export interface LiveryRuntimeDeps {
  readonly boot: BootCheck
  readonly identity: RuntimeIdentity
  readonly entryId: string
  readonly configForms: { get(entryId: string): ConfigFormLike }
  readonly presenter: Presenter
  readonly core: CoreApi
  /** Fetch and validate the catalog once; resolves `undefined` when unavailable. */
  readonly fetchCatalog: () => Promise<LiveryCatalog | undefined>
  readonly locale: LocaleSource
  readonly theme?: ThemeSource | undefined
  /** Document access for the adoption hash checks; undefined in DOM-less tests. */
  readonly document?: Document | undefined
}

/** Append one note without duplicating it. */
function withNote(notes: readonly string[], note: string): readonly string[] {
  return notes.includes(note) ? notes : [...notes, note]
}

/** Frozen empty capability map. */
const NO_CAPABILITIES: CapabilityMap = {}

/** The client state machine. */
export class LiveryRuntime implements LiveryRuntimeApi {
  private snapshot: LiveryRuntimeSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly deps: LiveryRuntimeDeps
  private form: ConfigFormLike | undefined
  private configUnsubscribe: (() => void) | undefined
  private localeUnsubscribe: (() => void) | undefined
  private started = false
  private disposed = false
  private settled = false
  private configSettled = false
  private catalogSettled = false
  private generation = 0
  /** Latest config revision observed from the host form. */
  private configRevision: number | undefined
  /** Previous observed revision, used to detect same-value/higher-revision updates. */
  private lastObservedConfigRevision: number | undefined
  /** Newer host config that arrived while a settings write was in flight. */
  private pendingConfig: { readonly revision: number | undefined; readonly confirmedId: string } | undefined
  /** Phase to return to after cancel/rollback (ready or degraded). */
  private basePhase: 'ready' | 'degraded' = 'ready'
  /** Resolved CSS of the confirmed (non-stock) livery. */
  private confirmedSkin: SkinCss | undefined
  /** Resolved CSS of the transient preview (undefined = stock preview). */
  private previewSkin: SkinCss | undefined
  /** Last failed settings write, replayed by {@link retryLastWrite}. */
  private lastWrite: { readonly kind: 'commit'; readonly id: string } | { readonly kind: 'restore' } | undefined
  private themeUnsubscribe: (() => void) | undefined

  /**
   * @param deps - host composition; see {@link LiveryRuntimeDeps}.
   */
  constructor(deps: LiveryRuntimeDeps) {
    this.deps = deps
    this.snapshot = createInitialSnapshot(deps.identity, {
      status: deps.boot.kind,
      reason: deps.boot.reasons[0],
      diagnostics: deps.boot.payload?.diagnostics ?? [],
      catalogProfile: deps.boot.payload?.catalogProfile,
    })
  }

  /** @returns the current immutable snapshot (stable between changes). */
  getSnapshot(): LiveryRuntimeSnapshot {
    return this.snapshot
  }

  /**
   * Subscribe to snapshot replacements (React `useSyncExternalStore` shape).
   * @param listener - change callback.
   * @returns unsubscribe.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Enter the state machine: inspect the handshake, then load config + catalog.
   * Nothing is written to the DOM before the first settled presentation.
   * @returns nothing.
   */
  start(): void {
    if (this.started || this.disposed) return
    this.started = true
    const boot = this.deps.boot
    if (boot.kind === 'mismatch') {
      // Fail closed: undo only the Livery-owned first-frame artifacts we can
      // identify, then stay on stock appearance with diagnostics.
      this.deps.presenter.removeBootArtifacts()
      this.patch({
        phase: 'degraded',
        bootStatus: 'mismatch',
        bootReason: boot.reasons.join('; '),
        notes: boot.reasons.map(reason => `handshake: ${reason}`),
        effectiveId: STOCK_ID,
        configStatus: 'unavailable',
        catalogStatus: 'idle',
      })
      return
    }

    this.patch({
      phase: 'loading',
      bootStatus: boot.kind,
      ...(boot.reasons[0] === undefined ? {} : { bootReason: boot.reasons[0] }),
      locale: normalizeLocale(this.deps.locale.getLocale()),
      themeMode: this.readThemeMode(),
    })

    this.localeUnsubscribe = this.deps.locale.subscribe((locale) => {
      const next = normalizeLocale(locale)
      if (next !== this.snapshot.locale) this.patch({ locale: next })
    })

    this.form = this.deps.configForms.get(this.deps.entryId)
    this.configUnsubscribe = this.form.subscribe(() => {
      this.onConfigChange()
    })
    this.onConfigChange()
    void this.loadCatalog()
  }

  /**
   * Tear everything down in reverse order: subscriptions first (no more
   * writes), then owned DOM, then the snapshot.
   * @returns nothing.
   */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.generation += 1
    this.configUnsubscribe?.()
    this.configUnsubscribe = undefined
    this.localeUnsubscribe?.()
    this.localeUnsubscribe = undefined
    this.themeUnsubscribe?.()
    this.themeUnsubscribe = undefined
    this.deps.presenter.dispose()
    const next: LiveryRuntimeSnapshot = {
      ...this.snapshot,
      revision: this.snapshot.revision + 1,
      phase: 'disposed',
      previewId: undefined,
      writing: false,
      effectiveId: STOCK_ID,
    }
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
    this.listeners.clear()
  }

  /**
   * Preview one livery without writing configuration.
   * @param id - livery id, or `stock`.
   * @returns whether the preview started.
   */
  preview(id: string): boolean {
    if (!this.canInteract()) return false
    if (this.snapshot.phase === 'previewing') this.cancelPreview()
    if (this.snapshot.phase !== 'ready' && this.snapshot.phase !== 'degraded') return false
    this.basePhase = this.snapshot.phase
    if (isStock(id)) {
      this.previewSkin = undefined
      this.deps.presenter.applyPreview({ id: STOCK_ID, cssText: '', hash: '' })
      this.patch({ phase: 'previewing', previewId: STOCK_ID, writeFailure: undefined })
      return true
    }
    const skin = this.skinFor(id)
    if (skin === undefined) return false
    this.previewSkin = skin
    this.deps.presenter.applyPreview(skin)
    this.patch({ phase: 'previewing', previewId: id, writeFailure: undefined })
    return true
  }

  /** Drop the transient preview and return to the confirmed livery. */
  cancelPreview(): void {
    if (this.snapshot.phase !== 'previewing') return
    this.previewSkin = undefined
    this.deps.presenter.rollbackPreview(this.confirmedSkin)
    this.patch({ phase: this.basePhase, previewId: undefined })
  }

  /**
   * Persist the previewed livery with exactly one config-form write.
   * @returns true when the host accepted the write.
   */
  async commitPreview(): Promise<boolean> {
    if (!this.canWrite()) return false
    if (this.snapshot.phase !== 'previewing' || this.snapshot.writing) return false
    const form = this.form
    const target = this.snapshot.previewId
    if (form === undefined || target === undefined) return false
    const priorConfirmed = this.snapshot.confirmedId
    const priorSkin = this.confirmedSkin
    const basePhase = this.basePhase
    const skin = this.previewSkin
    const startRevision = this.configRevision
    this.pendingConfig = undefined
    this.lastWrite = target === STOCK_ID ? { kind: 'restore' } : { kind: 'commit', id: target }
    this.patch({ writing: true, writeFailure: undefined })
    let accepted = false
    let failure: WriteFailure | undefined
    try {
      accepted = await form.set('skinId', target)
    } catch {
      accepted = false
      failure = 'transport'
    }
    if (this.disposed) return false
    const pendingCommit = this.pendingConfigSnapshot()
    if (pendingCommit !== undefined && pendingCommit.revision !== startRevision) {
      // A newer host configuration landed while we waited: it wins over this
      // older write result. Roll forward to the newest confirmed style instead
      // of overwriting it with the stale target/rollback.
      const newest = pendingCommit.confirmedId
      this.pendingConfig = undefined
      this.lastWrite = undefined
      this.previewSkin = undefined
      this.deps.presenter.rollbackPreview(undefined)
      this.patch({
        writing: false,
        phase: basePhase,
        previewId: undefined,
        writeFailure: undefined,
        notes: withNote(this.snapshot.notes, 'newer host configuration superseded the in-flight settings write'),
      })
      this.present(newest, false)
      return accepted
    }
    this.pendingConfig = undefined
    if (accepted) {
      if (target === STOCK_ID || skin === undefined) {
        this.deps.presenter.clearSkin()
        this.confirmedSkin = undefined
      } else {
        this.deps.presenter.applyConfirmed(skin)
        this.confirmedSkin = skin
      }
      this.previewSkin = undefined
      this.lastWrite = undefined
      this.patch({
        writing: false,
        phase: basePhase,
        previewId: undefined,
        confirmedId: target,
        effectiveId: isStock(target) ? STOCK_ID : target,
        invalidSkinId: undefined,
        missingRequired: [],
        degraded: this.degradedForId(target),
        writeFailure: undefined,
      })
      return true
    }
    // Refused or transport failure: roll the preview back to the confirmed skin.
    this.previewSkin = undefined
    this.deps.presenter.rollbackPreview(priorSkin)
    this.patch({
      writing: false,
      phase: basePhase,
      previewId: undefined,
      confirmedId: priorConfirmed,
      writeFailure: failure ?? 'refused',
      notes: withNote(this.snapshot.notes, failure === undefined
        ? 'settings write refused by the host'
        : 'settings write transport failure'),
    })
    return false
  }

  /**
   * Apply one livery directly with exactly one config write, without entering
   * the transient preview phase.
   *
   * This is the internal flow-driver API used by native preset application: it
   * is not a simulated card click, and it distinguishes every failure mode so
   * the caller can abort before touching the wallpaper state or report a
   * partial result.
   * @param id - livery id, or `stock` to restore stock appearance.
   * @returns `{ ok: true }` or `{ ok: false, failure }`.
   */
  async applyStyle(id: string): Promise<StyleApplyOutcome> {
    if (this.disposed) return { ok: false, failure: 'busy' }
    if (this.snapshot.configStatus !== 'ready' || this.snapshot.writable !== true) {
      return { ok: false, failure: 'unavailable' }
    }
    const phase = this.snapshot.phase
    if (phase !== 'ready' && phase !== 'degraded' && phase !== 'previewing') {
      return { ok: false, failure: 'busy' }
    }
    if (this.snapshot.writing) return { ok: false, failure: 'busy' }
    if (this.snapshot.phase === 'previewing') this.cancelPreview()
    if (isStock(id)) {
      if (isStock(this.snapshot.confirmedId) && isStock(this.snapshot.effectiveId)) return { ok: true }
      return this.styleOutcome(await this.restoreStock())
    }
    const catalog = this.snapshot.catalog
    if (catalog === undefined) return { ok: false, failure: 'unavailable' }
    if (this.skinFor(id) === undefined) {
      return this.deps.core.findLivery(catalog, id) === undefined
        ? { ok: false, failure: 'unknown' }
        : { ok: false, failure: 'unavailable' }
    }
    if (this.snapshot.confirmedId === id && this.snapshot.effectiveId === id) return { ok: true }
    if (!this.preview(id)) return { ok: false, failure: 'busy' }
    const accepted = await this.commitPreview()
    if (this.disposed) return { ok: false, failure: 'busy' }
    if (!accepted) return this.styleOutcome(false)
    // A newer host configuration can supersede the in-flight write; then the
    // preset's livery is not what the host reports as confirmed.
    if (this.snapshot.confirmedId !== id) return { ok: false, failure: 'refused' }
    return { ok: true }
  }

  /**
   * Map a write result to the structured direct-apply outcome.
   * @param accepted - whether the config form accepted the write.
   * @returns the public outcome.
   */
  private styleOutcome(accepted: boolean): StyleApplyOutcome {
    if (accepted) return { ok: true }
    if (this.form === undefined) return { ok: false, failure: 'unavailable' }
    return {
      ok: false,
      failure: this.snapshot.writeFailure === 'transport' ? 'transport' : 'refused',
    }
  }

  /**
   * Persist the stock appearance with one config-form write.
   * @returns true when the host accepted the write.
   */
  async restoreStock(): Promise<boolean> {
    if (!this.canWrite()) return false
    if (this.snapshot.phase === 'previewing') this.cancelPreview()
    if (this.snapshot.writing) return false
    const form = this.form
    if (form === undefined) return false
    const basePhase = this.snapshot.phase === 'degraded' ? 'degraded' : 'ready'
    const startRevision = this.configRevision
    this.pendingConfig = undefined
    this.lastWrite = { kind: 'restore' }
    this.patch({ writing: true, writeFailure: undefined })
    let accepted = false
    let failure: WriteFailure | undefined
    try {
      accepted = await form.set('skinId', STOCK_ID)
    } catch {
      accepted = false
      failure = 'transport'
    }
    if (this.disposed) return false
    const pendingRestore = this.pendingConfigSnapshot()
    if (pendingRestore !== undefined && pendingRestore.revision !== startRevision) {
      const newest = pendingRestore.confirmedId
      this.pendingConfig = undefined
      this.lastWrite = undefined
      this.patch({
        writing: false,
        phase: basePhase,
        previewId: undefined,
        writeFailure: undefined,
        notes: withNote(this.snapshot.notes, 'newer host configuration superseded the in-flight settings write'),
      })
      this.present(newest, false)
      return accepted
    }
    this.pendingConfig = undefined
    if (accepted) {
      this.deps.presenter.clearSkin()
      this.confirmedSkin = undefined
      this.lastWrite = undefined
      this.patch({
        writing: false,
        phase: basePhase,
        confirmedId: STOCK_ID,
        effectiveId: STOCK_ID,
        previewId: undefined,
        invalidSkinId: undefined,
        missingRequired: [],
        degraded: [],
        writeFailure: undefined,
      })
      return true
    }
    this.deps.presenter.applyConfirmed(this.confirmedSkin ?? { id: STOCK_ID, cssText: '', hash: '' })
    this.patch({ writing: false, phase: basePhase, writeFailure: failure ?? 'refused' })
    return false
  }

  /**
   * Replay the last settings write that did not land: a refused/failed commit
   * is previewed again and retried; a failed stock restore is retried directly.
   * @returns true when the retried write was accepted.
   */
  async retryLastWrite(): Promise<boolean> {
    const last = this.lastWrite
    if (!this.canWrite() || last === undefined) return false
    if (last.kind === 'restore') return this.restoreStock()
    if (!this.preview(last.id)) return false
    return this.commitPreview()
  }

  /**
   * Retry the catalog fetch after an offline/degraded load.
   * @returns resolves when the retry settled.
   */
  async retryCatalog(): Promise<void> {
    if (this.disposed || !this.settled) return
    if (this.snapshot.catalogStatus === 'loading' || this.snapshot.catalogStatus === 'ready') return
    this.catalogSettled = false
    this.settled = false
    this.patch({ phase: 'loading', catalogStatus: 'idle', notes: this.snapshot.notes.filter(note => !note.includes('catalog')) })
    await this.loadCatalog()
  }

  /**
   * Observe host light/dark changes. Called by the settings page while it is
   * mounted, so startup performs zero `theme/change` subscriptions
   * (implementation-plan.md §18.8).
   * @returns unsubscribe.
   */
  observeTheme(): () => void {
    const theme = this.deps.theme
    if (theme === undefined) return () => undefined
    this.themeUnsubscribe?.()
    this.patch({ themeMode: theme.getMode() })
    this.themeUnsubscribe = theme.subscribe((mode) => {
      if (mode !== this.snapshot.themeMode) this.patch({ themeMode: mode })
    })
    return () => {
      this.themeUnsubscribe?.()
      this.themeUnsubscribe = undefined
    }
  }

  // --- internals -----------------------------------------------------------

  private pendingConfigSnapshot(): { readonly revision: number | undefined; readonly confirmedId: string } | undefined {
    return this.pendingConfig
  }

  private canInteract(): boolean {
    if (this.disposed) return false
    const phase = this.snapshot.phase
    return phase === 'ready' || phase === 'degraded' || phase === 'previewing'
  }

  /** Central host-config write permission (all form.set paths). */
  private canWrite(): boolean {
    return this.canInteract()
      && this.snapshot.configStatus === 'ready'
      && this.snapshot.writable === true
      && this.form !== undefined
  }

  private readThemeMode(): LiveryMode {
    const theme = this.deps.theme
    if (theme === undefined) return 'light'
    try {
      return theme.getMode()
    } catch {
      return 'light'
    }
  }

  private patch(partial: Partial<LiveryRuntimeSnapshot>): void {
    if (this.disposed && partial.phase !== 'disposed') return
    const nextPhase = partial.phase ?? this.snapshot.phase
    const notes = partial.notes
      ?? (nextPhase !== this.snapshot.phase && !canTransition(this.snapshot.phase, nextPhase)
        ? withNote(this.snapshot.notes, `illegal transition ${this.snapshot.phase} -> ${nextPhase}`)
        : this.snapshot.notes)
    const next: LiveryRuntimeSnapshot = {
      ...this.snapshot,
      ...partial,
      notes,
      revision: this.snapshot.revision + 1,
    }
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }

  private async loadCatalog(): Promise<void> {
    if (this.disposed) return
    const generation = ++this.generation
    this.patch({ catalogStatus: 'loading' })
    let catalog: LiveryCatalog | undefined
    try {
      catalog = await this.deps.fetchCatalog()
    } catch {
      catalog = undefined
    }
    if (this.disposed || generation !== this.generation) return
    this.catalogSettled = true
    if (catalog === undefined) {
      this.patch({
        catalogStatus: 'unavailable',
        notes: withNote(this.snapshot.notes, 'catalog route unavailable'),
      })
    } else {
      // The catalog is the live host's own identity record: surface its
      // version/adapter/contract/profile in the snapshot (self-check + about)
      // so the UI never has to infer them.
      this.patch({
        catalogStatus: 'ready',
        catalog,
        capabilities: catalog.capabilities,
        catalogProfile: catalog.catalogProfile,
        identity: {
          adapterId: catalog.adapterId,
          contractHash: catalog.contractHash,
          pluginVersion: this.snapshot.identity.pluginVersion,
          hostVersion: catalog.hostVersion,
        },
        notes: this.snapshot.notes.filter(note => !note.includes('catalog route')),
      })
    }
    this.maybeSettle()
  }

  private onConfigChange(): void {
    const form = this.form
    if (form === undefined || this.disposed) return
    const snapshot = form.getSnapshot()
    if (snapshot.status === 'loading') {
      this.patch({ configStatus: 'loading' })
      return
    }
    const value = normalizeSkinId(snapshot.value)
    const fallback = snapshot.status === 'unavailable' ? this.deps.boot.payload?.skinId : undefined
    const confirmedId = value ?? fallback ?? STOCK_ID
    this.configSettled = true
    const previousRevision = this.lastObservedConfigRevision
    this.lastObservedConfigRevision = snapshot.revision
    this.configRevision = snapshot.revision
    const previous = this.snapshot.confirmedId
    this.patch({
      configStatus: snapshot.status,
      writable: snapshot.writable,
      confirmedId,
    })
    if (!this.settled) {
      this.maybeSettle()
      return
    }
    if (confirmedId === previous) {
      // Same skin id but a newer host revision is still a real external update:
      // it must supersede an in-flight write and refresh the confirmed baseline.
      if (snapshot.revision === undefined || previousRevision === undefined || snapshot.revision <= previousRevision) return
      if (this.snapshot.writing) {
        this.pendingConfig = { revision: snapshot.revision, confirmedId }
        return
      }
      if (this.snapshot.phase === 'previewing') {
        this.previewSkin = undefined
        this.deps.presenter.rollbackPreview(undefined)
        this.patch({ previewId: undefined, phase: this.basePhase })
      }
      this.present(confirmedId, true)
      return
    }
    if (this.snapshot.writing) {
      // Never present over an in-flight write, but remember the newest config so
      // the write result can reconcile forward when it settles.
      this.pendingConfig = { revision: snapshot.revision, confirmedId }
      return
    }
    if (this.snapshot.phase === 'previewing') {
      // An external config change supersedes the transient preview.
      this.previewSkin = undefined
      this.deps.presenter.rollbackPreview(undefined)
      this.patch({ previewId: undefined, phase: this.basePhase })
    }
    this.present(confirmedId, true)
  }

  private maybeSettle(): void {
    if (this.settled || this.disposed) return
    if (!this.configSettled || !this.catalogSettled) return
    this.settled = true
    const catalog = this.snapshot.catalog
    const confirmedId = this.snapshot.confirmedId ?? this.deps.boot.payload?.skinId ?? STOCK_ID
    this.patch({ confirmedId })
    if (catalog === undefined) {
      this.settleWithoutCatalog(confirmedId)
      return
    }
    this.present(confirmedId, true)
    this.basePhase = this.snapshot.phase === 'degraded' ? 'degraded' : 'ready'
  }

  private settleWithoutCatalog(confirmedId: string): void {
    const payload = this.deps.boot.payload
    const canAdopt = this.deps.boot.kind === 'valid'
      && payload !== undefined
      && payload.skinId === confirmedId
      && payload.cssHash.length > 0
    const adopted = canAdopt && this.deps.presenter.adoptBootStyle({
      id: payload.skinId,
      cssText: '',
      hash: payload.cssHash,
    })
    const effectiveId = adopted ? confirmedId : (payload?.skinId ?? STOCK_ID)
    this.patch({
      phase: 'degraded',
      effectiveId,
      notes: withNote(this.snapshot.notes, 'catalog unavailable: colors from the first frame remain'),
    })
    this.basePhase = 'degraded'
  }

  /**
   * Resolve and present one configured skin.
   * @param id - configured skin id.
   * @param allowAdopt - whether adopting the host first frame is allowed (first settle only).
   */
  private present(id: string, allowAdopt: boolean): void {
    const catalog = this.snapshot.catalog
    const capabilities = this.snapshot.capabilities
    const contractMissing = missingContractCapabilities(capabilities)
    if (catalog === undefined) {
      this.patch({ effectiveId: STOCK_ID })
      return
    }
    if (isStock(id)) {
      this.deps.presenter.clearSkin()
      this.confirmedSkin = undefined
      this.patch({
        phase: contractMissing.length > 0 ? 'degraded' : 'ready',
        effectiveId: STOCK_ID,
        invalidSkinId: undefined,
        missingRequired: [],
        degraded: [],
        notes: contractMissing.length > 0
          ? withNote(this.snapshot.notes, `required host capabilities missing: ${contractMissing.join(', ')}`)
          : this.snapshot.notes,
      })
      return
    }
    const livery = this.deps.core.findLivery(catalog, id)
    if (livery === undefined) {
      this.deps.presenter.clearSkin()
      this.confirmedSkin = undefined
      this.patch({
        phase: 'degraded',
        effectiveId: STOCK_ID,
        invalidSkinId: id,
        missingRequired: [],
        degraded: [],
        notes: withNote(this.snapshot.notes, `unknown skin id: ${id}`),
      })
      return
    }
    const availability = liveryAvailability(livery, capabilities)
    if (!availability.applicable) {
      this.deps.presenter.clearSkin()
      this.confirmedSkin = undefined
      this.patch({
        phase: 'degraded',
        effectiveId: STOCK_ID,
        invalidSkinId: undefined,
        missingRequired: availability.missingRequired,
        degraded: availability.degraded,
        notes: withNote(
          this.snapshot.notes,
          `required capabilities missing for ${id}: ${availability.missingRequired.join(', ')}`,
        ),
      })
      return
    }
    const cssText = this.deps.core.styleTextOf(livery)
    const skin: SkinCss = { id, cssText, hash: this.deps.core.liveryCssHash(livery) }
    const adopted = allowAdopt && this.tryAdoptBoot(skin)
    if (!adopted) this.deps.presenter.applyConfirmed(skin)
    this.confirmedSkin = skin
    const degraded = availability.degraded
    const phase: LiveryPhase = contractMissing.length > 0 ? 'degraded' : 'ready'
    this.patch({
      phase,
      effectiveId: id,
      invalidSkinId: undefined,
      missingRequired: [],
      degraded,
      ...(contractMissing.length > 0
        ? { notes: withNote(this.snapshot.notes, `required host capabilities missing: ${contractMissing.join(', ')}`) }
        : {}),
    })
  }

  /** Adopt the host first frame when it matches this render exactly. */
  private tryAdoptBoot(skin: SkinCss): boolean {
    const boot = this.deps.boot
    const payload: BootPayload | undefined = boot.payload
    if (boot.kind !== 'valid' || payload === undefined) return false
    const body = this.deps.document?.body
    const facts = {
      expectedId: skin.id,
      expectedHash: skin.hash,
      bootId: payload.skinId,
      bootHash: payload.cssHash,
      bodyId: body?.getAttribute(BODY_ATTRIBUTE) ?? null,
      bodyHash: body?.getAttribute(HASH_ATTRIBUTE) ?? null,
    }
    if (!bootMatchesExpected(facts)) return false
    return this.deps.presenter.adoptBootStyle(skin)
  }

  /** Resolve the CSS presentation of one applicable livery. */
  private skinFor(id: string): SkinCss | undefined {
    const catalog = this.snapshot.catalog
    if (catalog === undefined || isStock(id)) return undefined
    const livery = this.deps.core.findLivery(catalog, id)
    if (livery === undefined) return undefined
    const availability = liveryAvailability(livery, this.snapshot.capabilities)
    if (!availability.applicable) return undefined
    return { id, cssText: this.deps.core.styleTextOf(livery), hash: this.deps.core.liveryCssHash(livery) }
  }

  /** Declared degradations of one livery id, for the snapshot. */
  private degradedForId(id: string): readonly CapabilityDegrade[] {
    const catalog = this.snapshot.catalog
    if (catalog === undefined || isStock(id)) return []
    const livery = this.deps.core.findLivery(catalog, id)
    if (livery === undefined) return []
    return liveryAvailability(livery, this.snapshot.capabilities).degraded
  }
}

/** Capabilities map used before the catalog settles. */
export { NO_CAPABILITIES }

/**
 * Build the runtime for one browser composition.
 * @param deps - host composition.
 * @returns an unstarted runtime; call {@link LiveryRuntime.start}.
 */
export function createLiveryRuntime(deps: LiveryRuntimeDeps): LiveryRuntime {
  return new LiveryRuntime(deps)
}

/** Locale id helper re-exported for the settings page. */
export type { LiveryLocaleId }
