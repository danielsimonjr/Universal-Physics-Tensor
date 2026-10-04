/**
 * Criterion 3, EXPLORATORY (Amendment 9): the frozen corpus in residual form
 * (`tools/criterion3-study/residual-corpus.ts`). This file checks the DATA preparation only: every
 * frozen expression is the registry's `scalarAst`, so the targets come from the same registry. It
 * runs no retrieval condition.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { residualCorpus } from '../../tools/criterion3-study/residual-corpus.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { canonicalResidual } from '../../src/canonical/residual.js';
import type { CorpusRecord } from '../../src/atlas/benchmark/baselines.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const frozen = JSON.parse(readFileSync(resolve(root, 'docs/research/criterion3/corpus.json'), 'utf-8')) as CorpusRecord[];
const registry = new Map(CANONICAL_EQUATIONS.map((e) => [e.id, e]));

describe('criterion 3 exploratory — the residual corpus', () => {
  const residual = residualCorpus(frozen, registry);

  it('converts every frozen record that has an expression, and leaves the others alone', () => {
    expect(residual).toHaveLength(frozen.length);
    for (let i = 0; i < frozen.length; i++) {
      const f = frozen[i]!;
      const r = residual[i]!;
      expect(r.id).toBe(f.id);
      expect(r.text).toBe(f.text);
      if (f.expr === undefined) expect(r.expr).toBeUndefined();
      else expect(r.expr).toEqual(canonicalResidual(registry.get(f.id)!));
    }
    expect(residual.filter((r) => r.expr !== undefined)).toHaveLength(93);
  });

  it('REFUSES a frozen expression that is not the registry scalarAst (the targets would not match it)', () => {
    const i = frozen.findIndex((r) => r.expr !== undefined);
    const tampered = frozen.map((r, j) => (j === i ? { ...r, expr: { kind: 'symbol', name: 'x', dim: { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } } as never } : r));
    expect(() => residualCorpus(tampered, registry)).toThrow(/not the registry's scalarAst/);
  });

  it('REFUSES a record with an expression but no registry entry', () => {
    const extra: CorpusRecord[] = [{ id: 'CE-not-in-registry', text: 't', expr: frozen.find((r) => r.expr)!.expr }];
    expect(() => residualCorpus(extra, registry)).toThrow(/no registry entry/);
  });
});
