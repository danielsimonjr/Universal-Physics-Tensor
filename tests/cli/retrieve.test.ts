/**
 * `upt retrieve` defaults to the atlas search and does not call Ollama.
 * `--embed` against a closed port is a successful atlas answer plus a reason.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { rankByStructure } from '../../src/atlas/benchmark/baselines.js';
import { canonicalRetrievalCorpus } from '../../src/atlas/benchmark/hybrid-retrieval.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('');

describe('upt retrieve', () => {
  it('defaults to the atlas search and does not mention an Ollama failure', async () => {
    const c = capture();
    expect(await runCli(['retrieve', 'period', 'of', 'a', 'pendulum'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/Embeddings were not requested/);
    expect(t).toMatch(/This is the atlas search/);
    expect(t).toMatch(/no expression/);
    expect(t).not.toMatch(/the process is not there/);
    expect(t).not.toMatch(/proposed \(cosine/);
    const accepted = rankByStructure({ text: 'period of a pendulum' }, canonicalRetrievalCorpus());
    expect(t).toContain(`    ${accepted[0]}`);
    expect(accepted).toEqual([...accepted].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it('--json reports the same accepted order and that embeddings were not requested', async () => {
    const c = capture();
    expect(await runCli(['retrieve', 'mass', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.command).toBe('retrieve');
    expect(env.options).toEqual({ embed: false, ollamaUrl: null });
    const accepted = rankByStructure({ text: 'mass' }, canonicalRetrievalCorpus());
    expect(env.result.embeddings).toBe('not-requested');
    expect(env.result.proposals).toBeNull();
    expect(env.result.accepted).toEqual(accepted);
    expect(env.result.note).toMatch(/no expression/);
  });

  it('--embed against a closed port exits 0, names the process, and keeps the atlas order', async () => {
    const c = capture();
    const code = await runCli(
      ['retrieve', 'mass', '--embed', '--ollama-url=http://127.0.0.1:1', '--json'],
      c.io,
    );
    expect(code).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.result.embeddings).toBe('fallback');
    expect(env.result.fallback).toBe('process-not-there');
    expect(env.result.note).toMatch(/the process is not there/);
    expect(env.result.proposals).toBeNull();
    expect(env.result.accepted).toEqual(rankByStructure({ text: 'mass' }, canonicalRetrievalCorpus()));
  });

  it('a missing claim is a usage error', async () => {
    const c = capture();
    expect(await runCli(['retrieve'], c.io)).toBe(2);
    expect(text(c)).toMatch(/give a claim/);
  });

  it('help names the fallback reasons and that the default does not call out', async () => {
    const c = capture();
    expect(await runCli(['help', 'retrieve'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/does not call out of process/);
    expect(t).toMatch(/--embed/);
    expect(t).toMatch(/--ollama-url/);
    expect(t).toMatch(/the process is not there/);
    expect(t).toMatch(/the model is not there/);
    expect(t).toMatch(/the call does not finish/);
    expect(t).toMatch(/not evidence/);
  });
});
