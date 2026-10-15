/**
 * The committed witness-results path lives in a support module (`src/cli/stored-results.ts`)
 * that the command module `_atlas-map.ts` and the support module `record.ts` both import, so
 * no support module reaches into `commands/`. And `path`'s translation invariant, "a translation
 * exists only for a bridge with a bound", is a check with a typed error, not a `!`.
 *
 * Found by the 2026-10-15 survey: `record.ts:23` imported `storedResultsFile` from
 * `./commands/_atlas-map.js`; `path.ts:595` and `:633` read `bridges[0]!.bound!.horizon`.
 */
import '../helpers/dist.js';
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as api from '../../dist/cli-api.js';
import { STORED_RESULTS_PATH, storedResultsFile } from '../../dist/cli/stored-results.js';
import { TranslationWithoutBoundError, translatedBound } from '../../dist/cli/commands/path.js';

const ROOT = join(import.meta.dirname, '../..');
const src = (rel: string): string => readFileSync(join(ROOT, 'src/cli', rel), 'utf8');

describe('stored-results is the one owner of the artifact path', () => {
  it('names the committed artifact, as an absolute path under the checkout', () => {
    expect(STORED_RESULTS_PATH).toBe('data/atlas/witness-results.json');
    expect(isAbsolute(storedResultsFile())).toBe(true);
    expect(storedResultsFile().replace(/\\/g, '/')).toMatch(/\/data\/atlas\/witness-results\.json$/);
  });
  it('record.ts imports no command module; _atlas-map.ts imports the path rather than defining it', () => {
    expect(src('record.ts')).not.toMatch(/from '\.\/commands\//);
    expect(src('record.ts')).toMatch(/from '\.\/stored-results\.js'/);
    expect(src('commands/_atlas-map.ts')).not.toMatch(/export const STORED_RESULTS_PATH/);
    expect(src('commands/_atlas-map.ts')).toMatch(/from '\.\.\/stored-results\.js'/);
  });
});

describe('path: the bound a translation presupposes', () => {
  const pendulum = api.ATLAS_FAMILIES.flatMap((f) => f.bridges).find((b) => b.id === 'ab-pendulum-linear')!;
  const [phase] = api.translationsOf('ab-pendulum-linear');

  it('returns the first bridge\'s bound', () => {
    expect(translatedBound([pendulum], phase!)).toBe(pendulum.bound);
  });
  it('a translation on a bridge with no bound is the typed invariant error, not a TypeError', () => {
    const { bound: _, ...unbounded } = pendulum;
    let caught: unknown;
    try {
      translatedBound([unbounded as typeof pendulum], phase!);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(TranslationWithoutBoundError);
    expect((caught as Error).message).toMatch(/ab-pendulum-linear/);
    expect((caught as Error).message).toMatch(/phase/);
  });
});
