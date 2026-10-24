#!/usr/bin/env node
/**
 * Build the cross-package reference index for `--dsw-*` / `--dsh-*` variables.
 *
 * Scans every installed @deepseek-ai package's compiled client bundles (which
 * embed per-component CSS strings) plus the built web-frontend CSS, and records
 * which packages read each token via var(--token) and which declare it.
 *
 * Output: research/extracted/references.json
 */
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = '/Users/ryanzhang/Personal/openprojects/dsh-livery';
const PKG_ROOT =
  '/Users/ryanzhang/.local/share/fnm/node-versions/v22.23.1/installation/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai';
const FRONTEND = path.join(PKG_ROOT, 'dsh-web-frontend/dist/assets');
const outFile = path.join(WORKSPACE, 'research/extracted/references.json');

const files = [];
for (const entry of fs.readdirSync(PKG_ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const libDir = path.join(PKG_ROOT, entry.name, 'lib');
  if (!fs.existsSync(libDir)) continue;
  for (const f of fs.readdirSync(libDir)) {
    if (f.endsWith('.js') || f.endsWith('.css')) files.push({ pkg: entry.name, file: path.join(libDir, f) });
  }
}
for (const f of fs.readdirSync(FRONTEND)) {
  if (f.endsWith('.css')) files.push({ pkg: 'dsh-web-frontend', file: path.join(FRONTEND, f) });
}

const reads = new Map(); // name -> Map(pkg -> count)
const declares = new Map(); // name -> Map(pkg -> count)
const colorsByPkg = new Map(); // pkg -> {hex, rgb, named}
const COLORS = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g;

for (const { pkg, file } of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/var\(\s*(--dsw-[a-z0-9-]+)/g)) {
    const map = reads.get(m[1]) ?? new Map();
    map.set(pkg, (map.get(pkg) ?? 0) + 1);
    reads.set(m[1], map);
  }
  for (const m of text.matchAll(/(--dsw-[a-z0-9-]+)\s*:/g)) {
    const map = declares.get(m[1]) ?? new Map();
    map.set(pkg, (map.get(pkg) ?? 0) + 1);
    declares.set(m[1], map);
  }
  // hardcoded colors in component bundles (rough: whole bundle, not only CSS strings)
  if (pkg !== 'dsh-client-ui-theme') {
    const hits = text.match(COLORS) ?? [];
    if (hits.length) {
      const cur = colorsByPkg.get(pkg) ?? { hex: 0, rgb: 0, named: 0, samples: [] };
      for (const h of hits) {
        if (h.startsWith('#')) cur.hex += 1;
        else cur.rgb += 1;
        if (cur.samples.length < 8 && !cur.samples.includes(h)) cur.samples.push(h);
      }
      colorsByPkg.set(pkg, cur);
    }
  }
}

const toObj = (map) =>
  Object.fromEntries(
    [...map.entries()]
      .map(([name, pkgs]) => [
        name,
        {
          count: [...pkgs.values()].reduce((a, b) => a + b, 0),
          byPackage: Object.fromEntries([...pkgs.entries()].sort((a, b) => b[1] - a[1])),
        },
      ])
      .sort((a, b) => b[1].count - a[1].count),
  );

/* second pass: JS string literals that declare --dsh vars in component CSS */
const dshDeclarations = [];
for (const { pkg, file } of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(--dsh-[a-z0-9-]+)\s*:\s*([^;{}"']{1,120})/g)) {
    dshDeclarations.push({ name: m[1], value: m[2].trim(), pkg, file: path.relative(PKG_ROOT, file) });
  }
}
const dshSetProperty = [];
for (const { pkg, file } of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/setProperty\(\s*"(--dsh-[a-z0-9-]+)"\s*,\s*([^)]{0,80})\)/g)) {
    dshSetProperty.push({ name: m[1], value: m[2].trim(), pkg, file: path.relative(PKG_ROOT, file) });
  }
}

const out = {
  scanned: {
    packages: [...new Set(files.map((f) => f.pkg))].length,
    files: files.length,
    frontend: fs.readdirSync(FRONTEND).filter((f) => f.endsWith('.css')),
  },
  dswReads: toObj(reads),
  dswDeclaresOutsideTheme: Object.fromEntries(
    Object.entries(toObj(declares)).filter(([name]) => {
      const by = declares.get(name);
      return ![...by.keys()].every((p) => p === 'dsh-client-ui-theme');
    }),
  ),
  dshDeclarations,
  dshSetProperty,
  hardcodedColors: Object.fromEntries(
    [...colorsByPkg.entries()].sort((a, b) => b[1].hex + b[1].rgb - (a[1].hex + a[1].rgb)),
  ),
};

fs.writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`);
console.log('scanned files:', files.length);
console.log('tokens read:', Object.keys(out.dswReads).length);
console.log('tokens declared outside theme:', Object.keys(out.dswDeclaresOutsideTheme).length);
console.log('top 10 reads:', Object.entries(out.dswReads).slice(0, 10).map(([k, v]) => `${k}=${v.count}`).join(', '));
console.log('dsh declared occurrences:', dshDeclarations.length, 'setProperty:', dshSetProperty.length);
console.log('hardcoded color pkgs:', Object.keys(out.hardcodedColors).length);
