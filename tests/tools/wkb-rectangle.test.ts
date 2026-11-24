import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tool = fileURLToPath(new URL('../../tools/wkb-rectangle.mjs', import.meta.url));
const run = (profile: [number, number][], stateEnergyJ = 0) => spawnSync(process.execPath, [tool], {
  encoding: 'utf8',
  input: JSON.stringify({
    stateEnergyJ,
    points: profile.map(([positionM, potentialJ]) => ({ positionM, potentialJ })),
  }),
});

describe('constant-mass profile reduction', () => {
  it('matches the analytic triangular width at interpolated turning points', () => {
    const result = run([[-2e-10, 0], [0, 4e-20], [2e-10, 0]], 2e-20);
    expect(result.status, result.stderr).toBe(0);
    const rectangle = JSON.parse(result.stdout);
    expect(rectangle.barrierHeightJ).toBe(2e-20);
    expect(rectangle.actualWidthM / 1e-10).toBeCloseTo(4 / 3, 14);
    expect(rectangle.turningPointsM).toEqual([-1e-10, 1e-10]);
  });

  it('adds the plateau and both shoulders of a trapezoidal barrier', () => {
    const result = run([[-2e-10, 0], [-1e-10, 2e-20], [1e-10, 2e-20], [2e-10, 0]]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).actualWidthM / 1e-10).toBeCloseTo(2 + 4 / 3, 14);
  });

  it('refuses an unbracketed profile', () => {
    const result = run([[0, 1], [1, 2], [2, 0]]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/bracketed/);
  });

  it('refuses multiple forbidden intervals', () => {
    const result = run([[0, 0], [1, 2], [2, 0], [3, 2], [4, 0]]);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/multiple forbidden intervals/);
  });
});
