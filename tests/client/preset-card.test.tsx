/**
 * Preset card server-render tests: static structure, the stable error region +
 * ARIA wiring, diff-preview rendering and complete i18n key coverage.
 *
 * The card is standalone (the wallpaper panel integration comes later), so the
 * runtime/controller ports are injected fakes here.
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

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
import {
  PRESET_DIFF_ID,
  PRESET_ERROR_ID,
  PRESET_FILE_INPUT_ID,
  PresetCard,
  presetErrorKey,
} from '../../src/client/ui/PresetCard.js'
import type { PresetCardError, PresetCardProps } from '../../src/client/ui/PresetCard.js'
import { BUILTIN_WALLPAPER_IDS, DEFAULT_WALLPAPER_EFFECTS, WALLPAPER_POSITION_OPTIONS } from '../../src/client/wallpaper.js'
import { createdWithOf } from '../../src/client/wallpaper/preset.js'
import type { LiveryPreset, PresetProblem } from '../../src/client/wallpaper/preset.js'
import { enUS, zhCN } from '../../src/i18n/index.js'
import type { LiveryKey } from '../../src/i18n/index.js'

type Dict = Record<string, string>
type Translate = (key: string, params?: Record<string, unknown>) => string

function translate(dict: Dict): Translate {
  return (key: string, params?: Record<string, unknown>): string => {
    const template = dict[key]
    if (template === undefined) return `!${key}`
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? `{${name}}`))
  }
}

function makePreset(patch: Partial<LiveryPreset> = {}): LiveryPreset {
  return {
    schemaVersion: 1,
    createdWith: createdWithOf('0.1.3'),
    styleId: 'midnight',
    wallpaper: { kind: 'builtin', id: 'aurora' },
    effects: { ...DEFAULT_WALLPAPER_EFFECTS, blur: 2 },
    position: { x: 100, y: 0 },
    ...patch,
  }
}

const BASE_PROPS: PresetCardProps = {
  t: translate(enUS),
  currentStyleId: 'fjord',
  currentWallpaper: {
    selection: { kind: 'builtin', id: 'aurora' },
    effects: { ...DEFAULT_WALLPAPER_EFFECTS },
    position: { x: 50, y: 50 },
  },
  catalogIds: ['fjord', 'midnight'],
  pluginVersion: '0.1.3',
  applyStyle: async () => ({ ok: true }),
  applyWallpaper: () => true,
  styleLabel: id => `Style ${id}`,
  writeClipboard: async () => true,
}

function render(patch: Partial<PresetCardProps> = {}, locale: 'en' | 'zh' = 'en'): string {
  const props: PresetCardProps = {
    ...BASE_PROPS,
    t: translate(locale === 'zh' ? zhCN : enUS),
    ...patch,
  }
  return renderToStaticMarkup(<PresetCard {...props} />)
}

/** Assert the stable error region and full ARIA wiring for one control. */
function expectErrorWiring(markup: string, testId: string, error: PresetCardError): void {
  expect(markup).toContain('data-testid="preset-error"')
  expect(markup).toContain(`id="${PRESET_ERROR_ID}"`)
  expect(markup).toContain('role="alert"')
  const button = markup.split('<button').find(chunk => chunk.includes(`data-testid="${testId}"`))
  expect(button, `button ${testId} should render`).toBeDefined()
  if (button === undefined) return
  expect(button).toContain('aria-invalid="true"')
  expect(button).toContain(`aria-describedby="${PRESET_ERROR_ID}`)
  expect(button).toContain(`aria-errormessage="${PRESET_ERROR_ID}"`)
  expect(markup).not.toContain('!preset.')
  expect(presetErrorKey(error).length).toBeGreaterThan(0)
}

describe('preset card — static structure', () => {
  it('renders the export/import controls with the agreed testids', () => {
    const markup = render()
    expect(markup).toContain('data-testid="preset-card"')
    expect(markup).toContain('data-testid="preset-export"')
    expect(markup).toContain('data-testid="preset-import"')
    expect(markup).toContain('data-testid="preset-import-file"')
    expect(markup).toContain(`id="${PRESET_FILE_INPUT_ID}"`)
    // The visually hidden native file input never joins the tab order.
    const input = markup.split('<input').find(chunk => chunk.includes('data-testid="preset-import-file"'))
    expect(input).toBeDefined()
    expect(input).toContain('tabindex="-1"')
    expect(input).toContain('type="file"')
    expect(input).toContain('accept=".json,application/json"')
    expect(input).toContain('wallpaper-file-input')
  })

  it('renders no diff or error before a file is loaded', () => {
    const markup = render()
    expect(markup).not.toContain('data-testid="preset-diff"')
    expect(markup).not.toContain('data-testid="preset-error"')
    expect(markup).not.toContain('data-testid="preset-apply"')
    expect(markup).not.toContain('aria-invalid="true"')
  })

  it('renders the import size limit hint', () => {
    expect(render()).toContain(`up to 64 KB`)
    expect(render({}, 'zh')).toContain('最大 64 KB')
  })
})

