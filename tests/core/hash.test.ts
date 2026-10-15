/**
 * `core/hash`: one SHA-256 hex digest. Six sites created their own
 * `createHash('sha256')` before; the record fingerprints and the PhysJS row
 * hashes they produce are pinned by their own tests, so this one checks the
 * digest itself against the published vectors.
 */
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../src/core/hash.js';

describe('sha256Hex', () => {
  it('matches the FIPS 180-4 vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('hashes a string as UTF-8 and a Buffer as its bytes, the same bytes giving the same digest', () => {
    expect(sha256Hex(Buffer.from('abc', 'utf8'))).toBe(sha256Hex('abc'));
    expect(sha256Hex('π')).toBe(sha256Hex(Buffer.from([0xcf, 0x80])));
  });

  it('does not normalise line endings; the unit-table reader does that before hashing', () => {
    expect(sha256Hex('a\r\n')).not.toBe(sha256Hex('a\n'));
  });
});
