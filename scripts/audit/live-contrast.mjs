#!/usr/bin/env node
/**
 * Live computed-style contrast scan for a running DSH Web/Desktop carrier.
 *
 * Static token-pair checks cannot see colors produced by `color-mix()`,
 * inherited backgrounds or host component nesting. This scan walks visible
 * text nodes on the conversation, Livery style/wallpaper and Plugins pages and
 * fails when text contrast falls below WCAG AA (4.5 normal, 3 large).
 *
 * Usage:
 *   node scripts/audit/live-contrast.mjs --url "http://127.0.0.1:PORT/?token=..."
 *     [--chrome-binary <Chrome-for-Testing>] [--json <path>]
 *
 * The caller owns the DSH_HOME and the server; this script is a read-only probe.
 */
import { chromium } from 'playwright-core'
import { writeFile } from 'node:fs/promises'

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const next = argv[index + 1]
    if (next !== undefined && !next.startsWith('--')) {
      options[name] = next
      index += 1
    } else {
      options[name] = true
    }
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
if (typeof options.url !== 'string' || options.url.length === 0) {
  console.error('usage: node scripts/audit/live-contrast.mjs --url <running-dsh-url> [--chrome-binary <path>] [--json <path>]')
  process.exit(2)
}

const browser = await chromium.launch({
  executablePath: typeof options['chrome-binary'] === 'string' ? options['chrome-binary'] : undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await (await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 1000 } })).newPage()
const results = []

async function scan(label) {
  await page.waitForTimeout(500)
  const rows = await page.evaluate(() => {
    function parse(value) {
      const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value)
      if (!match) return null
      return { r: +match[1], g: +match[2], b: +match[3], a: match[4] === undefined ? 1 : +match[4] }
    }
    function composite(fg, bg) {
      return {
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
        a: 1,
      }
    }
    function linear(value) {
      const next = value / 255
      return next <= 0.04045 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4
    }
    function luminance(color) {
      return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b)
    }
    function ratio(a, b) {
      const left = luminance(a)
      const right = luminance(b)
      return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05)
    }
    function backgroundOf(element) {
      let node = element
      let accumulated = null
      for (let depth = 0; node && depth < 24; depth += 1, node = node.parentElement) {
        const color = parse(getComputedStyle(node).backgroundColor)
        if (!color || color.a <= 0.01) continue
        accumulated = accumulated === null ? color : composite(accumulated, color)
        if (accumulated.a >= 0.99) return accumulated
      }
      return accumulated ?? parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 }
    }
    const failures = []
    for (const element of document.querySelectorAll('*')) {
      if (element.children.length > 0) continue
      const text = (element.textContent ?? '').trim()
      if (text.length === 0) continue
      const rect = element.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue
      const foreground = parse(style.color)
      if (!foreground) continue
      const background = backgroundOf(element)
      const foregroundComposited = composite(foreground, background)
      const contrast = ratio(foregroundComposited, background)
      const font = parseFloat(style.fontSize)
      const large = font >= 24 || (font >= 18.66 && Number(style.fontWeight) >= 700)
      const minimum = large ? 3 : 4.5
      if (contrast < minimum) {
        failures.push({
          text: text.slice(0, 80),
          ratio: +contrast.toFixed(2),
          minimum,
          color: style.color,
          fontSize: font,
          className: String(element.className ?? '').slice(0, 100),
          tag: element.tagName,
        })
      }
    }
    failures.sort((left, right) => left.ratio - right.ratio)
    return failures.slice(0, 40)
  })
  results.push({ label, failures: rows })
}

try {
  await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForSelector('[data-slot="sidebar"]', { timeout: 120_000 })
  await page.waitForTimeout(1_500)
  await scan('conversation')

  const livery = page.locator('[data-slot="sidebar"] nav button[aria-label="视觉风格"]').first()
  if (await livery.count()) {
    await livery.click({ timeout: 10_000 }).catch(() => {})
    await page.waitForSelector('[data-testid="livery-page-tabs"]', { timeout: 15_000 }).catch(() => {})
    await scan('livery-style')
    const wallpaper = page.locator('[data-testid="livery-page-tab-wallpaper"]').first()
    if (await wallpaper.count()) {
      await wallpaper.click({ timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(1_000)
      await scan('livery-wallpaper')
    }
  }

  const plugins = page.locator('[data-slot="sidebar"] nav button[aria-label="插件"]').first()
  if (await plugins.count()) {
    await plugins.click({ timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(800)
    await scan('plugins')
  }
} finally {
  await browser.close()
}

const failed = results.reduce((total, result) => total + result.failures.length, 0)
const report = { url: options.url, scannedAt: new Date().toISOString(), results, failed }
if (typeof options.json === 'string') await writeFile(options.json, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
process.exit(failed > 0 ? 1 : 0)
