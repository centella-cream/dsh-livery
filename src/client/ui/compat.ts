/**
 * Compatibility-mode presentation helpers.
 *
 * The handshake module accepts an uncertified-but-in-range host by synthesizing
 * the `dsh-compat` identity and setting `payload.compat`; the UI only reads that
 * identity to show an "unverified" warning. No policy logic lives here.
 */
import { COMPAT_ADAPTER_ID } from '../../core/compat.js'

/**
 * Whether this snapshot's identity came from the compatibility fallback.
 * @param identity - live adapter identity (boot payload or catalog).
 * @returns true for the synthesized `dsh-compat` identity.
 */
export function isCompatIdentity(identity: { readonly adapterId: string }): boolean {
  return identity.adapterId === COMPAT_ADAPTER_ID
}
