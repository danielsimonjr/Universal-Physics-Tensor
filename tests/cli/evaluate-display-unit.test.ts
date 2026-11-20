/**
 * The text label of an `upt evaluate` primary output (#681). A quantity may declare a
 * `displayUnit`; the label reads it before the derived SI unit. The JSON `unit` stays base form.
 * Needs `npm run build`.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import * as api from '../../dist/cli-api.js';
import { parseUnit } from '../../dist/dimensional/units.js';
import { allQuantityRecords, quantityRecord } from '../../dist/dimensional/quantity-registry.js';
import { primaryUnitLabel } from '../../dist/cli/expr-print.js';

async function run(args: string[]): Promise<{ out: string }> {
  let out = '';
  await runCli(args, {
    out: (line?: string) => {
      out += `${line ?? ''}\n`;
    },
    err: () => {},
    write: (s: string) => {
      out += s;
    },
  });
  return { out };
}

/** Two dimensions are equal over the union of their keys; a missing key is exponent 0. */
const sameDim = (a: Record<string, number>, b: Record<string, number>): boolean =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => (a[k] ?? 0) === (b[k] ?? 0));

/** The quantity ids that declare a displayUnit, sorted. */
const DECLARED_IDS = [
  'acdrude-conduct',
  'capacitor-voltage-variance',
  'clapeyron-slope',
  'coax-specific',
  'debye-heat-capacity',
  'dos2d-states',
  'dos3d-states',
  'einstein-heat-capacity',
  'fourier-slab-flux',
  'gibbs-isotherm-dg',
  'joule-thomson-mu',
  'lorentz-resistivity',
  'planck-u',
  'sackur-entropy',
  'shot-noise',
  'sommerfeld-heat-capacity',
  'stefan-sigma',
  'thermal-conductivity',
  'thomson-coefficient',
  'voltage-noise-density',
];

/**
 * A text label is readable when it is the quantity's declared displayUnit, one named unit
 * (a bare base unit such as kg counts), or a base form with at most 2 base factors and no kg.
 * Every SI named unit that has mass needs kg or 3 or more base factors, so it cannot pass (c).
 */
const isReadableLabel = (label: string, declared: string | undefined): boolean => {
  if (label === declared) return true;
  if (/^[A-Za-z]+$/.test(label)) return true;
  const factors = label.split(/[*/()]/).filter((f) => f !== '' && f !== '1');
  return factors.length <= 2 && !factors.some((f) => /^kg(\^|$)/.test(f));
};

/** A declared unit is coherent (scale 1) and has the quantity's dimension. */
const declaredUnitIsCoherent = (displayUnit: string, dimension: Record<string, number>): boolean => {
  const parsed = parseUnit(displayUnit);
  return sameDim(parsed.dim as never, dimension) && parsed.scale === 1;
};

describe('evaluate display unit (#681)', () => {
  it('T1: be-58 prints the declared unit, not the base form', async () => {
    const r = await run(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000']);
    expect(r.out).toContain('voltage-noise-density [V^2/Hz]');
    expect(r.out).not.toContain('kg^2');
  });

  it('T2: every declared displayUnit is coherent and has the quantity dimension; a wrong unit fails the same check', () => {
    const rows = allQuantityRecords().filter((q) => q.displayUnit !== undefined);
    expect(rows.map((q) => q.id).sort()).toEqual(DECLARED_IDS);
    for (const q of rows) expect(declaredUnitIsCoherent(q.displayUnit!, q.dimension as never), q.id).toBe(true);
    const noise = quantityRecord('voltage-noise-density')!;
    expect(declaredUnitIsCoherent('V/K', noise.dimension as never)).toBe(false);
    expect(sameDim({ L: 1 }, { L: 1, T: -1 })).toBe(false);
    expect(sameDim({ L: 1, T: -1 }, { L: 1 })).toBe(false);
    expect(sameDim({ L: 1, T: 0 }, { L: 1 })).toBe(true);
  });

  it('T3 rule: a 3-factor base form and a 3-factor named-unit base form are not readable', () => {
    expect(isReadableLabel('m^4*s^-3*A^-2', undefined)).toBe(false);
    expect(isReadableLabel('m^2/(s^2*K)', undefined)).toBe(false);
    expect(isReadableLabel('kg/s^3', undefined)).toBe(false);
    expect(isReadableLabel('kg', undefined)).toBe(true);
    expect(isReadableLabel('Hz', undefined)).toBe(true);
    expect(isReadableLabel('A/m^2', undefined)).toBe(true);
    expect(isReadableLabel('V^2/Hz', 'V^2/Hz')).toBe(true);
  });

  it('T3: every bridge evaluator with a catalog edge prints a readable label', () => {
    const unreadable: string[] = [];
    let checked = 0;
    for (const [id] of api.BRIDGE_EVALUATORS) {
      const found = api.resolveEvaluable(id) as { edge?: { target: { name: string; dim: never } } };
      if (found.edge === undefined) continue;
      checked += 1;
      const name = api.primaryRelation(id)?.target ?? found.edge.target.name;
      const label = primaryUnitLabel(api, name, found.edge.target.dim);
      if (!isReadableLabel(label, api.quantityRecord(name)?.displayUnit)) unreadable.push(`be-${id} ${name} ${label}`);
    }
    expect(checked).toBeGreaterThan(100);
    expect(unreadable).toEqual([]);
  });
});
