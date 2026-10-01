/**
 * CLI behavior from the open dogfood rows: refusal, conventions, search,
 * path, curvature, test plans, and the falsifier list.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { C_SI, E_SI, G_SI, M_SUN_SI } from '../../src/core/constants.js';

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

describe('upt eval — unbound e, CODATA names, units, parser', () => {
  it('reads bare e as the elementary charge, exp(1) and euler as Euler, and refuses --allow-euler', async () => {
    const charge = capture();
    expect(await runCli(['eval', 'e'], charge.io)).toBe(0);
    expect(Number(text(charge).trim())).toBeCloseTo(E_SI, 15);
    expect(charge.err.join('')).not.toMatch(/Euler/);
    const squared = capture();
    expect(await runCli(['eval', 'e^2'], squared.io)).toBe(0);
    expect(Number(text(squared).trim())).toBeCloseTo(E_SI * E_SI, 30);
    const named = capture();
    expect(await runCli(['eval', 'e_charge'], named.io)).toBe(0);
    expect(Number(text(named).trim())).toBeCloseTo(E_SI, 15);
    const euler = capture();
    expect(await runCli(['eval', 'exp(1)'], euler.io)).toBe(0);
    expect(Number(text(euler).trim())).toBeCloseTo(Math.E, 12);
    const spelled = capture();
    expect(await runCli(['eval', 'euler'], spelled.io)).toBe(0);
    expect(Number(text(spelled).trim())).toBeCloseTo(Math.E, 12);
    const energy = capture();
    expect(await runCli(['eval', 'E'], energy.io)).toBe(2);
    expect(energy.err.join('')).toMatch(/E is energy/);
    const flagged = capture();
    expect(await runCli(['eval', 'e', '--allow-euler'], flagged.io)).toBe(2);
    expect(flagged.err.join('')).toMatch(/unknown flag/);
    const coulomb = capture();
    expect(await runCli(['eval', 'e^2/(4*pi*eps0*r^2)', 'r=1'], coulomb.io)).toBe(0);
    expect(Number(text(coulomb).trim())).toBeGreaterThan(1e-28);
    expect(coulomb.err.join('')).not.toMatch(/Euler/);
  });

  it('--show-parser prints the kind and upt version stays a bare semver', async () => {
    const parser = capture();
    expect(await runCli(['eval', '--show-parser'], parser.io)).toBe(0);
    expect(text(parser).trim()).toBe('mathts');
    const version = capture();
    expect(await runCli(['version'], version.io)).toBe(0);
    expect(text(version).trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('accepts a scientific literal, 1Msun, AU and --natural rest energy', async () => {
    const hbar = capture();
    expect(await runCli(['eval', 'x', 'x=1.054571817e-34'], hbar.io)).toBe(0);
    expect(Number(text(hbar).trim())).toBe(1.054571817e-34);
    const sun = capture();
    expect(await runCli(['eval', 'M', 'M=1Msun'], sun.io)).toBe(0);
    expect(Number(text(sun).trim())).toBe(M_SUN_SI);
    const au = capture();
    expect(await runCli(['eval', 'x', 'x=1AU'], au.io)).toBe(0);
    expect(Number(text(au).trim())).toBe(149597870700);
    const natural = capture();
    expect(await runCli(['eval', 'm*c^2', 'm=3', '--natural'], natural.io)).toBe(0);
    expect(Number(text(natural).trim())).toBeCloseTo(3, 12);
    const si = capture();
    expect(await runCli(['eval', 'm*c^2', 'm=3'], si.io)).toBe(0);
    expect(Number(text(si).trim())).toBeCloseTo(3 * C_SI * C_SI, -2);
  });

  it('names the stored ħ when hbar is used in SI mode', async () => {
    const c = capture();
    expect(await runCli(['eval', 'hbar'], c.io)).toBe(0);
    expect(c.err.join('')).toMatch(/HBAR_SI/);
  });
});

describe('upt search indexes applied cases', () => {
  it('skin and brownian name the evaluate command', async () => {
    const skin = capture();
    expect(await runCli(['search', 'skin'], skin.io)).toBe(0);
    expect(text(skin)).toMatch(/case-skin-depth/);
    expect(text(skin)).toMatch(/upt evaluate case-skin-depth/);
    const brown = capture();
    expect(await runCli(['search', 'brownian'], brown.io)).toBe(0);
    expect(text(brown)).toMatch(/case-brownian-sphere/);
  });
});

describe('upt path names a multi-premise bridge', () => {
  it('Stokes drag to Fick has no chain and names ab-stokes-einstein', async () => {
    const c = capture();
    expect(await runCli(['path', 'model-stokes-drag', 'model-fick'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/no chain of bridges connects these models/);
    expect(t).toMatch(/ab-stokes-einstein: model-langevin \+ model-stokes-drag → model-fick/);
  });

  it('Langevin to Fick keeps its chain and still names the two-premise bridge', async () => {
    const c = capture();
    expect(await runCli(['path', 'model-langevin', 'model-fick'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/ab-langevin-diffusion/);
    expect(t).toMatch(/ab-stokes-einstein/);
  });
});

describe('upt metric', () => {
  it('Schwarzschild Kretschmann matches 48 G² M² / (c⁴ r⁶)', async () => {
    const c = capture();
    expect(await runCli(['metric', 'schwarzschild', 'M=1.989e30', 'r=1e8', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    const M = 1.989e30;
    const r = 1e8;
    const closed = (48 * G_SI * G_SI * M * M) / (C_SI ** 4 * r ** 6);
    expect(Math.abs(env.result.kretschmann - closed) / Math.abs(closed)).toBeLessThan(1e-3);
    expect(env.result.signatureNote).toMatch(/canonical Einstein-equation metric node/);
    expect(env.result.signature).toBe('(-,+,+,+)');
  });

  it('Kerr --geodesic integrates an equatorial circular orbit', async () => {
    const c = capture();
    expect(await runCli(['curvature', 'kerr', '--geodesic', 'a=0', 'r=1e8'], c.io)).toBe(0);
    expect(text(c)).toMatch(/geodesic: circular orbit/);
    expect(text(c)).not.toMatch(/not implemented/);
  });

  it('Kerr --geodesic at θ off the equator integrates an inclined orbit', async () => {
    const c = capture();
    expect(await runCli(['metric', 'kerr', '--geodesic', '--json', 'a=0', 'r=1e8', 'theta=1.2'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.result.geodesic.kind).toBe('inclined');
    expect(env.result.geodesic.thetaEnd).not.toBe(env.result.geodesic.theta0);
    expect(Math.abs(env.result.geodesic.norm0 + 1)).toBeLessThan(1e-9);
  });
});

describe('upt testplan', () => {
  it('prints confirm and falsify for a confrontation and a case', async () => {
    const be = capture();
    expect(await runCli(['testplan', 'be-58'], be.io)).toBe(0);
    expect(text(be)).toMatch(/## Confirm/);
    expect(text(be)).toMatch(/## Falsify/);
    const sphere = capture();
    expect(await runCli(['testplan', 'case-brownian-sphere', '--json'], sphere.io)).toBe(0);
    const env = JSON.parse(text(sphere));
    expect(env.command).toBe('testplan');
    expect(env.result.confirm.length).toBeGreaterThan(0);
    expect(env.result.falsify.length).toBeGreaterThan(0);
  });
});

describe('discover --require-falsifier lists encoded falsifiers', () => {
  it('keeps the hidden count and names a confrontation', async () => {
    const c = capture();
    expect(await runCli(['discover', '--source=canonical', '--require-falsifier'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/--require-falsifier: \d+ of the \d+ promising hidden/);
    expect(t).toMatch(/encoded falsifiers already on the records/);
    expect(t).toMatch(/be-58 \(confrontation\)/);
    expect(t).toMatch(/ab-stokes-einstein/);
  });
});

describe('evaluate conventions and regime coordinates', () => {
  it('be-65 prints the Jeans formula and be-56 names the stored ħ', async () => {
    const jeans = capture();
    expect(await runCli(['evaluate', 'be-65', 'T_K=10', 'mu=2', 'rho_kg_per_m3=1e-18'], jeans.io)).toBe(0);
    expect(text(jeans)).toMatch(/leading 5 is convention-dependent/);
    const casimir = capture();
    expect(await runCli(['evaluate', 'be-56', 'd_m=1um'], casimir.io)).toBe(0);
    expect(text(casimir)).toMatch(/HBAR_SI/);
  });

  it('the Brownian case prints the regime --at line', async () => {
    const c = capture();
    const code = await runCli(
      ['evaluate', 'case-brownian-sphere', 'T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=1um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2', 'h_m=100um'],
      c.io,
    );
    expect(code).toBe(0);
    expect(text(c)).toMatch(/upt regime diffusion --at Re=/);
  });
});

describe('map conventions', () => {
  it('a Compton comparison says the entry is the reduced wavelength', async () => {
    const c = capture();
    await runCli(['map', '--equation', 'compton_wavelength = hbar/(mass*c)', '--equation-only'], c.io);
    expect(text(c)).toMatch(/reduced wavelength/);
  });

  it('1-eccentricity^2 is the perihelion factor', async () => {
    const c = capture();
    await runCli(
      ['map', '--equation', 'perihelion_precession = 6*pi*G*mass/(c^2*a*(1-eccentricity^2))', '--equation-only', '--bind-short'],
      c.io,
    );
    expect(text(c)).toMatch(/CE-perihelion-precession/);
  });
});
