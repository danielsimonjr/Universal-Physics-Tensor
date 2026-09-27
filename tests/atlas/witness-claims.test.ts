/**
 * A registered witness is attributed to a claim of its record only where its
 * own spec tests that claim. For the bound, three things are read off the
 * spec and the record, never off prose:
 *
 * - the declared point `claim.at(fineResolution)` lies inside the record's
 *   regime, by `regimeHolds` on the π-groups computed from that point;
 * - the spec's error there, in the bound's norm (relative to the reduced value
 *   `target`, or the value itself when the target is 0), equals the record's
 *   `deltaAt` at that point, so the spec measures the bound's quantity;
 * - the spec's tolerance, in the same norm, is no looser than `delta`, so the
 *   bound failing at that point refutes the witness.
 *
 * Limit: each of these bridges computes `deltaAt` with the same numerics
 * function its witness evaluates, so the second check shows the witness
 * measures the bound's quantity at the declared point, not that the physics is
 * independently right. And a tolerance compared with `delta` tests the
 * supremum at one interior point, not the tighter `deltaAt` there.
 */
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { regimeHolds } from '../../src/atlas/regime.js';
import type { AtlasBridge } from '../../src/atlas/types.js';
import { WITNESS_REGISTRY } from '../../src/atlas/witness-specs.js';
import type { RegisteredNumericWitness, WitnessClaim } from '../../src/atlas/witness-specs.js';

type Verdict = { readonly ok: true } | { readonly ok: false; readonly reason: string };

const BRIDGES = ATLAS_FAMILIES.flatMap((f) => f.bridges);
const bridgeOf = (id: string): AtlasBridge => BRIDGES.find((b) => b.id === id)!;

function groupValues(bridge: AtlasBridge, p: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(
    bridge.regime.inequalities.map((i) => {
      const def = bridge.regime.groupDefinitions[i.group];
      const value =
        def === undefined
          ? Number.NaN
          : Object.entries(def.exponents).reduce((acc, [name, e]) => acc * (p[name] ?? Number.NaN) ** e, 1);
      return [i.group, value];
    }),
  );
}

function checkBoundClaim(entry: RegisteredNumericWitness, claim: WitnessClaim): Verdict {
  const bridge = bridgeOf(entry.recordId);
  const bound = bridge.bound;
  if (bound === undefined || bound.deltaAt === undefined) return { ok: false, reason: `${bridge.id} states no bound with a deltaAt` };
  const { spec } = entry;
  const p = claim.at(spec.fineResolution);
  const regime = regimeHolds(bridge.regime, groupValues(bridge, p));
  if (regime.ok !== true) return { ok: false, reason: `the point ${JSON.stringify(p)} is not inside the regime (${String(regime.ok)})` };
  const scale = spec.target === 0 ? 1 : Math.abs(spec.target);
  const error = Math.abs(spec.evaluate(spec.fineResolution) - spec.target) / scale;
  const deltaAt = bound.deltaAt(p);
  if (!(Math.abs(error - deltaAt) <= 1e-9 * Math.max(deltaAt, 1e-12))) {
    return { ok: false, reason: `the spec's error ${error} is not the bound's deltaAt ${deltaAt} at the declared point` };
  }
  if (!(spec.tolerance / scale <= bound.delta)) {
    return { ok: false, reason: `tolerance ${spec.tolerance / scale} in the bound's norm is looser than delta ${bound.delta}` };
  }
  return { ok: true };
}

const attributed = WITNESS_REGISTRY.filter(
  (e): e is RegisteredNumericWitness & { claim: WitnessClaim } => e.kind === 'numeric' && e.claim !== undefined,
);

describe('witness → claim attribution is derived from the spec', () => {
  it('the attributed witnesses', () => {
    expect(attributed.map((e) => `${e.spec.id} → ${e.recordId} ${e.claim.name}`)).toEqual([
      'WS4 → ab-klein-gordon-wave bound',
      'WD6 → ab-telegraph-diffusion bound',
      'WD7 → ab-telegraph-wave bound',
      'WS5 → ab-kg-schrodinger bound',
      'WS7 → ab-stiff-string bound',
    ]);
  });

  it.each(attributed.map((e) => [e.spec.id, e] as const))('%s tests the bound of its record', (_, e) => {
    const verdict = checkBoundClaim(e, e.claim);
    expect(verdict, verdict.ok ? '' : verdict.reason).toEqual({ ok: true });
  });

  it('every attributed witness is one of its record\'s own witnesses', () => {
    for (const e of attributed) expect(bridgeOf(e.recordId).witnesses.map((w) => w.id)).toContain(e.spec.id);
  });
});

describe('controls: a wrong attribution fails', () => {
  const numeric = (id: string) => WITNESS_REGISTRY.find((e) => e.spec.id === id) as RegisteredNumericWitness;

  it('a witness on a record with no bound (WS1, ab-string-wave)', () => {
    const ws1 = numeric('WS1');
    const v = checkBoundClaim(ws1, { name: 'bound', at: () => ({ F: 2, mu: 0.5 }) });
    expect(v).toMatchObject({ ok: false, reason: expect.stringMatching(/states no bound/) });
  });

  it('a declared point that is not where the spec evaluates (WS4 at twice its k)', () => {
    const ws4 = numeric('WS4');
    const v = checkBoundClaim(ws4, { name: 'bound', at: (r) => ({ ...ws4.claim!.at(r), k: 2 * ws4.claim!.at(r)['k']! }) });
    expect(v).toMatchObject({ ok: false, reason: expect.stringMatching(/is not the bound's deltaAt/) });
  });

  it('a tolerance too loose to refute the bound (WS7 at tolerance 0.6, 6e-3 relative against delta 5e-3)', () => {
    const ws7 = numeric('WS7');
    const v = checkBoundClaim({ ...ws7, spec: { ...ws7.spec, tolerance: 0.6 } }, ws7.claim!);
    expect(v).toMatchObject({ ok: false, reason: expect.stringMatching(/looser than delta/) });
  });

  it('a point outside the regime (WD6 at ε = 0.1 > 0.05)', () => {
    const wd6 = numeric('WD6');
    const v = checkBoundClaim(wd6, { name: 'bound', at: () => ({ tau: 0.1, D: 1, q: 1 }) });
    expect(v).toMatchObject({ ok: false, reason: expect.stringMatching(/not inside the regime/) });
  });

  it('a spec measuring a different quantity (WS1\'s string solution against the KG bound)', () => {
    const ws1 = numeric('WS1');
    const ws4 = numeric('WS4');
    const v = checkBoundClaim({ ...ws1, recordId: ws4.recordId }, ws4.claim!);
    expect(v).toMatchObject({ ok: false, reason: expect.stringMatching(/is not the bound's deltaAt/) });
  });
});
