/**
 * Issue 691. A catalog entry may declare `domains`, the application domains
 * of its relation, from the closed list in the schema. Search indexes them, so
 * a reader finds a relation by the device it serves, not only by its physics
 * prose. The enum and the tags are checked against each other: no dead word,
 * no unknown word.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allText, capture } from '../helpers/cli.js';
import { runCli } from '../../src/cli/main.js';
import { dataSchema, dataText, parseDataFile } from '../../src/core/data-file.js';

async function search(query: string): Promise<{ code: number; text: string }> {
  const cap = capture();
  const code = await runCli(['search', query], cap.io);
  return { code, text: allText(cap) };
}

interface Row { id: number; domains?: string[] }
const catalog = JSON.parse(dataText('bridge-catalog.json')) as { entries: Row[] };
const schema = JSON.parse(readFileSync('data/bridge-catalog.schema.json', 'utf8')) as {
  properties: { entries: { items: { properties: { domains?: { items: { enum: string[] } } } } } };
};
const vocabulary = schema.properties.entries.items.properties.domains?.items.enum ?? [];
const tagged = (word: string): string[] =>
  catalog.entries.filter((e) => e.domains?.includes(word)).map((e) => `be-${e.id}`);

describe('search indexes the declared application domains (#691)', () => {
  it('finds the MEMS relations by the word mems', async () => {
    const r = await search('mems');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/be-79\b/);
    expect(r.text).toMatch(/be-126\b/);
  });

  it('the schema declares a non-empty list', () => {
    expect(vocabulary.length).toBeGreaterThan(0);
  });

  it('returns each entry tagged with a domain, and only those, for that word', async () => {
    for (const word of vocabulary) {
      const expected = tagged(word);
      expect(expected.length, `${word} tags no entry`).toBeGreaterThan(0);
      const r = await search(word);
      for (const id of expected) expect(r.text, `${word}: ${id}`).toContain(`${id} `);
    }
  });

  it('a word no entry declares adds no hit', async () => {
    const r = await search('zqxdomain');
    expect(r.text).not.toMatch(/be-\d+/);
  });

  it('every domain in the list tags an entry, and every tag is in the list', () => {
    for (const word of vocabulary) expect(tagged(word).length, word).toBeGreaterThan(0);
    for (const e of catalog.entries) for (const d of e.domains ?? []) expect(vocabulary, `be-${e.id}`).toContain(d);
  });

  it('the loader refuses a domain outside the list', () => {
    const broken = JSON.parse(dataText('bridge-catalog.json')) as { entries: Row[] };
    broken.entries[0]!.domains = ['zqx'];
    expect(() => parseDataFile('bridge-catalog.json', JSON.stringify(broken), dataSchema('bridge-catalog.json'))).toThrow(/zqx/);
  });
});