describe('preset card — import diff preview', () => {
  it('renders the diff region with the apply/cancel confirm controls', () => {
    const markup = render({ initialPreset: makePreset() })
    expect(markup).toContain('data-testid="preset-diff"')
    expect(markup).toContain(`id="${PRESET_DIFF_ID}"`)
    expect(markup).toContain('role="region"')
    expect(markup).toContain('data-testid="preset-apply"')
    expect(markup).toContain('data-testid="preset-cancel"')
    expect(markup).toContain('data-testid="preset-import-status"')
    expect(markup).toContain('dsh-livery/0.1.3')
    // Apply is described by the diff region until an error appears.
    const apply = markup.split('<button').find(chunk => chunk.includes('data-testid="preset-apply"'))
    expect(apply).toContain(`aria-describedby="${PRESET_DIFF_ID}"`)
  })

  it('lists every changed field in the stable order with readable values', () => {
    const markup = render({ initialPreset: makePreset() })
    expect(markup.split('data-testid="preset-diff-row"')).toHaveLength(4)
    expect(markup).toContain('data-field="style"')
    expect(markup).toContain('data-field="effects"')
    expect(markup).toContain('data-field="position"')
    expect(markup).not.toContain('data-field="wallpaper"')
    expect(markup).toContain('Style fjord')
    expect(markup).toContain('Style midnight')
    // Position 100/0 is the top-right cell; effects show all four numbers.
    expect(markup).toContain('Top right')
    expect(markup).toContain('Blur 2 px')
    expect(markup).toContain('→')
    expect(markup).not.toContain('!preset.')
  })

  it('renders the matching-setup copy when nothing would change', () => {
    const current = makePreset({
      styleId: 'fjord',
      wallpaper: { kind: 'builtin', id: 'aurora' },
      effects: { ...DEFAULT_WALLPAPER_EFFECTS },
      position: { x: 50, y: 50 },
    })
    const markup = render({ initialPreset: current })
    expect(markup).toContain('This preset already matches the current setup.')
    expect(markup).not.toContain('data-testid="preset-diff-row"')
  })

  it('renders a remote wallpaper hostname and the credit change', () => {
    const markup = render({
      currentAttribution: { title: 'Dunes' },
      initialPreset: makePreset({
        styleId: 'fjord',
        wallpaper: { kind: 'remote', url: 'https://images.example.com/city.webp' },
        effects: { ...DEFAULT_WALLPAPER_EFFECTS },
        position: { x: 50, y: 50 },
      }),
    })
    expect(markup).toContain('data-field="wallpaper"')
    expect(markup).toContain('images.example.com')
    expect(markup).toContain('data-field="attribution"')
    expect(markup).toContain('No credit')
  })

  it('localizes the diff in Chinese', () => {
    const markup = render({ initialPreset: makePreset() }, 'zh')
    expect(markup).toContain('此预设的改动')
    expect(markup).toContain('视觉风格')
    expect(markup).toContain('应用预设')
    expect(markup).not.toContain('!preset.')
  })
})

