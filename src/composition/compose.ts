/**
 * Composition graph — the composition operator (v0.8.0 T2/T4, per
 * docs/planning/v0.8.0-Design.md §3 + r2 deltas).
 *
 * `composeEdges(first, second)` pipes `first`'s output quantity into a
 * matching source of `second`, producing a NEW `BridgeEdge` (design
 * D-2 — composition closes over the edge type, so chains nest
 * arbitrarily). Defined iff:
 *
 *   1. `first.target` matches one of `second.sources` — by canonical
 *      name, or via an explicit {@link QuantityIdentification} (the
 *      reviewable physics judgments, e.g. "the Hawking temperature IS
 *      the temperature in Landauer's bound");
 *   2. the junction dimensions are EXACTLY equal (the dimension-functor
 *      check — ℤ⁷ integer-vector equality via the dimensional
 *      calculus's `equals`);
 *   3. domains conjoin THROUGH the pipe (design D-5): the composed
 *      domain checks `first`'s domain on the outer inputs and
 *      `second`'s domain on the piped intermediate value. This
 *      evaluates `first.evaluate` inside the predicate — acceptable
 *      for scalar closed forms.
 *
 * Confidence demotes: `min(first, second)` on
 * established > speculative > highly-speculative. Composition never
 * launders credibility (improvement-plan confidence algebra).
 *
 * Operator is named `composeEdges` (NOT `compose`) — `compose` is the
 * public v0.7 Cell factory in `src/core/cell.ts` (Adam A-1).
 *
 * @module composition/compose
 */

import { equals, format } from '../dimensional/algebra.js';
import type { Dimension } from '../dimensional/types.js';
import { validate } from '../dimensional/validator.js';
import type { ExprNode } from '../dimensional/validator.js';
import type { BridgeEdge, EdgeConfidence } from './edge.js';
import type { Quantity, RegimeAttributes } from './quantity.js';
import { regimeAttributesOf } from './quantity.js';
import { AXES } from './axes.js';
import { conventionFactor } from '../dimensional/unit-convention.js';
import {
  assertCoefficientSet,
  CompositionAliasError,
  CompositionDimensionError,
  CompositionJunctionError,
  UndefinedCompositionError,
} from './edge.js';
import { DomainViolationError } from '../bridges/evaluation-errors.js';
import { substitute } from './expr-subst.js';
import { monomialExponents } from './formula-shape.js';
// Atlas Phase 1 overlay. The composition table is a leaf module (pure, no
// registry reads, no import from `src/composition/`), so this does not close a
// cycle — same rule as the type-only atlas import in `./edge.ts`.
import { composeRelation, NO_COMPOSITE_CLAIM } from '../relations/composition-table.js';
import { checkConventions } from '../relations/conventions.js';
import { intersectRegimes } from '../relations/regime.js';
import type { Conventions, Regime, RelationContract, RelationType } from '../relations/types.js';

/**
 * The `RelationContract` a composed edge carries, given the composite TYPE the
 * table returned and the two operand contracts.
 *
 * Only four types can be returned by the table (`derivation`,
 * `exact-equivalence`, `restriction`, `coarse-graining`); the other four appear
 * only as operands. `exact-equivalence` is produced by exactly one cell —
 * `exact-equivalence ∘ exact-equivalence` — so both operands are guaranteed to
 * carry the `inverse` its contract requires, and the composed inverse undoes
 * the second map first.
 *
 * NOT composed here: an `ApproximationBound`. `coarse-graining ∘
 * coarse-graining` accumulates error through `composeBounds`
 * (`src/atlas/error-algebra.ts`), which the implementation plan wires in as a
 * SEPARATE task behind this same guard. Until then the composite states its
 * type and no bound — it does not restate either operand's bound, which would
 * be a narrower error claim than the chain supports.
 *
 * @internal
 */
function composedContract(
  type: Exclude<RelationType, 'approximation'>,
  first: RelationContract,
  second: RelationContract,
): RelationContract {
  const transformation = `${first.transformation} then ${second.transformation}`;
  if (type === 'exact-equivalence') {
    // Guarded by the table: only exact ∘ exact yields exact, and that contract
    // makes `inverse` REQUIRED on both operands.
    const fi = (first as Extract<RelationContract, { type: 'exact-equivalence' }>).inverse;
    const si = (second as Extract<RelationContract, { type: 'exact-equivalence' }>).inverse;
    return { type, transformation, inverse: `${si} then ${fi}` };
  }
  return { type, transformation };
}

