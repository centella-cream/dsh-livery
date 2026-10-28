/**
 * Shared host boundary for wallpaper URLs.
 *
 * A wallpaper URL must be a public https origin before it can enter the guarded
 * cache downloader; localhost/private/link-local/single-label and multicast
 * addresses are never acceptable, including IPv4-mapped IPv6 literals.
 */

const LOCAL_HOSTS: readonly RegExp[] = [
  /^localhost\.?$/i,
  /\.localhost\.?$/i,
  /\.local\.?$/i,
  /\.internal\.?$/i,
  /\.home\.arpa\.?$/i,
]

function isPrivateIpv4(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(hostname)
  if (match === null) return false
  const octets = match.slice(1).map(Number)
  if (octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true
  const [a, b] = octets as [number, number, number, number]
  return a === 0 || a === 10 || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && octets[2] === 100)
    || (a === 203 && b === 0 && octets[2] === 113)
    || a >= 224
}

function isPrivateIpv6(hostname: string): boolean {
  const address = hostname.replace(/^\[|\]$/gu, '').toLowerCase()
  if (address === '::' || address === '::1') return true
  if (address.startsWith('fc') || address.startsWith('fd')) return true
  if (/^fe[89ab]/u.test(address)) return true
  // Site-local (fec0::/10) and multicast (ff00::/8).
  if (/^fe[c-f]/u.test(address) || address.startsWith('ff')) return true
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/u.exec(address)
  if (mapped !== null) return isPrivateIpv4(mapped[1] as string)
  const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/u.exec(address)
  if (hexMapped !== null) {
    const high = Number.parseInt(hexMapped[1] as string, 16)
    const low = Number.parseInt(hexMapped[2] as string, 16)
    return isPrivateIpv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`)
  }
  if (address.startsWith('::') && address !== '::' && address !== '::1') return true
  return false
}

/**
 * Whether one URL hostname is loopback/private/link-local/site-local/multicast
 * or a single-label local name.
 * @param hostname - hostname from `new URL(...)`.
 * @returns true when the host must not be fetched.
 */
export function isLocalOrPrivateHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/u, '')
  if (normalized.length === 0) return true
  if (LOCAL_HOSTS.some(pattern => pattern.test(normalized))) return true
  if (isPrivateIpv4(normalized)) return true
  if (isPrivateIpv6(normalized)) return true
  // Single-label names are local DNS names, not public hosts.
  return !normalized.includes('.') && !normalized.includes(':')
}

/**
 * Validate a remote image URL for direct UI use (thumbnails): https and a
 * public host. Returns the normalized URL or undefined.
 * @param raw - untrusted image URL.
 * @returns safe http(s) URL or undefined.
 */
export function safeRemoteImageUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return undefined
    if (isLocalOrPrivateHost(url.hostname)) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}
