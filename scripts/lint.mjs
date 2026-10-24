#!/usr/bin/env node
/**
 * Repository lint: cheap structural checks that do not need the TypeScript
 * compiler or a browser. CSS safety proper lives in `audit:css`.
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const problems = []

async function walk(directory, files = []) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return files
  }
  for (const entry of entries) {
    if (['node_modules', 'lib', 'artifacts', '.tmp', '.git', 'references', 'research'].includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path, files)
    else files.push(path)
  }
  return files
}

const files = await walk(root)
const sourceFiles = files.filter((file) => /\.(ts|tsx|mjs|js|json|yml|yaml|md)$/u.test(file))

for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8')
  const rel = relative(root, file)
  if (rel.startsWith('docs/research/') || rel.startsWith('docs/verification/')) continue
  if (rel.startsWith('references/') || rel.startsWith('research/')) continue
  if (/\/Users\/[^/\s"'`]+/u.test(text) && !rel.startsWith('docs/')) {
    problems.push(`${rel}: contains an absolute user path`)
  }
  if (rel.startsWith('src/') && text.includes("from 'references/")) {
    problems.push(`${rel}: imports from references/ (must never ship)`)
  }
  if (rel.startsWith('src/') && /{{INJECT|TODO:|FIXME:/u.test(text)) {
    problems.push(`${rel}: contains an unresolved TODO/FIXME/injection marker`)
  }
}

// Every JSON file we commit must parse.
for (const file of files.filter((path) => path.endsWith('.json'))) {
  try {
    JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    problems.push(`${relative(root, file)}: invalid JSON (${error.message})`)
  }
}

// Contract + adapter must agree with the package's exact support declaration.
try {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  if (pkg.engines?.dsh !== '0.2.0-rc.2') problems.push('package.json engines.dsh must be exactly 0.2.0-rc.2')
  if (!pkg.dsh?.bundle?.patch) problems.push('package.json dsh.bundle.patch is required')
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
  if (!patch.includes('id: livery')) problems.push('cordis.patch.yml must insert the stable entry id `livery`')
  const types = await readFile(join(root, 'src', 'core', 'types.ts'), 'utf8')
  if (!types.includes("ENTRY_ID = 'livery'")) problems.push('ENTRY_ID in src/core/types.ts must stay `livery`')
} catch (error) {
  problems.push(`cannot validate package contract: ${error.message}`)
}

// Generated code must not be a placeholder by the time anything ships.
try {
  const generated = await readFile(join(root, 'src', 'generated', 'liveries.ts'), 'utf8')
  if (generated.includes('GENERATED PLACEHOLDER')) {
    problems.push('src/generated/liveries.ts is still the placeholder; run `pnpm liveries:compile`')
  }
} catch {
  problems.push('src/generated/liveries.ts is missing')
}

// Documentation required by the plan.
for (const file of ['docs/implementation/interfaces.md', 'LICENSE', 'README.md', 'schemas/livery.schema.json']) {
  try {
    await stat(join(root, file))
  } catch {
    problems.push(`required file missing: ${file}`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`lint: FAIL ${problem}`)
  process.exitCode = 1
} else {
  console.log(`lint: OK ${sourceFiles.length} source files checked`)
}
