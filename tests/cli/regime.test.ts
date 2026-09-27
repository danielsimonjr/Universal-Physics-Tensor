/**
 * `upt regime` — in-process against the built CLI (dist/cli/main.js), the
 * convention of `confront.test.ts` and `main-dispatch.test.ts`.
 *
 * The cases that matter here are the TRI-STATE ones: a coordinate the point
 * never supplied must read as unknown/unchecked, and a regime with no
 * inequality at all must not read as a plain pass.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('upt regime', () => {
  it('lists the family at a stated point (exit 0)', async () => {
    const cap = capture();
    const code = await runCli(['regime', 'oscillators', '--at', 'theta0=0.2'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/model-pendulum/);
    expect(text).toMatch(/ab-pendulum-linear/);
  });

  it('reports a CHECKED violation by naming the inequality', async () => {
    const cap = capture();
    const code = await runCli(['regime', 'oscillators', '--at', 'theta0=0.9'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/ab-pendulum-linear: VIOLATED/);
    expect(text).toMatch(/violated: theta0 <= 0\.5/);
  });

  it("an unsupplied coordinate is 'unknown', never valid and never violated", async () => {
    const cap = capture();
    const code = await runCli(['regime', 'oscillators', '--at', 'theta0=0.2'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    // ab-chain-wave is constrained on `qa`, which the point never supplied.
    expect(text).toMatch(/ab-chain-wave: unknown/);
    expect(text).toMatch(/unchecked \(no value supplied\): qa < 1/);
    expect(text).not.toMatch(/ab-chain-wave: valid/);
    expect(text).not.toMatch(/ab-chain-wave: VIOLATED/);
  });

  it('marks a regime with no inequality as VACUOUS rather than a pass', async () => {
    const cap = capture();
    const code = await runCli(['regime', 'oscillators', '--at', 'theta0=0.2'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/model-spring: valid \(VACUOUS/);
  });

  it('refuses to synthesize a box when no --at point is given', async () => {
    const cap = capture();
    const code = await runCli(['regime', 'oscillators'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/Uncovered regions: no box stated/);
    expect(text).toMatch(/every inequality is UNCHECKED, which is not a pass/);
  });

  it('a missing family is a bad invocation value → exit 1', async () => {
    const cap = capture();
    expect(await runCli(['regime'], cap.io)).toBe(1);
  });

  it('an unknown family → exit 1', async () => {
    const cap = capture();
    const code = await runCli(['regime', 'nope'], cap.io);
    expect(code).toBe(1);
    expect(cap.lines.join('')).toMatch(/unknown family 'nope'/);
  });

  it('a non-finite --at value → exit 1', async () => {
    const cap = capture();
    expect(await runCli(['regime', 'oscillators', '--at', 'theta0=abc'], cap.io)).toBe(1);
  });

  it('an --at token that is not group=value → exit 1', async () => {
    const cap = capture();
    expect(await runCli(['regime', 'oscillators', '--at', 'theta0'], cap.io)).toBe(1);
  });

  it('an unknown flag is rejected by the parser → exit 2', async () => {
    const cap = capture();
    expect(await runCli(['regime', 'oscillators', '--bogus'], cap.io)).toBe(2);
  });

  it('--json emits the confront-shaped envelope with the tri-state preserved', async () => {
    const cap = capture();
    const code = await runCli(['regime', 'oscillators', '--at', 'theta0=0.9', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(parsed.command).toBe('regime');
    expect(typeof parsed.epistemics).toBe('string');
    expect(parsed.options).toEqual({ family: 'oscillators', at: { theta0: 0.9 }, assume: [], deny: [] });
    const byId = new Map<string, { ok: unknown; vacuous: boolean }>(
      parsed.result.records.map((r: { id: string }) => [r.id, r] as const),
    );
    expect(byId.get('ab-pendulum-linear')!.ok).toBe(false);
    expect(byId.get('ab-chain-wave')!.ok).toBe('unknown');
    expect(byId.get('model-spring')!.vacuous).toBe(true);
    expect(parsed.result.uncovered.boxStated).toBe(true);
  });

  it('--json with no point reports uncovered as null, not an empty list', async () => {
    const cap = capture();
    const code = await runCli(['regime', 'oscillators', '--json'], cap.io);
    expect(code).toBe(0);
    expect(JSON.parse(cap.lines.join('')).result.uncovered).toBe(null);
  });

  it('`upt help regime` prints the command help', async () => {
    const cap = capture();
    expect(await runCli(['help', 'regime'], cap.io)).toBe(0);
    expect(cap.lines.join('')).toMatch(/upt regime <family>/);
  });
});
