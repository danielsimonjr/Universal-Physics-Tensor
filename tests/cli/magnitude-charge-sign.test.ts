/**
 * A frequency or a radius is a magnitude. The plasma frequency is even in
 * the carrier charge, and a gyroradius is a length. Buckingham still writes
 * the odd dimensional exponent. Explain prints that exponent as a magnitude,
 * so the positive number sits beside `|charge|`. An even integer power stays
 * bare. A signed cyclotron frequency and a Hall coefficient stay signed.
 * Issues #388, #389, and #419.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { E_SI, M_E_SI } from '../../src/core/constants.js';
import { EPS0_SI } from '../../src/dimensional/formula-names.js';

const edge = (id: string) => {
  const found = CANONICAL_GRAPH.find((e) => e.id === id);
  if (found === undefined) throw new Error(`missing ${id}`);
  return found;
};

describe('magnitudes stay positive when the carrier charge is negative', () => {
  it('plasma frequency is even in charge', () => {
    const expected = Math.sqrt((1e6 * E_SI * E_SI) / (EPS0_SI * M_E_SI));
    const value = edge('CE-plasma-frequency').evaluate({
      'carrier-density': 1e6,
      charge: -E_SI,
      'vacuum-permittivity': EPS0_SI,
      mass: M_E_SI,
    });
    expect(value).toBeCloseTo(expected, 6);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeCloseTo(
      edge('CE-plasma-frequency').evaluate({
        'carrier-density': 1e6,
        charge: E_SI,
        'vacuum-permittivity': EPS0_SI,
        mass: M_E_SI,
      }),
      8,
    );
  });

  it('Larmor radius is a length', () => {
    const expected = (M_E_SI * 1e6) / (E_SI * 1);
    const value = edge('CE-larmor-radius').evaluate({
      mass: M_E_SI,
      speed: 1e6,
      charge: -E_SI,
      'magnetic-field': 1,
    });
    expect(value).toBeCloseTo(expected, 6);
    expect(value).toBeGreaterThan(0);
  });

  it('explain of a negative carrier charge prints the positive magnitudes', async () => {
    const cap = { lines: [] as string[], err: [] as string[] };
    const io = {
      out: (s?: string) => cap.lines.push((s ?? '') + '\n'),
      err: (s?: string) => cap.err.push((s ?? '') + '\n'),
      write: (s: string) => cap.lines.push(s),
    };
    expect(
      await runCli(
        [
          'explain',
          'plasma-frequency',
          'carrier-density=1e6',
          `charge=${-E_SI}`,
          `vacuum-permittivity=${EPS0_SI}`,
          `mass=${M_E_SI}`,
          '--source=canonical',
        ],
        io,
      ),
    ).toBe(0);
    const body = cap.lines.join('');
    expect(body).not.toMatch(/Recovered value: -/);
    expect(body).toMatch(/Recovered value: 56414\.6023118063/);
    for (const line of body.match(/plasma-frequency ∝ [^\n]+/g) ?? []) {
      expect(line, line).toContain('|charge|');
      expect(line.replaceAll('|charge|', ''), line).not.toMatch(/charge/);
    }
    expect(body.match(/plasma-frequency ∝ /g)?.length).toBeGreaterThan(0);

    const larmor = { lines: [] as string[] };
    expect(
      await runCli(
        [
          'explain',
          'larmor-radius',
          `mass=${M_E_SI}`,
          'speed=1e6',
          `charge=${-E_SI}`,
          'magnetic-field=1',
          '--source=canonical',
        ],
        {
          out: (s?: string) => larmor.lines.push((s ?? '') + '\n'),
          err: () => undefined,
          write: (s: string) => larmor.lines.push(s),
        },
      ),
    ).toBe(0);
    const larmorText = larmor.lines.join('');
    expect(larmorText).toMatch(/Recovered value: 0\.00000568563010356572/);
    for (const line of larmorText.match(/larmor-radius ∝ [^\n]+/g) ?? []) {
      expect(line, line).toContain('|charge|^-1');
      expect(line.replaceAll('|charge|', ''), line).not.toMatch(/charge/);
    }
    expect(larmorText.match(/larmor-radius ∝ /g)?.length).toBeGreaterThan(0);
  });

  it('prints an even integer power of charge bare', async () => {
    const cap = { lines: [] as string[] };
    expect(
      await runCli(
        [
          'explain',
          'electrical-resistivity',
          `mass=${M_E_SI}`,
          'carrier-density=1e28',
          `charge=${-E_SI}`,
          'relaxation-time=1e-14',
          '--source=canonical',
        ],
        {
          out: (s?: string) => cap.lines.push((s ?? '') + '\n'),
          err: () => undefined,
          write: (s: string) => cap.lines.push(s),
        },
      ),
    ).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/Recovered value: 3\.54869118854327e-7/);
    for (const line of text.match(/electrical-resistivity ∝ [^\n]+/g) ?? []) {
      expect(line, line).toContain('charge^-2');
      expect(line, line).not.toContain('|charge|');
    }
    expect(text.match(/electrical-resistivity ∝ /g)?.length).toBeGreaterThan(0);
  });

  it('mobility and the Hall coefficient stay signed', () => {
    const mobility = edge('CE-carrier-mobility').evaluate({
      charge: -E_SI,
      'relaxation-time': 1e-14,
      mass: M_E_SI,
    });
    expect(mobility).toBeLessThan(0);
    expect(mobility).toBeCloseTo((-E_SI * 1e-14) / M_E_SI, 6);
    const hall = edge('CE-hall-coefficient').evaluate({
      'carrier-density': 1e6,
      charge: -E_SI,
    });
    expect(hall).toBeLessThan(0);
    expect(hall * (1e6 * -E_SI)).toBeCloseTo(1, 8);
  });
});
