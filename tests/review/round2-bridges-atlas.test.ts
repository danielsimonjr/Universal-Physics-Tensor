/**
 * Tom's second review round, bridges/atlas/data findings, each pinned here and red on the
 * tree before its fix: the emitted atlas JSON against the shipped schema, the two
 * derivations a mutation left green, confrontation verdicts that were stored and never
 * recomputed, and a power of a dimensionless constant in the normal form.
 *
 * @module tests/review/round2-bridges-atlas
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { schemaProblems } from '../../src/core/json-schema.js';
import { deriveCompositeEvidence } from '../../src/atlas/derive-evidence.js';
import type { EvidenceTag } from '../../src/atlas/types.js';
import { adjudicateBridgeEntry } from '../../src/bridges/membership.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { loadCatalog } from '../../src/bridges/catalog-load.js';
import type { CatalogFileRecord } from '../../src/bridges/catalog-types.js';
import { parseCatalogExpression } from '../../src/bridges/expr-parse.js';
import { structurallyEqual } from '../../src/canonical/normal-form.js';

const ROOT = join(import.meta.dirname, '../..');
const json = (rel: string): unknown => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

describe('the emitted atlas JSON conforms to data/schemas/atlas-record.v0.json', () => {
  const schema = json('data/schemas/atlas-record.v0.json') as Record<string, unknown>;
  for (const family of ['oscillators', 'diffusion', 'waves']) {
    it(`data/atlas/${family}.json has no schema problem`, () => {
      expect(schemaProblems(schema, json(`data/atlas/${family}.json`))).toEqual([]);
    });
  }
  it('control: a witness without a test file is a problem', () => {
    const file = json('data/atlas/oscillators.json') as { bridges: { witnesses: Record<string, unknown>[] }[] };
    delete file.bridges[0]!.witnesses[0]!['test'];
    expect(schemaProblems(schema, file)).not.toEqual([]);
  });
});

describe('deriveCompositeEvidence: never stronger than its weakest part', () => {
  const s = (...tags: EvidenceTag[]): ReadonlySet<EvidenceTag> => new Set(tags);
  it('the positive tags are the intersection of the parts', () => {
    expect([...deriveCompositeEvidence([s('numerically-supported'), s('numerically-supported', 'symbolically-checked')])]).toEqual([
      'numerically-supported',
    ]);
    expect([...deriveCompositeEvidence([s('formally-proved'), s('formally-proved', 'numerically-supported')])]).toEqual(['formally-proved']);
  });
  it('a contradicted part contradicts the chain; no common positive tag caps it at proposed', () => {
    expect([...deriveCompositeEvidence([s('numerically-supported'), s('symbolically-checked', 'contradicted')])].sort()).toEqual(
      ['contradicted', 'proposed'],
    );
    expect([...deriveCompositeEvidence([s('numerically-supported'), s('proposed')])]).toEqual(['proposed']);
  });
});

describe('adjudicateBridgeEntry: an equal regime tuple is not a bridge', () => {
  it('a synthetic entry with bridges [quantum, quantum] is not-a-bridge; distinct labels are a bridge', () => {
    const base = BRIDGE_EQUATIONS.find((e) => e.bridges[0] !== 'unknown' && e.bridges[0] !== e.bridges[1])!;
    expect(adjudicateBridgeEntry(base)).toBe('bridge');
    expect(adjudicateBridgeEntry({ ...base, id: 999, bridges: ['quantum', 'quantum'] })).toBe('not-a-bridge');
    expect(adjudicateBridgeEntry({ ...base, id: 998, bridges: ['unknown', 'quantum'] })).toBe('unadjudicated');
  });
});

describe('a confrontation verdict is recomputed at load, not trusted', () => {
  const file = (): CatalogFileRecord => json('data/bridge-catalog.json') as CatalogFileRecord;
  const tamper = (id: number, mutate: (o: Record<string, unknown>) => void): CatalogFileRecord => {
    const f = file();
    const row = (f.confrontations as readonly { catalogId: number; outcome: Record<string, unknown> }[]).find((c) => c.catalogId === id)!;
    mutate(row.outcome);
    return f;
  };
  it('the shipped file loads', () => {
    expect(() => loadCatalog(file())).not.toThrow();
  });
  it('a residualInSigma that is not |predicted − observed|/σ is refused', () => {
    expect(() => loadCatalog(tamper(52, (o) => { o['residualInSigma'] = 0.5; }))).toThrow(/residualInSigma/);
  });
  it('a withinObserved that disagrees with the residual is refused', () => {
    expect(() => loadCatalog(tamper(52, (o) => { o['withinObserved'] = false; }))).toThrow(/withinObserved/);
  });
  it('an upper-bound `satisfied` that disagrees with predicted ≤ bound is refused', () => {
    const f = file();
    const row = (f.confrontations as readonly { kind: string; catalogId: number; outcome: Record<string, unknown> }[]).find((c) => c.kind === 'upper-bound')!;
    row.outcome['satisfied'] = !(row.outcome['satisfied'] as boolean);
    expect(() => loadCatalog(f)).toThrow(/satisfied/);
  });
});

describe('the normal form drops a power of a dimensionless constant, as it drops the constant', () => {
  it('mass·π² ≡ mass ≡ mass·√(2π); a dimensionful base is kept', () => {
    const p = parseCatalogExpression;
    expect(structurallyEqual(p('mass*pi'), p('mass'))).toBe(true);
    expect(structurallyEqual(p('mass*pi^2'), p('mass'))).toBe(true);
    expect(structurallyEqual(p('mass*sqrt(2*pi)'), p('mass'))).toBe(true);
    expect(structurallyEqual(p('mass^2'), p('mass'))).toBe(false);
    expect(structurallyEqual(p('mass*speed^2'), p('mass*speed'))).toBe(false);
  });
});
