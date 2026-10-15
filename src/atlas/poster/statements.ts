/**
 * Atlas Phase 3 — the poster's sixteen entries, its five hidden supporting
 * nodes, and the three conservation statements its edges conclude in.
 *
 * ## The one rule this module exists to obey
 *
 * **Blueprint v2's Appendix A is NOT in this repo.** `ROADMAP.md` Phase 3
 * states the fifteen typed edge lines and the five hidden nodes in full, and
 * it references the sixteen entries BY NUMBER in identifying context — but no
 * file here maps number → name. Design note
 * `docs/planning/Atlas-Phase-3-Design.md` §5 is explicit about what follows:
 * *"Transcribe or derive each entry from a stated source; never invent one to
 * fill a gap."*
 *
 * So every entry below carries an {@link Identification}, and it is a FIELD
 * rather than a comment because a comment cannot be tested. Three values:
 *
 * - `'derived'` — the edge lines pin it. `10 → 9` restriction with *"separate
 *   frame content in 9"*, `11 → momentum conservation … converse fails … fails
 *   naively when fields carry momentum`: those three lines are Newton's
 *   second, first and third laws and nothing else.
 * - `'partial'` — the lines pin a FAMILY but not the member. Entry 7 is a
 *   Maxwell equation (the line distinguishes it from *"the full Maxwell
 *   system"*, which is a hidden node — `never from 7 alone`), but which of the
 *   four it is, is not recoverable. Entry 5 is read here as `E = mc²`; see
 *   {@link POSTER_5_IDENTIFICATION_NOTE}.
 * - `'unidentified'` — entries 3 and 14, which `ROADMAP.md` names exactly
 *   once, in `3, 14 → * association only`. Nothing there identifies them. They
 *   are recorded as placeholders WITH THEIR NUMBERS and no physics, because a
 *   plausible guess would be uncheckable, and an honest gap beats it.
 *
 * **The edges do not depend on any of this.** Every record in
 * `./derivations.ts` and `./associations.ts` references entries by NUMBER, so
 * a mis-identified NAME cannot corrupt an edge type. That separation is
 * deliberate: the numbers come from a stated source, the names are an
 * inference over it, and only one of them is load-bearing.
 *
 * ## `ast?` is absent everywhere here, on purpose
 *
 * `statement.ts` §1 already argues it: the hidden nodes are valuable because
 * they are NAMED and LINKED, not evaluable, and requiring an `ast` would force
 * a fabricated encoding. The same holds for the sixteen — this module records
 * poster claims, not evaluable equations — so every statement here carries an
 * honest `sourceExpression` and no `ast`, and {@link buildPosterRegistry}
 * refuses one that carries an `ast` it cannot have earned.
 *
 * Pure: no I/O. Imports `../statement.js` and `../model.js` types only, so
 * this module is a leaf under `src/atlas/` and closes no cycle.
 *
 * @module atlas/poster/statements
 */

import type { Context, Statement, StatementId } from '../statement.js';
import type { ModelId } from '../model.js';

/**
 * How firmly an entry's IDENTITY is pinned by a source in this repo.
 *
 * @internal
 */
export type Identification = 'derived' | 'partial' | 'unidentified';

/**
 * The `ModelId` every poster statement carries.
 *
 * Phase 3 records a `Model` for the nine oscillator models and for nothing
 * else. A poster entry has no state space, dynamics or parameter list in this
 * repo, so every per-entry model id available here would be invented — and an
 * invented `'model-newtonian-mechanics'` would read, to the next sprint,
 * exactly like a model someone recorded.
 *
 * One shared sentinel instead, which says what is true: no model is recorded.
 * `tests/atlas/poster-statements.test.ts` pins that no poster statement claims
 * an oscillator model id.
 *
 * @internal
 */
export const POSTER_MODEL_UNRECORDED: ModelId = 'model-poster-unrecorded';

/** What `3, 14 → *` puts in `sourceExpression`. Never a guess. @internal */
export const UNIDENTIFIED = 'UNIDENTIFIED';

/**
 * Why entry 5 is `'partial'` and not `'derived'`.
 *
 * Two edge lines constrain it and they pull in different directions.
 * `16 → 5, 10` is an approximation in `v/c` *"needing `E = γmc²`, `p = γmv`,
 * `F = dp/dt`"*, which reads as `E = mc²` reached from `E = γmc²`.
 * `5, 16 → 8 constrain but do not determine` is, in the usual telling, the
 * Newtonian-limit-plus-special-relativity constraint on the field equations,
 * which would make 5 Newton's law of universal gravitation.
 *
 * It cannot be both, and `8 → 12` — approximation then *"restriction to a
 * point source"* — already lands on universal gravitation at 12. Two entries
 * cannot be the same law, so 5 is read as `E = mc²` here. The reading is
 * RECORDED rather than asserted: the entry stays `'partial'`, and no edge
 * depends on it, because every edge references 5 by number.
 *
 * @internal
 */