/**
 * A reviewable quantity-identification judgment: the assertion that
 * the quantity named `from` (an edge's target) IS the quantity named
 * `to` (another edge's source), with the physics rationale on record.
 *
 * @public
 */
export interface QuantityIdentification {
  readonly from: string;
  readonly to: string;
  readonly rationale: string;
  readonly citation?: string;
}

/**
 * Registered identifications (v0.8.0 CT-1). Each entry is a physics
 * judgment intended for review — see CONTRIBUTING.md.
 *
 * @public
 */
export const QUANTITY_IDENTIFICATIONS: readonly QuantityIdentification[] = [
  {
    from: 'hawking-temperature',
    to: 'temperature',
    rationale:
      'The Hawking temperature of a black-hole horizon is a genuine ' +
      'thermodynamic temperature — the temperature appearing in ' +
      "Landauer's bound for erasure at the horizon. This is the " +
      'standard identification underlying black-hole thermodynamics ' +
      '(the horizon radiates as a black body at T_H).',
    citation: 'Hawking 1975 CMP 43:199; Bekenstein 1973 PRD 7:2333',
  },
  {
    from: 'de-broglie-wavelength',
    to: 'compton-wavelength',
    rationale:
      'The de Broglie wavelength λ = h/p and the Compton wavelength ' +
      'λ_C = h/(mc) are the SAME matter-wavelength quantity of a massive ' +
      'particle; the Compton wavelength is its value in the relativistic ' +
      'limit p = mc (v → c). They are equal only in that limit, but at the ' +
      'composition graph’s quantity-KIND resolution they name one node. ' +
      'Folded ONTO compton-wavelength (not the reverse) because that node is ' +
      'anchor-determinable (ℏ/mc from a mass) and carries the sourced atomic ' +
      'scale the magnitude gate needs; de-broglie’s own form needs a ' +
      'momentum the single-mass anchor does not supply.',
    citation: 'de Broglie 1924; Compton 1923 Phys. Rev. 21:483',
  },
  {
    from: 'thermal-de-broglie-wavelength',
    to: 'thermal-wavelength',
    rationale:
      'The catalog names the thermal de Broglie wavelength ' +
      'λ_T = √(2πℏ²/(m k_B T)) `thermal-de-broglie-wavelength` (BE-11 Zurek ' +
      'decoherence, BE-12 Caldeira–Leggett coherence length), while the ' +
      'canonical L-layer law `CE-thermal-de-broglie` names the SAME physical ' +
      'quantity `thermal-wavelength`. They are one node. Folded ONTO the ' +
      'canonical `thermal-wavelength` (anchor-determinable: √(2πℏ²/(m k_B T)) ' +
      'from a mass + temperature), reconnecting BE-11 — an ESTABLISHED bridge — ' +
      'to standard physics (surfaced by the bridges-vs-canonical map; the link ' +
      'was hidden purely by the name divergence).',
    citation: 'de Broglie 1924; standard statistical mechanics (λ_T)',
  },
];

/**
 * Effective regime attributes for a candidate NAME, resolved through the
 * `QUANTITY_IDENTIFICATIONS` fold — the SINGLE shared implementation every
 * attribute consumer must use (Eve r3 #2 mandate; the discovery-hardening
 * Phase-2 axis-compatibility gate is the first). `attributesByName` is the
 * REGISTRY-only source (never canonical per-equation stamps — Option-A,
 * audit adjudication F1): callers supply it (production: every centralized
 * `Quantity.attributes`; tests: an injected fixture map), this function only
 * does the fold resolution.
 *
 * Candidate names are already fold-canonicalized (the `to` side of an
 * identification); this additionally pulls in every `from` contributor that
 * folds ONTO `name` and, per axis, unions their stated value with `name`'s
 * own. Where contributors DISAGREE on an axis, the axis counts as UNSTATED
 * (conflict → abstain) rather than picking a side — the fold-conflict rule.
 *
 * @internal
 */
