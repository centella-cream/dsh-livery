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

/** Expand one IPv6 host into eight 16-bit groups (`undefined` when malformed). */
function expandIpv6(address: string): readonly number[] | undefined {
  const halves = address.split('::')
  if (halves.length > 2) return undefined
  const parse = (text: string): number[] | undefined => {
    if (text.length === 0) return []
    const groups: number[] = []
    for (const group of text.split(':')) {
      if (!/^[0-9a-f]{1,4}$/u.test(group)) return undefined
      groups.push(Number.parseInt(group, 16))
    }
    return groups
  }
  const head = parse(halves[0] ?? '')
  if (head === undefined) return undefined
  if (halves.length === 1) return head.length === 8 ? head : undefined
  const tail = parse(halves[1] ?? '')
  if (tail === undefined) return undefined
  const missing = 8 - head.length - tail.length
  if (missing < 1) return undefined
  return [...head, ...Array.from({ length: missing }, () => 0), ...tail]
}

function mappedIpv4Of(address: string): string | undefined {
  const groups = expandIpv6(address)
  if (groups === undefined) return undefined
  const high = groups[6] ?? 0
  const low = groups[7] ?? 0
  const ipv4 = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`
  if (groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0
    && groups[4] === 0 && groups[5] === 0xffff) return ipv4
  if (groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0
    && groups[4] === 0xffff && groups[5] === 0) return ipv4
  return undefined
}

function isPrivateIpv6(hostname: string): boolean {
  const address = hostname.replace(/^\[|\]$/gu, '').toLowerCase()
  // A plain DNS hostname is never an IPv6 literal. Only bracketed literals or
  // colon-containing addresses reach the IPv6 rules (fedora.org is public).
  if (!address.includes(':')) return false
  if (address === '::' || address === '::1') return true
  const dotted = /^::ffff:(?:0:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/u.exec(address)
  if (dotted !== null) return isPrivateIpv4(dotted[1] as string)
  const mapped = mappedIpv4Of(address)
  if (mapped !== undefined) return isPrivateIpv4(mapped)
  if (address.includes('.')) return true
  const first = address.split(':')[0] ?? ''
  if (first.startsWith('ff')) return true
  if (/^fe[c-f]/u.test(first)) return true
  if (/^fe[89ab]/u.test(first)) return true
  if (first.startsWith('fc') || first.startsWith('fd')) return true
  if (address.startsWith('::')) return true
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

/** Exact image hosts for the direct-only reviewed providers (0.2.3). */
export const DIRECT_IMAGE_HOSTS: Readonly<Record<string, string>> = Object.freeze({
  cleveland: 'openaccess-cdn.clevelandart.org',
  'met-open-access': 'images.metmuseum.org',
})

/**
 * Whether a direct selection is provider-controlled: a reviewed direct provider
 * id plus optional URLs on that provider's exact image host. The map is
 * cross-checked against `src/provider-manifests.json` by the client unit test
 * `wallpaper.test.ts`; this is not duplicated by `verify-provider-gate`.
 * @param providerId - untrusted provider id from state/preset provenance.
 * @param urls - full-image and optional thumbnail URLs.
 * @returns true only for the reviewed provider/host pair.
 */
export function isAllowedDirectImage(providerId: unknown, ...urls: readonly unknown[]): boolean {
  if (typeof providerId !== 'string') return false
  const host = DIRECT_IMAGE_HOSTS[providerId]
  if (host === undefined) return false
  for (const raw of urls) {
    if (raw === undefined) continue
    if (typeof raw !== 'string') return false
    try {
      if (new URL(raw).hostname.toLowerCase().replace(/\.$/u, '') !== host) return false
    } catch {
      return false
    }
  }
  return true
}
