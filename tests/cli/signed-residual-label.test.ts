/**
 * A comparison residual is value/reference − 1. That number is signed.
 * "Excess" names a surplus, so a negative residual printed beside that word
 * is a false label. The glossary is what the text line and the JSON meaning
 * both print.
 */
import { describe, expect, it } from 'vitest';
import { BROWNIAN_SPHERE_CASE } from '../../src/cases/brownian-sphere.js';
import { KEPLER_RV_CASE } from '../../src/cases/kepler-rv.js';
import { LUMPED_COOLING_CASE } from '../../src/cases/lumped-cooling.js';
import { RESISTOR_NOISE_CASE } from '../../src/cases/resistor-noise.js';
import { SKIN_DEPTH_CASE } from '../../src/cases/skin-depth.js';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      out: (s?: string) => stdout.push((s ?? '') + '\n'),
      err: (s?: string) => stderr.push((s ?? '') + '\n'),
      write: (s: string) => stdout.push(s),
    },
  };
}

async function run(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, stdout: cap.stdout.join(''), stderr: cap.stderr.join('') };
}

function outputLine(text: string, key: string): string {
  const line = text.split('\n').find((l) => l.includes(`${key} =`));
  expect(line, key).toBeDefined();
  return line!;
}

function meaning(outputs: readonly { key: string; meaning: string }[], key: string): string {
  const row = outputs.find((o) => o.key === key);
  expect(row, key).toBeDefined();
  return row!.meaning;
}

function expectSignedLabel(label: string): void {
  expect(label).toMatch(/signed relative difference/);
  expect(label).not.toMatch(/excess/);
}

describe('signed comparison residuals', () => {
  it('prints a negative skin-depth residual as a signed difference', async () => {
    const poor = await run([
      'evaluate',
      'case-skin-depth',
      'rho_ohm_m=1800',
      'f_Hz=1MHz',
      'mu_r=1',
      'eps_r=1',
      'l_mfp_m=39nm',
      'v_carrier_m_per_s=1.57e6',
      'thickness_m=1',
    ]);
    expect(poor.code).toBe(3);
    const line = outputLine(poor.stdout, 'maxwell_deviation');
    expect(Number(line.match(/maxwell_deviation = ([^ ]+)/)?.[1])).toBeCloseTo(-0.0487572085250777, 12);
    expectSignedLabel(line);
    expectSignedLabel(meaning(SKIN_DEPTH_CASE.outputs, 'maxwell_deviation'));
  });

  it('prints a negative lumped-cooling residual as a signed difference', async () => {
    const copper = await run([
      'evaluate',
      'case-lumped-cooling',
      ...LUMPED_COOLING_CASE.examples.valid.args,
    ]);
    expect(copper.code).toBe(0);
    const line = outputLine(copper.stdout, 'parent_deviation');
    expect(Number(line.match(/parent_deviation = ([^ ]+)/)?.[1])).toBeCloseTo(-0.000052203242016934936, 12);
    expectSignedLabel(line);
    expectSignedLabel(meaning(LUMPED_COOLING_CASE.outputs, 'parent_deviation'));
  });

  it('uses the same signed label on the other value/reference − 1 glossaries', () => {
    expectSignedLabel(meaning(RESISTOR_NOISE_CASE.outputs, 'parent_deviation'));
    expectSignedLabel(meaning(BROWNIAN_SPHERE_CASE.outputs, 'langevin_deviation'));
    expectSignedLabel(meaning(BROWNIAN_SPHERE_CASE.outputs, 'hydro_deviation'));
    expectSignedLabel(meaning(BROWNIAN_SPHERE_CASE.outputs, 'wall_deviation'));
    // (1 + q)^{2/3} − 1 is an excess for a mass ratio q ≥ 0. That label stays.
    expect(meaning(KEPLER_RV_CASE.outputs, 'two_body_deviation')).toMatch(/excess/);
  });
});
