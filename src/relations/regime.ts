/**
 * Regime derivation — π-groups as the coordinates a regime is written in.
 *
 * Dimensionless inputs are passed INTO `buckinghamPi` as zero-dimension
 * variables and come back as their own trivial groups, keyed by their own
 * names in `PiGroup.formula`. Nothing is synthesized here. (Measured in
 * design note §10 Q1 by executing `buckinghamPi`; the implementation plan's
 * "plus one trivial group per dimensionless input" would double-add.)
 *
 * `admitApproximation` stays in `src/atlas/regime.ts`: it is generic over
 * `AtlasBridge`, and moving it would drag that record into this vocabulary.
 *
 * @module relations/regime
 */

import { buckinghamPi } from '../dimensional/buckingham.js';
import type { DimensionalVariable, PiGroup } from '../dimensional/buckingham.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import type { Regime, RegimeInequality } from './types.js';

/**
 * Derive the regime coordinates of a family, keyed by `PiGroup.formula`.
 *
 * A dimensionally-independent set has no groups and yields an empty record.
 *
 * @internal
 */
export function deriveRegimeGroups(
  family: string,
  parameters: readonly DimensionalVariable[],
  dimensionlessInputs: readonly string[],
): Record<string, PiGroup> {
  const variables: DimensionalVariable[] = [
    ...parameters,
    ...dimensionlessInputs.map((name) => ({ name, dim: DIMENSIONLESS })),
  ];
  if (variables.length === 0) {
    throw new Error(`deriveRegimeGroups(${family}) requires at least one variable`);
  }
  // buckinghamPi rejects duplicate names itself; the message is clearer here.
  const names = variables.map((v) => v.name);
  if (new Set(names).size !== names.length) {
    throw new Error(
      `deriveRegimeGroups(${family}) requires unique names across parameters and ` +
        `dimensionless inputs; got [${names.join(', ')}]`,
    );
  }
  const groups: Record<string, PiGroup> = {};
  for (const group of buckinghamPi(variables).piGroups) groups[group.formula] = group;
  return groups;
}

/**
 * Result of {@link regimeHolds} — TRI-STATE, not a boolean.
 *
 * Design note §1, Adam A2 RED #2. The first draft of this rule returned a
 * boolean and folded "could not check" into one of the two answers. Both
 * foldings are wrong in a way that is invisible at the call site:
 *
 *   - Folding absence into `true` is a SILENT PASS. A caller who supplies
 *     `{ Ma: 0.1 }` and never computes `Re` gets a confident "the regime
 *     holds" while `Re = 50` grossly violates it. The omission of the very
 *     data that would reveal the violation is what produces the pass.
 *   - Folding absence into `false` reports a VIOLATION that was never
 *     observed, which is a different false claim and destroys the caller's
 *     ability to tell "I measured this and it failed" from "I never measured
 *     this". Only the first licenses saying the regime is violated.
 *
 * So `ok` carries three answers and the two failure sets are kept apart.
 *
 * @public
 */
export interface RegimeCheck {
  /**
   * `true` — every inequality was CHECKED and satisfied.
   * `false` — at least one was checked and VIOLATED.
   * `'unknown'` — nothing was violated, but at least one could NOT be checked.
   *
   * `'unknown'` is a failure to confirm validity, NEVER validity. A caller
   * asking "may I use this model here?" must test `=== true`; `!== false` is
   * the silent pass this type exists to prevent.
   */
  readonly ok: boolean | 'unknown';
  /** CHECKED and violated — carried whole so the caller can name them. */
  readonly violated: readonly RegimeInequality[];
  /** NOT checked: the π-group value was absent or non-finite. */
  readonly unchecked: readonly RegimeInequality[];
  /**
   * How many inequalities a finite value reached. `ok: true` with
   * `checked: 0` is a VACUOUS pass: the regime states no inequality (the
   * plasma, piezoelectricity and Tolman registrations), so nothing was
   * checked and nothing held. That is a different fact from a pass over a
   * non-empty list, and a coverage count must not add it (AGENTS law 4).
   */
  readonly checked: number;
}

