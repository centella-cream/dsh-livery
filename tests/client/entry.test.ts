/**
 * Contribution-composition tests for the client entry.
 *
 * On certified hosts the feature is a `sidebar.panellist` row selecting a keyed
 * `main` panel; older/foreign compositions get the legacy `settings.section`
 * page. Activation order is profile-dependent, so the entry must be inject-first
 * and only install the fallback after a grace period — these tests model late
 * slot declarations with fake timers and a fake Cordis context that can defer
 * `slots.inject` callbacks until the test fires the declaration.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const React = await import('react')
  type AnyProps = Record<string, unknown>
  const passthrough = (tag: string) => (props: AnyProps) =>
    React.createElement(tag, props as never)
  return {
    Button: passthrough('button'),
    Input: passthrough('input'),
    Tag: passthrough('span'),
    Modal: () => null,
    Toast: () => null,
    writeClipboard: async () => true,
  }
})
import type { Context } from '@deepseek-ai/cordis'
import { apply, inject, LIVERY_SETTINGS_ORDER } from '../../src/client/index.js'
import {
  PANEL_NAVIGATION_GRACE_MS,
  PANEL_ROW_ORDER,
} from '../../src/client/navigation.js'

interface RegistrationRecord {
  readonly options: Record<string, unknown>
  readonly component: unknown
  active: boolean
}

interface FakeContext {
  readonly ctx: Context
  readonly registrations: RegistrationRecord[]
  readonly injections: string[]
  readonly disposedInjections: string[]
  readonly localeDictionaries: Array<[string, readonly string[]]>
  /** Inject keys whose declaration callback is still waiting. */
  pendingKeys(): string[]
  /** Fire the deferred slot declaration, running its inject callback. */
  declare(key: string): void
  /** Emulate plugin unload: run every registered effect cleanup, newest first. */
  disposeAll(): void
}

/** Options for {@link createContext}. */
interface ContextOptions {
  /** Slot keys whose `inject` callbacks stay pending until `declare(key)`. */
  readonly deferredInject?: readonly string[]
  /** `inject(key, …)` with this key throws (simulated slot-API drift). */
  readonly failInjectFor?: string
  /** `register({name: …})` with this name throws (simulated registration fault). */
  readonly failRegisterFor?: string
}

/**
 * Build a fake client context mirroring the shipped slots service surface.
 * @param options - deferred declarations and injected faults.
 * @returns the fake context plus helpers.
 */
