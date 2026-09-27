/**
 * The CLI-only applied-physicist audit of 0.47.1 (docs/audit/Universal_Physics_Tensor_CLI_Audit.md,
 * §11 findings ledger). One block per finding not already pinned beside its command's own tests.
 * In-process against dist/cli/main.js.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
async function run(args: string[]): Promise<{ code: number; text: string }> {
  const c = capture();
  const code = await runCli(args, c.io);
  return { code, text: c.lines.join('') };
}

describe('F14 — help states no fixed isolated-bridge count', () => {
  it('top-level help does not hard-code "20 ISOLATED"', async () => {
    const { text } = await run(['help']);
    expect(text).not.toMatch(/\b20 ISOLATED\b/);
    expect(text).toMatch(/upt connectors \[--source=catalog\|canonical\|both\]/);
  });

  it('connectors help does not hard-code the catalog count either', async () => {
    const { text } = await run(['help', 'connectors']);
    expect(text).not.toMatch(/20-bridge/);
  });

  it('connectors prints its own count for the selected source', async () => {
    const both = await run(['connectors']);
    const catalog = await run(['connectors', '--source=catalog']);
    const count = (t: string) => {
      const m = /(\d+) of the isolated bridges have a same-kind connector; (\d+) are truly unconnected/.exec(t);
      return m === null ? null : Number(m[1]) + Number(m[2]);
    };
    expect(count(both.text)).not.toBeNull();
    expect(count(catalog.text)).not.toBeNull();
    expect(count(both.text)).not.toBe(count(catalog.text));
  });
});

describe('top-level help agrees with the commands it summarizes', () => {
  it('confront: margin to the acceptance threshold, not "to exclusion" (F07)', async () => {
    const { text } = await run(['help']);
    expect(text).not.toMatch(/margin to exclusion/);
    expect(text).toMatch(/1σ acceptance threshold/);
  });

  it('ground: documents --source (F04)', async () => {
    const { text } = await run(['help']);
    expect(text).toMatch(/upt ground <quantityA> <quantityB> \[--source=catalog\|canonical\|both\]/);
  });

  it('path: says a route may cross families (F01)', async () => {
    const { text } = await run(['help']);
    expect(text).toMatch(/across families/);
  });
});
