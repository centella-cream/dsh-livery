#!/usr/bin/env node
// Web-profile acceptance probe for dsh-livery.
// Drives the *already running* web profile with system Chrome (no browser download).
//
//   PLAYWRIGHT_BROWSERS_PATH=$PWD/research/profile-probe/.pw-browsers \
//   node research/profile-probe/probe-web.mjs \
//     --token-url "http://127.0.0.1:3081/?token=..." \
//     --out research/profile-probe/.run --expect-plugin dsh-livery
//
// The token URL is the `dsh web:` line printed once at boot (strip the " (LAN: ...)" suffix).
// Exit 0 = token exchange worked, page booted, expected plugin row present, no console errors.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PW_CORE = process.env.PW_CORE
  ?? '/Users/ryanzhang/.npm/_npx/dd6c45a6a1785775/node_modules/playwright-core/index.mjs';
const { chromium } = await import(PW_CORE);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const tokenUrl = arg('token-url') ?? arg('url');
const outDir = arg('out', 'research/profile-probe/.run');
const expectPlugin = arg('expect-plugin', 'dsh-livery');
const theme = arg('theme', 'light'); // light | dark (emulateMedia, only affects preference=system)
if (!tokenUrl) {
  console.error('usage: probe-web.mjs --token-url <printed URL> [--out DIR] [--expect-plugin NAME] [--theme light|dark]');
  process.exit(2);
}

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const httpErrors = [];
const result = {
  tokenUrl,
  baseUrl: new URL(tokenUrl).origin,
  startedAt: new Date().toISOString(),
  redirectedUrl: null,
  tokenDropped: null,
  boot: null,
  plugin: null,
  cookies: [],
  theme: {},
  locale: {},
  consoleErrors,
  pageErrors,
  failedRequests,
  httpErrors,
  screenshots: [],
};

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--no-first-run', '--no-default-browser-check', '--disable-crash-reporter'],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ type: msg.type(), text: msg.text(), location: msg.location() });
    }
  });
  page.on('pageerror', (err) => pageErrors.push(String(err?.stack ?? err)));
  page.on('requestfailed', (req) =>
    failedRequests.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText }));
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && !url.endsWith('/favicon.ico')) {
      httpErrors.push({ url, status: res.status() });
    }
  });

  // Single navigation: the ?token=... request answers 303 + Set-Cookie, then lands on "/".
  await page.goto(tokenUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  result.redirectedUrl = page.url();
  result.tokenDropped = !page.url().includes('token=');
  result.cookies = (await context.cookies()).map((c) => ({
    name: c.name, domain: c.domain, path: c.path, httpOnly: c.httpOnly,
    sameSite: c.sameSite, secure: c.secure, expires: c.expires,
  }));

  await page.waitForFunction(
    () => typeof window.__DSH_BOOT__ === 'object' && window.__DSH_BOOT__ !== null,
    undefined, { timeout: 30_000 },
  );
  await page.waitForTimeout(1500); // let the shell mount and plugin factories materialize

  result.boot = await page.evaluate(() => {
    const g = window.__DSH_BOOT__;
    return {
      rev: g.rev,
      entryIds: (g.entries ?? []).map((e) => e.id),
      batchIds: (g.batches ?? []).flatMap((b) => b.entries ?? []),
    };
  });

  // Boot graph row + exact revisioned bundle route (public static asset; no cookie needed).
  const entry = await page.evaluate((id) => (window.__DSH_BOOT__.entries ?? []).find((e) => e.id === id), expectPlugin);
  if (entry) {
    const url = new URL(entry.url, page.url()).href;
    const res = await context.request.get(url);
    result.plugin = {
      id: entry.id,
      url,
      status: res.status(),
      contentType: res.headers()['content-type'] ?? null,
      bytes: (await res.body()).length,
    };
  } else {
    result.plugin = { id: expectPlugin, missing: true, entryIds: result.boot.entryIds };
  }

  result.theme = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return {
      darkAttribute: document.body.getAttribute('data-ds-dark-theme'),
      themeSource: document.documentElement.getAttribute('data-ds-theme-source'),
      bgBase: s.getPropertyValue('--dsw-alias-bg-base').trim(),
      labelPrimary: s.getPropertyValue('--dsw-alias-label-primary').trim(),
      contentFontSize: s.getPropertyValue('--dsh-content-font-size').trim(),
      colorScheme: s.colorScheme,
    };
  });
  result.locale = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    bodySample: document.body.innerText.slice(0, 400),
  }));

  const shot = join(outDir, `web-${theme}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  result.screenshots.push(shot);

  // A second pass for the opposite scheme only works while the durable preference is "system".
  if (theme === 'light') {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(400);
    const shotDark = join(outDir, 'web-dark.png');
    await page.screenshot({ path: shotDark, fullPage: false });
    result.screenshots.push(shotDark);
    result.theme.darkEmulated = await page.evaluate(() => ({
      darkAttribute: document.body.getAttribute('data-ds-dark-theme'),
      bgBase: getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim(),
    }));
  }
} finally {
  await browser.close();
}

const failures = [];
if (!result.tokenDropped) failures.push('token was not dropped after redirect');
if (result.plugin?.missing) failures.push(`plugin row "${expectPlugin}" missing from __DSH_BOOT__`);
if (result.plugin && result.plugin.status !== 200) failures.push(`plugin client.js status ${result.plugin.status}`);
if (result.plugin && !/javascript/.test(result.plugin.contentType ?? '')) failures.push('plugin client.js not served as javascript');
if (consoleErrors.length) failures.push(`${consoleErrors.length} console error/warning`);
if (pageErrors.length) failures.push(`${pageErrors.length} page errors`);
result.failures = failures;
result.ok = failures.length === 0;
await writeFile(join(outDir, 'probe-report.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok: result.ok, failures, plugin: result.plugin, theme: result.theme, locale: result.locale, consoleErrors: consoleErrors.length, httpErrors }, null, 2));
process.exit(result.ok ? 0 : 1);