function satisfies(value: number, ineq: RegimeInequality): boolean {
  switch (ineq.op) {
    case '<':
      return value < ineq.bound;
    case '<=':
      return value <= ineq.bound;
    case '>':
      return value > ineq.bound;
    case '>=':
      return value >= ineq.bound;
  }
}

/**
 * Check a regime against measured group values.
 *
 * A group with no supplied value, or a non-finite one, is UNCHECKED — not
 * violated and not satisfied. See {@link RegimeCheck} for why the distinction
 * is load-bearing. A regime with no inequalities returns `true` with
 * `checked: 0`: there was nothing to check and nothing went unchecked, so the
 * claim "every inequality was checked and satisfied" is vacuously true rather
 * than unknown, and `checked` says that nothing was checked. A caller that
 * counts coverage reads `checked`, never `ok` alone.
 *
 * A violation outranks an absence: once one inequality is CHECKED and fails,
 * the regime does not hold, whatever the unmeasured coordinates would say.
 *
 * @public
 */
export function regimeHolds(
  regime: Regime,
  groupValues: Readonly<Record<string, number>>,
): RegimeCheck {
  const violated: RegimeInequality[] = [];
  const unchecked: RegimeInequality[] = [];
  let checked = 0;
  for (const ineq of regime.inequalities) {
    const value = groupValues[ineq.group];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      unchecked.push(ineq);
      continue;
    }
    checked += 1;
    if (!satisfies(value, ineq)) violated.push(ineq);
  }
  const ok = violated.length > 0 ? false : unchecked.length > 0 ? 'unknown' : true;
  return { ok, violated, unchecked, checked };
}

// ── Sprint 2: regime algebra and admission ──────────────────────────────────

/**
 * Merge two regimes into the regime that holds where BOTH hold.
 *
 * The conjunction is the whole operation: an inequality from either side is an
 * inequality of the intersection, so the list is concatenated rather than
 * reduced. No attempt is made to simplify `x < 1` and `x < 2` into one
 * inequality — the redundant one is still true, and a simplifier that dropped
 * the wrong one would be a silent change of claim.
 *
 * `groupDefinitions` are merged and CHECKED, not overwritten. Two regimes that
 * key the same `PiGroup.formula` to different exponent vectors are not
 * traceable to one dimension matrix, and quietly keeping one would hand the
 * caller a regime whose group definitions no longer describe its inequalities.
 *
 * @throws Error if the families differ, or if a shared group name carries
 *   conflicting definitions.
 * @internal
 */
export function intersectRegimes(a: Regime, b: Regime): Regime {
  if (a.family !== b.family) {
    throw new Error(
      `intersectRegimes: families differ ('${a.family}' vs '${b.family}'); ` +
        'a regime is stated in the groups of its own family',
    );
  }
  const groupDefinitions: Record<string, PiGroup> = { ...a.groupDefinitions };
  for (const [name, group] of Object.entries(b.groupDefinitions)) {
    const existing = groupDefinitions[name];
    if (existing !== undefined && !samePiGroup(existing, group)) {
      throw new Error(
        `intersectRegimes: group '${name}' is defined differently in the two regimes`,
      );
    }
    groupDefinitions[name] = group;
  }
  return {
    family: a.family,
    inequalities: [...a.inequalities, ...b.inequalities],
    groupDefinitions,
  };
}

/**
 * Group names whose π-groups differ across `regimes`. The path command leaves
 * those names unchecked on every step that defines them. It does not call
 * {@link intersectRegimes}: that function still throws when the families differ.
 *
 * The same key with the same exponent vector is not a collision. A zero
 * exponent is ignored, matching `--at` derivation.
 *
 * @internal
 */
