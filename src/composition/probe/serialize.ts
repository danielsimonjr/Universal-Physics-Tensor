/**
 * Probe-profile re-exports of the one canonical-JSON module.
 *
 * Object keys are sorted lexicographically; `undefined` properties are omitted;
 * arrays keep encounter order. A `Date` serializes as ISO-8601. An `undefined`
 * array hole becomes `null`.
 *
 * Hashes use SHA-256 over this canonical form. Experimental — not a public
 * API stability surface (`src/index.ts` does not re-export this module).
 *
 * @module composition/probe/serialize
 */

export { canonicalJson, sha256Hex, hashCanonical } from '../canonical-json.js';
