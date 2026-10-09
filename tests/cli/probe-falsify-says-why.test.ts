/**
 * `upt probe falsify` accounts for every candidate (persona finding C5, 2026-09-25).
 *
 * The persona ran `falsify` and got no battery lines at all. The batteries run only for NEW
 * candidates: one that is algebraically equivalent to a known corpus relation stops at
 * `equivalent-known` and is not falsified, by design. But the command said nothing, so a user
 * could not tell "no batteries ran" from "the command is broken". Every candidate without
 * batteries is now listed with the reason, its status.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runCli } from '../../dist/cli/main.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, '../fixtures/discovery/pendulum-scaling/public/problem.json');

describe('upt probe falsify', () => {
  it('says why a corpus-equivalent candidate has no falsification batteries', async () => {
    const lines: string[] = [];
    const sink = (s?: string) => lines.push((s ?? '') + '\n');
    const code = await runCli(['probe', 'falsify', `--problem=${fixture}`], { out: sink, err: sink, write: (s: string) => lines.push(s) });
    expect(code).toBe(0);
    const text = lines.join('');
    expect(text).toMatch(
      /falsify h-1-[0-9a-f]+: no batteries run — status equivalent-known: batteries run only for candidates that are not equivalent to a known corpus relation/,
    );
  });
});

describe('upt probe falsify — control: a new candidate still gets its batteries', () => {
  it('prints every battery for a candidate the corpus does not hold (f = η/(ρL²)), and no "no batteries" line for it', async () => {
    // tests/fixtures/discovery/viscous-rate-problem.json: rows are exactly visc/(rho·size²).
    const novel = join(here, '../fixtures/discovery/viscous-rate-problem.json');
    const lines: string[] = [];
    const sink = (s?: string) => lines.push((s ?? '') + '\n');
    const code = await runCli(['probe', 'falsify', `--problem=${novel}`], { out: sink, err: sink, write: (s: string) => lines.push(s) });
    expect(code).toBe(0);
    const text = lines.join('');
    expect(text).toMatch(/falsify h-1-[0-9a-f]+ survived=true/);
    for (const battery of ['dimensional', 'finiteness', 'limits']) expect(text).toMatch(new RegExp(`    ${battery}: `));
    expect(text).not.toMatch(/no batteries run/);
  });
});
