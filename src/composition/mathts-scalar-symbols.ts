/**
 * Scalar leaves of an `ExprNode`, read from a MathTS AST.
 *
 * `governingOf` and the free-leaf list in `compose-symbolic.ts` both call
 * {@link scalarSymbolsFromMathTs}. The names come from that node's symbol
 * filter. This module does not walk `ExprNode` to collect them.
 *
 * The rendered text uses the same gensym as `expr-simplify.ts`: a bare `e`
 * is `gN`, never the identifier MathTS reads as Euler's number. Mapped back,
 * the name is the elementary charge. `exp(1)` does not introduce `e`.
 * Tensor and curvature kinds contribute no symbol.
 *
 * @module composition/mathts-scalar-symbols
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { quietlySync } from './mathts-quiet.js';
import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';

/** One scalar leaf and the dimension stored on that symbol. @internal */
export interface ScalarSymbol {
  readonly name: string;
  readonly dim: Dimension;
}

interface LeafMeta {
  readonly name: string;
  readonly dim: Dimension;
}

/** The bits of a MathTS node this reader uses. */
interface MathNode {
  filter(predicate: (node: MathNode) => boolean): MathNode[];
  readonly isSymbolNode?: boolean;
  readonly name?: string;
}

interface MathtsFunctionsModule {
  parse(expr: string): MathNode;
}

const isLiteral = (name: string): boolean => Number.isFinite(Number(name));

/**
 * Render one symbol the way `expr-simplify.ts` does: a numeric literal stays
 * a number, and every other name becomes `gN`. Repeated names share one
 * gensym, so MathTS never sees the physics spelling of `e`.
 *
 * @internal
 */
export function renderScalarLeaf(
  expr: { readonly name: string; readonly dim: Dimension },
  gensymOf: Map<string, string>,
  meta: Map<string, LeafMeta>,
): string {
  if (isLiteral(expr.name)) return String(Number(expr.name));
  let g = gensymOf.get(expr.name);
  if (g === undefined) {
    g = `g${gensymOf.size}`;
    gensymOf.set(expr.name, g);
    meta.set(g, { name: expr.name, dim: expr.dim });
  }
  return g;
}

/**
 * A MathTS expression whose symbol nodes are the scalar leaves.
 * Integral bounds are omitted: the previous leaf list did not include them.
 * A curvature or tensor kind returns null.
 */
function renderSymbolQuery(
  expr: ExprNode,
  gensymOf: Map<string, string>,
  meta: Map<string, LeafMeta>,
): string | null {
  switch (expr.kind) {
    case 'symbol':
      return renderScalarLeaf(expr, gensymOf, meta);
    case 'op': {
      const parts: string[] = [];
      for (const arg of expr.args) {
        const part = renderSymbolQuery(arg, gensymOf, meta);
        if (part !== null) parts.push(part);
      }
      return joinParts(parts, expr.op);
    }
    case 'transcendental':
    case 'abs':
    case 'dirac-delta':
      return renderSymbolQuery(expr.arg, gensymOf, meta);
    case 'integral':
      return joinParts(
        [
          renderSymbolQuery(expr.over, gensymOf, meta),
          renderSymbolQuery(expr.integrand, gensymOf, meta),
        ].filter((part): part is string => part !== null),
        '+',
      );
    case 'derivative':
      return joinParts(
        [
          renderSymbolQuery(expr.of, gensymOf, meta),
          renderSymbolQuery(expr.wrt, gensymOf, meta),
        ].filter((part): part is string => part !== null),
        '+',
      );
    case 'variational-derivative':
      return joinParts(
        [
          renderSymbolQuery(expr.functional, gensymOf, meta),
          renderSymbolQuery(expr.field, gensymOf, meta),
          renderSymbolQuery(expr.over, gensymOf, meta),
        ].filter((part): part is string => part !== null),
        '+',
      );
    default:
      return null;
  }
}

function joinParts(parts: readonly string[], op: string): string | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0] ?? null;
  return `(${parts.map((part) => `(${part})`).join(op)})`;
}

let cachedParse: MathtsFunctionsModule['parse'] | undefined;

/**
 * Load `parse` at the call. This walk does not add its own static import.
 * The load AND the first parse run inside the one console-silencing window
 * this module opens (`mathts-quiet.ts` states the invariant): the peer's
 * WASM-fallback chatter fires lazily on first use, so the smoke parse is that
 * first use, and every later parse runs with the console untouched.
 */
function mathTsParse(): MathtsFunctionsModule['parse'] {
  if (cachedParse !== undefined) return cachedParse;
  let url: string;
  try {
    url = import.meta.resolve('@danielsimonjr/mathts-functions');
  } catch (err) {
    throw new Error(
      `scalar symbols require @danielsimonjr/mathts-functions (${err instanceof Error ? err.message : String(err)})`,
    );
  }
  const parse = quietlySync(() => {
    const require = createRequire(import.meta.url);
    const loaded = require(fileURLToPath(url)) as MathtsFunctionsModule;
    if (typeof loaded.parse !== 'function') {
      throw new Error('@danielsimonjr/mathts-functions: no parse() export');
    }
    const bound = loaded.parse.bind(loaded);
    bound('g0');
    return bound;
  });
  cachedParse = parse;
  return cachedParse;
}

/**
 * Distinct scalar leaves of `expr`, in first-seen order.
 *
 * The MathTS symbol filter supplies the names. A gensym that this renderer
 * did not issue is dropped, so a function callee such as `exp` is not a leaf.
 * Tensor and curvature kinds return an empty list.
 *
 * @internal
 */
export function scalarSymbolsFromMathTs(expr: ExprNode): ScalarSymbol[] {
  const gensymOf = new Map<string, string>();
  const meta = new Map<string, LeafMeta>();
  const rendered = renderSymbolQuery(expr, gensymOf, meta);
  if (rendered === null) return [];
  const node = mathTsParse()(rendered);
  const seen = new Set<string>();
  const leaves: ScalarSymbol[] = [];
  for (const symbol of node.filter((candidate) => candidate.isSymbolNode === true)) {
    const issued = symbol.name !== undefined ? meta.get(symbol.name) : undefined;
    if (issued === undefined || seen.has(issued.name)) continue;
    seen.add(issued.name);
    leaves.push(issued);
  }
  return leaves;
}
