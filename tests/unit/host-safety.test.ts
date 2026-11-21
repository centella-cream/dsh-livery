import { describe, expect, it } from 'vitest'
import { isLocalOrPrivateHost, safeRemoteImageUrl } from '../../src/client/wallpaper/host-safety.js'

describe('host-safety private-host predicate', () => {
  it('does not mistake public domains for IPv6 literals', () => {
    for (const host of ['fedora.org', 'feedly.com', 'fda.gov', 'fc2.com']) {
      expect(isLocalOrPrivateHost(host), host).toBe(false)
    }
  })

  it('rejects loopback, private, link-local, ULA, multicast and mapped-private', () => {
    for (const host of ['localhost', '127.0.0.1', '10.0.0.1', '169.254.1.1', '[::1]', '[fe80::1]', '[fc00::1]', '[fd00::1]', '[ff02::1]', '[::ffff:127.0.0.1]']) {
      expect(isLocalOrPrivateHost(host), host).toBe(true)
    }
  })

  it('keeps public IPv6 and mapped-public hosts', () => {
    expect(isLocalOrPrivateHost('[2001:4860:4860::8888]')).toBe(false)
    expect(isLocalOrPrivateHost('[::ffff:8.8.8.8]')).toBe(false)
  })

  it('rejects non-https and private thumbnail URLs', () => {
    expect(safeRemoteImageUrl('http://example.com/a.png')).toBeUndefined()
    expect(safeRemoteImageUrl('https://127.0.0.1/a.png')).toBeUndefined()
    expect(safeRemoteImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
  })
})
