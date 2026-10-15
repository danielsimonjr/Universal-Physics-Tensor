/**
 * One SHA-256 digest.
 *
 * The record fingerprints, the PhysJS reviewed-row hashes, the unit-table
 * hash and the canonical-JSON hash all read the same digest; each site used
 * to build its own `createHash('sha256')`. A string is hashed as UTF-8, a
 * `Buffer` as its bytes. Nothing is normalised here: a caller that folds line
 * endings does so before hashing, and says so.
 *
 * @module core/hash
 */

import { createHash } from 'node:crypto';

/** The SHA-256 of `text` (UTF-8 for a string, raw bytes for a Buffer) as lowercase hex. @internal */
export function sha256Hex(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex');
}
