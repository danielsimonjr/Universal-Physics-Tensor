/**
 * The linear oscillator at the W7p fine step, before the hand RK4 loop is
 * the production stepper. Both that loop and MathTS `solveODESystem` with
 * `dt` match the exact solution on one step.
 */
import { solveODESystem } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { linearAccel, rk4Step, W2 } from '../../src/atlas/oscillators/pendulum-motion.js';

/** The hand loop `rk4Step` had before it called `solveODESystem`. */
function handRk4(x: number, v: number, h: number, accel: (x: number) => number): [number, number] {
  const k1x = v;
  const k1v = accel(x);
  const k2x = v + 0.5 * h * k1v;
  const k2v = accel(x + 0.5 * h * k1x);
  const k3x = v + 0.5 * h * k2v;
  const k3v = accel(x + 0.5 * h * k2x);
  const k4x = v + h * k3v;
  const k4v = accel(x + h * k3x);
  return [x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x), v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)];
}

describe('linear oscillator at the W7p fine step', () => {
  const theta0 = 0.2;
  const h = 1 / 200;
  const omega = Math.sqrt(W2);
  const exact: [number, number] = [
    theta0 * Math.cos(omega * h),
    -theta0 * omega * Math.sin(omega * h),
  ];

  it('matches the exact solution for the hand loop and for solveODESystem', () => {
    const hand = handRk4(theta0, 0, h, linearAccel);
    const sol = solveODESystem((_t, y) => [y[1]!, linearAccel(y[0]!)], [theta0, 0], [0, h], { dt: h });
    const end = sol.y[sol.y.length - 1]!;
    expect(Math.abs(hand[0] - exact[0])).toBeLessThan(1e-9);
    expect(Math.abs(hand[1] - exact[1])).toBeLessThan(1e-9);
    expect(Math.abs(end[0]! - exact[0])).toBeLessThan(1e-9);
    expect(Math.abs(end[1]! - exact[1])).toBeLessThan(1e-9);
    expect([end[0], end[1]]).toEqual(hand);
    expect(rk4Step(theta0, 0, h, linearAccel)).toEqual(hand);
  });
});

// A "still exports the leapfrog and heat steps" block stood here, three `typeof` checks on named
// imports; an import that resolves cannot fail them (law 3). Removed 2026-10-15. The three
// steps are exercised by the atlas witnesses that call them.
