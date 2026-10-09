/**
 * The canonical graph evaluator multiplies the sourced prefactor. The table
 * lives outside `src/canonical`. compareWithCanonical already used it. The
 * graph evaluator did not, so explain recovered the monomial and dropped 6π, ½, and 2.
 */
import { describe, expect, it } from 'vitest';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { attemptDerivation } from '../../src/composition/bridge-analysis.js';
import { runCli } from '../../src/cli/main.js';

function edge(id: string) {
  const found = CANONICAL_GRAPH.find((e) => e.id === id);
  expect(found, id).toBeDefined();
  return found!;
}

describe('canonical graph evaluator applies the sourced prefactor', () => {
  it('recovers Stokes drag, dynamic pressure, and Laplace pressure', () => {
    expect(edge('CE-stokes-drag').evaluate({ viscosity: 1e-3, radius: 1e-6, speed: 1e-4 })).toBe(
      6 * Math.PI * 1e-3 * 1e-6 * 1e-4,
    );
    expect(edge('CE-dynamic-pressure').evaluate({ density: 1000, 'flow-velocity': 2 })).toBe(2000);
    expect(edge('CE-laplace-pressure').evaluate({ 'surface-tension': 0.072, 'droplet-radius': 1e-3 })).toBe(144);
    expect(edge('CE-schwarzschild-radius').evaluate({ mass: 1 })).toBeCloseTo((2 * 6.6743e-11) / 299792458 ** 2, 12);
  });

  it('explain prints those recovered values', async () => {
    const lines: string[] = [];
    const io = {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => lines.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    };
    expect(
      await runCli(['explain', 'force', 'viscosity=1e-3', 'radius=1e-6', 'speed=1e-4', '--source=canonical'], io),
    ).toBe(0);
    expect(lines.join('')).toContain('Recovered value: 1.88495559215388e-12');
    expect(lines.join('')).not.toContain('Recovered value: 1e-13');
    lines.length = 0;
    expect(
      await runCli(['explain', 'dynamic-pressure', 'density=1000', 'flow-velocity=2', '--source=canonical'], io),
    ).toBe(0);
    expect(lines.join('')).toContain('Recovered value: 2000');
    lines.length = 0;
    expect(
      await runCli(
        ['explain', 'laplace-pressure', 'surface-tension=0.072', 'droplet-radius=1e-3', '--source=canonical'],
        io,
      ),
    ).toBe(0);
    expect(lines.join('')).toContain('Recovered value: 144');
  });

  it('derives field energy on ε₀ and Larmor on {c, ε₀}, and Stokes–Einstein at 1/(6π)', () => {
    const field = attemptDerivation(edge('CE-field-energy-density'));
    const larmor = attemptDerivation(edge('CE-larmor-power'));
    const stokes = attemptDerivation(edge('CE-stokes-einstein'));
    // ε₀ joined the closure constants on 2026-10-09 (the entries bake it); before that the audit
    // closed these two on {ℏ, c, G, e} and called the mismatch a decoy.
    expect(field.status).toBe('derived');
    expect(larmor.status).toBe('derived');
    expect(stokes.status).toBe('derived');
    expect(stokes.cleanPrefactor).toBe(true);
    expect(stokes.prefactor).toBeCloseTo(1 / (6 * Math.PI), 12);
  });
});
