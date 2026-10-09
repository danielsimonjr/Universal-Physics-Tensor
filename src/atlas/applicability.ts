/**
 * Atlas Phase 4, S4.1 — the applicability checker.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §1.
 *
 * **This module answers "what about this bridge is not checked?", and it
 * returns FINDINGS rather than a boolean.** A boolean would have to choose
 * between "unchecked" and "wrong", and those are the two states the module
 * exists to keep apart. Every finding therefore carries a
 * {@link ApplicabilitySeverity}:
 *
 *  - `'blocking'` — the data CONTRADICTS ITSELF. A dimensional failure, two
 *    records declaring opposite conventions, a literal zero divisor.
 *  - `'question'` — the data is SILENT. A divisor nobody guarded, a convention
 *    only one side declares, two premise models whose relationship is
 *    unrecorded.
 *
 * `src/atlas/conventions.ts` already argues this asymmetry at length for the
 * convention comparison: absence is not disagreement. The same reasoning
 * governs every rule here. Collapsing the two severities would report "four
 * findings" for a record whose only defect is that nobody wrote something
 * down, and would bury a genuine contradiction among them.
 *
 * **Nothing here mutates a record and nothing here is a verdict.** The checker
 * has no authority to promote or reject: it produces the list a reviewer reads.
 * That is the same firewall the rest of the repo keeps — no machine verdict
 * mutates a catalog.
 *
 * @module atlas/applicability
 * @internal
 */

import type { ExprNode } from '../dimensional/ast-types.js';
import { validate } from '../dimensional/validator.js';
import type { AtlasModel } from './model.js';
import type { Conventions } from './types.js';
import { checkConventions, unknownConventionKeys } from './conventions.js';

/** Whether a finding is a contradiction in the data or a silence in it. @internal */
export type ApplicabilitySeverity = 'blocking' | 'question';

/**
 * The rule that produced a finding. A closed union so a caller can filter by
 * rule without matching on prose.
 *
 * @internal
 */
export type ApplicabilityFindingKind =
  | 'dimensional-inconsistency'
  | 'convention-mismatch'
  | 'convention-undeclared'
  | 'division-unguarded'
  | 'division-by-zero'
  | 'squaring-adds-solutions'
  | 'model-incompatibility';

/** One thing a reviewer must resolve before believing the record. @internal */
export interface ApplicabilityFinding {
  readonly kind: ApplicabilityFindingKind;
  readonly severity: ApplicabilitySeverity;
  /** Human-readable statement of what is unresolved. */
  readonly detail: string;
  /**
   * Where it was found: an AST path (`'args[1]'`), a convention key, or a
   * model id. Absent when the finding is about the record as a whole.
   */
  readonly where?: string;
}

/**
 * What the checker is given. Every field is optional EXCEPT the side
 * conditions, which are required so that "this record states none" is a
 * written choice (`[]`) rather than a forgotten argument — the same reasoning
 * that made `passingWitnessIds` required in `derive-evidence.ts`.
 *
 * @internal
 */
export interface ApplicabilityInput {
  /** The transformation's AST, when the record encodes one. */
  readonly ast?: ExprNode;
  /** The record's stated side conditions, as free prose. REQUIRED; `[]` is a statement. */
  readonly sideConditions: readonly string[];
  /** The premise records' declared conventions. */
  readonly premiseConventions?: Conventions;
  /** The conclusion record's declared conventions. */
  readonly conclusionConventions?: Conventions;
  /** The premise models (many). */
  readonly premises?: readonly AtlasModel[];
  /** The conclusion model (one). */
  readonly conclusion?: AtlasModel;
  /**
   * Family pairs already bridged, so a genuine cross-family step is not
   * reported as unrecorded. Unordered: `['a','b']` covers `['b','a']`.
   */
  readonly declaredBridges?: readonly (readonly [string, string])[];
}

/**
 * Non-vanishing markers a side condition may use. Matched case-insensitively
 * against the side-condition prose.
 *
 * ⚠ **Shallow by design, and the asymmetry is the point** (design note §1.3).
 * A side condition is free text and no parser exists for it. The failure mode
 * is a FALSE QUESTION — a genuinely guarded divisor phrased in words this list
 * does not know — never a false clearance, because a divisor absent from the
 * prose cannot match any marker. The check over-asks rather than over-clears.
 */
const NONVANISHING_MARKERS: readonly string[] = [
  '≠ 0',
  '≠0',
  '!= 0',
  '!=0',
  '<> 0',
  '<>0',
  'nonzero',
  'non-zero',
  'non zero',
  '> 0',
  '>0',
  'positive',
];