function createContext(options: ContextOptions = {}): FakeContext {
  const registrations: RegistrationRecord[] = []
  const injections: string[] = []
  const disposedInjections: string[] = []
  const effects: Array<() => void> = []
  const localeDictionaries: Array<[string, readonly string[]]> = []
  const pendingCallbacks = new Map<string, () => (() => void) | undefined>()
  const deferred = new Set(options.deferredInject ?? [])

  const recordRegistration = (registrationOptions: Record<string, unknown>, component: unknown): (() => void) => {
    const name = registrationOptions.name as string
    if (options.failRegisterFor === name) throw new Error(`registration refused: ${name}`)
    const record: RegistrationRecord = { options: registrationOptions, component, active: true }
    registrations.push(record)
    return () => {
      record.active = false
    }
  }

  const runInject = (key: string, callback: () => (() => void) | undefined): (() => void) => {
    injections.push(key)
    const disposeRegistration = callback()
    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      disposedInjections.push(key)
      disposeRegistration?.()
    }
  }

  const ctx = {
    locale: {
      bind: () => (key: string) => key,
      register: (namespace: string, dictionaries: Record<string, unknown>) => {
        localeDictionaries.push([namespace, Object.keys(dictionaries)])
        return () => undefined
      },
      getLocale: () => ({ active: 'en' }),
      subscribe: () => () => undefined,
    },
    slots: {
      inject: (key: string, callback: () => (() => void) | undefined) => {
        if (options.failInjectFor === key) throw new Error(`inject refused: ${key}`)
        if (deferred.has(key) && !pendingCallbacks.has(key)) {
          pendingCallbacks.set(key, callback)
          let disposed = false
          return () => {
            if (disposed) return
            disposed = true
            pendingCallbacks.delete(key)
            disposedInjections.push(key)
          }
        }
        deferred.delete(key)
        return runInject(key, callback)
      },
      register: recordRegistration,
    },
    configForms: {
      get: () => ({
        getSnapshot: () => ({ status: 'ready', value: { skinId: 'stock' }, revision: 1, writable: true, mode: 'host' }),
        subscribe: () => () => undefined,
        set: async () => true,
      }),
    },
    get: () => undefined,
    on: () => () => undefined,
    effect: (body: () => unknown) => {
      const inner = body()
      const cleanup = typeof inner === 'function' ? (inner as () => void) : () => undefined
      effects.push(cleanup)
      return () => { cleanup() }
    },
  } as unknown as Context

  return {
    ctx,
    registrations,
    injections,
    disposedInjections,
    localeDictionaries,
    pendingKeys: () => [...pendingCallbacks.keys()],
    declare: (key: string) => {
      const callback = pendingCallbacks.get(key)
      if (callback === undefined) throw new Error(`no pending inject for ${key}`)
      pendingCallbacks.delete(key)
      deferred.delete(key)
      runInject(key, callback)
    },
    disposeAll: () => {
      for (const cleanup of [...effects].reverse()) {
        try {
          cleanup()
        } catch {
          /* unload keeps tearing down */
        }
      }
    },
  }
}

/** Active (not-yet-disposed) registrations by slot name. */
function activeNames(fake: FakeContext): string[] {
  return fake.registrations.filter(entry => entry.active).map(entry => entry.options.name as string)
}

/** Active registrations of one slot name. */
function active(fake: FakeContext, name: string): RegistrationRecord[] {
  return fake.registrations.filter(entry => entry.active && entry.options.name === name)
}

