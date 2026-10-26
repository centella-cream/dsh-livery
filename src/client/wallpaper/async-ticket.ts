/**
 * Monotonic ticket for async UI work: the newest started operation owns the
 * result; older completions are ignored instead of overwriting newer ones.
 */
export interface AsyncTicket {
  /** Start a new operation and return its ticket. */
  next(): number
  /** Whether the ticket still belongs to the newest operation. */
  isCurrent(ticket: number): boolean
  /** Invalidate every outstanding ticket (teardown/unmount). */
  invalidate(): void
}

/** Create one ticket source. */
export function createAsyncTicket(): AsyncTicket {
  let current = 0
  return {
    next: () => ++current,
    isCurrent: (ticket: number) => ticket === current,
    invalidate: () => { current += 1 },
  }
}
