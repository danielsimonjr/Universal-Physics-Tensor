/**
 * Every REGISTERED command is documented in `upt --help`.
 *
 * `--help` is a static text in `src/cli/main.ts`, not generated from the
 * registry. `command-count-prose.test.ts` counts commands by parsing that text,
 * so a command registered WITHOUT a help entry was runnable and invisible to it:
 * on 2026-09-22 `upt atlas` ran while `upt help` did not list it, and the count
 * gate could not have noticed. This test compares the registry itself against the
 * help text, which closes that gap.
 */

import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { listCommandNames } from '../../src/cli/command.js';

async function helpText(): Promise<string> {
  const lines: string[] = [];
  const code = await runCli(['--help'], { out: (s: string) => lines.push(s), err: () => {} } as never);
  expect(code).toBe(0);
  return lines.join('\n');
}

/** Registered names with no `  upt <name>` entry in the help text. */
const undocumented = (names: readonly string[], help: string): string[] =>
  names.filter((n) => !new RegExp(`^ {2}upt ${n}(?![\\w-])`, 'm').test(help));

describe('upt --help covers the command registry', () => {
  it('CONTROLS: an absent name IS reported, and a present one is NOT', async () => {
    // Both directions: a matcher that reported EVERY name (as a mistyped `\b`
    // — a backspace inside a template literal — once did) passes the first
    // half alone.
    const help = await helpText();
    expect(undocumented(['zzz-not-a-command'], help)).toEqual(['zzz-not-a-command']);
    expect(undocumented(['audit', 'regime'], help)).toEqual([]);
    // A prefix is not an entry: `upt eval` must not satisfy `evaluate`, or vice versa.
    expect(undocumented(['evalu'], help)).toEqual(['evalu']);
  });

  it('the registry is non-empty (an empty one would make the next test vacuous)', async () => {
    await helpText(); // runCli loads the command modules
    expect(listCommandNames().length).toBeGreaterThan(20);
  });

  it('every registered command has a help entry, except upt chain', async () => {
    const help = await helpText();
    // `upt chain` is registered so the name is not "Unknown command". It is
    // not listed in `upt help`: the command-count prose counts that text, and
    // the command does not run the chain orchestrator. `upt help chain` is
    // the status.
    expect(undocumented(listCommandNames(), help)).toEqual(['chain']);
    expect(help).not.toMatch(/^ {2}upt chain(?![\w-])/m);
    const lines: string[] = [];
    const code = await runCli(['help', 'chain'], {
      out: (s: string) => lines.push(s),
      err: () => {},
    } as never);
    expect(code).toBe(0);
    const chainHelp = lines.join('\n');
    expect(chainHelp).toContain('provisional');
    expect(chainHelp).toContain('not written to the catalog');
  });
});
