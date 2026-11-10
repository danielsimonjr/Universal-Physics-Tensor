/**
 * `upt retrieve` defaults to the atlas search and does not call Ollama.
 * `--embed` against a closed port is a successful atlas answer plus a reason.
 */
import '../helpers/dist.js';
import { captureMerged, text } from '../helpers/cli.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { rankByStructure } from '../../src/atlas/benchmark/baselines.js';
import { canonicalRetrievalCorpus, OLLAMA_EMBEDDING_MODEL } from '../../src/atlas/benchmark/hybrid-retrieval.js';
import { command as retrieveCommand } from '../../dist/cli/commands/retrieve.js';

afterEach(() => vi.unstubAllGlobals());

describe('upt retrieve', () => {
  it('defaults to the atlas search and does not mention an Ollama failure', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'period', 'of', 'a', 'pendulum'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/Embeddings were not requested/);
    expect(t).toMatch(/This is the atlas search/);
    expect(t).toMatch(/no expression/);
    expect(t).not.toMatch(/the process is not there/);
    expect(t).not.toMatch(/proposed \(cosine/);
    // A text claim has no expression, so the atlas search accepts nothing (the owner's ruling
    // of 2026-10-09); the structural ranking of the corpus is not an acceptance of it.
    expect(t).toMatch(/nothing is accepted/);
    expect(t).toContain('    none — the claim has no expression to rank by structure');
    expect(rankByStructure({ text: 'period of a pendulum' }, canonicalRetrievalCorpus()).length).toBeGreaterThan(0);
  });

  it('--json reports the same accepted order and that embeddings were not requested', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'mass', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.command).toBe('retrieve');
    expect(env.options).toEqual({ embed: false, ollamaUrl: null, embedModel: null });

    expect(env.result.embeddings).toBe('not-requested');
    expect(env.result.proposals).toBeNull();
    expect(env.result.accepted).toEqual([]);
    expect(env.result.note).toMatch(/no expression/);
  });

  it('--embed against a closed port exits 0, names the process, and keeps the atlas order', async () => {
    // The CLI builds its embedder on the global `fetch`; the refusal is injected there rather
    // than dialled, because a sandbox that drops the packet to 127.0.0.1:1 would reach the
    // timeout and report `call-did-not-finish`, a different reason.
    vi.stubGlobal('fetch', async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    });
    const c = captureMerged();
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
    expect(env.result.accepted).toEqual([]);
  });

  /** Stub `fetch` and keep the model name of each request body. */
  function captureModels(): string[] {
    const models: string[] = [];
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      models.push((JSON.parse(String(init?.body)) as { model: string }).model);
      return new Response(JSON.stringify({ error: 'model not found' }), { status: 404 });
    });
    return models;
  }

  it('--embed --embed-model=NAME asks Ollama for NAME and reports it', async () => {
    const models = captureModels();
    const c = captureMerged();
    expect(await runCli(['retrieve', 'mass', '--embed', '--embed-model=x', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(models).toEqual(['x']);
    expect(env.options.embedModel).toBe('x');
    expect(env.result.fallback).toBe('model-not-there');
  });

  it('--embed without --embed-model asks for the default model', async () => {
    const models = captureModels();
    const c = captureMerged();
    expect(await runCli(['retrieve', 'mass', '--embed'], c.io)).toBe(0);
    expect(models).toEqual([OLLAMA_EMBEDDING_MODEL]);
    expect(text(c)).toContain(`(Ollama at http://127.0.0.1:11434), model ${OLLAMA_EMBEDDING_MODEL}`);
  });

  it('the --embed-model default is the one default of the embedder', () => {
    const flag = retrieveCommand.flags.find((f) => f.name === '--embed-model');
    expect(flag?.defaultValue).toBe(OLLAMA_EMBEDDING_MODEL);
  });

  it('an empty --embed-model is a usage error', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'mass', '--embed', '--embed-model='], c.io)).toBe(2);
    expect(text(c)).toMatch(/--embed-model/);
  });

  it('a missing claim is a usage error', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve'], c.io)).toBe(2);
    expect(text(c)).toMatch(/give a claim/);
  });

  it('help names the fallback reasons and that the default does not call out', async () => {
    const c = captureMerged();
    expect(await runCli(['help', 'retrieve'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/does not call out of process/);
    expect(t).toMatch(/--embed/);
    expect(t).toMatch(/--ollama-url/);
    expect(t).toMatch(/--embed-model=NAME/);
    expect(t).toContain(OLLAMA_EMBEDDING_MODEL);
    expect(t).toMatch(/the process is not there/);
    expect(t).toMatch(/the model is not there/);
    expect(t).toMatch(/the call does\s+not finish/);
    expect(t).toMatch(/not evidence/);
  });
});
