/**
 * `rk4Trajectory`: the fixed-step RK4 run that keeps every state, built on the
 * same MathTS `solveODESystem` call as `integrateRK4` (which keeps only the
 * last). The two must agree exactly on the final state, and the trajectory
 * must be the one continuous run, not a re-entry per sample.
 */
import { describe, expect, it } from 'vitest';
import { integrateRK4 } from '../../src/numerical/null-ray-integrator.js';
import { rk4Trajectory } from '../../src/numerical/rk4-trajectory.js';

const harmonic = (_t: number, y: readonly number[]): number[] => [y[1]!, -y[0]!];

describe('rk4Trajectory', () => {
  it('returns steps + 1 states, the first being y0 and the last integrateRK4’s final state, bit for bit', () => {
    const traj = rk4Trajectory(harmonic, [1, 0], 0, 2 * Math.PI, 400);
    expect(traj).toHaveLength(401);
    expect(traj[0]).toEqual([1, 0]);
    expect(traj[400]).toEqual(integrateRK4(harmonic, [1, 0], 0, 2 * Math.PI, 400));
  });

  it('tracks cos t at every step to 1e-10 over one period with 4000 steps', () => {
    const steps = 4000;
    const h = (2 * Math.PI) / steps;
    const traj = rk4Trajectory(harmonic, [1, 0], 0, 2 * Math.PI, steps);
    let worst = 0;
    for (let i = 0; i <= steps; i++) worst = Math.max(worst, Math.abs(traj[i]![0]! - Math.cos(i * h)));
    expect(worst).toBeLessThan(1e-10);
  });

  it('is one continuous run: the state after k steps equals integrateRK4 over the same k steps', () => {
    const traj = rk4Trajectory(harmonic, [1, 0], 0, 1, 10);
    for (const k of [1, 3, 7]) {
      expect(traj[k]).toEqual(integrateRK4(harmonic, [1, 0], 0, k / 10, k));
    }
  });

  it('refuses a non-positive or non-integer step count', () => {
    expect(() => rk4Trajectory(harmonic, [1, 0], 0, 1, 0)).toThrow(/step count/);
    expect(() => rk4Trajectory(harmonic, [1, 0], 0, 1, 2.5)).toThrow(/step count/);
  });
});
