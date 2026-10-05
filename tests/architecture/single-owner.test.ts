/**
 * Each concept the integration design assigned once has one owner.
 * A second name in `src/` fails this scan. The same scan is what
 * `docs:deps` writes to `docs/architecture/duplicate-owners.md`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  renderDuplicateOwners,
  signOwnerHits,
  temperatureOwnerHits,
} from '../../tools/duplicate-owner-scans.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('single owner', () => {
  it('applies the temperature reading only from readNamedBinding', () => {
    expect(temperatureOwnerHits(root)).toEqual([]);
  });

  it('calls assertSameCarrierSign only from the sign policy', () => {
    expect(signOwnerHits(root)).toEqual([]);
  });

  it('writes that list to duplicate-owners.md', () => {
    expect(readFileSync(resolve(root, 'docs/architecture/duplicate-owners.md'), 'utf8')).toBe(
      renderDuplicateOwners(root),
    );
  });
});