export function collidingRegimeGroups(
  regimes: readonly Regime[],
): readonly { readonly group: string; readonly families: readonly string[] }[] {
  const seen = new Map<string, { sig: string; families: string[] }>();
  const collisions = new Map<string, string[]>();
  for (const regime of regimes) {
    for (const [name, group] of Object.entries(regime.groupDefinitions)) {
      const sig = exponentSignature(group);
      const prev = seen.get(name);
      if (prev === undefined) {
        seen.set(name, { sig, families: [regime.family] });
        continue;
      }
      if (prev.sig === sig) {
        if (!prev.families.includes(regime.family)) prev.families.push(regime.family);
        continue;
      }
      const families = collisions.get(name) ?? [...prev.families];
      if (!families.includes(regime.family)) families.push(regime.family);
      collisions.set(name, families);
    }
  }
  return [...collisions.entries()].map(([group, families]) => ({ group, families }));
}

function exponentSignature(group: PiGroup): string {
  return Object.entries(group.exponents)
    .filter(([, exp]) => exp !== 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, exp]) => `${name}:${exp}`)
    .join(',');
}

function samePiGroup(x: PiGroup, y: PiGroup): boolean {
  const names = new Set([...Object.keys(x.exponents), ...Object.keys(y.exponents)]);
  for (const name of names) {
    if ((x.exponents[name] ?? 0) !== (y.exponents[name] ?? 0)) return false;
  }
  return true;
}

/** A closed-or-open interval on one π-group. Unbounded ends are ±Infinity. */
interface GroupInterval {
  lo: number;
  loOpen: boolean;
  hi: number;
  hiOpen: boolean;
}

function fullInterval(): GroupInterval {
  return { lo: -Infinity, loOpen: true, hi: Infinity, hiOpen: true };
}

/** Narrow `iv` in place by one inequality. */
function narrow(iv: GroupInterval, ineq: RegimeInequality): void {
  switch (ineq.op) {
    case '<':
    case '<=': {
      const open = ineq.op === '<';
      if (ineq.bound < iv.hi || (ineq.bound === iv.hi && open)) {
        iv.hi = ineq.bound;
        iv.hiOpen = open;
      }
      return;
    }
    case '>':
    case '>=': {
      const open = ineq.op === '>';
      if (ineq.bound > iv.lo || (ineq.bound === iv.lo && open)) {
        iv.lo = ineq.bound;
        iv.loOpen = open;
      }
      return;
    }
  }
}

/** The per-group intervals the inequalities of a regime carve out. */
function intervalsOf(regime: Regime): Map<string, GroupInterval> {
  const out = new Map<string, GroupInterval>();
  for (const ineq of regime.inequalities) {
    let iv = out.get(ineq.group);
    if (iv === undefined) {
      iv = fullInterval();
      out.set(ineq.group, iv);
    }
    narrow(iv, ineq);
  }
  return out;
}

function isEmpty(iv: GroupInterval): boolean {
  if (iv.lo > iv.hi) return true;
  return iv.lo === iv.hi && (iv.loOpen || iv.hiOpen);
}

function intersectIntervals(x: GroupInterval, y: GroupInterval): GroupInterval {
  const lo = Math.max(x.lo, y.lo);
  const hi = Math.min(x.hi, y.hi);
  return {
    lo,
    loOpen: (x.lo === lo && x.loOpen) || (y.lo === lo && y.loOpen),
    hi,
    hiOpen: (x.hi === hi && x.hiOpen) || (y.hi === hi && y.hiOpen),
  };
}

/** Is every point of `inner` a point of `outer`? */
function contains(outer: GroupInterval, inner: GroupInterval): boolean {
  if (isEmpty(inner)) return true;
  const loOk =
    outer.lo < inner.lo || (outer.lo === inner.lo && (!outer.loOpen || inner.loOpen));
  const hiOk =
    outer.hi > inner.hi || (outer.hi === inner.hi && (!outer.hiOpen || inner.hiOpen));
  return loOk && hiOk;
}

/** How two regimes sit relative to each other. @internal */
export type RegimeOverlap = 'disjoint' | 'overlap' | 'nested';

