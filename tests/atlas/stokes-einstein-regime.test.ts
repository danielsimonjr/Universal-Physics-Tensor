/**
 * ab-stokes-einstein states its regime in machine form (persona finding L8, 2026-09-25).
 *
 * Its side conditions said "Re ≪ 1" and "t ≫ m/γ" in prose only. The regime had no inequality,
 * so `upt regime diffusion --at Re=1000` reported the bridge VACUOUS and valid. Stokes drag, and
 * with it D = k_B T/(6πηa), holds only in creeping flow; the Oseen correction is first order in
 * Re. The thresholds 0.1 and 0.01 are CHOSEN machine forms of "≪ 1", and the side conditions say so.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import {
  BRIDGE_LANGEVIN_DIFFUSION,
  BRIDGE_STOKES_EINSTEIN,
} from '../../src/atlas/diffusion/bridges-closure.js';
import { regimeHolds } from '../../src/atlas/regime.js';
import { runCli } from '../../dist/cli/main.js';

const TAU = 'm · gamma^-1 · t^-1';

describe('ab-stokes-einstein — the regime is machine-checked', () => {
  it('states Re ≤ 0.1 and m/(γt) ≤ 0.01, both on derived groups', () => {
    const r = BRIDGE_STOKES_EINSTEIN.regime;
    expect(r.inequalities.map((i) => [i.group, i.op, i.bound])).toEqual([
      ['Re', '<=', 0.1],
      [TAU, '<=', 0.01],
    ]);
    for (const i of r.inequalities) expect(Object.keys(r.groupDefinitions)).toContain(i.group);
  });

  it('uses the SAME overdamping group as ab-langevin-diffusion', () => {
    expect(BRIDGE_LANGEVIN_DIFFUSION.regime.inequalities.map((i) => i.group)).toContain(TAU);
  });

  it('Re = 1000 violates it; creeping flow with a long time satisfies it; Re alone is unknown', () => {
    expect(regimeHolds(BRIDGE_STOKES_EINSTEIN.regime, { Re: 1000, [TAU]: 1e-3 }).ok).toBe(false);
    expect(regimeHolds(BRIDGE_STOKES_EINSTEIN.regime, { Re: 0.05, [TAU]: 1e-3 }).ok).toBe(true);
    expect(regimeHolds(BRIDGE_STOKES_EINSTEIN.regime, { Re: 0.05 }).ok).toBe('unknown');
  });

  it('the side conditions say the thresholds are chosen', () => {
    const text = BRIDGE_STOKES_EINSTEIN.sideConditions.join(' ');
    expect(text).toMatch(/Re ≤ 0\.1: a chosen threshold/);
    expect(text).toMatch(/m\/\(γt\) ≤ 0\.01: a chosen threshold/);
  });

  it('`upt regime diffusion --at Re=1000` reports it VIOLATED, not VACUOUS', async () => {
    const lines: string[] = [];
    const sink = (s?: string) => lines.push((s ?? '') + '\n');
    await runCli(['regime', 'diffusion', '--at', 'Re=1000'], { out: sink, err: sink, write: (s: string) => lines.push(s) });
    const text = lines.join('');
    expect(text).toMatch(/\[bridge\] ab-stokes-einstein: VIOLATED/);
  });
});