export function effectiveAttributes(
  name: string,
  attributesByName: ReadonlyMap<string, RegimeAttributes>,
  idents: readonly QuantityIdentification[] = QUANTITY_IDENTIFICATIONS,
): RegimeAttributes {
  const contributors: RegimeAttributes[] = [];
  const own = attributesByName.get(name);
  if (own) contributors.push(own);
  for (const id of idents) {
    if (id.to !== name) continue;
    const folded = attributesByName.get(id.from);
    if (folded) contributors.push(folded);
  }

  // One-value-agrees, zero-or-conflicting-values-abstain, per REGISTRY axis.
  // The fold reads `AXES`, so an axis the registry carries is folded here: a
  // hand list once named scale, force and information only, and the
  // discrimination audit then measured symmetry, topology and statistics as
  // `checked: 0` whatever the data said (9.0.0 audit §4 C2).
  const folded: Record<string, string> = {};
  for (const { name } of AXES) {
    const values = new Set(
      contributors.map((c) => (c as Readonly<Record<string, string | undefined>>)[name]).filter((v) => v !== undefined),
    );
    if (values.size === 1) folded[name] = [...values][0]!;
  }
  return regimeAttributesOf(folded, `effectiveAttributes(${name})`);
}

/**
 * A recorded aliasing judgment for one duplicate source name in a
 * composition (v0.11 Option D). `'shared'` = one input deliberately
 * feeds both slots (e.g. ST-2: one M is both the lens and the r_s
 * source). `renameSecond` = split the collision: the SECOND operand's
 * quantity is renamed, and the composed evaluator remaps the renamed
 * input key back to the operand's internal name (vet A-4 — without the
 * remap the rename is a no-op).
 *
 * @public
 */
export interface AliasDisposition {
  readonly name: string;
  readonly treatAs: 'shared' | { readonly renameSecond: string };
  readonly rationale: string;
  readonly citation?: string;
}

/**
 * Registered alias dispositions, keyed by composed id
 * (`first.id>>second.id`) — judgments live in reviewable registry
 * data, mirroring {@link QUANTITY_IDENTIFICATIONS} (vet A-6.2).
 *
 * @public
 */
export const SOURCE_ALIAS_DISPOSITIONS: Readonly<
  Record<string, readonly AliasDisposition[]>
> = {
  // Empty. The one entry this table held, `law-schwarzschild-radius>>be-51`
  // ("ST-2": one M is both the lens and the r_s source), keyed a composition
  // no call can reach: the law's target `schwarzschild-radius` matches none
  // of be-51's sources (`mass`, `impact-parameter`) by name or registered
  // identification, so `composeEdges` throws `CompositionJunctionError`
  // before the alias gate runs. The judgment was never applied. Retracted in
  // the 9.0.0 audit (§4 C8); `tests/composition/compose.test.ts` now requires
  // every key here to reach the gate.
};

const CONFIDENCE_RANK: Record<EdgeConfidence, number> = {
  established: 2,
  speculative: 1,
  'highly-speculative': 0,
};

/**
 * Confidence demotion: the min of the two grades on the ordering
 * established > speculative > highly-speculative.
 *
 * @public
 */