/** Free symbol names appearing anywhere in a subtree. */
function symbolNames(node: ExprNode, into: Set<string> = new Set()): Set<string> {
  if (node.kind === 'symbol') {
    into.add(node.name);
    return into;
  }
  for (const child of childNodes(node)) symbolNames(child, into);
  return into;
}

/**
 * The `ExprNode` children of a node, for the scalar grammar this checker
 * reasons about. Tensor and curvature node families have no children here and
 * return `[]`: the side-condition and squaring rules are statements about
 * scalar algebra, and silently descending into a tensor node would invite
 * findings whose `where` path means nothing to a reader.
 */
function childNodes(node: ExprNode): readonly ExprNode[] {
  switch (node.kind) {
    case 'op':
      return node.args;
    case 'integral':
      return [node.over, node.integrand, ...(node.lower ? [node.lower] : []),
        ...(node.upper ? [node.upper] : [])];
    case 'derivative':
      return [node.of, node.wrt];
    case 'dirac-delta':
      return [node.arg];
    case 'variational-derivative':
      return [node.functional, node.field, node.over];
    case 'transcendental':
      return [node.arg];
    case 'abs':
      return [node.arg];
    default:
      return [];
  }
}

/**
 * The numeric value of a leaf that IS a literal, or `null`.
 *
 * Literals are `symbol` leaves whose `name` parses as a number — the same
 * convention `validator.ts` uses to recognise a literal exponent, so the two
 * cannot disagree about what a literal is.
 */
function literalValue(node: ExprNode): number | null {
  if (node.kind !== 'symbol') return null;
  if (node.name.trim() === '') return null;
  const v = Number(node.name);
  return Number.isFinite(v) ? v : null;
}

/** The word-like tokens of a side condition: runs of letters, digits and underscores, lower-cased. */
function wordTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []);
}

/**
 * Is `name` guarded as non-vanishing by any of the stated side conditions?
 *
 * The name must appear as a WHOLE token of the condition: `a` is not guarded
 * by "the amplitude is positive", although that sentence contains the letter
 * `a` beside a marker. A substring match cleared every one-letter divisor on
 * most prose; that was the audit's A14.
 */
function isGuarded(name: string, sideConditions: readonly string[]): boolean {
  const needle = name.toLowerCase();
  return sideConditions.some((raw) => {
    if (!wordTokens(raw).has(needle)) return false;
    const s = raw.toLowerCase();
    return NONVANISHING_MARKERS.some((m) => s.includes(m));
  });
}

/** An even, integer literal exponent, or `null` when the exponent is anything else. */
function evenLiteralExponent(node: ExprNode): number | null {
  if (node.kind !== 'op' || node.op !== '^') return null;
  const exp = node.args[1];
  if (exp === undefined) return null;
  const v = literalValue(exp);
  if (v === null || !Number.isInteger(v) || v === 0) return null;
  return v % 2 === 0 ? v : null;
}

/** Walk the AST, applying the side-condition and squaring rules. */
function checkAst(
  node: ExprNode,
  sideConditions: readonly string[],
  path: string,
  out: ApplicabilityFinding[],
): void {
  if (node.kind === 'op' && node.op === '/') {
    const divisor = node.args[1];
    if (divisor !== undefined) {
      const lit = literalValue(divisor);
      if (lit === 0) {
        out.push({
          kind: 'division-by-zero',
          severity: 'blocking',
          detail: 'Division by the literal 0.',
          where: `${path}args[1]`,
        });
      } else if (lit === null) {
        // Not a literal: it needs a stated non-vanishing side condition.
        const names = [...symbolNames(divisor)];
        const unguarded = names.filter((n) => !isGuarded(n, sideConditions));
        // Every name guarded ⇒ nothing to ask. A divisor with NO symbols and no
        // literal value (a tensor leaf, say) is reported, because nothing about
        // it can be checked and silence there would read as clearance.
        if (names.length === 0 || unguarded.length > 0) {
          const subject = names.length === 0 ? 'the divisor' : unguarded.join(', ');
          out.push({
            kind: 'division-unguarded',
            severity: 'question',
            detail:
              `Division whose divisor (${subject}) has no stated non-vanishing side ` +
              'condition. This is a question, not a defect: the divisor may well be ' +
              'non-zero and simply unstated.',
            where: `${path}args[1]`,
          });
        }
      }
    }
  }

  // Difference (or sum) of two equal even powers ⇒ the relation was obtained by
  // squaring, which admits the sign-flipped branch. See design note §1.4 for why
  // an isolated even power is NOT reported.
  if (node.kind === 'op' && (node.op === '-' || node.op === '+')) {
    const exps = node.args.map(evenLiteralExponent);
    for (let i = 0; i < exps.length; i += 1) {
      for (let j = i + 1; j < exps.length; j += 1) {
        const a = exps[i];
        if (a !== null && a !== undefined && a === exps[j]) {
          out.push({
            kind: 'squaring-adds-solutions',
            severity: 'question',
            detail:
              `Two terms raised to the same even power (${a}) are equated. Raising a ` +
              'relation to an even power admits the sign-flipped branch, so a side ' +
              'condition fixing the sign is needed for the step to be reversible.',
            where: `${path}args[${i}]`,
          });
        }
      }
    }
  }

  const children = childNodes(node);
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child !== undefined) checkAst(child, sideConditions, `${path}args[${i}].`, out);
  }
}

