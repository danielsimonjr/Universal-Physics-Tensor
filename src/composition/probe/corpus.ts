/**
 * In-repo corpus comparison: canonical scalarAst + normalForm.
 * Novelty wording is always corpus-relative.
 *
 * @module composition/probe/corpus
 */

import type { ExprNode } from '../../dimensional/ast-types.js';
import { CANONICAL_EQUATIONS } from '../../canonical/registry.js';
import { normalForm } from '../../canonical/normal-form.js';
import { BRIDGE_RHS_BY_ID } from '../../bridges/rhs-registry.js';
import { monomialToExpr } from './generator.js';
import { evalExpr } from '../expr-eval.js';
import { equals } from '../../dimensional/algebra.js';
import type { Dimension } from '../../dimensional/types.js';
import { canonicalPrefactor } from '../canonical-prefactors.js';
import { constantRatio, fixedPoint } from '../../canonical/fixed-points.js';

/** One corpus entry that matches an expression, with the layer that holds it. */
export interface CorpusMatch {
  readonly id: string;
  readonly layer: 'canonical' | 'bridge';
}

/** The result of comparing one expression with the in-repo corpus. */
export interface CorpusComparisonResult {
  readonly corpusId: string;
  readonly corpusVersion: string;
  readonly exactMatches: readonly CorpusMatch[];
  readonly algebraicMatches: readonly CorpusMatch[];
  readonly searchedAt: string;
}

const CORPUS_ID = 'upt-l-layer+b-layer';

/** Compare an expression to the in-repo L- and B-layers. @internal */
export function compareToCorpus(expr: ExprNode, corpusVersion: string): CorpusComparisonResult {
  const form = normalForm(expr);
  const algebraic: CorpusMatch[] = [];
  for (const ce of CANONICAL_EQUATIONS) {
    if (ce.scalarAst && normalForm(ce.scalarAst) === form) {
      algebraic.push({ id: ce.id, layer: 'canonical' });
    } else if (ce.dimensional?.monomial) {
      const mono = monomialToExpr(ce.dimensional.monomial, [
        ce.dimensional.target,
        ...ce.dimensional.governing,
      ]);
      if (normalForm(mono) === form) {
        algebraic.push({ id: ce.id, layer: 'canonical' });
      }
    }
  }
  for (const [id, rhs] of BRIDGE_RHS_BY_ID.entries()) {
    if (rhs && normalForm(rhs) === form) {
      algebraic.push({ id: `be-${id}`, layer: 'bridge' });
    }
  }
  return {
    corpusId: CORPUS_ID,
    corpusVersion,
    exactMatches: [],
    algebraicMatches: algebraic,
    searchedAt: new Date().toISOString(),
  };
}

/**
 * The symbols of an AST that carry a dimension, with that dimension. Numeric
 * literals and named numbers (`8pi`) are dimensionless and left out; so is a
 * dimensionless variable, which then makes the ratio vary and returns no prefactor.
 */
function dimensionedSymbols(node: ExprNode, out: Map<string, Dimension>): Map<string, Dimension> {
  if (node.kind === 'symbol') {
    if (Object.values(node.dim).some((e) => e !== 0)) out.set(node.name, node.dim);
    return out;
  }
  for (const a of (node as { args?: readonly ExprNode[] }).args ?? []) dimensionedSymbols(a, out);
  return out;
}

/**
 * The corpus prefactor k of a fully quantitative canonical entry against a
 * candidate body: `scalarAst / candidate`, which must be constant. Symbols align
 * by name, then by a dimension exactly one candidate symbol carries. Evaluated at
 * three points where variable i takes (1.7 + i)^p, p = 1, 1.3, 1.6 (`fixedPoint`, base 1.7,
 * step 1), and the ratio is constant when its largest relative departure is at most 1e-9
 * (`constantRatio`). `null` when the symbols do not align or the ratio is not constant.
 */