const POSTER_5_IDENTIFICATION_NOTE =
  "entry 5 is read as E = mc² because 8 → 12 already lands on universal gravitation at 12, " +
  "so the alternative reading of '5, 16 → 8' (the Newtonian limit) would duplicate entry 12; " +
  'no edge in this module depends on the reading — all fifteen reference entries by number';

/**
 * One of the sixteen, with its number and how firmly its identity is pinned.
 *
 * @internal
 */
export interface PosterEntry {
  /** 1–16, as every `ROADMAP.md` Phase 3 edge line references it. */
  readonly number: number;
  readonly statement: Statement;
  readonly identification: Identification;
  /** Required when `identification !== 'derived'`: what is unresolved, and why. */
  readonly note?: string;
}

/** Terse `Context` builder. `assumptions` is required; `excludes` defaults to none. */
function ctx(
  assumptions: readonly string[],
  over: Partial<Omit<Context, 'assumptions'>> = {},
): Context {
  return { excludes: [], ...over, assumptions };
}

function entry(
  number: number,
  id: StatementId,
  sourceExpression: string,
  display: string,
  context: Context,
  identification: Identification = 'derived',
  note?: string,
): PosterEntry {
  return {
    number,
    identification,
    ...(note !== undefined ? { note } : {}),
    statement: {
      id,
      context,
      model: POSTER_MODEL_UNRECORDED,
      sourceExpression,
      display,
    },
  };
}

/**
 * The sixteen poster entries, in poster order.
 *
 * Every `context.assumptions` is non-empty. Where `ROADMAP.md` states the
 * qualification, it is used verbatim in substance: entry 11's *"fields carry
 * no momentum"* (and the matching `excludes`, which is the one genuinely
 * reachable context refusal in this data — see `./derivations.ts`), entry
 * 13's `σ > 0`. Where it does not, the assumption is the standard statement
 * of the entry's own validity and nothing more; none of them adds a claim.
 *
 * @internal
 */
export const POSTER_ENTRIES: readonly PosterEntry[] = [
  entry(
    1,
    'poster-1',
    'dU = δQ − δW',
    'First law of thermodynamics',
    ctx(['closed system', 'heat and work are defined for the process'], {
      conventions: { heatWorkSign: 'Q-W' },
      quantityTypes: ['energy'],
    }),
  ),
  entry(
    2,
    'poster-2',
    'S = k_B ln W',
    'Boltzmann entropy',
    ctx(['isolated system', 'accessible microstates are equiprobable'], {
      quantityTypes: ['entropy'],
    }),
  ),
  entry(
    3,
    'poster-3',
    UNIDENTIFIED,
    'Poster entry 3 (unidentified)',
    ctx(['unidentified: no source in this repo names this entry']),
    'unidentified',
    "ROADMAP.md Phase 3 names entry 3 exactly once, in '3, 14 → * association only', " +
      'which identifies nothing about it; Blueprint v2 Appendix A is not in this repo',
  ),
  entry(
    4,
    'poster-4',
    'σ_x σ_p ≥ ħ/2',
    'Heisenberg uncertainty relation',
    ctx([
      'canonical commutator [x, p] = iħ',
      'the state lies in the domain of both operators',
    ]),
  ),
  entry(
    5,
    'poster-5',
    'E = mc²',
    'Mass–energy equivalence',
    ctx(['rest frame of the body', 'isolated body'], { quantityTypes: ['energy', 'mass'] }),
    'partial',
    POSTER_5_IDENTIFICATION_NOTE,
  ),
  entry(
    6,
    'poster-6',
    'iħ ∂_t ψ = Ĥ ψ',
    'Schrödinger equation',
    ctx(['non-relativistic', 'self-adjoint Hamiltonian', 'fixed Hilbert space']),
  ),
  entry(
    7,
    'poster-7',
    `${UNIDENTIFIED} (one equation of the Maxwell set)`,
    'A Maxwell equation (which one is unidentified)',
    ctx(['macroscopic electromagnetic fields', 'the stated unit system']),
    'partial',
    "the '7 ↔ 16' line says the derivation route runs from 'the full Maxwell system' and " +
      "'never from 7 alone', so entry 7 is ONE equation of the set; which of the four is not " +
      'recoverable from any source in this repo. The full system is statement-maxwell-system.',
  ),
  entry(
    8,
    'poster-8',
    'G_μν + Λ g_μν = (8πG/c⁴) T_μν',
    'Einstein field equations',
    ctx([
      'pseudo-Riemannian spacetime',
      'the stress-energy tensor is covariantly conserved',
    ], { conventions: { metricSignature: '-+++' } }),
  ),
  entry(
    9,
    'poster-9',
    'net F = 0 ⇒ v constant',
    "Newton's first law",
    ctx(['an inertial frame', 'no net force']),
  ),
  entry(
    10,
    'poster-10',
    'F = m a',
    "Newton's second law",
    ctx(['an inertial frame', 'constant mass', 'v ≪ c']),
  ),
  entry(
    11,
    'poster-11',
    'F_12 = −F_21',
    "Newton's third law",
    ctx(['isolated particle system', 'fields carry no momentum'], {
      // The one exclusion this data states, and ROADMAP.md states it:
      // entry 11 "fails naively when fields carry momentum". The
      // field-inclusive momentum statement ASSUMES the excluded string, so
      // pooling the two is refused rather than silently merged.
      excludes: ['fields carry momentum'],
    }),
  ),
  entry(
    12,
    'poster-12',
    'F = G m₁ m₂ / r²',
    'Newtonian universal gravitation',
    ctx(['weak field', 'slow motion', 'point masses']),
  ),
  entry(
    13,
    'poster-13',
    'p(x) = (1/(σ√(2π))) exp(−(x−μ)²/(2σ²))',
    'Normal (Gaussian) distribution',
    ctx(['σ > 0']),
  ),
  entry(
    14,
    'poster-14',
    UNIDENTIFIED,
    'Poster entry 14 (unidentified)',
    ctx(['unidentified: no source in this repo names this entry']),
    'unidentified',
    "ROADMAP.md Phase 3 names entry 14 exactly once, in '3, 14 → * association only', " +
      'which identifies nothing about it; Blueprint v2 Appendix A is not in this repo',
  ),
  entry(
    15,
    'poster-15',
    'ψ = c₁ψ₁ + c₂ψ₂ is a state whenever ψ₁, ψ₂ are',
    'Superposition principle',
    ctx(['linear evolution equation', 'Hilbert-space kinematics']),
  ),
  entry(
    16,
    'poster-16',
    "t' = γ(t − vx/c²), x' = γ(x − vt)",
    'Lorentz transformation (special relativity)',
    ctx(['inertial frames', 'the speed of light is frame-independent', 'flat spacetime'], {
      conventions: { metricSignature: '-+++' },
    }),
  ),
];

