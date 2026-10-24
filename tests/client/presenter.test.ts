import { describe, expect, it } from 'vitest'
import { CLIENT_CSS_FILE, createPresenter } from '../../src/client/presenter.js'
import type { SkinCss } from '../../src/client/presenter.js'
import { FakeDocument } from './fixtures.js'

const FJORD: SkinCss = { id: 'fjord', cssText: 'body[data-dsh-livery="fjord"]{color:red}', hash: 'sha256:fjord' }
const MIDNIGHT: SkinCss = { id: 'midnight', cssText: 'body[data-dsh-livery="midnight"]{color:blue}', hash: 'sha256:midnight' }

function setup(): { doc: FakeDocument; presenter: ReturnType<typeof createPresenter> } {
  const doc = new FakeDocument()
  return { doc, presenter: createPresenter(doc.asDocument()) }
}

describe('presenter without a document', () => {
  it('is a safe no-op (no throw, no writes)', () => {
    const presenter = createPresenter(undefined)
    expect(() => {
      presenter.installClientCss('x')
      presenter.adoptBootStyle(FJORD)
      presenter.applyConfirmed(FJORD)
      presenter.applyPreview(MIDNIGHT)
      presenter.rollbackPreview(FJORD)
      presenter.clearSkin()
      presenter.removeBootArtifacts()
      presenter.dispose()
    }).not.toThrow()
    expect(presenter.snapshot().cssTextWrites).toBe(0)
  })
})

describe('client stylesheet lifecycle', () => {
  it('mounts one owned style tag and removes it on dispose', () => {
    const { doc, presenter } = setup()
    const dispose = presenter.installClientCss('body{}')
    const style = doc.head.walk().find(element => element.dataset.pluginCss === CLIENT_CSS_FILE)
    expect(style).toBeDefined()
    expect(style?.dataset.plugin).toBe('dsh-livery')
    expect(style?.textContent).toBe('body{}')
    dispose()
    expect(doc.head.walk().some(element => element.dataset.pluginCss === CLIENT_CSS_FILE)).toBe(false)
  })

  it('does not duplicate or remove a tag it did not create', () => {
    const { doc, presenter } = setup()
    const disposeA = presenter.installClientCss('a{}')
    const disposeB = presenter.installClientCss('b{}')
    const tags = doc.head.walk().filter(element => element.dataset.pluginCss === CLIENT_CSS_FILE)
    expect(tags).toHaveLength(1)
    expect(tags[0]?.textContent).toBe('a{}')
    disposeB()
    expect(doc.head.walk().filter(element => element.dataset.pluginCss === CLIENT_CSS_FILE)).toHaveLength(1)
    disposeA()
    expect(doc.head.walk().filter(element => element.dataset.pluginCss === CLIENT_CSS_FILE)).toHaveLength(0)
  })
})

describe('confirmed presentation', () => {
  it('creates one owned token style and writes its text once', () => {
    const { doc, presenter } = setup()
    presenter.applyConfirmed(FJORD)
    const token = doc.getElementById('dsh-livery-tokens')
    expect(token?.textContent).toBe(FJORD.cssText)
    expect(token?.dataset.plugin).toBe('dsh-livery')
    expect(doc.body.getAttribute('data-dsh-livery')).toBe('fjord')
    expect(doc.body.getAttribute('data-dsh-livery-hash')).toBe(FJORD.hash)
    expect(presenter.snapshot().cssTextWrites).toBe(1)
  })

  it('rewrites the text only when the css actually changed (one write per batch)', () => {
    const { doc, presenter } = setup()
    presenter.applyConfirmed(FJORD)
    presenter.applyConfirmed(FJORD)
    expect(presenter.snapshot().cssTextWrites).toBe(1)
    presenter.applyConfirmed(MIDNIGHT)
    expect(presenter.snapshot().cssTextWrites).toBe(2)
    expect(doc.getElementById('dsh-livery-tokens')?.textContent).toBe(MIDNIGHT.cssText)
  })

  it('removes a stale host boot style instead of keeping a second scope', () => {
    const { doc, presenter } = setup()
    const boot = doc.createElement('style')
    boot.id = 'dsh-livery-boot'
    boot.textContent = 'host{}'
    doc.head.appendChild(boot)
    presenter.applyConfirmed(FJORD)
    expect(doc.getElementById('dsh-livery-boot')).toBeNull()
  })

  it('leaves host data-ds-* attributes untouched', () => {
    const { doc, presenter } = setup()
    doc.body.setAttribute('data-ds-dark-theme', '')
    doc.body.setAttribute('data-ds-theme-source', 'system')
    presenter.applyConfirmed(FJORD)
    presenter.clearSkin()
    expect(doc.body.getAttribute('data-ds-dark-theme')).toBe('')
    expect(doc.body.getAttribute('data-ds-theme-source')).toBe('system')
    expect(doc.body.getAttribute('data-dsh-livery')).toBeNull()
  })
})

