/**
 * A domain refusal names the condition that failed, in the caller's keys.
 *
 * A relation states its validity domain once, as `holds`. Before, a second,
 * hand-written prose `domain` sat beside it and was what a refusal printed:
 * be-127 printed "T ≠ 0" when the check was T ≥ 0, be-147 likewise, and every
 * refusal listed the whole domain in the relation's internal source names, so
 * it never said which condition or which input failed. Now the predicate, the
 * description and the refusal are all read from `holds`, and the refusal is a
 * typed `DomainViolationError` listing `{ condition, key, value, inputs }` for
 * exactly the conjuncts that failed.
 *
 * The class check runs over every catalog evaluator with reference inputs and
 * moves each input in turn to values a sign or range condition refuses. For
 * every refusal it re-reads each listed condition with MathTS over the given
 * inputs (not through the interpreter that produced it) and checks that it is
 * false, that every false conjunct is listed, that each key is one the caller
 * may give, and that no internal source name leaks into the message.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runCli } from '../../src/cli/main.js';
import { BRIDGE_EVALUATORS, type EvaluatorSpec } from '../../src/bridges/evaluators.js';
import { catalogRelations, primaryRelation } from '../../src/bridges/catalog-load.js';
import { formulaNames, formulaScope } from '../../src/bridges/expr-parse.js';
import { holds, holdsConditions } from '../../src/bridges/holds.js';
import { DomainViolationError, type DomainViolation } from '../../src/bridges/evaluation-errors.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { composeEdges } from '../../src/composition/compose.js';
import { evaluateEdge, validityDomain, type BridgeEdge } from '../../src/composition/edge.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { CatalogRelation } from '../../src/bridges/catalog-types.js';

const NAMES = [...formulaNames()];
const words = (text: string): string[] => text.match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? [];

/** The caller's key for each relation source, read from the evaluator's contract. */
function keyMap(spec: EvaluatorSpec, relation: CatalogRelation): Map<string, string> {
  const map = new Map<string, string>();
  for (const source of relation.sources) {
    const slot = spec.contract.slots.find((s) => s.spellings.includes(source));
    map.set(source, slot?.key ?? source);
  }
  return map;
}

/**
 * `condition` (written in caller keys) at `inputs`, read again from its text by
 * the exact-comparison interpreter (MathTS's own `evaluate` compares with an
 * epsilon, so 1.6e-19 != 0 would read false): false, or unreadable, is a failure.
 */
function failsAt(condition: string, inputs: Readonly<Record<string, number>>): boolean {
  try {
    return !holds(condition, inputs, formulaScope(), [...NAMES, ...Object.keys(inputs)]);
  } catch {
    return true;
  }
}

/** The conjuncts of the relation's condition, written in the caller's keys. */
function conjunctsInKeys(relation: CatalogRelation, keys: Map<string, string>): string[] {
  return holdsConditions(relation.holds, NAMES).map((c) =>
    c.text.replace(/[A-Za-z_][A-Za-z0-9_-]*/g, (w) => keys.get(w) ?? w),
  );
}

const WITH_REFERENCE = [...BRIDGE_EVALUATORS.values()].filter(
  (spec) => primaryRelation(spec.bridgeId)?.reference?.inputs !== undefined,
);

/** Each input moved, one at a time, to values a sign or ordering condition refuses. */
function probes(reference: Readonly<Record<string, number>>): Record<string, number>[] {
  const out: Record<string, number>[] = [];
  for (const [key, value] of Object.entries(reference)) {
    for (const moved of [0, -1, -Math.abs(value) - 1, value * 1e6 + 1, value / 1e6]) {
      out.push({ ...reference, [key]: moved });
    }
  }
  return out;
}