/**
 * The five hidden supporting nodes, named by `ROADMAP.md` Phase 3 and by no
 * other source.
 *
 * They are the deliverable precisely as named — `docs/planning/Atlas-Phase-3-Design.md`
 * §8 puts *"evaluating hidden supporting nodes"* explicitly out of scope — so
 * each carries a prose `sourceExpression` and no `ast`.
 *
 * `statement-lorentz-group` is what the `7 ↔ 16` line calls *"spacetime
 * structure"* in the hyperedge `{full Maxwell system, spacetime structure} →
 * 16`. That identification is an inference: `ROADMAP.md` names exactly five
 * hidden nodes and the Lorentz group is the only one of the five that can
 * BE spacetime structure. It is recorded here rather than silently assumed,
 * and `./derivations.ts` repeats it in the hyperedge's side conditions.
 *
 * @internal
 */
export const HIDDEN_NODES: readonly Statement[] = [
  {
    id: 'statement-action-principle',
    context: {
      assumptions: ['a stated action functional', 'variations vanish on the boundary'],
      excludes: [],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression: 'δS = 0',
    display: 'Action principle (stationary action)',
  },
  {
    id: 'statement-noether',
    context: {
      assumptions: [
        'a continuous symmetry of a stated action',
        'the action principle holds',
      ],
      excludes: [],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression: 'a continuous symmetry of the action yields a conserved current',
    display: "Noether's theorem",
  },
  {
    id: 'statement-maxwell-system',
    context: {
      assumptions: ['all four equations taken together', 'the stated unit system'],
      excludes: [],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression: 'the four Maxwell equations as one system',
    display: 'The full Maxwell system',
  },
  {
    id: 'statement-lorentz-group',
    context: {
      assumptions: ['flat spacetime', 'the speed of light is frame-independent'],
      excludes: [],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression:
      'the group of transformations preserving the Minkowski interval (the spacetime structure)',
    display: 'The Lorentz group',
  },
  {
    id: 'statement-central-limit-theorem',
    context: {
      assumptions: [
        'independent, identically distributed summands',
        'finite variance',
      ],
      excludes: [],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression:
      'the normalized sum of i.i.d. finite-variance terms converges in distribution to a normal law',
    display: 'Central limit theorem',
  },
];

/**
 * The statements the poster's edges CONCLUDE in that are neither a numbered
 * entry nor a hidden node.
 *
 * All three are named by `ROADMAP.md` Phase 3: *"`11 → momentum
 * conservation`"*, *"the field-inclusive version"*, *"`1 ↔ energy
 * conservation`"*. Nothing here is added beyond those names.
 *
 * The two momentum statements are SEPARATE records because the line says the
 * particle version *"fails naively when fields carry momentum"*. One record
 * carrying both readings would erase exactly the distinction the line draws,
 * and it is the distinction that makes entry 11's `excludes` bite.
 *
 * @internal
 */
export const SUPPORTING_STATEMENTS: readonly Statement[] = [
  {
    id: 'statement-momentum-conservation',
    context: {
      assumptions: ['isolated particle system', 'fields carry no momentum'],
      excludes: ['fields carry momentum'],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression: 'Σ p_i is constant for an isolated particle system',
    display: 'Momentum conservation (particles)',
  },
  {
    id: 'statement-momentum-conservation-fields',
    context: {
      assumptions: [
        'fields carry momentum',
        'spatial translation symmetry of a stated action',
        'stated boundary conditions',
      ],
      excludes: [],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression: 'the total momentum of matter AND fields is constant',
    display: 'Momentum conservation (field-inclusive)',
  },
  {
    id: 'statement-energy-conservation',
    context: {
      assumptions: ['an autonomous model (no explicit time dependence)'],
      excludes: [],
    },
    model: POSTER_MODEL_UNRECORDED,
    sourceExpression: 'the conserved current of time-translation symmetry is constant',
    display: 'Energy conservation',
  },
];

/** Every statement this poster index defines, in a stable order. @internal */
export const POSTER_ALL_STATEMENTS: readonly Statement[] = [
  ...POSTER_ENTRIES.map((e) => e.statement),
  ...HIDDEN_NODES,
  ...SUPPORTING_STATEMENTS,
];

/** Thrown by {@link buildPosterRegistry}. @internal */
export class PosterStatementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PosterStatementError';
  }
}

/**
 * The registry `makeDerivation` and `statementContextUnion` resolve against,
 * built through four checks.
 *
 * The checks run HERE, at construction, rather than only in a test, because
 * `./derivations.ts` builds its records against this registry at module load:
 * a defect that reaches the registry reaches every derivation before any test
 * has a chance to look.
 *
 * 1. **No duplicate id.** A later duplicate would silently replace an earlier
 *    statement in the map, and the derivation that consumed it would carry the
 *    wrong context with no symptom.
 * 2. **Non-empty `assumptions`.** The S3.3 requirement, and the reason a
 *    context can refuse at all: an empty one pools with anything.
 * 3. **No `ast`.** Nothing in this module is evaluable (see the module note);
 *    an `ast` here could only have been fabricated.
 * 4. **A non-`'derived'` entry states its `note`.** An unidentified entry
 *    without its reason is indistinguishable from an oversight.
 *
 * The two arguments exist so a TEST can drive these four checks with a
 * defective index through THIS code path rather than a copy of it. A test that
 * reimplements a guard in order to break it proves only that the copy works,
 * which is the vacuous-pass shape the design note names; the copy and the
 * original then drift with nothing reporting it.
 *
 * @throws PosterStatementError on any of the four.
 * @internal
 */
export function buildPosterRegistry(
  statements: readonly Statement[] = POSTER_ALL_STATEMENTS,
  entries: readonly PosterEntry[] = POSTER_ENTRIES,
): ReadonlyMap<StatementId, Statement> {
  const map = new Map<StatementId, Statement>();
  for (const s of statements) {
    if (map.has(s.id)) {
      throw new PosterStatementError(
        `duplicate statement id '${s.id}'; the later record would silently replace the earlier`,
      );
    }
    if (s.context.assumptions.length === 0) {
      throw new PosterStatementError(
        `statement '${s.id}' states no assumptions; every poster statement must state at least one`,
      );
    }
    if (s.ast !== undefined) {
      throw new PosterStatementError(
        `statement '${s.id}' carries an ast; poster statements are named and linked, never evaluated`,
      );
    }
    map.set(s.id, s);
  }
  for (const e of entries) {
    if (e.identification !== 'derived' && (e.note === undefined || e.note === '')) {
      throw new PosterStatementError(
        `entry ${e.number} is '${e.identification}' but states no note; ` +
          'an unpinned entry must say what is unresolved',
      );
    }
  }
  return map;
}

/** The built registry. @internal */
export const POSTER_REGISTRY: ReadonlyMap<StatementId, Statement> = buildPosterRegistry();

/** The entry with this number. @throws RangeError when there is none. @internal */
export function posterEntry(number: number): PosterEntry {
  const found = POSTER_ENTRIES.find((e) => e.number === number);
  if (found === undefined) {
    throw new RangeError(`posterEntry: no entry ${number}; the poster has 1–16`);
  }
  return found;
}

/** The statement id of entry `number` — `posterId(9) === 'poster-9'`. @internal */
export function posterId(number: number): StatementId {
  return posterEntry(number).statement.id;
}