export function minConfidence(
  a: EdgeConfidence,
  b: EdgeConfidence,
): EdgeConfidence {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

/** Options for {@link composeEdges}. @public */
export interface ComposeOptions {
  /** Extra identifications, consulted after the registered ones. */
  readonly identifications?: readonly QuantityIdentification[];
  /**
   * Alias dispositions for duplicate source names (v0.11 Option D);
   * consulted after {@link SOURCE_ALIAS_DISPOSITIONS} entries for the
   * composed id.
   */
  readonly aliases?: readonly AliasDisposition[];
}

function findJunction(
  first: BridgeEdge,
  second: BridgeEdge,
  identifications: readonly QuantityIdentification[],
): {
  junction: BridgeEdge['sources'][number];
  /** Position in `second.sources`: the slot the pipe fills. One slot, even when the same object sits twice. */
  index: number;
  viaIdentification: QuantityIdentification | null;
} {
  for (const [index, src] of second.sources.entries()) {
    if (src.name === first.target.name) {
      return { junction: src, index, viaIdentification: null };
    }
  }
  for (const ident of identifications) {
    if (ident.from !== first.target.name) continue;
    for (const [index, src] of second.sources.entries()) {
      if (src.name === ident.to) {
        return { junction: src, index, viaIdentification: ident };
      }
    }
  }
  throw new CompositionJunctionError(
    `Cannot compose ${first.id} -> ${second.id}: target quantity ` +
      `'${first.target.name}' matches none of [${second.sources
        .map((s) => `'${s.name}'`)
        .join(', ')}] by name or registered identification`,
  );
}

/**
 * The two sides of a composition pipe have the same dimension.
 *
 * This is the check `composeEdges` already applied: `equals` on the seven
 * SI bases, including that function's exponent tolerance. A mismatch is
 * still {@link CompositionDimensionError}.
 *
 * @internal
 */
export function junctionDimensionsMatch(left: Dimension, right: Dimension): boolean {
  return equals(left, right);
}

/**
 * Compose two edges into a new edge (sequential composition through a
 * shared quantity). See module docs for the definedness conditions.
 *
 * The composed edge's `sources` are `first.sources` followed by
 * `second`'s remaining (non-junction) sources; `kind` is `'law'` only
 * when both operands are laws; `beId` is null (a derived relation has
 * no single catalog row).
 *
 * @public
 */
export function composeEdges(
  first: BridgeEdge,
  second: BridgeEdge,
  opts: ComposeOptions = {},
): BridgeEdge {
  const identifications = [
    ...QUANTITY_IDENTIFICATIONS,
    ...(opts.identifications ?? []),
  ];
  const { junction, index: junctionIndex, viaIdentification } = findJunction(
    first,
    second,
    identifications,
  );

  if (!junctionDimensionsMatch(first.target.dim, junction.dim)) {
    throw new CompositionDimensionError(
      `Cannot compose ${first.id} -> ${second.id}: junction dimension ` +
        `mismatch — ${first.target.name} is ${format(first.target.dim)} ` +
        `but ${junction.name} is ${format(junction.dim)}`,
    );
  }
  const junctionScale =
    viaIdentification === null
      ? 1
      : conventionFactor(first.target.name, junction.name);

  // The pipe fills ONE slot of `second.sources`, the one `findJunction`
  // returned. Removal by object identity would also drop a second slot that
  // holds the same `Quantity` object, which a `shared` disposition produces.
  const remainingSources = second.sources.filter((_, i) => i !== junctionIndex);

  // v0.11 Option D (namespacing gate): pure name-collision rule across
  // operands. Intra-operand duplicates (e.g. ['mass','mass'] inherited
  // from a prior 'shared' disposition) are exempt by construction —
  // only names present in BOTH first.sources and second's remaining
  // sources are collisions, and each needs a recorded disposition.
  const firstNames = new Set(first.sources.map((s) => s.name));
  const collisionNames = [
    ...new Set(
      remainingSources
        .filter((s) => firstNames.has(s.name))
        .map((s) => s.name),
    ),
  ];
  const composedId = `${first.id}>>${second.id}`;
  const dispositions: AliasDisposition[] = [
    ...(SOURCE_ALIAS_DISPOSITIONS[composedId] ?? []),
    ...(opts.aliases ?? []),
  ];
  const renameMap: Record<string, string> = {}; // renamed key -> operand-internal name
  const dispositionsUsed: AliasDisposition[] = [];
  let finalRemaining: Quantity[] = [...remainingSources];
  for (const name of collisionNames) {
    const d = dispositions.find((x) => x.name === name);
    if (!d) {
      throw new CompositionAliasError(
        `Cannot compose ${composedId}: source quantity '${name}' appears ` +
          `in BOTH operands (first: [${[...firstNames].join(', ')}]; ` +
          `second remaining: [${remainingSources
            .map((s) => s.name)
            .join(', ')}]). Same name does not imply same physical ` +
          `quantity — record an AliasDisposition ('shared' or ` +
          `{renameSecond}) in SOURCE_ALIAS_DISPOSITIONS or opts.aliases.`,
      );
    }
    dispositionsUsed.push(d);
    if (d.treatAs === 'shared') continue; // one input key feeds both slots
    const renamed = d.treatAs.renameSecond;
    if (
      firstNames.has(renamed) ||
      second.sources.some((s) => s.name === renamed)
    ) {
      throw new CompositionAliasError(
        `Cannot compose ${composedId}: renameSecond target '${renamed}' ` +
          `collides with an existing source name of an operand (vet A-4).`,
      );
    }
    finalRemaining = finalRemaining.map((s) =>
      s.name === name ? { ...s, name: renamed, symbol: s.symbol } : s,
    );
    renameMap[renamed] = name;
  }

  /** Build the second operand's input map: remap renamed keys back to
   *  the operand-internal names (shadowing the first operand's value
   *  for that name — vet A-4's required remap), then pipe the junction. */
  const buildSecondInputs = (
    inputs: Record<string, number>,
    intermediate: number,
  ): Record<string, number> => {
    const si: Record<string, number> = { ...inputs };
    for (const [renamed, original] of Object.entries(renameMap)) {
      si[original] = inputs[renamed];
      delete si[renamed];
    }
    si[junction.name] = intermediate * junctionScale;
    return si;
  };

  const composedDomain = {
    description:
      `(${first.domain.description}) AND, on the piped ` +
      `${junction.name}, (${second.domain.description})`,
    // Standalone domain queries evaluate `first` to obtain the piped
    // intermediate (design D-5; acceptable for scalar closed forms).
    // The composed `evaluate` below does NOT call this predicate — it
    // computes the intermediate once and checks both domains inline
    // (v0.8.0 punch-list: removed the double evaluation of `first`).
    predicate: (inputs: Record<string, number>): boolean => {
      if (!first.domain.predicate(inputs)) return false;
      const intermediate = first.evaluate(inputs);
      return second.domain.predicate(buildSecondInputs(inputs, intermediate));
    },
  };

  const id = `${first.id}>>${second.id}`;

  // ── Atlas Phase 1 (S1.2b): the relation overlay, and NOTHING else. ────────
  // Entered only when BOTH operands carry a `relation`. An operand with no
  // relation skips this block, and the composed edge then has no `relation`
  // key. The catalog edges that carry one are the catalog's `relation` rows
  // (`tests/composition/relation-refusal.test.ts` lists them); they stay.
  // When both operands carry a relation, a silent table cell throws
  // `UndefinedCompositionError`. The approximation cell throws the same
  // error, because an edge relation carries no norm transport and this
  // layer does not invent a bound. `enumerateCompositionsWithRefusals`
  // records that throw on its own list. A dimension or junction failure
  // is a different error and is not that list.
  let relationOverlay: Pick<
    BridgeEdge,
    'relation' | 'relationDerivedFrom' | 'conventions'
  > = {};
  if (first.relation !== undefined && second.relation !== undefined) {
    const composite = composeRelation(first.relation.type, second.relation.type);
    if (composite === NO_COMPOSITE_CLAIM) {
      throw new UndefinedCompositionError(
        `Cannot compose ${first.id} -> ${second.id}: the composition table ` +
          `asserts no composite relation for '${first.relation.type}' ` +
          `(${first.id}) followed by '${second.relation.type}' ` +
          `(${second.id}). This is silence, not refutation — see ` +
          `docs/planning/Atlas-Phase-1-Design.md §2.2.`,
      );
    }
    if (composite === 'approximation') {
      // Reachable since the table's one widening: approximation then
      // exact-equivalence (docs/planning/ADR-transported-norm-composition.md).
      // An `approximation` contract REQUIRES an `ApproximationBound`, and the
      // composed bound exists only when the exact map declares a norm
      // transport. A `RelationContract` on an edge carries none, so this layer
      // cannot compose the bound and must refuse rather than fabricate one.
      // The atlas route layer (`boundPath`) is where a declared transport is
      // applied.
      throw new UndefinedCompositionError(
        `Cannot compose ${first.id} -> ${second.id}: the composition table ` +
          `returned 'approximation', which requires a composed ` +
          `ApproximationBound; an edge relation declares no norm transport, ` +
          `so no bound is composed here (the atlas boundPath applies declared transports).`,
      );
    }
    // Conventions carry forward only when the operands do not CONTRADICT each
    // other. `checkConventions` treats an undeclared key as unknown, so a
    // silent operand never blocks the carry-forward; a genuine disagreement
    // does, and then the composite declares no conventions at all rather than
    // picking one operand's choice over the other's. One rule, not a per-key
    // filter: a chain built across a sign disagreement has no single first-law
    // convention to state, and stating one would be a claim about the chain
    // that neither operand supports.
    const merged: Conventions =
      checkConventions(first.conventions, second.conventions).length === 0
        ? { ...first.conventions, ...second.conventions }
        : {};
    relationOverlay = {
      relation: composedContract(composite, first.relation, second.relation),
      relationDerivedFrom: [first.id, second.id],
      ...(Object.keys(merged).length > 0 ? { conventions: merged } : {}),
    };
  }

  return {
    id,
    beId: null,
    kind: first.kind === 'law' && second.kind === 'law' ? 'law' : 'bridge',
    label: `${first.label} ∘ ${second.label}`,
    sources: [...first.sources, ...finalRemaining],
    target: second.target,
    confidence: minConfidence(first.confidence, second.confidence),
    domain: composedDomain,
    evaluate: (inputs) => {
      if (!first.domain.predicate(inputs)) {
        throw new DomainViolationError(
          `${id}: inputs violate composed validity domain ` +
            `(${composedDomain.description})`,
        );
      }
      // Each operand's unset-coefficient gate is the one `evaluateEdge`
      // applies to a primitive edge; an operand's monomial times an absent 1
      // must not reach the caller as a number through the pipe.
      assertCoefficientSet(first, inputs);
      const intermediate = first.evaluate(inputs);
      const pipedInputs = buildSecondInputs(inputs, intermediate);
      if (!second.domain.predicate(pipedInputs)) {
        throw new DomainViolationError(
          `${id}: inputs violate composed validity domain ` +
            `(${composedDomain.description})`,
        );
      }
      assertCoefficientSet(second, pipedInputs);
      return second.evaluate(pipedInputs);
    },
    citation: `${first.citation} | ${second.citation}`,
    ...(viaIdentification !== null
      ? { identificationUsed: viaIdentification }
      : {}),
    ...(dispositionsUsed.length > 0
      ? { aliasDispositionsUsed: dispositionsUsed }
      : {}),
    ...relationOverlay,
    ...carriedClaims(first, second, junction, junctionScale, finalRemaining, renameMap),
  };
}

/**
 * The claims a composed edge carries from its operands (9.0.0 audit §4 C5).
 * A composed edge that dropped them answered differently from its operands:
 * the regime gate abstained on every chain longer than two, an unset
 * coefficient became a number, an even input lost its magnitude reading,
 * a count became a Buckingham governor, and an alias key stopped working.
 *
 * - `regime`: the one an operand states; two of one family intersect
 *   (`intersectRegimes`, which also refuses conflicting group definitions);
 *   two of different families refuse with `UndefinedCompositionError`, since
 *   this layer does not state where a cross-family chain applies.
 * - `coefficientUnset`: either operand's. `evaluateEdge` then refuses the
 *   composite; a bound group lifts a primitive entry only, because the group
 *   row is keyed by the entry id, so a composite with an unset operand is
 *   refused by `evaluateEdge` whatever is bound (its own `evaluate` applies
 *   each operand's gate and does lift the operand whose group is bound).
 * - `evenInputs`, `aliases`: the first operand's, plus the second's for its
 *   remaining sources under their composed names. The piped junction is not
 *   an input and is dropped. An alias key that two quantities would share is
 *   carried for neither.
 * - `formulaFactors`: the second operand's for its remaining sources, exact.
 *   The first operand's counts enter through the pipe with their exponent
 *   times the junction's exponent in the second's monomial, so they are
 *   carried only when `second.symbolic` is a monomial that states it.
 * - `symbolic`: the second's form with the junction leaf replaced by the
 *   first's, when both exist, the junction carries no convention factor, no
 *   source was renamed, the leaf occurs, and the result validates to the
 *   target dimension. Otherwise absent, as on a numeric-only edge.
 */
function carriedClaims(
  first: BridgeEdge,
  second: BridgeEdge,
  junction: Quantity,
  junctionScale: number,
  finalRemaining: readonly Quantity[],
  renameMap: Readonly<Record<string, string>>,
): Pick<BridgeEdge, 'regime' | 'coefficientUnset' | 'evenInputs' | 'formulaFactors' | 'aliases' | 'symbolic'> {
  const out: {
    regime?: Regime;
    coefficientUnset?: boolean;
    evenInputs?: readonly string[];
    formulaFactors?: Readonly<Record<string, number>>;
    aliases?: Readonly<Record<string, readonly string[]>>;
    symbolic?: ExprNode;
  } = {};

  if (first.regime !== undefined && second.regime !== undefined) {
    if (first.regime.family !== second.regime.family) {
      throw new UndefinedCompositionError(
        `Cannot compose ${first.id} -> ${second.id}: the regimes are of different ` +
          `families ('${first.regime.family}', '${second.regime.family}'), and this ` +
          `layer does not state where a cross-family chain applies.`,
      );
    }
    try {
      out.regime = intersectRegimes(first.regime, second.regime);
    } catch (e) {
      // Conflicting definitions of one group name: the composite has no regime this
      // layer can state, the same refusal as a cross-family chain.
      throw new UndefinedCompositionError(`Cannot compose ${first.id} -> ${second.id}: ${(e as Error).message}`);
    }
  } else if (first.regime !== undefined || second.regime !== undefined) {
    out.regime = first.regime ?? second.regime;
  }

  if (first.coefficientUnset === true || second.coefficientUnset === true) out.coefficientUnset = true;

  // Operand-internal name → the name the composite exposes it under.
  const composedName = new Map(Object.entries(renameMap).map(([renamed, original]) => [original, renamed]));
  const exposed = (name: string): string => composedName.get(name) ?? name;
  const remainingNames = new Set(finalRemaining.map((s) => s.name));
  const secondRemaining = (name: string): boolean => name !== junction.name && remainingNames.has(exposed(name));

  const even = [
    ...(first.evenInputs ?? []),
    ...(second.evenInputs ?? []).filter(secondRemaining).map(exposed),
  ];
  if (even.length > 0) out.evenInputs = even;

  const factors: Record<string, number> = {};
  const junctionExponent = monomialExponents(second.symbolic)?.get(junction.name);
  if (first.formulaFactors !== undefined && junctionExponent !== undefined) {
    for (const [name, exp] of Object.entries(first.formulaFactors)) factors[name] = exp * junctionExponent;
  }
  for (const [name, exp] of Object.entries(second.formulaFactors ?? {})) {
    if (secondRemaining(name)) factors[exposed(name)] = exp;
  }
  if (Object.keys(factors).length > 0) out.formulaFactors = factors;

  const aliasOwner = new Map<string, string>();
  const shared = new Set<string>();
  const aliases: Record<string, string[]> = {};
  const addAliases = (quantity: string, keys: readonly string[]): void => {
    for (const key of keys) {
      const owner = aliasOwner.get(key);
      if (owner !== undefined && owner !== quantity) shared.add(key);
      aliasOwner.set(key, quantity);
      (aliases[quantity] ??= []).push(key);
    }
  };
  for (const [quantity, keys] of Object.entries(first.aliases ?? {})) addAliases(quantity, keys);
  for (const [quantity, keys] of Object.entries(second.aliases ?? {})) {
    if (secondRemaining(quantity)) addAliases(exposed(quantity), keys);
  }
  const kept = Object.fromEntries(
    Object.entries(aliases)
      .map(([quantity, keys]) => [quantity, keys.filter((k) => !shared.has(k))] as const)
      .filter(([, keys]) => keys.length > 0),
  );
  if (Object.keys(kept).length > 0) out.aliases = kept;

  if (
    first.symbolic !== undefined &&
    second.symbolic !== undefined &&
    junctionScale === 1 &&
    Object.keys(renameMap).length === 0
  ) {
    const { expr, count } = substitute(second.symbolic, junction.name, first.symbolic);
    const v = count > 0 ? validate(expr) : undefined;
    if (v !== undefined && v.ok && v.inferredDimension !== null && equals(v.inferredDimension, second.target.dim)) {
      out.symbolic = expr;
    }
  }

  return out;
}
