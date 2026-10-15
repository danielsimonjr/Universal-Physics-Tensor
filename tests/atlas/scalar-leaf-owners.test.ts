/**
 * The atlas and CLI leaf walks use the one owner (`src/dimensional/ast-leaves.ts`).
 *
 * `atlas/applicability.ts` walked symbol names through its own child list and read a literal as
 * `Number(name)` after a trim; `atlas/witness-symbolic.ts` carried the same literal reader;
 * `atlas/chain-pipeline.ts` read a number name by its own regex and a constant through a bare
 * `CONSTANTS[name]` lookup (true for `constructor`); `cli/commands/symbolic.ts` collected leaves
 * by a hand walk over `op` arguments. Each now calls `forEachScalarLeaf` with its own arms,
 * `isDecimalLiteral` / `literalValue`, and `isRegisteredConstant`. `src/atlas/benchmark/**` is
 * the pinned study code and is not touched; it reaches `checkApplicability`, so its items are in
 * the sweep below.
 *
 * The verdicts are pinned by a snapshot taken on the tree BEFORE the change, over every
 * expression the walkers run on: the 125 benchmark items (the one production caller of
 * `checkApplicability`), every catalog right-hand side and every canonical scalar AST. A second
 * method beside it: the old literal rule (trim, then a finite `Number`) and the owner's rule agree
 * on every leaf name of that corpus.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { forEachScalarLeaf, isDecimalLiteral } from '../../src/dimensional/ast-leaves.js';
import { checkApplicability } from '../../src/atlas/applicability.js';
import { governingOf } from '../../src/atlas/chain-pipeline.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';

const ROOT = join(import.meta.dirname, '../..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf8');

interface BenchmarkItem {
  readonly id: string;
  readonly expr: ExprNode;
  readonly sideConditions?: readonly string[];
}
const ITEMS = JSON.parse(read('tests/fixtures/atlas/benchmark/public/items.json')) as BenchmarkItem[];

const CORPUS: readonly (readonly [string, ExprNode])[] = [
  ...ITEMS.map((i) => [`item:${i.id}`, i.expr] as const),
  ...[...BRIDGE_RHS_BY_ID].map(([id, e]) => [`be-${id}`, e] as const),
  ...CANONICAL_EQUATIONS.flatMap((c) => (c.scalarAst === undefined ? [] : [[c.id, c.scalarAst] as const])),
];

/** Every leaf name of a tree, through every arm a walker here enters. */
function allLeafNames(e: ExprNode): string[] {
  const names: string[] = [];
  forEachScalarLeaf(e, (l) => names.push(l.name), {
    transcendental: true,
    abs: true,
    diracDelta: true,
    integral: 'all',
    derivative: true,
    variationalDerivative: true,
    tensorProduct: true,
  });
  return names;
}

describe('the leaf walks read the one owner', () => {
  it('no atlas or CLI walker keeps its own literal reader, number regex, constant lookup or hand walk', () => {
    const applicability = read('src/atlas/applicability.ts');
    expect(applicability).not.toMatch(/Number\(node\.name\)/);
    expect(applicability).toMatch(/forEachScalarLeaf\(/);
    const witness = read('src/atlas/witness-symbolic.ts');
    expect(witness).not.toMatch(/Number\(node\.name\)/);
    const chain = read('src/atlas/chain-pipeline.ts');
    expect(chain).not.toMatch(/function isNumericName/);
    expect(chain).not.toMatch(/const registered = CONSTANTS\[name\]/);
    expect(chain).toMatch(/isRegisteredConstant\(/);
    const symbolic = read('src/cli/commands/symbolic.ts');
    expect(symbolic).not.toMatch(/args\.forEach\(collect\)/);
    expect(symbolic).toMatch(/api\.forEachScalarLeaf\(/);
  });

  it('second method: the retired literal rule and isDecimalLiteral agree on every leaf name of the corpus', () => {
    const retired = (name: string): boolean => name.trim() !== '' && Number.isFinite(Number(name));
    const disagree = new Set<string>();
    let leaves = 0;
    for (const [, e] of CORPUS) {
      for (const name of allLeafNames(e)) {
        leaves += 1;
        if (retired(name) !== (isDecimalLiteral(name) && Number.isFinite(Number(name)))) disagree.add(name);
      }
    }
    expect(leaves).toBeGreaterThan(1000);
    expect([...disagree]).toEqual([]);
  });

  it('checkApplicability findings over every benchmark item, catalog RHS and canonical AST are the pinned ones', () => {
    const rows: Record<string, string> = {};
    for (const [id, e] of CORPUS) {
      const item = ITEMS.find((i) => `item:${i.id}` === id);
      const findings = checkApplicability({ ast: e, sideConditions: item?.sideConditions ?? [] });
      rows[id] = findings.map((f) => `${f.kind}|${f.severity}|${f.where ?? ''}|${f.detail}`).join(' ;; ');
    }
    expect(Object.keys(rows).length).toBe(CORPUS.length);
    expect(rows).toMatchSnapshot();
  });

  it('governingOf over every catalog RHS and canonical AST is the pinned one', () => {
    const rows: Record<string, string> = {};
    for (const [id, e] of CORPUS) {
      if (id.startsWith('item:')) continue;
      rows[id] = governingOf(e, '').map((v) => v.name).join(',');
    }
    expect(rows).toMatchSnapshot();
  });
});
