/**
 * CE-sound-speed is filed under the quantity `speed`, so explaining
 * `sound-speed` has no derivation, and `gamma` is not a graph name.
 * A bound adiabatic index is √γ in front of √(P/ρ). Unbound, the factor
 * is unset and no number is recovered. Issue #390.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { compareWithCanonical } from '../../src/composition/canonical-compare.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('') + c.err.join('');

function recovered(body: string): number | undefined {
  const m = /Recovered value: ([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(body);
  return m === null ? undefined : Number(m[1]);
}

const BARE = Math.sqrt(1e5 / 1.2);
const WITH_GAMMA = Math.sqrt((1.4 * 1e5) / 1.2);

describe('sound-speed explain uses CE-sound-speed', () => {
  it('leaves unbound gamma unset and prints no recovered number', async () => {
    const cap = capture();
    expect(
      await runCli(['explain', 'sound-speed', 'pressure=1e5', 'density=1.2', '--source=canonical'], cap.io),
    ).toBe(0);
    const body = text(cap);
    expect(body).toMatch(/CE-sound-speed/);
    expect(body).not.toMatch(/Recovered value:/);
    expect(body).toMatch(/factor is unset/);
    expect(recovered(body)).toBeUndefined();
  });

  it('multiplies by √γ when gamma is bound and does not claim the constant was set to 1', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'sound-speed', 'pressure=1e5', 'density=1.2', 'gamma=1.4', '--source=canonical'],
        cap.io,
      ),
    ).toBe(0);
    const body = text(cap);
    expect(body).toMatch(/CE-sound-speed/);
    expect(recovered(body)).toBeCloseTo(WITH_GAMMA, 6);
    expect(recovered(body)).not.toBeCloseTo(BARE, 6);
    expect(body).not.toContain('sets the dimensionless constant to 1');
    expect(body).toMatch(/∝ [^\n]*\bgamma\b/);
  });

  it('gamma = 1 is the bound factor 1, not the unset sentence', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'sound-speed', 'pressure=1e5', 'density=1.2', 'gamma=1', '--source=canonical'],
        cap.io,
      ),
    ).toBe(0);
    const body = text(cap);
    expect(recovered(body)).toBeCloseTo(BARE, 6);
    expect(body).not.toContain('sets the dimensionless constant to 1');
  });

  it('explain speed with pressure and density does not use the sound-speed equation', async () => {
    const cap = capture();
    expect(
      await runCli(['explain', 'speed', 'pressure=1e5', 'density=1.2', '--source=canonical'], cap.io),
    ).toBe(0);
    const body = text(cap);
    expect(body).not.toMatch(/CE-sound-speed/);
    expect(recovered(body)).toBeUndefined();
  });

  it('a string wave still targets speed, and a Schwarzschild radius still targets radius', async () => {
    const cap = capture();
    expect(
      await runCli(['explain', 'speed', 'tension=4', 'linear-density=1', '--source=canonical'], cap.io),
    ).toBe(0);
    const body = text(cap);
    expect(body).toMatch(/CE-string-wave-speed/);
    expect(recovered(body)).toBeCloseTo(2, 8);
    const sound = CANONICAL_EQUATIONS.find((e) => e.id === 'CE-sound-speed');
    const hole = CANONICAL_EQUATIONS.find((e) => e.id === 'CE-schwarzschild-radius');
    expect(sound?.dimensional.target.name).toBe('sound-speed');
    expect(hole?.dimensional.target.name).toBe('radius');
    const viaSpeed = compareWithCanonical('speed', ['pressure', 'density'], (v) =>
      Math.sqrt(v.pressure! / v.density!),
    ).find((c) => c.id === 'CE-sound-speed');
    expect(viaSpeed?.kind).toBe('prefactor-unchecked');
  });
});