describe('host boot style adoption', () => {
  it('renames the boot element without rewriting its CSS text', () => {
    const { doc, presenter } = setup()
    const boot = doc.createElement('style')
    boot.id = 'dsh-livery-boot'
    boot.textContent = FJORD.cssText
    doc.head.appendChild(boot)
    doc.body.setAttribute('data-dsh-livery', 'fjord')
    doc.body.setAttribute('data-dsh-livery-hash', FJORD.hash)

    const adopted = presenter.adoptBootStyle(FJORD)

    expect(adopted).toBe(true)
    expect(presenter.snapshot().cssTextWrites).toBe(0)
    expect(presenter.snapshot().adoptedBootStyle).toBe(true)
    expect(doc.getElementById('dsh-livery-boot')).toBeNull()
    const token = doc.getElementById('dsh-livery-tokens')
    expect(token?.textContent).toBe(FJORD.cssText)
    expect(token?.dataset.plugin).toBe('dsh-livery')
    expect(doc.body.getAttribute('data-dsh-livery')).toBe('fjord')
  })

  it('reports false when the host element is missing (caller falls back to one batch)', () => {
    const { presenter } = setup()
    expect(presenter.adoptBootStyle(FJORD)).toBe(false)
  })
})

describe('transient preview', () => {
  it('appends the preview style after the token style and moves the body attribute', () => {
    const { doc, presenter } = setup()
    presenter.applyConfirmed(FJORD)
    presenter.applyPreview(MIDNIGHT)
    const token = doc.getElementById('dsh-livery-tokens')
    const preview = doc.getElementById('dsh-livery-preview')
    expect(preview?.textContent).toBe(MIDNIGHT.cssText)
    expect(token?.textContent).toBe(FJORD.cssText)
    expect(doc.head.children.indexOf(preview!)).toBe(doc.head.children.indexOf(token!) + 1)
    expect(doc.body.getAttribute('data-dsh-livery')).toBe('midnight')
    expect(doc.body.getAttribute('data-dsh-livery-hash')).toBe(MIDNIGHT.hash)
  })

  it('rolls back to the confirmed skin', () => {
    const { doc, presenter } = setup()
    presenter.applyConfirmed(FJORD)
    presenter.applyPreview(MIDNIGHT)
    presenter.rollbackPreview(FJORD)
    expect(doc.getElementById('dsh-livery-preview')).toBeNull()
    expect(doc.getElementById('dsh-livery-tokens')?.textContent).toBe(FJORD.cssText)
    expect(doc.body.getAttribute('data-dsh-livery')).toBe('fjord')
    expect(doc.body.getAttribute('data-dsh-livery-hash')).toBe(FJORD.hash)
  })

  it('previews stock by removing the owned attribute and the preview sheet', () => {
    const { doc, presenter } = setup()
    presenter.applyConfirmed(FJORD)
    presenter.applyPreview({ id: 'stock', cssText: '', hash: '' })
    expect(doc.getElementById('dsh-livery-preview')).toBeNull()
    expect(doc.body.getAttribute('data-dsh-livery')).toBeNull()
    expect(doc.body.getAttribute('data-dsh-livery-hash')).toBeNull()
  })
})

describe('cleanup', () => {
  it('clearSkin removes every owned style and attribute', () => {
    const { doc, presenter } = setup()
    presenter.applyConfirmed(FJORD)
    presenter.applyPreview(MIDNIGHT)
    presenter.clearSkin()
    expect(doc.head.walk().filter(element => element.dataset.plugin === 'dsh-livery')).toHaveLength(0)
    expect(doc.body.getAttribute('data-dsh-livery')).toBeNull()
    expect(doc.body.getAttribute('data-dsh-livery-hash')).toBeNull()
  })

  it('dispose leaves no residue after an adopted boot style', () => {
    const { doc, presenter } = setup()
    const boot = doc.createElement('style')
    boot.id = 'dsh-livery-boot'
    doc.head.appendChild(boot)
    presenter.adoptBootStyle(FJORD)
    presenter.dispose()
    expect(doc.head.walk().filter(element => element.dataset.plugin === 'dsh-livery')).toHaveLength(0)
    expect(doc.body.getAttribute('data-dsh-livery')).toBeNull()
  })

  it('fail-closed cleanup removes only the identifiable boot artifacts', () => {
    const { doc, presenter } = setup()
    const boot = doc.createElement('style')
    boot.id = 'dsh-livery-boot'
    doc.head.appendChild(boot)
    const foreign = doc.createElement('style')
    foreign.id = 'another-plugin'
    doc.head.appendChild(foreign)
    doc.body.setAttribute('data-dsh-livery', 'fjord')
    doc.body.setAttribute('data-dsh-livery-hash', 'sha256:fjord')
    presenter.removeBootArtifacts()
    expect(doc.getElementById('dsh-livery-boot')).toBeNull()
    expect(doc.getElementById('another-plugin')).not.toBeNull()
    expect(doc.body.getAttribute('data-dsh-livery')).toBeNull()
  })
})
