/**
 * A MathTS function name used as a quantity (`gamma`, `distance`) must remain a
 * free variable. Swallowing it made `upt map --equation` refuse the adiabatic
 * sound speed and Ampere's law, and `upt eval` report "got function" instead of
 * a missing value. `gamma(5)` stays the gamma function.
 *
 * In-process against the built CLI (`dist/cli/main.js`).
 */
import '../helpers/dist.js';
import { run } from '../helpers/cli-run.js';
import { describe, it, expect } from 'vitest';

describe('quantity names that collide with MathTS functions', () => {
  it('sound speed with gamma is dimensionally a velocity and is not refused', async () => {
    const r = await run([
      'map',
      '--source=canonical',
      '--equation-only',
      '--equation',
      'speed = sqrt(gamma*pressure/density)',
    ]);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe('');
    expect(r.stdout).toMatch(/dimensionally consistent: \[velocity\]/);
    expect(r.stdout).not.toMatch(/undeclared symbol 'gamma'/);
  });

  it('eval of a bare gamma asks for a value; gamma(5) is Γ(5) = 24; a supplied gamma is the quantity', async () => {
    const bare = await run(['eval', 'gamma']);
    expect(bare.code).toBe(2);
    expect(bare.stderr).toMatch(/missing values for: gamma/);
    expect(bare.stderr).not.toMatch(/got function/);

    const call = await run(['eval', 'gamma(5)']);
    expect(call.code).toBe(0);
    expect(Number(call.stdout.trim())).toBe(24);

    const air = await run(['eval', 'sqrt(gamma*p/rho)', 'gamma=1.4', 'p=101325', 'rho=1.225']);
    expect(air.code).toBe(0);
    expect(Number(air.stdout.trim())).toBeCloseTo(Math.sqrt((1.4 * 101325) / 1.225), 8);
  });

  it("Ampere's law with distance is not refused as an undeclared symbol", async () => {
    const r = await run([
      'map',
      '--source=canonical',
      '--equation-only',
      '--equation',
      'magnetic_field = mu_0*current/(2*pi*distance)',
    ]);
    expect(r.code).not.toBe(2);
    expect(r.stderr).not.toMatch(/undeclared symbol 'distance'/);
    expect(r.stdout).toMatch(/distance/);
  });
});
