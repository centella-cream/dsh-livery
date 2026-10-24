#!/usr/bin/env node
/**
 * Verify research/tokens.json against the authoritative compiled bundle.
 * Every recorded declaration must literally appear on its cited line.
 */
import fs from 'node:fs';

const WORKSPACE = '/Users/ryanzhang/Personal/openprojects/dsh-livery';
const THEME_CLIENT =
  '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js';

const inventory = JSON.parse(fs.readFileSync(`${WORKSPACE}/research/tokens.json`, 'utf8'));
const lines = fs.readFileSync(THEME_CLIENT, 'utf8').split('\n');

let checked = 0;
const failures = [];

function assertDecl(lineNo, name, value, where) {
  const line = (lines[lineNo - 1] ?? '').replace(/\\"/g, '"');
  const needle = `${name}:${value}`;
  if (!line.includes(needle)) {
    // tolerate whitespace normalization differences from the extractor
    const loose = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    if (!loose.test(line)) failures.push({ where, name, value, lineNo, got: line.slice(0, 160) });
  }
  checked += 1;
}

for (const token of inventory.tokens) {
  const lineNo = Number(token.definedIn.split(':').pop());
  assertDecl(lineNo, token.name, token.lightValue, 'primary');
  if (token.definitions) {
    for (const def of token.definitions) {
      assertDecl(Number(def.ref.split(':').pop()), token.name, def.value, 'definition');
    }
  }
}

// spot-check computed values independently of the resolver
const byName = new Map(inventory.tokens.map((t) => [t.name, t]));
const expectations = [
  ['--dsw-alias-bg-base', 'var(--dsw-static-neutral-bluish-00)', 'var(--dsw-static-neutral-bluish-950)'],
  ['--dsw-static-neutral-bluish-00', '#fff', '#fff'],
  ['--dsw-focus-ring-width', '2px', '2px'],
  ['--dsw-radius-panel', '28px', '28px'],
  ['--dsw-corner-shape', 'superellipse(1.5)', 'superellipse(1.5)'],
  ['--dsw-elevation-stroke-color', 'var(--dsw-alias-border-l4)', 'var(--dsw-alias-border-l3)'],
  ['--dsw-font-family-brand', '"Montserrat", var(--dsw-font-family)', '"Montserrat", var(--dsw-font-family)'],
];
for (const [name, light, dark] of expectations) {
  const token = byName.get(name);
  if (!token) failures.push({ where: 'expectation', name, got: 'missing' });
  else {
    if (token.lightValue !== light || token.darkValue !== dark) {
      failures.push({ where: 'expectation', name, expected: [light, dark], got: [token.lightValue, token.darkValue] });
    }
  }
  checked += 1;
}
// independently resolved spot checks (var substitution, runtime font defaults)
const resolvedExpectations = [
  ['--dsw-alias-bg-base', '#fff', '#151517'],
  ['--dsw-specific-bubble', '#edf3fe', '#2c2c2e'],
  ['--dsw-focus-ring-width', '2px', '2px'],
];
for (const [name, light, dark] of resolvedExpectations) {
  const token = byName.get(name);
  if (!token || token.resolved.light !== light || token.resolved.dark !== dark) {
    failures.push({ where: 'resolved-expectation', name, got: [token?.resolved.light, token?.resolved.dark] });
  }
  checked += 1;
}
// the dark rebind is scoped to [data-menu-material], recorded in its definitions
const stroke = byName.get('--dsw-elevation-stroke-color');
if (!stroke?.definitions?.some((d) => d.selector === 'body[data-ds-dark-theme] [data-menu-material]')) {
  failures.push({ where: 'scoped-dark-rebind', name: '--dsw-elevation-stroke-color', got: stroke?.definitions });
}

console.log(`checked ${checked} declarations; failures: ${failures.length}`);
if (failures.length) {
  console.log(JSON.stringify(failures.slice(0, 10), null, 2));
  process.exitCode = 1;
}
