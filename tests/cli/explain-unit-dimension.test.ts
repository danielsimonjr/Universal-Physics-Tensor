/**
 * `upt explain` kept the SI scale of a unit and dropped its dimension: `nu=500nm`
 * was read as Hertz, `pressure=1km` as Pa, `flow-velocity=1s` as m/s, and
 * `wavelength=1kg` as a metre. `upt evaluate` rejects the same mismatches,
 * because it passes the parameter's declared unit to the binding reader.
 * Issues #542 and #537.
 *
 * The check runs after `readNamedBinding`: a bare number is already in the
 * quantity's unit and stays accepted; a dimensioned value must match the
 * quantity's own dimension, read from the graph's quantity registry the
 * explain path already uses.
 */
import { allText, capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { H_SI } from '../../src/core/constants.js';

function recovered(body: string): number | undefined {
  const m = /Recovered value: ([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(body);
  return m === null ? undefined : Number(m[1]);
}

describe('explain refuses a unit whose dimension is not the quantitys dimension', () => {
  it('photon-energy nu=500nm is a length on a frequency, not 5e-7 hertz', async () => {
    const cap = capture();
    expect(
      await runCli(['explain', 'photon-energy', 'nu=500nm', '--source=canonical'], cap.io),
    ).toBe(1);
    const body = allText(cap);
    expect(body).toMatch(/'500nm' is \[length\]/);
    expect(body).toMatch(/this input is \[frequency\] \(nu\)/);
    expect(recovered(body)).toBeUndefined();
    expect(body).not.toMatch(/3\.313035075e-40/);
  });

  it('photon-energy nu=1s is a time, not a frequency', async () => {
    const cap = capture();
    expect(
      await runCli(['explain', 'photon-energy', 'nu=1s', '--source=canonical'], cap.io),
    ).toBe(1);
    const body = allText(cap);
    expect(body).toMatch(/'1s' is \[time\]/);
    expect(body).toMatch(/this input is \[frequency\] \(nu\)/);
    expect(body).not.toMatch(/6\.62607015e-34/);
  });

  it('sound-speed pressure=1km is a length, not a pressure', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'sound-speed', 'pressure=1km', 'density=1.2', 'gamma=1.4', '--source=canonical'],
        cap.io,
      ),
    ).toBe(1);
    const body = allText(cap);
    expect(body).toMatch(/'1km' is \[length\]/);
    expect(body).toMatch(/this input is \[L\^-1 M T\^-2\] \(pressure\)/);
    expect(body).not.toMatch(/34\.1565025531987/);
  });

  it('dynamic-pressure flow-velocity=1s is a time, not a velocity', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'dynamic-pressure', 'density=1000', 'flow-velocity=1s', '--source=canonical'],
        cap.io,
      ),
    ).toBe(1);
    const body = allText(cap);
    expect(body).toMatch(/'1s' is \[time\]/);
    expect(body).toMatch(/this input is \[velocity\] \(flow-velocity\)/);
    expect(body).not.toMatch(/Recovered value: 1\b/);
  });

  it('speed wavelength=1kg is a mass, not a length', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'speed', 'frequency=1Hz', 'wavelength=1kg', '--source=canonical'],
        cap.io,
      ),
    ).toBe(1);
    const body = allText(cap);
    expect(body).toMatch(/'1kg' is \[mass\]/);
    expect(body).toMatch(/this input is \[length\] \(wavelength\)/);
    expect(body).not.toMatch(/Recovered value: 1\b/);
  });
});

describe('explain still converts a matching unit, and keeps a bare number in the quantity unit', () => {
  it('photon-energy nu=1Hz recovers h', async () => {
    const cap = capture();
    expect(
      await runCli(['explain', 'photon-energy', 'nu=1Hz', '--source=canonical'], cap.io),
    ).toBe(0);
    expect(recovered(allText(cap))).toBeCloseTo(H_SI, 39);
  });

  it('photon-energy nu=2*1kHz recovers twice h, and nu=1/(1s) recovers h', async () => {
    const doubled = capture();
    expect(
      await runCli(['explain', 'photon-energy', 'nu=2*1kHz', '--source=canonical'], doubled.io),
    ).toBe(0);
    expect(recovered(allText(doubled))).toBeCloseTo(2000 * H_SI, 39);
    const perSecond = capture();
    expect(
      await runCli(['explain', 'photon-energy', 'nu=1/(1s)', '--source=canonical'], perSecond.io),
    ).toBe(0);
    expect(recovered(allText(perSecond))).toBeCloseTo(H_SI, 39);
  });

  it('a bare number stays in SI: photon-energy nu=5e14', async () => {
    const cap = capture();
    expect(
      await runCli(['explain', 'photon-energy', 'nu=5e14', '--source=canonical'], cap.io),
    ).toBe(0);
    expect(recovered(allText(cap))).toBeCloseTo(5e14 * H_SI, 24);
  });

  it('sound-speed pressure=1kPa density=1.2g/cm^3 gamma=1.4 converts and recovers', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'sound-speed', 'pressure=1kPa', 'density=1.2g/cm^3', 'gamma=1.4', '--source=canonical'],
        cap.io,
      ),
    ).toBe(0);
    expect(recovered(allText(cap))).toBeCloseTo(Math.sqrt((1000 * 1.4) / 1200), 9);
  });

  it('dynamic-pressure flow-velocity=1m/s converts and recovers', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'dynamic-pressure', 'density=1000', 'flow-velocity=1m/s', '--source=canonical'],
        cap.io,
      ),
    ).toBe(0);
    expect(recovered(allText(cap))).toBeCloseTo(500, 6);
  });
});