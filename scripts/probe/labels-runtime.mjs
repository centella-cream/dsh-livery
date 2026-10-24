/**
 * Optional label override support.
 *
 * `--labels` accepts either a path to a JSON file or inline JSON with the shape
 * `{ "zh": { "apply": "…" }, "en": { … } }` (a flat object applies to both
 * locales). This lets the harness track copy changes without editing code.
 */

import { readFileSync } from 'node:fs'

export function labelOverrides(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('empty --labels value')
  if (text.startsWith('{')) return JSON.parse(text)
  return JSON.parse(readFileSync(text, 'utf8'))
}
