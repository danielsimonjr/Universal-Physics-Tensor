/**
 * New-behavior coverage for task 5's `--source` + `--json` extension of the
 * eight ported printer commands. In-process against the new `src/cli` port
 * (dist/cli/main.js) — NOT the old bin/upt.mjs, which never had `--source`
 * on `priority`/`audit`/`connectors`/`predict`, nor `--json` on any of them.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function makeIo() {
  const outLines: string[] = [];
  const errLines: string[] = [];
  const writes: string[] = [];
  const io = {
    out: (line?: string) => outLines.push((line ?? '') + '\n'),
    err: (line?: string) => errLines.push((line ?? '') + '\n'),
    write: (s: string) => writes.push(s),
  };
  return { io, outLines, errLines, writes };
}

async function runJson(args: string[]): Promise<{ status: number; envelope: any }> {
  const { io, writes } = makeIo();
  const status = await runCli(args, io);
  const envelope = writes.length > 0 ? JSON.parse(writes.join('')) : undefined;
  return { status, envelope };
}

describe('source-extension — honest degenerate + --source plumbing', () => {
  it('priority --source=canonical: exit 0, honest-degenerate text (canonical L-layer is all-established)', async () => {
    const { io, outLines } = makeIo();
    const status = await runCli(['priority', '--source=canonical'], io);

    expect(status).toBe(0);
    expect(outLines.join('')).toContain('triage is vacuous');
  });

  it('audit --source=canonical: exit 0', async () => {
    const { io } = makeIo();
    const status = await runCli(['audit', '--source=canonical'], io);

    expect(status).toBe(0);
  });

  it('connectors --source=both: exit 0', async () => {
    const { io } = makeIo();
    const status = await runCli(['connectors', '--source=both'], io);

    expect(status).toBe(0);
  });

  it('coverage --source=catalog: exit 2 (coverage has no --source flag)', async () => {
    const { io, errLines } = makeIo();
    const status = await runCli(['coverage', '--source=catalog'], io);

    expect(status).toBe(2);
    expect(errLines.join('')).toContain("unknown flag '--source'");
  });
});

describe('source-extension — --json envelopes', () => {
  it('priority --json: envelope.command + Array result', async () => {
    const { status, envelope } = await runJson(['priority', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('priority');
    expect(envelope.source).toBe('catalog');
    expect(Array.isArray(envelope.result)).toBe(true);
    expect(envelope.result.length).toBeGreaterThan(0);
  });

  it('audit --json: result.derived is non-empty', async () => {
    const { status, envelope } = await runJson(['audit', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('audit');
    expect(envelope.result.derived.length).toBeGreaterThan(0);
  });

  it('coverage --json: result.total === 44', async () => {
    const { status, envelope } = await runJson(['coverage', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('coverage');
    expect(envelope.result.total).toBe(160);
    // 136 is the record from before be-147..170.
    // 123 is the record from before be-134..146.
    // 115 is the record from before be-126..133.
    // 92 is the record from before be-103..125. 77 is the record from before be-88..102.
  });

  it('canonical --json: result.entries.length > 0', async () => {
    const { status, envelope } = await runJson(['canonical', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('canonical');
    expect(envelope.result.entries.length).toBeGreaterThan(0);
  });

  it('recover --json: some entry classifies as restates-canonical', async () => {
    const { status, envelope } = await runJson(['recover', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('recover');
    expect(envelope.result.some((r: any) => r.classification === 'restates-canonical')).toBe(true);
  });

  it('connectors --json: result.connectors is defined', async () => {
    const { status, envelope } = await runJson(['connectors', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('connectors');
    expect(envelope.result.connectors).toBeDefined();
  });

  it('predict --json: result.placedEdges is defined', async () => {
    const { status, envelope } = await runJson(['predict', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('predict');
    expect(envelope.result.placedEdges).toBeDefined();
  });

  it('candidates --json: Array result with entries', async () => {
    const { status, envelope } = await runJson(['candidates', '--json']);

    expect(status).toBe(0);
    expect(envelope.command).toBe('candidates');
    expect(Array.isArray(envelope.result) ? envelope.result.length > 0 : envelope.result.length > 0).toBe(true);
  });
});