/**
 * Classify two regimes on the group names they SHARE.
 *
 * Shared names only, and that restriction is the whole subtlety. A group one
 * regime constrains and the other says nothing about cannot separate them:
 * silence is not a constraint, so treating the unconstrained side as empty
 * would report `'disjoint'` for two regimes that genuinely overlap. The answer
 * is therefore about the shared coordinates, and says nothing about the
 * private ones.
 *
 * - `'disjoint'` — some shared group has intervals that cannot both hold.
 * - `'nested'` — the shared box of one regime contains the other (equal boxes,
 *   and the no-shared-group case, are nested: each contains the other).
 * - `'overlap'` — they meet, and neither contains the other.
 *
 * @internal
 */
export function regimeOverlap(a: Regime, b: Regime): RegimeOverlap {
  const ia = intervalsOf(a);
  const ib = intervalsOf(b);
  const shared = [...ia.keys()].filter((name) => ib.has(name));

  for (const name of shared) {
    if (isEmpty(intersectIntervals(ia.get(name)!, ib.get(name)!))) return 'disjoint';
  }
  const aInB = shared.every((name) => contains(ib.get(name)!, ia.get(name)!));
  const bInA = shared.every((name) => contains(ia.get(name)!, ib.get(name)!));
  return aInB || bInA ? 'nested' : 'overlap';
}

/** One grid cell of a sampled group box, and the regimes that cover it. @internal */
export interface RegionSample {
  /** The π-group value at this cell, keyed by `PiGroup.formula`. */
  readonly point: Readonly<Record<string, number>>;
}

/** A record carrying a regime — `AtlasModel` and `AtlasBridge` both fit. @internal */
export interface RegimeBearing {
  readonly id: string;
  readonly regime: Regime;
}

/**
 * Grid-sample a group box and list the cells no regime covers.
 *
 * `samples` IS the box: one explicit axis of values per π-group name. The box
 * is not derived from the bounds the regimes themselves carry, and that is
 * deliberate — a synthesized box would report coverage against an extent this
 * library invented, so "uncovered" would measure the guess rather than the
 * atlas. The caller states where it wants to know about.
 *
 * COVERED means some regime returned `true` with at least one inequality
 * checked. An `'unknown'` is NOT coverage, by the same rule that makes
 * {@link regimeHolds} tri-state: a regime whose groups the sample axes never
 * mention has not been shown to apply anywhere. Neither is a vacuous pass: a
 * regime that states no inequality has checked nothing at the point.
 *
 * Records of another family are skipped, so a mixed list is safe to pass.
 *
 * @internal
 */
export function uncoveredRegions(
  family: string,
  models: readonly RegimeBearing[],
  samples: Readonly<Record<string, readonly number[]>>,
): readonly RegionSample[] {
  const inFamily = models.filter((m) => m.regime.family === family);
  const uncovered: RegionSample[] = [];
  for (const point of gridPoints(samples)) {
    // `checked > 0`: a regime with no inequality passes vacuously and has shown
    // nothing about this point, so it covers nothing (the rule in `regimeHolds`'s
    // doc comment: coverage reads `checked`, never `ok` alone).
    const covered = inFamily.some((m) => {
      const check = regimeHolds(m.regime, point);
      return check.ok === true && check.checked > 0;
    });
    // An uncovered cell is covered by nothing, by definition; the sample
    // carries the point and no list that could only ever be empty.
    if (!covered) uncovered.push({ point });
  }
  return uncovered;
}

/** Cartesian product of the named axes. An axis with no values yields nothing. */
function gridPoints(
  samples: Readonly<Record<string, readonly number[]>>,
): readonly Record<string, number>[] {
  let points: Record<string, number>[] = [{}];
  for (const [group, axis] of Object.entries(samples)) {
    const next: Record<string, number>[] = [];
    for (const base of points) {
      for (const value of axis) next.push({ ...base, [group]: value });
    }
    points = next;
  }
  return points;
}
