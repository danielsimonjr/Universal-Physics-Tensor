/**
 * Candidate fingerprints — `normalForm` is the cheap algebraic hash.
 *
 * @module composition/probe/fingerprint
 */

import type { ExprNode } from '../../dimensional/ast-types.js';
import { ALL_SCALAR_ARMS, scalarChildren } from '../../dimensional/ast-leaves.js';
import type { LeafWalkArms } from '../../dimensional/ast-leaves.js';
import { validate } from '../../dimensional/validator.js';
import { format } from '../../dimensional/algebra.js';
import { normalForm } from '../../canonical/normal-form.js';
import { hashCanonical, sha256Hex } from './serialize.js';
import type { CandidateFingerprint, ComplexityMetrics, ProbeCandidateBody } from './types.js';

/** Expression of a probe body. @internal */
export function bodyExpression(body: ProbeCandidateBody): ExprNode {
  return body.kind === 'scalar-expr' ? body.expression : body.correction;
}

/**
 * The arms {@link countOperators} descends into: every scalar arm except a
 * variational derivative, which counts as zero operators.
 */
const OPERATOR_ARMS: LeafWalkArms = { ...ALL_SCALAR_ARMS, variationalDerivative: false };

/** The node kinds that count as one operator each. */
const OPERATOR_KINDS: ReadonlySet<ExprNode['kind']> = new Set(['op', 'transcendental', 'integral', 'derivative']);

/** Recursively count AST nodes. @internal */
export function countAstNodes(node: ExprNode): number {
  return scalarChildren(node, ALL_SCALAR_ARMS).reduce((n, child) => n + countAstNodes(child), 1);
}

/** Operator / transcendental count. @internal */
export function countOperators(node: ExprNode): number {
  return scalarChildren(node, OPERATOR_ARMS).reduce((n, child) => n + countOperators(child), OPERATOR_KINDS.has(node.kind) ? 1 : 0);
}

/** Max `^` numeric exponent used as a derivative-order proxy for monomials. @internal */
export function maxPowerOrder(node: ExprNode): number {
  if (node.kind === 'op' && node.op === '^' && node.args[1]?.kind === 'symbol') {
    const e = Math.abs(Number(node.args[1].name));
    return Number.isFinite(e) ? e : 0;
  }
  if (node.kind === 'op') return Math.max(0, ...node.args.map(maxPowerOrder));
  if (node.kind === 'transcendental' || node.kind === 'abs') return maxPowerOrder(node.arg);
  return 0;
}

/** Complexity metrics for an expression. @internal */
export function complexityOf(node: ExprNode, freeParameters = 1): ComplexityMetrics {
  const astNodes = countAstNodes(node);
  const operators = countOperators(node);
  return {
    astNodes,
    operators,
    freeParameters,
    derivativeOrder: Math.round(maxPowerOrder(node)),
    descriptionLength: astNodes + operators,
  };
}

/** Fingerprint an expression under optional regime/assumption signatures. @internal */
export function fingerprintExpr(
  node: ExprNode,
  regimeSignature = '',
  assumptionSignature = '',
): CandidateFingerprint {
  const syntaxHash = hashCanonical(node);
  const canonicalAstHash = sha256Hex(normalForm(node));
  const v = validate(node);
  const dimensionalSignature = v.inferredDimension ? format(v.inferredDimension) : 'invalid';
  return {
    syntaxHash,
    canonicalAstHash,
    dimensionalSignature,
    regimeSignature,
    assumptionSignature: sha256Hex(assumptionSignature),
  };
}
