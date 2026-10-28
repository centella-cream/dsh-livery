/**
 * Serial coordinator for wallpaper upload commits and destructive GC.
 *
 * Browser tabs can overlap an upload transaction with cleanup; a tiny local
 * queue removes in-tab TOCTOU and `navigator.locks` extends the same mutex to
 * other tabs when the platform exposes it. The callback must still re-read the
 * live/durable selection because selection transitions are synchronous and do
 * not themselves await this lock.
 */

type LockBody<T> = () => Promise<T>

let localTail: Promise<unknown> = Promise.resolve()

/**
 * Run one upload/GC critical section.
 * @param body - async critical section.
 * @returns the callback result.
 */
export async function withWallpaperGcLock<T>(body: LockBody<T>): Promise<T> {
  const runLocal = async (): Promise<T> => {
    const previous = localTail
    let release: () => void = () => undefined
    localTail = new Promise<void>((resolve) => { release = resolve })
    await previous.catch(() => undefined)
    try {
      return await body()
    } finally {
      release()
    }
  }
  const locks = typeof navigator === 'undefined'
    ? undefined
    : (navigator as unknown as { locks?: { request<T>(name: string, callback: () => Promise<T>): Promise<T> } }).locks
  if (locks === undefined || typeof locks.request !== 'function') return runLocal()
  return locks.request('dsh-livery-wallpaper-gc', runLocal)
}
