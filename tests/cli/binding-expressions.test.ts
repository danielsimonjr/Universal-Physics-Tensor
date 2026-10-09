/**
 * Bindings are quantities, and a withdrawn claim prints no bound number.
 *
 * A value is a bare number, a number with a unit, or an expression of
 * constants and unit literals (`v=0.6*c`, `theta=pi/2`). Every command that
 * takes a binding reads it the same way. `upt eval --show-parser --json` is
 * an envelope. A `upt path` whose regime or horizon was checked and failed
 * does not print the domain supremum.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { C_SI, M_SUN_SI } from '../../src/core/constants.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return {
    lines,
    err,
    io: { out: sink, err: (s?: string) => err.push((s ?? '') + '\n'), write: (s: string) => lines.push(s) },
  };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('');

describe('binding expressions', () => {
  it('upt metric accepts M=1Msun and theta=pi/2', async () => {
    const cap = capture();
    const code = await runCli(['metric', 'schwarzschild', 'M=1Msun', 'theta=pi/2', '--json'], cap.io);
    expect(code).toBe(0);
    const result = JSON.parse(text(cap)).result;
    expect(result.parameters.M).toBe(M_SUN_SI);
    expect(result.parameters.theta).toBeCloseTo(Math.PI / 2, 12);
    expect(result.notes.join('\n')).toMatch(/Msun is 1\.989e\+?30 kg/);
  });

  it('upt metric rejects a mass given as a time', async () => {
    const cap = capture();
    const code = await runCli(['metric', 'schwarzschild', 'M=1s'], cap.io);
    expect(code).not.toBe(0);
    expect(cap.err.join('') + text(cap)).toMatch(/time|mass/i);
  });

  it('upt eval evaluates v=0.6*c with units', async () => {
    const cap = capture();
    const code = await runCli(['eval', '1/sqrt(1-v^2/c^2)', 'v=0.6*c'], cap.io);
    expect(code).toBe(0);
    // 1/sqrt(1-0.36) = 1.25, independent of the parser.
    expect(Number(text(cap).trim())).toBeCloseTo(1.25, 12);
  });

  it('upt eval --natural evaluates v=0.6*c with c = 1', async () => {
    const cap = capture();
    const code = await runCli(['eval', '1/sqrt(1-v^2/c^2)', 'v=0.6*c', '--natural'], cap.io);
    expect(code).toBe(0);
    expect(Number(text(cap).trim())).toBeCloseTo(1.25, 12);
  });

  it('upt eval --show-parser --json is an envelope, and the text form stays the bare word', async () => {
    const json = capture();
    expect(await runCli(['eval', '--show-parser', '--json'], json.io)).toBe(0);
    const env = JSON.parse(text(json));
    expect(env.command).toBe('eval');
    expect(env.result.parser).toBe('mathts');
    const bare = capture();
    expect(await runCli(['eval', '--show-parser'], bare.io)).toBe(0);
    expect(text(bare).trim()).toBe('mathts');
  });

  it('a violated upt path prints no bound number', async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.8', 'T0=1', 't=1'],
      cap.io,
    );
    expect(code).toBe(3);
    const body = text(cap);
    expect(body).toMatch(/regimes at --at: VIOLATED/);
    expect(body).toMatch(/no bound on this path is claimed at this point/);
    expect(body).not.toMatch(/composed bound: K =/);
    expect(body).not.toMatch(/bound at this point: K =/);
    const json = capture();
    expect(
      await runCli(
        ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.8', 'T0=1', 't=1', '--json'],
        json.io,
      ),
    ).toBe(3);
    const result = JSON.parse(text(json)).result;
    expect(result.kind).toBe('bound');
    expect(result).not.toHaveProperty('bound');
    expect(result.pointBound).toBeNull();
  });

  it('a horizon that fails prints no bound number', async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=1000'],
      cap.io,
    );
    expect(code).toBe(3);
    const body = text(cap);
    expect(body).toMatch(/horizons at t=1000: NOT all hold/);
    expect(body).not.toMatch(/composed bound: K =/);
    expect(body).not.toMatch(/bound at this point: K =/);
    const json = capture();
    await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=1000', '--json'],
      json.io,
    );
    const result = JSON.parse(text(json)).result;
    expect(result.kind).toBe('bound');
    expect(result).not.toHaveProperty('bound');
    expect(result.pointBound).toBeNull();
  });

  it('a path inside its regime still prints the supremum and the point bound', async () => {
    const cap = capture();
    const code = await runCli(
      ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10'],
      cap.io,
    );
    expect(code).toBe(0);
    expect(text(cap)).toMatch(/composed bound: K = 1 · delta = 0\.0158525/);
    expect(text(cap)).toMatch(/bound at this point: K = 1 · delta = 0\.00250574/);
  });

  it('upt evaluate accepts v-style expressions and unit expressions in --sigma', async () => {
    const cap = capture();
    const code = await runCli(['evaluate', 'be-51', 'b_m=1e8', 'M_kg=1*M_sun'], cap.io);
    expect(code).toBe(0);
    expect(text(cap)).toMatch(/1\*M_sun|M_kg/);
    const sigma = capture();
    const sigmaCode = await runCli(
      ['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', '--sigma', 'T_K=3*1', '--sigma', 'R_ohm=10'],
      sigma.io,
    );
    expect(sigmaCode).toBe(0);
    expect(text(sigma)).toMatch(/T_K/);
  });

  it('upt explain, regime, path --at, sweep, tolerance and --anchor accept expressions', async () => {
    const explained = capture();
    expect(await runCli(['explain', 'hawking-temperature', 'mass=1*M_sun'], explained.io)).toBe(0);
    const plain = capture();
    expect(await runCli(['explain', 'hawking-temperature', `mass=${M_SUN_SI}`], plain.io)).toBe(0);
    const recovered = (body: string) => /Recovered value: ([0-9.eE+-]+)/.exec(body)?.[1];
    expect(recovered(text(explained))).toBe(recovered(text(plain)));

    const regime = capture();
    expect(await runCli(['regime', 'oscillators', '--at', 'theta0=pi/2', 'T0=1', 't=1'], regime.io)).toBe(3);
    expect(text(regime)).toMatch(/VIOLATED/);

    const at = capture();
    expect(
      await runCli(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=pi/10', 'T0=1', 't=1'], at.io),
    ).toBe(0);
    expect(text(at)).toMatch(/regimes at --at: all hold/);

    const sweep = capture();
    expect(
      await runCli(
        ['path', 'model-pendulum', 'model-spring', '--at', 'T0=1', 't=1', '--sweep', 'theta0=pi/30:pi/10:4'],
        sweep.io,
      ),
    ).toBe(0);
    expect(text(sweep)).toMatch(/4 samples/);

    const tol = capture();
    expect(
      await runCli(
        ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=1', '--tolerance=pi/100'],
        tol.io,
      ),
    ).toBe(0);
    expect(text(tol)).toMatch(/ADEQUATE/);

    const anchor = capture();
    expect(await runCli(['discover', '--anchor=mass=1*M_sun', '--max-orders=1'], anchor.io)).toBe(0);
  });

  it('a garbage binding still fails, and the anchor error stays the pinned sentence', async () => {
    const explained = capture();
    // A bad value is exit 1 on every command (9.0.0 audit K10); a missing `=` stays usage (2).
    expect(await runCli(['explain', 'hawking-temperature', 'mass=abc'], explained.io)).toBe(1);
    const anchor = capture();
    expect(await runCli(['discover', '--anchor=mass=abc'], anchor.io)).toBe(1);
    expect(anchor.err.join('')).toMatch(
      /upt: --anchor expects k=v with a finite numeric value, got "mass=abc"\./,
    );
    const gamma = capture();
    expect(await runCli(['eval', '1/sqrt(1-v^2/c^2)', 'v=0.6*c*nope'], gamma.io)).not.toBe(0);
  });

  it('Lorentz factor at 0.6c is 1.25 by an independent arithmetic check', () => {
    expect(1 / Math.sqrt(1 - 0.6 * 0.6)).toBeCloseTo(1.25, 12);
    expect(0.6 * C_SI).toBeGreaterThan(1e8);
  });
});
