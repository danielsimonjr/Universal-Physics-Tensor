/**
 * `upt eval` reads an energy on `T`, `temperature`, `temp`, or `T_K` as
 * `k_B T`. `upt explain` stored the joule magnitude in the kelvin slot, so
 * `temperature=10eV` was about `1.6e-19` K. Issue #386.
 *
 * `upt evaluate` reads that energy through `readNamedBinding`, the same
 * kelvin as explain, eval, a discovery anchor, a regime coordinate, and a
 * path sweep. `bindingInUnit` alone still rejects it.
 */
import { capture, text } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import * as api from '../../src/cli-api.js';
import { runCli } from '../../src/cli/main.js';
import { parseAt } from '../../src/cli/commands/regime.js';
import { parseSweep } from '../../src/cli/commands/path.js';
import { bindingInUnit, readNamedBinding } from '../../src/numerical/binding-value.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';

const errText = (c: ReturnType<typeof capture>) => c.err.join('');

const KELVIN_10EV = (10 * E_SI) / K_B_SI;
const PROTON = '1.67262192369e-27';
const KB = String(K_B_SI);
const N_A = 6.02214076e23;
const V_M3 = 0.0224;

function recovered(body: string): number {
  const m = /Recovered value: ([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(body);
  if (m === null) throw new Error(`no recovered value in:\n${body}`);
  return Number(m[1]);
}

function idealGas(k: number, temperature: string) {
  return [
    'explain',
    'pressure',
    `boltzmann-constant=${k}`,
    `temperature=${temperature}`,
    `V=${V_M3}`,
    `N=${N_A}`,
    '--source=canonical',
  ];
}

describe('explain temperature bindings', () => {
  it('reads most-probable-speed temperature=10eV as the kelvin whose kT is 10 eV', async () => {
    const energy = capture();
    expect(
      await runCli(
        ['explain', 'most-probable-speed', `boltzmann-constant=${KB}`, 'temperature=10eV', `molecular-mass=${PROTON}`, '--source=canonical'],
        energy.io,
      ),
    ).toBe(0);
    const kelvin = capture();
    expect(
      await runCli(
        ['explain', 'most-probable-speed', `boltzmann-constant=${KB}`, `temperature=${KELVIN_10EV}`, `molecular-mass=${PROTON}`, '--source=canonical'],
        kelvin.io,
      ),
    ).toBe(0);
    expect(text(energy)).not.toMatch(/Recovered value:/);
    expect(text(kelvin)).not.toMatch(/Recovered value:/);
    expect(text(energy)).toMatch(/factor is unset/);
    expect(errText(energy)).toMatch(/k_B T/);
    const explained = /is ([0-9.]+e[+-]\d+) K/.exec(errText(energy));
    expect(explained).not.toBeNull();
    expect(Number(explained![1])).toBeCloseTo(KELVIN_10EV, 0);

    const gasEnergy = capture();
    expect(await runCli(idealGas(K_B_SI, '10eV'), gasEnergy.io)).toBe(0);
    const gasKelvin = capture();
    expect(await runCli(idealGas(K_B_SI, String(KELVIN_10EV)), gasKelvin.io)).toBe(0);
    const expected = (N_A * K_B_SI * KELVIN_10EV) / V_M3;
    expect(recovered(text(gasEnergy))).toBeCloseTo(expected, 4);
    expect(recovered(text(gasEnergy))).toBeCloseTo(recovered(text(gasKelvin)), 6);
    expect(recovered(text(gasEnergy))).not.toBeCloseTo((N_A * K_B_SI * (10 * E_SI)) / V_M3, 0);
  });

  it('a boltzmann-constant that disagrees with k_B is refused; the registered one keeps kT at 10 eV', async () => {
    // Constants win over inputs (9.0.0 audit §3 B2): a stated `boltzmann-constant` is checked against
    // the registry, never bound. A doubled k_B is a disagreement, exit 1, naming the constant.
    const doubled = 2 * K_B_SI;
    const refused = capture();
    expect(
      await runCli(
        ['explain', 'most-probable-speed', `boltzmann-constant=${doubled}`, 'temperature=10eV', `molecular-mass=${PROTON}`, '--source=canonical'],
        refused.io,
      ),
    ).toBe(1);
    expect(errText(refused)).toMatch(/k_B/);
    const thermal = (k: number, temperature: string) => [
      'explain',
      'thermal-energy',
      `boltzmann-constant=${k}`,
      `temperature=${temperature}`,
      '--source=canonical',
    ];
    const gasEnergy = capture();
    expect(await runCli(thermal(K_B_SI, '10eV'), gasEnergy.io)).toBe(0);
    const gasKelvin = capture();
    expect(await runCli(thermal(K_B_SI, String((10 * E_SI) / K_B_SI)), gasKelvin.io)).toBe(0);
    const expected = 1.5 * 10 * E_SI;
    expect(recovered(text(gasEnergy))).toBeCloseTo(expected, 4);
    expect(recovered(text(gasEnergy))).toBeCloseTo(recovered(text(gasKelvin)), 6);
  });

  it('reads plasma-beta temperature=10eV as the same beta as that kelvin', async () => {
    const pressure = '5.72957794818894e-11';
    const energy = capture();
    expect(
      await runCli(
        ['explain', 'plasma-beta', 'carrier-density=5e6', 'temperature=10eV', `magnetic-pressure=${pressure}`, '--source=catalog'],
        energy.io,
      ),
    ).toBe(0);
    const kelvin = capture();
    expect(
      await runCli(
        ['explain', 'plasma-beta', 'carrier-density=5e6', `temperature=${KELVIN_10EV}`, `magnetic-pressure=${pressure}`, '--source=catalog'],
        kelvin.io,
      ),
    ).toBe(0);
    expect(recovered(text(energy))).toBeCloseTo(recovered(text(kelvin)), 8);
    expect(recovered(text(energy))).toBeCloseTo(0.139816287366543, 5);
    expect(recovered(text(energy))).not.toBeCloseTo(1.93037217362116e-24, 6);
  });

  it('keeps a bare temperature=300 as kelvin', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'most-probable-speed', `boltzmann-constant=${KB}`, 'temperature=300', `molecular-mass=${PROTON}`, '--source=canonical'],
        cap.io,
      ),
    ).toBe(0);
    expect(text(cap)).not.toMatch(/Recovered value:/);
    expect(text(cap)).toMatch(/factor is unset/);
    expect(errText(cap)).not.toMatch(/k_B T/);
    const gas = capture();
    expect(await runCli(idealGas(K_B_SI, '300'), gas.io)).toBe(0);
    expect(recovered(text(gas))).toBeCloseTo((N_A * K_B_SI * 300) / V_M3, 4);
    expect(recovered(text(gas))).not.toBeCloseTo((N_A * 300 * E_SI) / V_M3, 0);
  });

  it('rejects a length bound to temperature and does not recover a value', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'most-probable-speed', `boltzmann-constant=${KB}`, 'temperature=1m', `molecular-mass=${PROTON}`, '--source=canonical'],
        cap.io,
      ),
    ).toBe(1);
    expect(errText(cap)).toMatch(/temperature/);
    expect(text(cap)).not.toMatch(/Recovered value/);
  });

  it('explain, evaluate, eval, a discovery anchor, parseAt, and a path sweep agree on temperature=10eV', async () => {
    const explain = capture();
    expect(
      await runCli(
        ['explain', 'most-probable-speed', `boltzmann-constant=${KB}`, 'temperature=10eV', `molecular-mass=${PROTON}`, '--source=canonical'],
        explain.io,
      ),
    ).toBe(0);
    const explained = /is ([0-9.]+e[+-]\d+) K/.exec(errText(explain));
    expect(explained).not.toBeNull();
    expect(Number(explained![1])).toBeCloseTo(KELVIN_10EV, 0);

    const evaluated = capture();
    expect(
      await runCli(
        ['evaluate', 'be-76', 'n_per_m3=5e6', 'T_K=10eV', 'p_B_Pa=5.72957794818894e-11'],
        evaluated.io,
      ),
    ).toBe(0);
    const input = /T_K=([0-9.eE+-]+)/.exec(text(evaluated));
    expect(input).not.toBeNull();
    expect(Number(input![1])).toBeCloseTo(KELVIN_10EV, 6);
    expect(text(evaluated)).toMatch(/k_B T/);

    const evaluatedKelvin = capture();
    expect(
      await runCli(
        ['evaluate', 'be-76', 'n_per_m3=5e6', `T_K=${KELVIN_10EV}`, 'p_B_Pa=5.72957794818894e-11'],
        evaluatedKelvin.io,
      ),
    ).toBe(0);
    const valueLine = (body: string): string => {
      const line = body.split('\n').find((row) => /^\s*\S+ \[[^\]]*\] = /.test(row));
      if (line === undefined) throw new Error(`no value line in:\n${body}`);
      return line;
    };
    expect(valueLine(text(evaluated))).toBe(valueLine(text(evaluatedKelvin)));

    const ev = capture();
    expect(await runCli(['eval', 'T', 'T=10eV'], ev.io)).toBe(0);
    expect(Number(text(ev).trim())).toBeCloseTo(KELVIN_10EV, 6);
    expect(errText(ev)).toMatch(/k_B T/);

    const anchor = capture();
    expect(await runCli(['discover', '--anchor=temperature=10eV', '--max-orders=1'], anchor.io)).toBe(0);
    const line = /anchor: temperature=([0-9.eE+-]+)/.exec(text(anchor));
    expect(line).not.toBeNull();
    expect(Number(line![1])).toBeCloseTo(KELVIN_10EV, 6);

    const notes: string[] = [];
    const point = parseAt(api, ['temperature=10eV'], 'regime', notes);
    expect(point.temperature).toBeCloseTo(KELVIN_10EV, 6);
    expect(notes.join('\n')).toMatch(/k_B T/);
    const sweep = parseSweep(api, 'temperature=1eV:2eV:2');
    expect(sweep.values[0]).toBeCloseTo(E_SI / K_B_SI, 8);
  });

  it('rejects a metre on a temperature name from evaluate and eval', async () => {
    const evaluated = capture();
    expect(
      await runCli(
        ['evaluate', 'be-76', 'n_per_m3=5e6', 'T_K=1m', 'p_B_Pa=1'],
        evaluated.io,
      ),
    ).toBe(1);
    expect(errText(evaluated)).toMatch(/temperature/);
    const ev = capture();
    expect(await runCli(['eval', 'T', 'T=1m'], ev.io)).toBe(1);
    expect(errText(ev)).toMatch(/temperature/);
  });

  it('keeps an energy on a non-temperature name in joules', async () => {
    expect(readNamedBinding('energy', '10eV').value).toBeCloseTo(10 * E_SI, 8);
    const ev = capture();
    expect(await runCli(['eval', 'E', 'E=10eV'], ev.io)).toBe(0);
    expect(Number(text(ev).trim())).toBeCloseTo(10 * E_SI, 6);
    expect(errText(ev)).not.toMatch(/k_B T/);
  });

  it('does not use bindingInUnit alone for an energy in a kelvin slot', () => {
    expect(() => bindingInUnit('10eV', 'K', 'absolute')).toThrow(/temperature/);
    expect(readNamedBinding('T_K', '10eV').value).toBeCloseTo(KELVIN_10EV, 6);
    expect(readNamedBinding('T_c_K', '10eV', { declaredUnit: 'K' }).value).toBeCloseTo(KELVIN_10EV, 6);
    expect(readNamedBinding('T_c_K', '10eV').value).toBeCloseTo(10 * E_SI, 8);
  });

  it('reads a discovery anchor temperature=10eV as kelvin', async () => {
    const cap = capture();
    expect(await runCli(['discover', '--anchor=temperature=10eV', '--max-orders=1'], cap.io)).toBe(0);
    const line = /anchor: temperature=([0-9.eE+-]+)/.exec(text(cap));
    expect(line).not.toBeNull();
    expect(Number(line![1])).toBeCloseTo(KELVIN_10EV, 6);
    expect(Number(line![1])).not.toBeCloseTo(10 * E_SI, 8);
  });

  it('rejects a length on a temperature anchor', async () => {
    const cap = capture();
    expect(await runCli(['discover', '--anchor=temperature=1m'], cap.io)).toBe(1);
    expect(errText(cap)).toMatch(/temperature/);
  });

  it('parseAt and parseSweep convert an energy on a temperature name', () => {
    const notes: string[] = [];
    const point = parseAt(api, ['temperature=10eV', `boltzmann-constant=${2 * K_B_SI}`], 'regime', notes);
    expect(point.temperature).toBeCloseTo((10 * E_SI) / (2 * K_B_SI), 8);
    expect(notes.join('\n')).toMatch(/k_B T/);
    expect(() => parseAt(api, ['temperature=1m'], 'regime')).toThrow(/temperature/);
    const sweep = parseSweep(api, 'temperature=1eV:2eV:2');
    expect(sweep.values[0]).toBeCloseTo(E_SI / K_B_SI, 8);
    expect(sweep.values[1]).toBeCloseTo((2 * E_SI) / K_B_SI, 8);
    expect(() => parseSweep(api, 'temperature=1m:2m:2')).toThrow(/temperature/);
  });

  it('refuses two Boltzmann spellings that disagree, and ignores one that is not J/K', () => {
    expect(() =>
      readNamedBinding('temperature', '10eV', {
        siblings: [
          { name: 'boltzmann-constant', raw: String(2 * K_B_SI) },
          { name: 'k_B', raw: '2' },
        ],
      }),
    ).toThrow(/disagree/);
    const ignored = readNamedBinding('temperature', '10eV', {
      siblings: [
        { name: 'boltzmann-constant', raw: '10eV' },
        { name: 'k_B', raw: '2' },
      ],
    });
    expect(ignored.value).toBeCloseTo((10 * E_SI) / 2, 8);
    expect(readNamedBinding('temperature', '300').value).toBe(300);
  });
});