function corpusPrefactor(ast: ExprNode, candidate: ExprNode): number | null {
  const astSyms = dimensionedSymbols(ast, new Map());
  const candSyms = dimensionedSymbols(candidate, new Map());
  if (astSyms.size !== candSyms.size) return null;
  const toCand = new Map<string, string>();
  const free = new Set(candSyms.keys());
  for (const s of astSyms.keys()) if (free.has(s)) (toCand.set(s, s), free.delete(s));
  for (const [s, d] of astSyms) {
    if (toCand.has(s)) continue;
    const hits = [...free].filter((c) => equals(candSyms.get(c)!, d));
    if (hits.length !== 1) return null;
    toCand.set(s, hits[0]!);
    free.delete(hits[0]!);
  }
  const names = [...candSyms.keys()].sort();
  const ratios = [1, 1.3, 1.6].map((p) => {
    const vals = fixedPoint(names, p, { base: 1.7, step: 1 });
    const astVals = Object.fromEntries([...toCand].map(([s, c]) => [s, vals[c]!]));
    return evalExpr(ast, astVals) / evalExpr(candidate, vals);
  });
  const decided = constantRatio(ratios, 1e-9);
  return decided.constant ? decided.value : null;
}

/**
 * Compare a FITTED prefactor with the prefactor of each corpus relation the
 * candidate is algebraically equivalent to. `normalForm` matches up to a
 * constant, so an equivalent candidate can still carry the wrong constant: a
 * pendulum fitted on finite-amplitude data gives ĉ = 7.39, not 2π. Only a fully
 * quantitative canonical entry records a prefactor; for any other match the
 * note says the fitted value is not compared. `tolerance` is relative (the
 * holdout tolerance of the run) and is what decides agreement; when the fit
 * carries a standard error `stderr`, the note also states the difference in
 * σ beside that verdict, and decides nothing by it.
 *
 * @internal
 */
export function corpusPrefactorNotes(
  result: CorpusComparisonResult,
  candidate: ExprNode,
  fitted: number,
  tolerance: number,
  stderr?: number | null,
): string[] {
  const c = fitted.toPrecision(4);
  const inSigma = (k: number): string => {
    if (stderr === undefined || stderr === null || !(stderr > 0)) return '';
    const z = (fitted - k) / stderr;
    return `; ${z >= 0 ? '+' : ''}${z.toFixed(1)}σ (σ_ĉ = ${Number(stderr.toPrecision(2))})`;
  };
  return result.algebraicMatches.map((m) => {
    const entry = m.layer === 'canonical' ? CANONICAL_EQUATIONS.find((e) => e.id === m.id) : undefined;
    let k: number | null = null;
    // Fully quantitative entries carry their prefactor; others may take it from
    // the sourced table, applied to the entry's AST or, lacking one, its monomial.
    const tabled = entry && entry.epistemicStatus !== 'fully-quantitative' ? canonicalPrefactor(entry.id) : undefined;
    const body =
      entry?.epistemicStatus === 'fully-quantitative'
        ? entry.scalarAst
        : tabled === undefined
          ? undefined
          : (entry?.scalarAst ??
            (entry?.dimensional.monomial
              ? monomialToExpr(entry.dimensional.monomial, [entry.dimensional.target, ...entry.dimensional.governing])
              : undefined));
    if (body !== undefined) {
      try {
        const base = corpusPrefactor(body, candidate);
        k = base === null ? null : (tabled ?? 1) * base;
      } catch {
        k = null;
      }
    }
    if (k === null) return `${m.id} records no prefactor, so the fitted ĉ=${c} is not compared with it`;
    const rel = fitted / k - 1;
    if (Math.abs(rel) <= tolerance) {
      return `fitted ĉ=${c} agrees with ${m.id}'s prefactor ${k.toPrecision(4)} (within the holdout tolerance ${tolerance}${inSigma(k)})`;
    }
    const pct = `${rel > 0 ? '+' : ''}${Math.round(rel * 100)}%`;
    const sigma = inSigma(k);
    return (
      `fitted ĉ=${c} contradicts ${m.id}'s prefactor ${k.toPrecision(4)} (${pct}): ` +
      `the data may lie outside that relation's regime${sigma === '' ? '' : `; the difference is ${sigma.slice(2)}`}`
    );
  });
}

/** Allowed automated novelty sentence. @internal */
export function corpusRelativeWording(result: CorpusComparisonResult): string {
  if (result.algebraicMatches.length > 0) {
    const ids = result.algebraicMatches.map((m) => m.id).join(', ');
    return `Algebraic equivalent found in corpus ${result.corpusId}@${result.corpusVersion}: ${ids}`;
  }
  return `No equivalent was found in corpus ${result.corpusId} version ${result.corpusVersion} under equivalence procedures E=normalForm. SCIENTIFIC NOVELTY NOT ESTABLISHED.`;
}
