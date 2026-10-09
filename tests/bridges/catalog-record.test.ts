/**
 * What the catalog file may carry, and what every record must say.
 *
 * - A field the schema declares has a reader in `src/`; the fields nothing
 *   read (`encoded_form`, `tractability_class`, `assumptions`, `scopeLimits`,
 *   `derivedFrom`, `basis`, a relation's `method`, a parameter's `optional`,
 *   an output's `requires`) are gone, from the file and from the schema.
 * - The row owns the relation contract, the regime, the conventions and the
 *   counterexamples; a relation carries no second copy.
 * - Records are in ascending id order, and `count` is the array's length,
 *   not a field.
 * - The negative catalog is the `rejections` ledger, and `rejected.ts`
 *   projects it.
 * - A path a note cites exists.
 * - A parameter's `quantity` is a quantity id.
 * - A label says what the expression computes.
 * - The loader refuses a broken outcome, a duplicate confrontation and a
 *   disordered file, and a value-kind prediction point reproduces its
 *   `predicted` through the evaluator.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogConfrontations, catalogEntries, catalogRejections, catalogRelations, loadCatalog } from '../../src/bridges/catalog-load.js';
import type { CatalogFileRecord } from '../../src/bridges/catalog-types.js';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';
import { REJECTED_BRIDGE_ADJUDICATIONS, REJECTED_BRIDGE_IDS } from '../../src/bridges/rejected.js';
import { predictedAt } from '../../src/bridges/sensitivity.js';
import { reservedFormulaNames } from '../../src/bridges/expr-parse.js';
import { CENSUS } from '../helpers/census.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const rawText = readFileSync(resolve(root, 'data', 'bridge-catalog.json'), 'utf8');
const raw = JSON.parse(rawText) as CatalogFileRecord & Record<string, unknown>;
const schema = JSON.parse(readFileSync(resolve(root, 'data', 'bridge-catalog.schema.json'), 'utf8')) as {
  required: string[];
  properties: Record<string, { items?: { properties: Record<string, unknown> }; properties?: Record<string, unknown> }>;
};
const quantityIds = new Set(
  (JSON.parse(readFileSync(resolve(root, 'data', 'quantities.json'), 'utf8')) as { quantities: { id: string }[] }).quantities.map((q) => q.id),
);

const fieldsOf = (rows: readonly object[]): Set<string> => new Set(rows.flatMap((row) => Object.keys(row)));

describe('the catalog file carries only fields something reads', () => {
  it('no entry carries an unread field, and the schema declares none', () => {
    const unread = ['encoded_form', 'tractability_class', 'assumptions', 'scopeLimits', 'derivedFrom', 'basis', 'formalRef'];
    const present = fieldsOf(raw.entries);
    expect(unread.filter((f) => present.has(f))).toEqual([]);
    expect(unread.filter((f) => f in schema.properties.entries!.items!.properties)).toEqual([]);
  });

  it('no relation carries a second copy of a row field, or a method', () => {
    const second = ['relation', 'regime', 'conventions', 'counterexamples', 'method'];
    const present = fieldsOf(raw.relations);
    expect(second.filter((f) => present.has(f))).toEqual([]);
    expect(second.filter((f) => f in schema.properties.relations!.items!.properties)).toEqual([]);
  });

  it('no parameter is flagged optional and no output lists what it requires: both are derived', () => {
    const params = raw.evaluators.flatMap((e) => e.parameters);
    expect(fieldsOf(params).has('optional')).toBe(false);
    expect(fieldsOf(raw.evaluators.flatMap((e) => e.outputs ?? [])).has('requires')).toBe(false);
  });

  it('the file has no count field; the array length is the count', () => {
    expect('count' in raw).toBe(false);
    expect(schema.required).not.toContain('count');
    expect(catalogEntries()).toHaveLength(CENSUS.catalog.entries);
  });
});

describe('record order and the two ledgers', () => {
  it('entries are in ascending id order', () => {
    const ids = raw.entries.map((e) => e.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('the loader refuses a disordered file', () => {
    const entries = [...raw.entries];
    [entries[41], entries[42]] = [entries[42]!, entries[41]!];
    expect(() => loadCatalog({ ...raw, entries })).toThrow(/entry \d+ follows entry \d+; records are in ascending id order/);
  });

  it('the negative catalog is the rejections ledger, projected by rejected.ts', () => {
    expect(raw.rejections.map((r) => r.catalogId)).toEqual([28, 29, 32, 35, 40]);
    expect(catalogRejections()).toEqual(raw.rejections);
    expect(REJECTED_BRIDGE_ADJUDICATIONS.map((r) => r.beId)).toEqual([28, 29, 32, 35, 40]);
    expect([...REJECTED_BRIDGE_IDS]).toEqual([28, 29, 32, 35, 40]);
    for (const r of REJECTED_BRIDGE_ADJUDICATIONS) expect(r.verdict).toBe('not-a-bridge');
  });

  it('the loader refuses a rejection of an unknown row and a row rejected twice', () => {
    expect(() => loadCatalog({ ...raw, rejections: [...raw.rejections, { ...raw.rejections[0]!, catalogId: 9999 }] })).toThrow(/names no catalog row/);
    expect(() => loadCatalog({ ...raw, rejections: [...raw.rejections, raw.rejections[0]!] })).toThrow(/is rejected twice/);
  });
});

describe('every path a record cites exists', () => {
  const PATH = /(?:src|tests|scripts|docs|data)\/[A-Za-z0-9_./-]+/g;
  const cited = (text: string): string[] => (text.match(PATH) ?? []).map((m) => m.replace(/[.,;:)]+$/, ''));

  it('in entries, relations and confrontations', () => {
    const texts: string[] = [];
    for (const e of raw.entries) texts.push(e.notes, e.context, ...e.known_issues.map((i) => i.description));
    for (const r of raw.relations) texts.push(r.label, r.domain, r.citation, r.notice?.text ?? '');
    for (const c of raw.confrontations) texts.push(JSON.stringify(c));
    const missing = [...new Set(texts.flatMap(cited))].filter((p) => !existsSync(resolve(root, p)));
    expect(missing).toEqual([]);
  });

  it('the matcher fires on a dead path (control)', () => {
    expect(cited('see src/bridges/equations/be-37-shapiro-delay.ts).')).toEqual(['src/bridges/equations/be-37-shapiro-delay.ts']);
    expect(existsSync(resolve(root, 'src/bridges/equations/be-37-shapiro-delay.ts'))).toBe(false);
  });
});

describe('what each record says', () => {
  it('every evaluator parameter names a quantity id', () => {
    const prose = raw.evaluators.flatMap((e) => e.parameters.filter((p) => !quantityIds.has(p.quantity)).map((p) => `be-${e.catalogId} ${p.key}: ${p.quantity}`));
    expect(prose).toEqual([]);
  });

  it('a label says what the expression computes: the root where the value is a root, and the theorem the proof covers', () => {
    const label = (id: string) => catalogRelations().find((r) => r.id === id)!.label;
    expect(label('be-33')).not.toMatch(/Hertz-Millis/);
    expect(label('be-33')).toMatch(/thermal scaling/);
    for (const id of ['be-103', 'be-104', 'be-105', 'be-107']) {
      expect(label(id), id).not.toMatch(/²\s*=/);
      expect(label(id), id).toMatch(/√|\/√/);
    }
  });

  it('be-62 reads the Euler–Mascheroni constant by name, and be-88/89 state the cube root as a ratio', () => {
    expect(catalogRelations().find((r) => r.id === 'be-62')!.expression).toBe('pi*k_B*critical-temperature/exp(euler_gamma)');
    expect(reservedFormulaNames().has('euler_gamma')).toBe(true);
    expect(catalogRelations().find((r) => r.id === 'be-88')!.expression).toContain('^(1/3)');
    expect(catalogRelations().find((r) => r.id === 'be-89')!.expression).toContain('^(1/3)');
  });

  it('be-170 keys its field B_T, as the other field inputs do', () => {
    expect(BRIDGE_EVALUATORS.get(170)!.parameters.map((p) => p.key)).toEqual(['L12', 'B_T']);
  });
});

describe('confrontation records', () => {
  it('the loader refuses a value outcome without its sigma, and a duplicate confrontation', () => {
    const value = raw.confrontations.find((c) => c.kind === 'value')!;
    const { sigma: _dropped, ...rest } = value.outcome as Record<string, unknown>;
    const broken = { ...raw, confrontations: raw.confrontations.map((c) => (c === value ? { ...c, outcome: rest } : c)) };
    expect(() => loadCatalog(broken)).toThrow(/outcome\.sigma must be a finite number/);
    expect(() => loadCatalog({ ...raw, confrontations: [...raw.confrontations, value] })).toThrow(/has two confrontations/);
  });

  it('a value-kind prediction point reproduces the predicted number through the evaluator', () => {
    const rows = catalogConfrontations().filter((c) => c.kind === 'value' && c.prediction !== undefined);
    expect(rows.map((c) => c.catalogId)).toEqual([52]);
    for (const row of rows) {
      const predicted = predictedAt(row.catalogId, row.prediction!, { ...row.prediction!.inputs });
      expect(predicted, `be-${row.catalogId}`).toBe((row.outcome as { predicted: number }).predicted);
      expect((row.outcome as { units: string }).units).toBe('arcsec/century');
    }
  });

  it('be-52 predicts Mercury per century from its period, not per orbit', () => {
    const row = catalogConfrontations().find((c) => c.catalogId === 52)!;
    expect(row.prediction!.output).toBe('precession_arcsec_per_century');
    expect(row.prediction!.inputs.T_yr).toBeCloseTo(0.2408467, 7);
    expect((row.outcome as { predicted: number }).predicted).toBeCloseTo(42.98, 2);
  });
});