describe('every catalog refusal names exactly the conditions that failed, in the caller keys', () => {
  let refusals = 0;
  const refusedRelations = new Set<string>();

  it.each(WITH_REFERENCE.map((spec) => [spec.bridgeId, spec] as const))('be-%s', (_, spec) => {
    const relation = primaryRelation(spec.bridgeId)!;
    const keys = keyMap(spec, relation);
    const conjuncts = conjunctsInKeys(relation, keys);
    const callerKeys = new Set(spec.contract.slots.map((s) => s.key));
    const internal = relation.sources.filter((s) => keys.get(s) !== s);
    // The reference is keyed by source names; the contract key is the name a refusal uses.
    const reference = Object.fromEntries(
      Object.entries(relation.reference!.inputs!).map(([k, v]) => [
        spec.contract.slots.find((slot) => slot.spellings.includes(k))?.key ?? k,
        v,
      ]),
    );
    for (const inputs of probes(reference)) {
      let error: unknown;
      try {
        spec.run(inputs, 'value');
      } catch (e) {
        error = e;
      }
      if (!(error instanceof DomainViolationError)) {
        // Not refused by the domain: no conjunct may be false here.
        if (error === undefined) expect(conjuncts.filter((c) => failsAt(c, inputs)), JSON.stringify(inputs)).toEqual([]);
        continue;
      }
      refusals += 1;
      refusedRelations.add(relation.id);
      expect(error.id).toBe(relation.id);
      expect(error.violations.length).toBeGreaterThan(0);
      for (const v of error.violations) {
        expect(failsAt(v.condition, inputs), v.condition).toBe(true);
        expect(callerKeys.has(v.key) || v.key === '', v.key).toBe(true);
        if (v.key !== '') expect(Object.is(v.value, inputs[v.key] ?? Number.NaN)).toBe(true);
        for (const input of v.inputs) expect(Object.is(input.value, inputs[input.key] ?? Number.NaN)).toBe(true);
        expect(error.message).toContain(v.condition);
      }
      // Complete: every false conjunct of the relation is listed (optional-parameter signs ride beside them).
      const listed = new Set(error.violations.map((v) => v.condition));
      for (const c of conjuncts.filter((c) => failsAt(c, inputs))) expect(listed.has(c), c).toBe(true);
      // No internal source name the caller did not use.
      const said = new Set(words(error.message));
      for (const source of internal) expect(said.has(source), `${source} in ${error.message}`).toBe(false);
    }
  });

  it('the probe is not vacuous: most evaluators are refused somewhere', () => {
    expect(refusals).toBeGreaterThan(200);
    expect(refusedRelations.size).toBeGreaterThan(WITH_REFERENCE.length * 0.8);
  });
});

describe('one source: the record states its domain only as holds', () => {
  it('no relation carries a prose domain, and the schema refuses one', () => {
    const file = JSON.parse(readFileSync('data/bridge-catalog.json', 'utf8')) as { relations: Record<string, unknown>[] };
    expect(file.relations.filter((r) => 'domain' in r).map((r) => r.id)).toEqual([]);
    const schema = JSON.parse(readFileSync('data/bridge-catalog.schema.json', 'utf8')) as {
      $defs?: Record<string, { properties?: Record<string, unknown>; additionalProperties?: boolean }>;
    };
    const text = JSON.stringify(schema);
    expect(text).not.toMatch(/"domain":\{"type":"string"\}/);
  });

  it('every catalog edge describes its domain with the conjuncts of its holds', () => {
    for (const relation of catalogRelations()) {
      const edge = CATALOG_GRAPH.find((e) => e.id === relation.id)!;
      expect(edge.domain.description).toBe(holdsConditions(relation.holds, NAMES).map((c) => c.text).join(' and '));
    }
  });

  it('a conjunct split is exact: not (A or B), not (not X) and not (x == y) become their parts', () => {
    expect(holdsConditions('not (not isFinite(x) or x == 0) and y >= 0', ['x', 'y']).map((c) => c.text)).toEqual([
      'isFinite(x)',
      'x != 0',
      'y >= 0',
    ]);
  });
});

