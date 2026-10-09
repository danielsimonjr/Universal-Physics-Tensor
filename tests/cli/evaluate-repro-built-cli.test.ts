/**
 * The issues' own repro commands, against the built CLI (`bin/upt.mjs` over `dist/`).
 *
 * Issue 454: `upt evaluate` blamed the validity domain when an input was absent.
 * #491 fixed `evaluateRelation`, but the CLI called the evaluator's `run`, a second
 * path that checked the domain before presence. Issue 458: `upt eval rho rho=1g/cm^3`
 * printed 999.9999999999999. #490 snapped the scale inside `parseUnit`, but the
 * binding reader `upt eval` uses took MathTS's float SI value. Both fixes were
 * library-only; these run the commands a user types.
 */
import '../helpers/dist.js';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cli = resolve(dirname(fileURLToPath(import.meta.url)), '../../bin/upt.mjs');

function upt(args: readonly string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [cli, ...args], { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

describe('upt evaluate names a missing input before any domain check (issue 454, the CLI path)', () => {
  it.each([
    [['be-133', 'c_kg_per_s=2', 'k_N_per_m=1'], "be-133: missing input 'm_kg'"],
    [['be-126', 'n=10', 'eps_F_per_m=8.85e-12', 'h_m=1e-5', 'V_volts=10'], "be-126: missing input 'g_m'"],
    [['be-77', 'R_m=0.01', 'deltaP_Pa=100', 'L_m=1'], "be-77: missing input 'mu_Pa_s'"],
    [['be-55'], "be-55: missing input 'C'"],
  ])('upt evaluate %j', (args, message) => {
    const { status, stderr } = upt(['evaluate', ...args]);
    expect(status).toBe(1);
    expect(stderr).toContain(message);
    expect(stderr).not.toMatch(/validity domain/);
  });

  it('a value outside the domain is still a domain failure, so the check above can fail', () => {
    const { status, stderr } = upt(['evaluate', 'be-133', 'c_kg_per_s=2', 'k_N_per_m=-1', 'm_kg=1']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/be-133: inputs violate validity domain/);
  });

  it('every absent input is named at once', () => {
    const { stderr } = upt(['evaluate', 'be-133', 'c_kg_per_s=2']);
    expect(stderr).toContain("missing input 'k_N_per_m', 'm_kg'");
  });
});

describe('upt evaluate refuses a non-finite input, and every input error has one prefix', () => {
  it.each(['NaN', 'Infinity', '-Infinity'])('c_kg_per_s=%s is a bad value, not a domain failure', (bad) => {
    const { status, stderr } = upt(['evaluate', 'be-133', `c_kg_per_s=${bad}`, 'k_N_per_m=1', 'm_kg=1']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/^upt evaluate: be-133: /);
    expect(stderr).toMatch(/finite/);
    expect(stderr).not.toMatch(/validity domain/);
  });

  it.each([
    [['be-133', 'c_kg_per_s=2', 'k_N_per_m=1'], /^upt evaluate: be-133: missing input 'm_kg'/],
    [['be-133', 'c_kg_per_s=2', 'k_N_per_m=1', 'm_kg=1', 'zz=1'], /^upt evaluate: be-133: 'zz' is not an input here/],
    [['be-133', 'c_kg_per_s=2', 'c_kg_per_s=3', 'k_N_per_m=1', 'm_kg=1'], /^upt evaluate: be-133: 'c_kg_per_s' is given twice/],
    [['be-133', 'c_kg_per_s=NaN', 'k_N_per_m=1', 'm_kg=1'], /^upt evaluate: be-133: 'NaN' is not a finite number/],
    [['case-resistor-noise', 'T_K=300'], /^upt evaluate: case-resistor-noise: missing input 'R_ohm'/],
  ])('upt evaluate %j exits 1 under the one prefix', (args, pattern) => {
    const { status, stderr } = upt(['evaluate', ...args]);
    expect(status).toBe(1);
    expect(stderr).toMatch(pattern);
  });
});

describe('upt eval reads a unit literal exactly (issue 458, the CLI path)', () => {
  it.each([
    [['eval', 'rho', 'rho=1g/cm^3'], '1000'],
    [['eval', 'gamma', 'gamma=72mN/m'], '0.072'],
    [['eval', 'x', 'x=1ug'], '1e-9'],
  ])('upt %j prints %s', (args, printed) => {
    const { status, stdout } = upt(args);
    expect(status).toBe(0);
    expect(stdout.trim()).toBe(printed);
  });

  it('upt evaluate converts the same literal exactly', () => {
    const { stdout } = upt(['evaluate', 'be-133', 'c_kg_per_s=2', 'k_N_per_m=1', 'm_kg=1g']);
    expect(stdout).toContain('converted: 1g → 0.001 kg');
  });
});
