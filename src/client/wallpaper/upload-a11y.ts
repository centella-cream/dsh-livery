/**
 * Upload dropzone keyboard behavior: Enter and Space open the hidden file
 * picker exactly once per physical key press (auto-repeat is ignored, and the
 * dropzone click handler is the other single entry point).
 */
import type { KeyboardEvent } from 'react'

/** Minimal keyboard event shape so the predicate is testable without a DOM. */
export interface FileDialogKeyEvent {
  readonly key: string
  readonly repeat?: boolean
}

/**
 * Whether this key event should open the file dialog.
 * @param event - keydown event (or minimal shape).
 * @returns true for a non-repeating Enter/Space.
 */
export function shouldOpenFileDialog(event: FileDialogKeyEvent): boolean {
  if (event.repeat === true) return false
  return event.key === 'Enter' || event.key === ' '
}

/**
 * React keydown adapter around {@link shouldOpenFileDialog}.
 * @param event - React keyboard event.
 * @param open - opens the hidden file input exactly once.
 */
export function handleDropzoneKeyDown(
  event: KeyboardEvent<HTMLElement>,
  open: () => void,
): void {
  if (!shouldOpenFileDialog(event)) return
  event.preventDefault()
  open()
}
