/**
 * The catalog `type` field is authoritative. The markdown ledger is the
 * human-readable reason for each filing. A row that disagrees fails here.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../../src/bridges/catalog-load.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ledgerPath = join(root, 'docs/architecture/bridge-type-classification.md');

function ledgerTypes(): Map<number, string> {
  const text = readFileSync(ledgerPath, 'utf8');
  const found = new Map<number, string>();
  for (const line of text.split('\n')) {
    const match = /^\| (\d+) \| (standard|cross-domain) \| /.exec(line);
    if (match === null) continue;
    const id = Number(match[1]);
    if (found.has(id)) throw new Error(`ledger repeats id ${id}`);
    found.set(id, match[2]!);
  }
  return found;
}

describe('bridge type classification ledger', () => {
  it('matches the catalog type field for every record', () => {
    const ledger = ledgerTypes();
    const entries = catalogEntries();
    expect(ledger.size).toBe(entries.length);
    for (const entry of entries) {
      expect(ledger.get(entry.id), `id ${entry.id}`).toBe(entry.type);
    }
  });
});