describe('preset card — stable error region and ARIA', () => {
  it('wires an import error to the import control', () => {
    const error: PresetCardError = { kind: 'import', code: 'too-large', detail: 'size' }
    const markup = render({ initialError: error })
    expectErrorWiring(markup, 'preset-import', error)
    expect(markup).toContain('data-error-kind="import"')
    expect(markup).toContain('data-error-code="too-large"')
    expect(markup).toContain('64 KB')
    expect(markup).toContain('data-testid="preset-dismiss"')
    expect(markup).not.toContain('data-testid="preset-diff"')
  })

  it('names the offending field for unknown-field errors', () => {
    const markup = render({ initialError: { kind: 'import', code: 'unknown-field', detail: 'css' } })
    expect(markup).toContain('(css)')
  })

  it('wires an export error to the export control', () => {
    const error: PresetCardError = { kind: 'export', code: 'upload' }
    const markup = render({ initialError: error })
    expectErrorWiring(markup, 'preset-export', error)
    expect(markup).toContain('Uploaded images stay on this device')
  })

  it('wires a copy failure to the export control', () => {
    const error: PresetCardError = { kind: 'copy', code: 'clipboard' }
    const markup = render({ initialError: error })
    expectErrorWiring(markup, 'preset-export', error)
    expect(markup).toContain('Could not copy to the clipboard')
  })

  it('wires a partial-apply failure to the apply control and offers wallpaper retry', () => {
    const error: PresetCardError = { kind: 'apply', code: 'wallpaper' }
    const markup = render({ initialPreset: makePreset(), initialError: error })
    expectErrorWiring(markup, 'preset-apply', error)
    expect(markup).toContain('data-testid="preset-retry-wallpaper"')
    expect(markup).toContain('data-testid="preset-dismiss"')
    // The apply button is described by both the diff region and the error.
    const apply = markup.split('<button').find(chunk => chunk.includes('data-testid="preset-apply"'))
    expect(apply).toContain(`aria-describedby="${PRESET_ERROR_ID} ${PRESET_DIFF_ID}"`)
    expect(markup).toContain('visual style was applied, but the wallpaper could not be changed')
  })

  it('offers a full retry for a style-apply failure', () => {
    const error: PresetCardError = { kind: 'apply', code: 'refused' }
    const markup = render({ initialPreset: makePreset(), initialError: error })
    expectErrorWiring(markup, 'preset-apply', error)
    expect(markup).toContain('data-testid="preset-retry"')
    expect(markup).toContain('The host refused the visual style change')
  })

  it('localizes errors in Chinese', () => {
    const markup = render({ initialError: { kind: 'import', code: 'invalid-json' } }, 'zh')
    expect(markup).toContain('文件不是有效的 JSON')
    expect(markup).not.toContain('!preset.')
  })

  it('keeps error messages free of raw field names in the visible headline', () => {
    const markup = render({ initialError: { kind: 'import', code: 'unknown-field', detail: 'css' } })
    // The detail is a parenthetical technical hint, not a raw payload dump.
    expect(markup).toContain('unsupported field')
  })
})

describe('preset card — i18n key coverage', () => {
  const importProblems: readonly PresetProblem[] = [
    'unreadable', 'too-large', 'invalid-json', 'not-object', 'schema-version',
    'created-with', 'unknown-field', 'style-id', 'unknown-style',
    'catalog-unavailable', 'wallpaper-kind', 'wallpaper-id', 'wallpaper-url',
    'effects', 'position', 'attribution', 'forbidden-content',
  ]
  const exportProblems = ['upload', 'invalid-url', 'invalid-wallpaper', 'invalid-style', 'invalid-version'] as const
  const applyProblems = ['refused', 'transport', 'unknown', 'unavailable', 'busy', 'wallpaper'] as const

  function expectKey(key: LiveryKey): void {
    expect(enUS[key], `enUS missing ${key}`).toBeTypeOf('string')
    expect(zhCN[key], `zhCN missing ${key}`).toBeTypeOf('string')
  }

  it('maps every import problem to a declared dictionary key', () => {
    for (const code of importProblems) expectKey(presetErrorKey({ kind: 'import', code }))
  })

  it('maps every export problem to a declared dictionary key', () => {
    for (const code of exportProblems) expectKey(presetErrorKey({ kind: 'export', code }))
  })

  it('maps every apply problem to a declared dictionary key', () => {
    for (const code of applyProblems) expectKey(presetErrorKey({ kind: 'apply', code }))
    expectKey(presetErrorKey({ kind: 'copy', code: 'clipboard' }))
    expectKey(presetErrorKey({ kind: 'download', code: 'unavailable' }))
  })

  it('maps unknown codes to the generic error copy', () => {
    expect(presetErrorKey({ kind: 'import', code: 'something-new' })).toBe('preset.error.generic')
    expect(presetErrorKey({ kind: 'export', code: 'something-new' })).toBe('preset.error.generic')
    expect(presetErrorKey({ kind: 'apply', code: 'something-new' })).toBe('preset.error.generic')
  })

  it('declares a localized label for every built-in wallpaper and every grid cell', () => {
    for (const id of BUILTIN_WALLPAPER_IDS) expectKey(`wallpaper.builtin.${id}` as LiveryKey)
    for (const option of WALLPAPER_POSITION_OPTIONS) {
      // Labels are keyed by camelCase option id (shared with the wallpaper panel).
      expect(option.id.length).toBeGreaterThan(0)
    }
    expect(enUS['wallpaper.position.topLeft']).toBe('Top left')
    expect(zhCN['wallpaper.position.bottomRight']).toBe('右下')
  })

  it('never renders a raw placeholder key in the rendered UI', () => {
    for (const styleId of ['fjord', 'midnight']) {
      const markup = render({
        currentStyleId: styleId,
        initialPreset: makePreset({ styleId: styleId === 'fjord' ? 'midnight' : 'fjord' }),
      })
      expect(markup).not.toContain('!preset.')
      expect(markup).not.toContain('!wallpaper.')
    }
  })
})