// The runtime's one catalog fetch must not reach the network in unit tests.
vi.stubGlobal('fetch', async () => ({ ok: false }))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('client entry contributions', () => {
  it('exposes the documented Cordis service dependencies and constants', () => {
    expect(inject).toEqual(['configForms', 'slots', 'locale', 'theme'])
    expect(LIVERY_SETTINGS_ORDER).toBe(25)
    expect(PANEL_ROW_ORDER).toBe(30)
    expect(PANEL_NAVIGATION_GRACE_MS).toBe(1500)
  })

  it('registers the locale dictionaries', () => {
    const fake = createContext()
    apply(fake.ctx)
    expect(fake.localeDictionaries).toHaveLength(1)
    expect(fake.localeDictionaries[0]?.[0]).toBe('dsh-livery')
    expect(fake.localeDictionaries[0]?.[1]).toEqual(['zh', 'en'])
  })

  it('installs both nav contributions when the shell slots are already live', () => {
    const fake = createContext()
    apply(fake.ctx)

    expect(activeNames(fake)).toEqual(expect.arrayContaining(['sidebar.panellist', 'main']))
    expect(activeNames(fake)).not.toContain('settings.section')
    expect(fake.injections).toEqual(expect.arrayContaining(['main', 'sidebar.panellist']))

    const row = active(fake, 'sidebar.panellist')[0]
    expect(row?.options).toMatchObject({
      name: 'sidebar.panellist',
      id: 'livery',
      order: 30,
      locale: 'dsh-livery',
    })
    expect((row?.options.label as () => string)()).toBe('panel.label')
    const main = active(fake, 'main')[0]
    expect(main?.options).toMatchObject({ name: 'main', key: 'livery', locale: 'dsh-livery' })
    expect(typeof main?.component).toBe('function')
    expect(row?.component).not.toBe(main?.component)

    // Grace timer must not add a settings page for a live nav conversation.
    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS * 2)
    expect(activeNames(fake)).not.toContain('settings.section')
  })

  it('waits for late slot declarations (activation order) without a fallback', () => {
    const fake = createContext({ deferredInject: ['main', 'sidebar.panellist'] })
    apply(fake.ctx)

    expect(fake.pendingKeys()).toEqual(expect.arrayContaining(['main', 'sidebar.panellist']))
    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS - 1)
    expect(activeNames(fake)).toEqual([])

    fake.declare('main')
    fake.declare('sidebar.panellist')
    expect(activeNames(fake)).toEqual(expect.arrayContaining(['main', 'sidebar.panellist']))
    expect(active(fake, 'sidebar.panellist')).toHaveLength(1)
    expect(active(fake, 'main')).toHaveLength(1)

    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS * 2)
    expect(activeNames(fake)).not.toContain('settings.section')
  })

  it('installs the settings fallback after the grace period when no row declares', () => {
    const fake = createContext({ deferredInject: ['main', 'sidebar.panellist'] })
    apply(fake.ctx)

    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS - 1)
    expect(activeNames(fake)).toEqual([])
    vi.advanceTimersByTime(1)
    expect(active(fake, 'settings.section')).toHaveLength(1)
    expect(activeNames(fake)).not.toContain('sidebar.panellist')
    expect(activeNames(fake)).not.toContain('main')

    const label = active(fake, 'settings.section')[0]?.options
    expect(label).toMatchObject({
      name: 'settings.section',
      id: 'livery',
      order: 25,
      locale: 'dsh-livery',
    })
    expect((label?.label as () => string)()).toBe('section.label')

    // Exactly one entry forever after; the timer never re-fires.
    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS * 5)
    expect(active(fake, 'settings.section')).toHaveLength(1)
  })

  it('replaces a grace-installed fallback when the row declares late (exactly one entry)', () => {
    const fake = createContext({ deferredInject: ['main', 'sidebar.panellist'] })
    apply(fake.ctx)

    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS + 1)
    expect(active(fake, 'settings.section')).toHaveLength(1)

    fake.declare('sidebar.panellist')
    expect(active(fake, 'settings.section')).toHaveLength(0)
    expect(active(fake, 'sidebar.panellist')).toHaveLength(1)
    expect(fake.disposedInjections).toContain('settings.section')

    fake.declare('main')
    expect(active(fake, 'main')).toHaveLength(1)

    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS * 3)
    expect(active(fake, 'settings.section')).toHaveLength(0)
    expect(active(fake, 'sidebar.panellist')).toHaveLength(1)
  })

  it('falls back to Settings when nav registration throws (no activation failure)', () => {
    const fake = createContext({ failRegisterFor: 'main' })
    expect(() => apply(fake.ctx)).not.toThrow()

    expect(active(fake, 'settings.section')).toHaveLength(1)
    expect(activeNames(fake)).not.toContain('main')
    expect(activeNames(fake)).not.toContain('sidebar.panellist')
    // The nav attempt never leaves a partially-active entry behind.
    expect(fake.injections).toContain('main')
  })

  it('falls back to Settings when inject setup itself throws', () => {
    const fake = createContext({ failInjectFor: 'main' })
    expect(() => apply(fake.ctx)).not.toThrow()
    expect(active(fake, 'settings.section')).toHaveLength(1)
    expect(activeNames(fake)).not.toContain('sidebar.panellist')
  })

  it('clears the grace timer and any fallback on plugin unload', () => {
    const fake = createContext({ deferredInject: ['main', 'sidebar.panellist'] })
    apply(fake.ctx)
    fake.disposeAll()
    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS * 3)
    expect(active(fake, 'settings.section')).toHaveLength(0)

    const late = createContext({ deferredInject: ['main', 'sidebar.panellist'] })
    apply(late.ctx)
    vi.advanceTimersByTime(PANEL_NAVIGATION_GRACE_MS + 1)
    expect(active(late, 'settings.section')).toHaveLength(1)
    late.disposeAll()
    expect(active(late, 'settings.section')).toHaveLength(0)
  })
})
