/**
 * Issue 691. A catalog entry may declare `domains`, the application domains
 * of its relation, from the closed list in the schema. Search indexes them, so
 * a reader finds a relation by the device it serves, not only by its physics
 * prose. The enum and the tags are checked against each other: no dead word,
 * no unknown word.
 */
import { describe, expect, it } from 'vitest';
import { allText, capture, text } from '../helpers/cli.js';
import { runCli } from '../../src/cli/main.js';
import { dataSchema, dataText, parseDataFile } from '../../src/core/data-file.js';

interface Match { kind: string; id: string; matchedIn: string[] }

async function searchJson(query: string): Promise<Match[]> {
  const cap = capture();
  const code = await runCli(['search', query, '--json'], cap.io);
  expect(code, allText(cap)).toBe(0);
  return (JSON.parse(text(cap)) as { result: { matches: Match[] } }).result.matches;
}

interface Row { id: number; domains?: string[] }
const catalog = JSON.parse(dataText('bridge-catalog.json')) as { entries: Row[] };
const schema = dataSchema('bridge-catalog.json') as unknown as {
  properties: { entries: { items: { properties: { domains?: { items: { enum: string[] } } } } } };
};
const vocabulary = schema.properties.entries.items.properties.domains?.items.enum ?? [];
const tagged = (word: string): string[] =>
  catalog.entries.filter((e) => e.domains?.includes(word)).map((e) => `be-${e.id}`).sort();

describe('search indexes the declared application domains (#691)', () => {
  it('finds the MEMS relations by mems and the noise-floor relations by sensor', async () => {
    const ids = async (q: string): Promise<string[]> => (await searchJson(q)).map((m) => m.id);
    expect(await ids('mems')).toEqual(expect.arrayContaining(['be-79', 'be-126']));
    expect(await ids('sensor')).toEqual(expect.arrayContaining(['be-58', 'be-85', 'be-87']));
  });

  it('the domain field matches exactly the entries tagged with the word', async () => {
    expect(vocabulary).toEqual(expect.arrayContaining(['mems', 'sensor']));
    for (const word of vocabulary) {
      const expected = tagged(word);
      expect(expected.length, `${word} tags no entry`).toBeGreaterThan(0);
      const byDomain = (await searchJson(word))
        .filter((m) => m.kind === 'catalog-bridge' && m.matchedIn.includes('domain'))
        .map((m) => m.id)
        .sort();
      expect(byDomain, word).toEqual(expected);
    }
  });

  it('every tag on an entry is in the list', () => {
    for (const e of catalog.entries) for (const d of e.domains ?? []) expect(vocabulary, `be-${e.id}`).toContain(d);
  });

  it('the loader refuses a domain outside the list', () => {
    const broken = JSON.parse(dataText('bridge-catalog.json')) as { entries: Row[] };
    broken.entries[0]!.domains = ['zqx'];
    expect(() => parseDataFile('bridge-catalog.json', JSON.stringify(broken), dataSchema('bridge-catalog.json'))).toThrow(/zqx/);
  });
});
