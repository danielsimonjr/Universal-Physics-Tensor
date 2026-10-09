/**
 * The stated command counts must equal the REGISTRY, not each other.
 *
 * This number is restated in prose in four places — `NOTES.md` (formerly `CLAUDE.md`) and three
 * spots in `cli/README.md` — and nothing failed when one drifted. On 2026-09-22 all four were
 * stale AND TWO DISAGREED WITH EACH OTHER: the README said "19 commands" in one sentence and
 * "all 15 — every command in the tables above except `help` and `version`" in another, which are
 * two statements of the SAME quantity differing by four. Both had been wrong for long enough that
 * neither was obviously the newer.
 *
 * The repo's own rule is that a rule is enforced by something that FAILS or it is not enforced, so
 * the count now has a test. It asserts each prose figure against the LIVE registry rather than
 * against a hardcoded literal — a literal here would simply be a fifth place to rot.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { runCli } from '../../src/cli/main.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

/**
 * The authority: what `upt --help` lists. Derived from the running registry, so adding a command
 * moves this number without anyone remembering to.
 */
async function registeredCommands(): Promise<string[]> {
  const lines: string[] = [];
  const code = await runCli(['--help'], {
    out: (s: string) => lines.push(s),
    err: () => {},
  } as never);
  expect(code).toBe(0);
  const names = lines
    .join('\n')
    .split('\n')
    .map((l) => /^ {2}upt ([a-z-]+)/.exec(l)?.[1])
    .filter((n): n is string => Boolean(n));
  // A registry that returns nothing would make every assertion below vacuously true.
  expect(names.length).toBeGreaterThan(5);
  return [...new Set(names)];
}

describe('the stated command count matches the registry', () => {
  it('NOTES.md and cli/README.md agree with `upt --help`, not with each other', async () => {
    const all = await registeredCommands();
    const dataBearing = all.filter((n) => n !== 'help' && n !== 'version');

    // `help` and `version` are the only non-data-bearing commands; if that ever stops being true
    // the difference below changes and this test should be revisited rather than re-baselined.
    expect(all.length - dataBearing.length).toBe(2);

    const notes = read('NOTES.md');
    const readme = read('cli/README.md');

    // NOTES.md, measured facts about the tree.
    expect(notes).toContain(`(${dataBearing.length} data-bearing commands + \`help\`/\`version\``);

    // cli/README.md — the generated span's sentence: the total, the registered count, and the two
    // built-ins. `upt chain` is registered and deliberately not listed by `upt help`, so the
    // registry's count is one more than the help listing's.
    expect(readme).toContain(`${all.length + 1} commands: ${dataBearing.length + 1} registered, plus \`help\` and \`version\`.`);

    // cli/README.md — the two statements of the DATA-BEARING count that once disagreed.
    expect(readme).toContain(`Every data-bearing command (all ${dataBearing.length} —`);
  });

  it('NEGATIVE CONTROL: a wrong figure in either file fails this test', async () => {
    const all = await registeredCommands();
    const dataBearing = all.filter((n) => n !== 'help' && n !== 'version');
    // The assertions above are `toContain` on a figure derived from the registry. Prove they are
    // sensitive to that figure: the neighbouring values must NOT appear in the same sentences,
    // which is exactly what a stale count would look like.
    const readme = read('cli/README.md');
    const notes = read('NOTES.md');
    for (const wrong of [dataBearing.length - 1, dataBearing.length + 1]) {
      expect(notes).not.toContain(`(${wrong} data-bearing commands + \`help\`/\`version\``);
      expect(readme).not.toContain(`Every data-bearing command (all ${wrong} —`);
    }
  });
});