describe('the edge path and composition name the caller key too', () => {
  const q = (name: string) => ({ name, symbol: name, dim: DIMENSIONLESS, attributes: {} });
  const edge = (id: string, source: string, target: string, condition: string): BridgeEdge => ({
    id,
    beId: null,
    kind: 'bridge',
    label: id,
    sources: [q(source)],
    target: q(target),
    confidence: 'established',
    domain: validityDomain(condition),
    evaluate: (i) => i[source]! - 10,
    citation: 'synthetic',
  });

  it('evaluateEdge lists the failing conjunct only', () => {
    const e = edge('lo', 'x', 'y', 'x > 0 and x < 100');
    try {
      evaluateEdge(e, { x: -2 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DomainViolationError);
      const v = (err as DomainViolationError).violations;
      expect(v).toEqual<DomainViolation[]>([{ condition: 'x > 0', key: 'x', value: -2, inputs: [{ key: 'x', quantity: 'x', value: -2 }] }]);
      expect((err as Error).message).toBe('lo: outside the validity domain: x = -2 violates x > 0');
    }
  });

  it('a catalog alias given by the caller is the key the refusal names', () => {
    const aliased = CATALOG_GRAPH.find((e) => e.aliases !== undefined && e.domain.description.includes('> 0'));
    expect(aliased).toBeDefined();
    const [source, aliases] = Object.entries(aliased!.aliases!)[0]!;
    const inputs: Record<string, number> = {};
    for (const s of aliased!.sources) inputs[s.name] = 1;
    delete inputs[source];
    inputs[aliases[0]!] = -1;
    const violations = aliased!.domain.violations(inputs);
    for (const v of violations) expect(words(v.condition)).not.toContain(source);
  });

  it('a composed edge says on which operand the domain failed, with the piped value', () => {
    const first = edge('first', 'x', 'y', 'x > 0');
    const second = edge('second', 'y', 'z', 'y >= 0');
    const composed = composeEdges(first, second);
    expect(() => composed.evaluate({ x: -1 })).toThrow('first>>second: outside the validity domain (on first): x = -1 violates x > 0');
    expect(() => composed.evaluate({ x: 5 })).toThrow(
      'first>>second: outside the validity domain (on second, with y piped from first): y = -5 violates y >= 0',
    );
    expect(composed.domain.violations({ x: 5 }).map((v) => v.condition)).toEqual(['y >= 0']);
  });
});

async function cli(args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => out.push(s ?? ''),
    err: (s?: string) => err.push(s ?? ''),
    write: (s: string) => out.push(s),
  });
  return { code, err: err.join('\n') };
}

describe('the reported repros', () => {
  it('be-127 at T_K = -1 names T_K >= 0, the check that ran (9.0.0 printed "T ≠ 0")', async () => {
    const r = await cli(['evaluate', 'be-127', 'T_K=-1', 'Cd_F=1e-12', 'Cox_F=1e-12']);
    expect(r.code).toBe(1);
    expect(r.err).toBe('be-127: outside the validity domain: T_K = -1 violates T_K >= 0');
  });
  it('be-127 at T_K = 0 names T_K != 0', async () => {
    const r = await cli(['evaluate', 'be-127', 'T_K=0', 'Cd_F=1e-12', 'Cox_F=1e-12']);
    expect(r.err).toBe('be-127: outside the validity domain: T_K = 0 violates T_K != 0');
  });
  it('be-127 with a negative capacitance names both conditions it breaks, with both keys', async () => {
    const r = await cli(['evaluate', 'be-127', 'T_K=300', 'Cd_F=-1e-12', 'Cox_F=1e-12']);
    expect(r.err).toBe(
      'be-127: outside the validity domain: Cox_F = 1e-12, Cd_F = -1e-12 violate Cox_F + Cd_F != 0; Cd_F = -1e-12 violates Cd_F > 0',
    );
  });
  it('be-147 at T_K = -5 names T_K >= 0 (9.0.0 printed "T ≠ 0; arrhprefac > 0, arrhwarmth >= 0")', async () => {
    const r = await cli(['evaluate', 'be-147', 'A_Hz=1e13', 'Ea_J_per_mol=5e4', 'T_K=-5']);
    expect(r.code).toBe(1);
    expect(r.err).toBe('be-147: outside the validity domain: T_K = -5 violates T_K >= 0');
    expect(r.err).not.toMatch(/arrh/);
  });
});
