/**
 * One name resolver for targets, inputs, eval, explain, evaluate, sigma,
 * and a regime coordinate.
 *
 * Two spellings of one quantity are one binding. An energy on any spelling
 * of temperature is `k_B T`, including a `--sigma` difference. `erasure-energy`
 * is the Landauer quantity on both sides of explain.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';

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

const out = (c: ReturnType<typeof capture>) => c.lines.join('');
const err = (c: ReturnType<typeof capture>) => c.err.join('');
const KELVIN_10EV = (10 * E_SI) / K_B_SI;
const PROTON = '1.67262192369e-27';
const KB = String(K_B_SI);

describe('one quantity name', () => {
  it('refuses two temperatures and does not print a value', async () => {
    for (const formula of ['k_B*T/e', 'k_B*temperature/e']) {
      for (const other of ['temperature=400', 'temp=400', 'T_K=400']) {
        const cap = capture();
        const code = await runCli(['eval', formula, 'T=300', other], cap.io);
        expect(code, `${formula} ${other}\n${err(cap)}`).toBe(1);
        expect(err(cap)).toMatch(/are one quantity and disagree/);
        expect(err(cap)).toMatch(/T=/);
        expect(out(cap)).not.toMatch(/[0-9]/);
      }
    }
  });

  it('uses one value when the spellings agree, for either formula', async () => {
    const expected = (K_B_SI * 300) / E_SI;
    for (const formula of ['k_B*T/e', 'k_B*temperature/e']) {
      for (const other of ['temperature=300', 'temp=300', 'T_K=300']) {
        const cap = capture();
        expect(await runCli(['eval', formula, 'T=300', other], cap.io), err(cap)).toBe(0);
        expect(Math.abs(Number(out(cap).trim()) - expected) / expected).toBeLessThan(1e-12);
      }
    }
  });

  it('reads T and temp on explain as the same kelvin as temperature', async () => {
    for (const name of ['T', 'temp', 'temperature']) {
      const cap = capture();
      expect(
        await runCli(
          ['explain', 'most-probable-speed', `boltzmann-constant=${KB}`, `${name}=10eV`, `molecular-mass=${PROTON}`, '--source=canonical'],
          cap.io,
        ),
        err(cap),
      ).toBe(0);
      expect(out(cap)).not.toMatch(/Recovered value:/);
      expect(err(cap)).toMatch(/k_B T/);
      const shown = /is ([0-9.]+e[+-]\d+) K/.exec(err(cap));
      expect(shown, err(cap)).not.toBeNull();
      expect(Number(shown![1])).toBeCloseTo(KELVIN_10EV, 0);
    }
  });

  it('resolves erasure-energy as the Landauer quantity and as a supplied input', async () => {
    const recovered = capture();
    expect(
      await runCli(['explain', 'erasure-energy', 'temperature=300', '--source=catalog'], recovered.io),
      err(recovered),
    ).toBe(0);
    const value = /Recovered value: ([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(out(recovered));
    expect(value, out(recovered)).not.toBeNull();
    const expected = K_B_SI * 300 * Math.LN2;
    expect(Math.abs(Number(value![1]) - expected) / expected).toBeLessThan(1e-9);

    const supplied = capture();
    expect(
      await runCli(
        ['explain', 'landauer-erasure-energy', 'temperature=300', 'erasure-energy=2.87e-21', '--source=catalog'],
        supplied.io,
      ),
      err(supplied),
    ).toBe(0);
    expect(out(supplied)).toMatch(/supplied input/);
    expect(out(supplied)).not.toMatch(/Recovered value:/);

    const disagree = capture();
    expect(
      await runCli(
        [
          'explain',
          'landauer-erasure-energy',
          'landauer-erasure-energy=1e-21',
          'erasure-energy=2e-21',
          '--source=catalog',
        ],
        disagree.io,
      ),
    ).toBe(1);
    expect(err(disagree)).toMatch(/are one quantity and disagree/);
    expect(out(disagree)).not.toMatch(/Recovered value/);
  });

  it('reads a temperature sigma as a difference in kelvin', async () => {
    const cap = capture();
    expect(
      await runCli(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1', '--sigma', 'T_K=10eV', '--json'], cap.io),
      err(cap),
    ).toBe(0);
    const body = JSON.parse(out(cap)) as { result: { uncertainty: { sigma: { T_K: number } } } };
    expect(Math.abs(body.result.uncertainty.sigma.T_K - KELVIN_10EV) / KELVIN_10EV).toBeLessThan(1e-9);

    const milli = capture();
    expect(await runCli(['evaluate', 'be-58', 'T_K=10meV', 'R_ohm=1', '--json'], milli.io), err(milli)).toBe(0);
    const noise = JSON.parse(out(milli)) as { result: { output: { S_V_V2_per_Hz: number } } };
    const expected = 4 * K_B_SI * ((10e-3 * E_SI) / K_B_SI);
    expect(Math.abs(noise.result.output.S_V_V2_per_Hz - expected) / expected).toBeLessThan(1e-9);

    const difference = capture();
    expect(
      await runCli(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1', '--sigma', 'T_K=10degC', '--json'], difference.io),
      err(difference),
    ).toBe(0);
    const delta = JSON.parse(out(difference)) as { result: { uncertainty: { sigma: { T_K: number } } } };
    expect(delta.result.uncertainty.sigma.T_K).toBeCloseTo(10, 9);
  });

  it('reads a juxtaposed unit on an evaluator input', async () => {
    const fin = async (heat: string) => {
      const cap = capture();
      expect(
        await runCli(
          ['evaluate', 'be-129', `h_W_per_m2_K=${heat}`, 'k_W_per_m_K=400', 't_m=1e-3', 'L_fin_m=0.01', '--json'],
          cap.io,
        ),
        err(cap),
      ).toBe(0);
      const body = JSON.parse(out(cap)) as { result: { output: { eta: number } } };
      return body.result.output.eta;
    };
    const glued = await fin('20W/m2K');
    const grouped = await fin('20W/(m^2*K)');
    expect(Math.abs(glued - 0.9966799462495581) / 0.9966799462495581).toBeLessThan(1e-9);
    expect(glued).toBeCloseTo(grouped, 12);

    const negative = capture();
    expect(
      await runCli(
        ['evaluate', 'be-70', 'mu_m2_per_Vs=1400cm^2/Vs', 'T_K=300', 'q_C=-1.602176634e-19'],
        negative.io,
      ),
    ).toBe(1);
    expect(err(negative)).toMatch(/same sign/);

    const positive = capture();
    expect(
      await runCli(
        ['evaluate', 'be-70', 'mu_m2_per_Vs=1400cm^2/Vs', 'T_K=300', 'q_C=1.602176634e-19', '--json'],
        positive.io,
      ),
      err(positive),
    ).toBe(0);
    const einstein = JSON.parse(out(positive)) as { result: { output: Record<string, number>; inputs: { mu_m2_per_Vs: number } } };
    expect(einstein.result.inputs.mu_m2_per_Vs).toBeCloseTo(0.14, 12);
  });
});
