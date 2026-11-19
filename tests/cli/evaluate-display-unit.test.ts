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
import { primaryUnitLabel } from '../../dist/cli/commands/evaluate.js';

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

const sameDim = (a: Record<string, number>, b: Record<string, number>): boolean =>
  Object.keys(a).every((k) => a[k] === b[k]);

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
    expect(rows.length).toBeGreaterThanOrEqual(18);
    for (const q of rows) expect(declaredUnitIsCoherent(q.displayUnit!, q.dimension as never), q.id).toBe(true);
    const noise = quantityRecord('voltage-noise-density')!;
    expect(declaredUnitIsCoherent('V/K', noise.dimension as never)).toBe(false);
  });

  it('T3: no bridge evaluator with a catalog edge labels its output with a kg base token', () => {
    const unreadable: string[] = [];
    let checked = 0;
    for (const [id] of api.BRIDGE_EVALUATORS) {
      const found = api.resolveEvaluable(id) as { edge?: { target: { name: string; dim: never } } };
      if (found.edge === undefined) continue;
      checked += 1;
      const name = api.primaryRelation(id)?.target ?? found.edge.target.name;
      const label = primaryUnitLabel(api, name, found.edge.target.dim);
      if (label !== 'kg' && /\bkg\b/.test(label)) unreadable.push(`be-${id} ${name} ${label}`);
    }
    expect(checked).toBeGreaterThan(100);
    expect(unreadable).toEqual([]);
  });
});
