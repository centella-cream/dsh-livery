/**
 * DSH Livery — runtime-neutral stylesheet helpers.
 *
 * This module intentionally imports nothing but the shared types: no derivation
 * state, no frozen stock token table, no renderer. The compile-time renderer and
 * every runtime bundle reuse this single concatenation rule so the injected bytes
 * and the compared hash can never disagree.
 */
import type { LiveryCss } from './types.js'

/**
 * Concatenate the three compiled stylesheet fragments into the exact bytes the
 * Host injects and the Client applies: tokens, then typography, then layout.
 * @param css - compiled fragments.
 * @returns stylesheet text with no wrapper, banner or trailing newline.
 */
export function styleTextFromFragments(css: LiveryCss): string {
  return css.tokens + css.typography + css.layout
}
