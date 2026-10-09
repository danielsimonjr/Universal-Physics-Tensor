/**
 * `upt help probe` documents the `--problem` file format (persona finding D2, 2026-09-25).
 *
 * The format was documented nowhere a user could read: the loader's types are `@internal`, and the
 * persona needed three failing runs to learn that `gap.kind` is an enum, `gap.id` must start with
 * `fg-`, and a dataset's `role` is an enum. The help now carries the format and a minimal example.
 * The example is taken out of the help text and loaded with the real loader, so a documented
 * example that does not load fails this test.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { searchProblemFromFile } from '../../src/composition/probe/problem.js';

async function help(): Promise<string> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  await runCli(['help', 'probe'], { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return lines.join('');
}

describe('upt help probe — the problem-file format', () => {
  it('names every rule the loader enforces', async () => {
    const t = await help();
    expect(t).toMatch(/PROBLEM FILE/);
    expect(t).toMatch(/"fg-"/);
    for (const kind of [
      'prediction-residual', 'relation-link', 'regime-transition', 'parameter-tension',
      'assumption-conflict', 'missing-operator', 'unexplained-observation', 'model-disagreement', 'causal-mechanism', 'other',
    ]) {
      expect(t).toContain(kind);
    }
    for (const role of ['exploratory-fit', 'validation-holdout', 'external-replication', 'falsification-only']) {
      expect(t).toContain(role);
    }
  });

  it('its minimal example loads with the real loader', async () => {
    const t = await help();
    const start = t.indexOf('{', t.indexOf('Minimal example'));
    const end = t.indexOf('\n        }', start);
    expect(start).toBeGreaterThan(0);
    const example = JSON.parse(t.slice(start, end + '\n        }'.length));
    const problem = searchProblemFromFile(example);
    expect(problem.target.name).toBe('period');
    expect(problem.exploratory?.rows.length).toBeGreaterThan(0);
    expect(problem.holdout?.rows.length).toBeGreaterThan(0);
  });
});