/** Is this family pair recorded as already bridged? Unordered. */
function bridgeDeclared(
  a: string,
  b: string,
  declared: readonly (readonly [string, string])[],
): boolean {
  return declared.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/**
 * Every unresolved question and contradiction the checker can see in a record.
 *
 * An EMPTY result means "no rule fired", which is weaker than "this bridge is
 * valid" and must not be reported as the latter. The rules in hand cover
 * dimensions, declared conventions, division guards, even-power equating and
 * model families; a bridge can be wrong in ways none of them reaches.
 *
 * @param input - the record's checkable parts. `sideConditions` is required.
 * @returns findings in rule order (dimensions, conventions, AST, models);
 * never `null`, never throws on a malformed AST.
 * @internal
 */
export function checkApplicability(
  input: ApplicabilityInput,
): readonly ApplicabilityFinding[] {
  const out: ApplicabilityFinding[] = [];

  // 1. Dimensions — the existing validator, unchanged.
  if (input.ast !== undefined) {
    const result = validate(input.ast);
    for (const v of result.violations) {
      // A warning-severity violation does not make the record inconsistent;
      // reporting it as blocking would contradict `validate`'s own verdict.
      const severity: ApplicabilitySeverity =
        (v.severity ?? 'error') === 'error' ? 'blocking' : 'question';
      out.push({
        kind: 'dimensional-inconsistency',
        severity,
        detail: v.note,
        where: v.location === '' ? undefined : v.location,
      });
    }
    if (result.inferredDimension === null && result.violations.length === 0) {
      out.push({
        kind: 'dimensional-inconsistency',
        severity: 'blocking',
        detail: 'No dimension could be inferred for the transformation AST.',
      });
    }
  }

  // 2. Conventions — mismatches block, asymmetric declarations are questions.
  const mismatches = checkConventions(input.premiseConventions, input.conclusionConventions);
  for (const key of mismatches) {
    out.push({
      kind: 'convention-mismatch',
      severity: 'blocking',
      detail:
        `Premise and conclusion declare different values for '${key}'. Two records ` +
        'that disagree on a sign or unit choice are not directly comparable.',
      where: key,
    });
  }
  for (const key of unknownConventionKeys(
    input.premiseConventions,
    input.conclusionConventions,
  )) {
    out.push({
      kind: 'convention-undeclared',
      severity: 'question',
      detail:
        `Exactly one side declares '${key}'. Silence is not agreement: the other ` +
        'record may use the opposite choice and simply never said.',
      where: key,
    });
  }

  // 3. Side conditions over the AST.
  if (input.ast !== undefined) checkAst(input.ast, input.sideConditions, '', out);

  // 4. Model compatibility.
  const premises = input.premises ?? [];
  const declared = input.declaredBridges ?? [];
  const conclusionFamily = input.conclusion?.family;
  const families = new Set(premises.map((m) => m.family));
  if (conclusionFamily !== undefined) families.add(conclusionFamily);
  const familyList = [...families];
  for (let i = 0; i < familyList.length; i += 1) {
    for (let j = i + 1; j < familyList.length; j += 1) {
      const a = familyList[i];
      const b = familyList[j];
      if (a === undefined || b === undefined) continue;
      if (bridgeDeclared(a, b, declared)) continue;
      out.push({
        kind: 'model-incompatibility',
        severity: 'question',
        detail:
          `Models span families '${a}' and '${b}' with no declared bridge between ` +
          'them. An unrecorded cross-family step is exactly what the atlas exists ' +
          'to make visible.',
        where: `${a}|${b}`,
      });
    }
  }

  return out;
}

/**
 * The `'blocking'` subset of {@link checkApplicability}.
 *
 * Offered because the two severities are read by different callers — a report
 * shows both, a gate looks only at contradictions — and filtering on the
 * severity string at every call site is how one of them eventually filters on
 * the wrong one.
 *
 * @internal
 */
export function blockingFindings(
  findings: readonly ApplicabilityFinding[],
): readonly ApplicabilityFinding[] {
  return findings.filter((f) => f.severity === 'blocking');
}
