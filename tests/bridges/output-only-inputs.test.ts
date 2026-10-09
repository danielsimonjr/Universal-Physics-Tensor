/**
 * One rule for an input only an extra output reads: it is optional, and the
 * output is left out when it is not given. Before 9.0.1 be-52 declared its
 * period optional with a stored `requires`, while be-139/144/146 required
 * theirs under `want: 'all'`; now both facts are derived from the contract.
 */
import { describe, expect, it } from 'vitest';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { MissingInputError } from '../../src/bridges/evaluation-errors.js';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';

const at = (id: string) => ({ ...catalogRelations().find((r) => r.id === id)!.reference!.inputs });

describe('an input only an extra output reads', () => {
  it('is optional on every evaluator that has one, and listed as such', () => {
    const outputOnly = [...BRIDGE_EVALUATORS.values()].flatMap((spec) =>
      spec.contract.slots.filter((slot) => slot.listed && slot.readBy === 'outputs').map((slot) => [spec.bridgeId, slot.key, slot.optional] as const),
    );
    expect(outputOnly.map(([id, key]) => `${id}:${key}`)).toEqual(['52:T_yr', '88:m_kg', '139:Nc_per_m3', '139:ND_per_m3', '144:C_ohm_m_s', '146:lambda0_m']);
    for (const [id, key, optional] of outputOnly) {
      expect(optional, `be-${id} ${key}`).toBe(true);
      expect(BRIDGE_EVALUATORS.get(id)!.parameters.find((p) => p.key === key)!.optional, `be-${id} ${key}`).toBe(true);
      expect(BRIDGE_EVALUATORS.get(id)!.inputKeys).not.toContain(key);
    }
  });

  it('be-139 returns its value without the densities, and the output with them', () => {
    const spec = BRIDGE_EVALUATORS.get(139)!;
    const bare = spec.run(at('be-139'));
    expect(Object.keys(bare)).toEqual(['value']);
    const full = spec.run({ ...at('be-139'), Nc_per_m3: 2.8e25, ND_per_m3: 1e22 });
    expect(Object.keys(full)).toEqual(['value', 'Ec_minus_EF_J']);
    expect(full.Ec_minus_EF_J).toBeCloseTo(1.380649e-23 * 300 * Math.log(2.8e25 / 1e22), 30);
  });

  it('be-144 and be-146 do the same, and a source input stays required', () => {
    expect(Object.keys(BRIDGE_EVALUATORS.get(144)!.run(at('be-144')))).toEqual(['value']);
    expect(Object.keys(BRIDGE_EVALUATORS.get(146)!.run(at('be-146')))).toEqual(['value']);
    expect(Object.keys(BRIDGE_EVALUATORS.get(144)!.run({ ...at('be-144'), C_ohm_m_s: 1e-22 }))).toEqual(['value', 'rho_ohm_m']);
    const { 'matthsum-scatter2': _dropped, ...partial } = at('be-144');
    expect(() => BRIDGE_EVALUATORS.get(144)!.run(partial)).toThrow(MissingInputError);
  });

  it('be-52 keeps its per-century output when the period is given, and only then', () => {
    const spec = BRIDGE_EVALUATORS.get(52)!;
    expect(Object.keys(spec.run(at('be-52')))).toEqual(['value']);
    expect(Object.keys(spec.run({ ...at('be-52'), T_yr: 0.2408467 }))).toEqual(['value', 'precession_arcsec_per_century']);
  });

  it('a positive-signed optional input is still checked when given', () => {
    expect(() => BRIDGE_EVALUATORS.get(52)!.run({ ...at('be-52'), T_yr: -1 })).toThrow(/T_yr must be > 0/);
  });
});
