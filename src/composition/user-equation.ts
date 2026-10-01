/**
 * User-equation injection — turn a free-form `TARGET = EXPR` string into a graph
 * junction (a target quantity + its source quantities), resolve the user's
 * symbols onto the catalog vocabulary, suggest near-misses, and report where the
 * injected junction lands in a built {@link VizModel}.
 *
 * Free-form means no dimensions: source quantities are the RHS's free variables
 * — extracted by the active formula parser via {@link getFormulaParser} (the
 * MathTS expression parser when the optional peer is installed, else the built-in
 * one; both already drop constants like `pi`/`tau`, numbers, and functions) —
 * minus the physics {@link CONSTANTS}. Multi-word quantities may be typed with
 * underscores **or** the catalog's own hyphens (`planck-length`): before parse,
 * {@link rewriteCatalogHyphens} rewrites kebab catalog names to underscores so
 * `-` is not read as subtraction (persona finding W2). Resolution still tries
 * the literal form first, then the `_`↔`-` swap.
 *
 * Pure: no file I/O. The injected junction is rendered as an `extraJunction`
 * (status `'user'`) and is never written into the catalog.
 *
 * @module composition/user-equation
 */

import { getFormulaParser, parsePhysics } from '../numerical/formula-registry.js';
import { formulaSymbolDimension } from '../numerical/formula-dimension.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';
import { formulaNameDimensions } from '../dimensional/formula-names.js';
import { naturalNote, naturalPowers, type UnitMode } from '../dimensional/natural-units.js';
import type { VizModel, VizJunction } from './graph-viz.js';
import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { equals } from '../dimensional/algebra.js';
import { inferUnknownDimension } from '../dimensional/dimension-inference.js';

/** Thrown when a user equation cannot be parsed into a target + sources. @public */
export class UserEquationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserEquationError';
  }
}

/**
 * A parsed user equation: the target quantity and its source quantities, as
 * written (underscores preserved; constants/numbers/functions removed).
 *
 * @public
 */
export interface UserEquation {
  readonly target: string;
  readonly sources: readonly string[];
  /** The original `TARGET = EXPR` text, for the junction label. */
  readonly text: string;
}

/**
 * Parse `TARGET = EXPR` into `{ target, sources }`. The target is the text left
 * of the first `=`; the sources are the RHS's free variables minus the physics
 * constants.
 *
 * Uses the active formula parser (MathTS when installed, built-in otherwise) to
 * extract the RHS's free variables.
 *
 * @throws {UserEquationError} on a missing `=`, an empty target, an unparseable
 *   RHS, or an RHS with no source quantities.
 * @public
 */
/** Upper bound on user `--equation` text to keep hint computation bounded. */
const MAX_USER_EQUATION_LEN = 8192;

/** Escape a string for use inside a {@link RegExp} character class / pattern. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrite catalog kebab-case names (`planck-length`) to underscored forms
 * (`planck_length`) in a formula string so the parser does not treat `-` as
 * subtraction (persona finding W2). Longest match first so
 * `hawking-temperature` wins over `temperature`. Names without a hyphen are
 * left alone. Pure.
 *
 * @internal
 */
export function rewriteCatalogHyphens(
  text: string,
  catalogNames: ReadonlySet<string> | Iterable<string>,
): string {
  const names = [...catalogNames]
    .filter((n) => n.includes('-'))
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
  let out = text;
  for (const name of names) {
    const underscored = name.replace(/-/g, '_');
    // Not a word-char on either side — keeps `planck-length` from eating into
    // `fooplanck-length` / `planck-lengthbar`, and leaves arithmetic `a-b` alone
    // when `a-b` is not a catalog name.
    const re = new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(name)}(?![A-Za-z0-9_])`, 'g');
    out = out.replace(re, underscored);
  }
  return out;
}

/**
 * When a subtract/dimension error still names a hyphenated token that is a
 * catalog quantity, tell the user `-` is arithmetic and to use underscores.
 * Persona finding I2 — clarity even if a rewrite path was skipped.
 *
 * @internal
 */
export function hyphenSubtractHint(
  parseError: string,
  rhs: string,
  catalogNames: ReadonlySet<string>,
): string | null {
  if (!/subtract/i.test(parseError) && !/dimension mismatch/i.test(parseError)) return null;
  const kebabs = [...catalogNames].filter((n) => n.includes('-') && rhs.includes(n));
  if (kebabs.length === 0) {
    // RHS may already have been split; look for catalog prefixes joined by -
    const tokens = rhs.match(/[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)+/g) ?? [];
    for (const t of tokens) {
      if (catalogNames.has(t)) kebabs.push(t);
    }
  }
  if (kebabs.length === 0) return null;
  const example = kebabs.sort((a, b) => b.length - a.length)[0]!;
  return (
    `'-' is arithmetic here; multi-word catalog names use underscores ` +
    `(${example} → ${example.replace(/-/g, '_')})`
  );
}

/**
 * Spellings that must not be a bare `e`: `1-eccentricity^2` is the perihelion
 * factor `one_minus_e_sq`, `eps0` and `epsilon0` are `epsilon_0`, and `mu0` is
 * `mu_0`. `upt eval` already accepts `eps0` and `mu0`; this is the equation path.
 */
function rewriteFormulaSpellings(text: string): string {
  return text
    .replace(/(?<![A-Za-z0-9_])eps0(?![A-Za-z0-9_])/g, 'epsilon_0')
    .replace(/(?<![A-Za-z0-9_])epsilon0(?![A-Za-z0-9_])/g, 'epsilon_0')
    .replace(/(?<![A-Za-z0-9_])mu0(?![A-Za-z0-9_])/g, 'mu_0')
    .replace(/(?<![A-Za-z0-9_])kB(?![A-Za-z0-9_])/g, 'k_B')
    .replace(
      /(?<![A-Za-z0-9_])1\s*-\s*eccentricity\s*(?:\^|\*\*)\s*2(?![A-Za-z0-9_])/g,
      'one_minus_e_sq',
    );
}

/** Options for {@link analyzeUserEquation}. @internal */
export interface AnalyzeUserEquationOptions {
  /**
   * Bind a one-letter token that is itself a catalog quantity (`a`, `r`, …).
   * Default false: the match is reported and not applied. The alias `T` →
   * `temperature` is not a one-letter catalog name and still binds.
   */
  readonly bindShortNames?: boolean;
  /** Reconcile a dimension difference by powers of c, ħ, and (geometrized) G. */
  readonly units?: Exclude<UnitMode, 'si'>;
}

function withFormulaNames(catalog: ReadonlyMap<string, Dimension>): Map<string, Dimension> {
  const out = new Map(catalog);
  for (const [name, dim] of formulaNameDimensions()) {
    if (!out.has(name)) out.set(name, dim);
  }
  return out;
}

export async function parseUserEquation(
  equation: string,
  catalogNames?: ReadonlySet<string> | Iterable<string>,
): Promise<UserEquation> {
  if (equation.length > MAX_USER_EQUATION_LEN) {
    throw new UserEquationError(
      `equation exceeds ${MAX_USER_EQUATION_LEN} characters (${equation.length})`,
    );
  }
  // Materialized once: an iterator (`map.keys()`) would be spent by the first use.
  const names = catalogNames === undefined ? undefined : new Set(catalogNames);
  const spelled = rewriteFormulaSpellings(equation);
  const rewritten = names === undefined ? spelled : rewriteCatalogHyphens(spelled, names);
  const eqIdx = rewritten.indexOf('=');
  if (eqIdx < 0) {
    throw new UserEquationError(
      `equation must be "TARGET = EXPR" (no "=" found in '${equation}')`,
    );
  }
  const target = rewritten.slice(0, eqIdx).trim();
  if (!target) throw new UserEquationError('equation has an empty target (left of "=")');
  const rhs = rewritten.slice(eqIdx + 1).trim();
  if (!rhs) throw new UserEquationError('equation has an empty right-hand side');

  let variables: readonly string[];
  try {
    const parser = await getFormulaParser();
    ({ variables } = parser.parse(rhs));
  } catch (e) {
    const base = `could not parse the right-hand side '${rhs}': ${(e as Error).message}`;
    const hint =
      names === undefined
        ? null
        : hyphenSubtractHint(String((e as Error).message), equation.slice(equation.indexOf('=') + 1), names);
    throw new UserEquationError(hint ? `${base}. ${hint}` : base);
  }
  const sources = variables.filter(
    (v) => !Object.prototype.hasOwnProperty.call(CONSTANTS, v),
  );
  // An all-constant right-hand side (the Planck length) is an equation about a catalog quantity
  // only when its target is one; otherwise it names nothing to check (persona finding W5).
  const targetIsCatalog = names !== undefined && resolveToCatalogName(target, names) !== null;
  if (sources.length === 0 && !targetIsCatalog) {
    throw new UserEquationError(
      `no source quantities in '${rhs}' (only constants/numbers?)`,
    );
  }
  return { target, sources, text: rewritten.trim() };
}

/**
 * Single-letter / latex-style aliases that map onto a catalog quantity when the
 * long name is present and the short token is not (persona finding L4). `T` is
 * temperature in every CE formula_latex that uses it; the pendulum period is
 * named `period`, not `T`, in this catalog.
 */
const FORMULA_ALIASES: Readonly<Record<string, string>> = {
  T: 'temperature',
};

/**
 * Resolve a user symbol to a catalog quantity name: the literal name first, then
 * the `_`→`-` and `-`→`_` swaps, then {@link FORMULA_ALIASES}, against
 * `catalogNames`. Returns `null` if none match.
 *
 * @public
 */
export function resolveToCatalogName(
  name: string,
  catalogNames: ReadonlySet<string>,
): string | null {
  if (catalogNames.has(name)) return name;
  const underToHyphen = name.replace(/_/g, '-');
  if (underToHyphen !== name && catalogNames.has(underToHyphen)) return underToHyphen;
  const hyphenToUnder = name.replace(/-/g, '_');
  if (hyphenToUnder !== name && catalogNames.has(hyphenToUnder)) return hyphenToUnder;
  const alias = FORMULA_ALIASES[name];
  if (alias !== undefined && catalogNames.has(alias)) return alias;
  return null;
}

/**
 * Optimal-string-alignment edit distance: Levenshtein plus a swap of two adjacent
 * letters as ONE edit. Plain Levenshtein counts `lenght` → `length` as 2, the same
 * as `lenght` → `height`, and the typo's intended name then lost the tie
 * (persona finding N2).
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], prev2[j - 2] + 1);
      }
    }
    [prev2, prev, curr] = [prev, curr, prev2];
  }
  return prev[n];
}

/** Normalize for comparison: lowercase, `_`/`-` unified. */
const normalizeForCompare = (s: string): string => s.toLowerCase().replace(/[_-]/g, '-');

/** The shortest name that counts as contained in another for the "did you mean?" ranking. */
const MIN_CONTAINED = 3;

/**
 * The one "did you mean?" ranking, shared by {@link suggestQuantities} and
 * {@link suggestByDimension}: edit distance first, then containment (one name
 * inside the other), then length, then name. Edit distance leads so a one-edit
 * typo beats a substring: `hawkng-temperature` → `hawking-temperature` before
 * `temperature` (persona finding N5). `gate` keeps a candidate only if one name
 * contains the other (the contained one at least three characters long) or the
 * distance is small against the query length; the
 * dimension-based caller passes `false`, because there the dimension is the evidence.
 */
function rankByName(name: string, candidates: Iterable<string>, gate: boolean): string[] {
  const needle = normalizeForCompare(name);
  // Without the gate, short catalog names (`a`, `nu`) are spurious "matches" for any typo.
  const maxDist = Math.max(1, Math.ceil(needle.length / 2));
  // A contained name counts only from MIN_CONTAINED characters: every one-letter name occurs inside
  // a long input (`schrodinger-equation` holds a, g, q, r), and that is not nearness (audit I5).
  const within = (outer: string, inner: string): boolean => inner.length >= MIN_CONTAINED && outer.includes(inner);
  return [...candidates]
    .map((cand) => {
      const hay = normalizeForCompare(cand);
      const contains = within(hay, needle) || within(needle, hay) ? 0 : 1;
      return { cand, contains, dist: editDistance(needle, hay) };
    })
    .filter((s) => !gate || s.contains === 0 || s.dist <= maxDist)
    .sort(
      (x, y) =>
        x.dist - y.dist ||
        x.contains - y.contains ||
        x.cand.length - y.cand.length ||
        x.cand.localeCompare(y.cand),
    )
    .map((s) => s.cand);
}

/**
 * Up to `k` catalog names most similar to `name` — the "did you mean?" set for an
 * unmatched user symbol. Ranked by edit distance first, then containment, then
 * length (the shared ranking of `upt map` and `upt explain`).
 *
 * @public
 */
export function suggestQuantities(
  name: string,
  catalogNames: Iterable<string>,
  k = 5,
): string[] {
  return rankByName(name, catalogNames, true).slice(0, k);
}

/**
 * Catalog quantity names whose dimension equals `dim`, capped at `k` — the
 * dimension-based "did you mean?" set once an unknown symbol's dimension has
 * been inferred. With `near` (the unknown symbol) they are ranked by the same
 * edit-distance ranking as {@link suggestQuantities}, so `lenght` lists `length`
 * first (persona finding N2); without it they are sorted by name.
 *
 * @public
 */
export function suggestByDimension(
  dim: Dimension,
  catalogDims: ReadonlyMap<string, Dimension>,
  k = 5,
  near?: string,
): string[] {
  const same = [...catalogDims.entries()].filter(([, d]) => equals(d, dim)).map(([name]) => name);
  return (near === undefined ? same.sort() : rankByName(near, same, false)).slice(0, k);
}

/**
 * Where the injected user junction landed, computed from a built `VizModel`.
 *
 * @public
 */
export interface EquationLanding {
  readonly isolated: boolean;
  /** Junctions in the user equation's connected component (including itself). */
  readonly clusterSize: number;
  /** The component holds a law/established junction (anchored to known physics). */
  readonly anchored: boolean;
  /** User-equation quantities that also appear in a neighbouring junction. */
  readonly sharedQuantities: readonly string[];
  /** Other junction ids in the user equation's component. */
  readonly connectedJunctionIds: readonly string[];
}

/**
 * Describe where `userJunctionId` sits in `model`: its component, the junctions it
 * connects to, and the quantities that link it to them.
 *
 * @public
 */
export function equationLanding(model: VizModel, userJunctionId: string): EquationLanding {
  const cluster = model.clusters.find((c) => c.junctionIds.includes(userJunctionId));
  const self = model.junctions.find((j) => j.id === userJunctionId);
  if (!cluster || !self) {
    return { isolated: true, clusterSize: 1, anchored: false, sharedQuantities: [], connectedJunctionIds: [] };
  }
  const connectedJunctionIds = cluster.junctionIds.filter((id) => id !== userJunctionId);
  const selfQuantities = new Set([...self.sources, self.target]);
  const neighbourQuantities = new Set<string>();
  for (const j of model.junctions) {
    if (j.id === userJunctionId || !cluster.junctionIds.includes(j.id)) continue;
    for (const qn of [...j.sources, j.target]) neighbourQuantities.add(qn);
  }
  const sharedQuantities = [...selfQuantities].filter((qn) => neighbourQuantities.has(qn)).sort();
  return {
    isolated: cluster.size === 1,
    clusterSize: cluster.size,
    anchored: cluster.anchored,
    sharedQuantities,
    connectedJunctionIds,
  };
}

/**
 * One or two lines summarising `connects to:` (persona findings W3 / I3).
 * Dumping ~100 edge ids next to a correct pendulum equation made shared
 * `length`/`temperature` look like a physics claim. Rank by overlap with the
 * user's shared quantities first, then textbook/law over bridges, then name.
 * When the list is long, state the structural caveat explicitly.
 *
 * @internal
 */
export function formatConnectedSummary(
  model: VizModel,
  landing: EquationLanding,
  maxShow = 5,
): readonly string[] {
  const ids = landing.connectedJunctionIds;
  if (ids.length === 0) return [];
  const shared = new Set(landing.sharedQuantities);
  const byId = new Map(model.junctions.map((j) => [j.id, j]));
  const tier = (id: string): number =>
    id.startsWith('CE-') || id.startsWith('law-') ? 0 : id.startsWith('be-') ? 1 : 2;
  const overlap = (id: string): number => {
    const j = byId.get(id);
    if (!j) return 0;
    let n = 0;
    for (const qn of [...j.sources, j.target]) if (shared.has(qn)) n++;
    return n;
  };
  const ranked = [...ids].sort(
    (a, b) => overlap(b) - overlap(a) || tier(a) - tier(b) || a.localeCompare(b),
  );
  const shown = ranked.slice(0, maxShow);
  const more = ranked.length - shown.length;
  if (more <= 0) {
    return [`     nearest equations: ${shown.join(', ')}`];
  }
  return [
    `     nearest equations: ${shown.join(', ')} (+${more} more)`,
    '     (shared-quantity connectivity, not a physics claim)',
  ];
}

/** A "did you mean?" suggestion for an unmatched symbol. */
export interface EquationHint {
  readonly name: string;
  readonly suggestions: readonly string[];
  /** True when the suggestions come from the symbol's INFERRED dimension. */
  readonly byDimension: boolean;
  /**
   * Registered constants that carry the symbol's inferred dimension (`sigma` → `sigma_sb`,
   * persona finding L5). Present only when a dimension was inferred and it is not dimensionless.
   */
  readonly constants?: readonly string[];
}

/** A one-letter user name bound to a catalog quantity (persona finding W6). */
export interface ShortBinding {
  readonly name: string;
  readonly quantity: string;
  readonly dim: Dimension;
  /**
   * Present and false when a one-letter catalog name was recognised and not
   * applied. Omitted when the name was bound.
   */
  readonly bound?: false;
}

/**
 * Full analysis of a user equation against a catalog name→dimension map: the
 * `user` junction (for the graph), the dimensional verdict (RHS dimension vs the
 * target's catalog dimension), and "did you mean?" hints (dimension-based when a
 * single unknown's dimension can be inferred, else name-similarity).
 *
 * Physics constants (`hbar`, `c`, `k_B`, …) are supplied to the parser with
 * their real dimensions (from `CONSTANTS`) so the dimensional check is correct.
 *
 * @public
 */
export interface EquationAnalysis {
  readonly junction: VizJunction;
  /** Set when the RHS is not dimensionally well-formed (then dims are null). */
  readonly parseError: string | null;
  readonly rhsDimension: Dimension | null;
  readonly targetDimension: Dimension | null;
  /** rhsDimension === targetDimension; null when unknowable or parse failed. */
  readonly consistent: boolean | null;
  readonly hints: readonly EquationHint[];
  /**
   * One-letter names that resolved to a catalog quantity. A one-letter name is the likeliest to
   * mean something else: the catalog's `a` is perihelion's semi-major axis, a length, and the
   * Unruh formula's `a` is an acceleration (persona finding W6).
   */
  readonly shortBindings: readonly ShortBinding[];
  /**
   * RHS names given a dimensionless placeholder because they did not resolve.
   * The reported RHS dimension treats them as dimensionless, so it is not a
   * check of the formula until they are bound.
   */
  readonly placeholders: readonly string[];
  /** Set when `--natural` / `--geometrized` reconciled the two dimensions. */
  readonly naturalNote?: string;
}

/**
 * Parse + dimensionally analyze a user `TARGET = EXPR` against `catalogDims`
 * (catalog quantity name → dimension). Throws {@link UserEquationError} on a
 * structurally malformed equation; reports a dimensional malformation via
 * `parseError`.
 *
 * @public
 */
export async function analyzeUserEquation(
  equation: string,
  catalogDims: ReadonlyMap<string, Dimension>,
  options?: AnalyzeUserEquationOptions,
): Promise<EquationAnalysis> {
  const dimsIn = withFormulaNames(catalogDims);
  const catalogNames = new Set(dimsIn.keys());
  const bindShort = options?.bindShortNames === true;
  // W2: rewrite catalog kebabs before either parser sees `-` as subtraction.
  const eq = await parseUserEquation(equation, catalogNames);
  const literalShort = (n: string): string | null =>
    n.length === 1 && catalogNames.has(n) ? n : null;
  const resolve = (n: string): string | null => {
    if (!bindShort && literalShort(n) !== null) return null;
    return resolveToCatalogName(n, catalogNames);
  };

  // dims for parsePhysics: physics constants carry their REAL dimensions; matched
  // sources their catalog dimension; the (≤1) unmatched source a DIMENSIONLESS
  // placeholder so the RHS still parses.
  const dims: Record<string, Dimension> = {};
  for (const [name, c] of Object.entries(CONSTANTS)) dims[name] = c.dim;
  for (const s of eq.sources) {
    const r = resolve(s);
    dims[s] = r ? (dimsIn.get(r) as Dimension) : (formulaSymbolDimension(s) ?? DIMENSIONLESS);
  }
  // Use the rewritten equation's RHS (eq.text) so planck-length has already
  // become planck_length before dimensional parse.
  const rhsText = eq.text.slice(eq.text.indexOf('=') + 1);

  let rhsDimension: Dimension | null = null;
  let exprForInference: import('../dimensional/validator.js').ExprNode | null = null;
  let parseError: string | null = null;
  try {
    const parsed = await parsePhysics(rhsText, dims);
    rhsDimension = parsed.dimension;
    exprForInference = parsed.expr;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = hyphenSubtractHint(msg, equation.slice(equation.indexOf('=') + 1), catalogNames);
    parseError = hint ? `${msg}. ${hint}` : msg;
  }

  const resolvedTarget = resolve(eq.target);
  const targetDimension = resolvedTarget ? (dimsIn.get(resolvedTarget) as Dimension) : null;

  const placeholders = eq.sources.filter((s) => !resolve(s));
  const hints: EquationHint[] = [];
  if (exprForInference) {
    const unmatchedSources = placeholders.filter((s) => bindShort || literalShort(s) === null);
    const totalUnmatched = placeholders.length + (resolvedTarget ? 0 : 1);
    for (const s of unmatchedSources) {
      let byDim: string[] | null = null;
      let constants: string[] = [];
      if (targetDimension && totalUnmatched === 1) {
        const inferred = inferUnknownDimension(exprForInference, s, targetDimension);
        if (inferred) {
          byDim = suggestByDimension(inferred, dimsIn, 5, s);
          if (!equals(inferred, DIMENSIONLESS)) {
            constants = Object.entries(CONSTANTS)
              .filter(([, c]) => equals(c.dim, inferred))
              .map(([name]) => name)
              .sort();
          }
        }
      }
      const withConstants = constants.length > 0 ? { constants } : {};
      hints.push(
        byDim
          ? { name: s, suggestions: byDim, byDimension: true, ...withConstants }
          : { name: s, suggestions: suggestQuantities(s, catalogNames, 5), byDimension: false, ...withConstants },
      );
    }
    if (!resolvedTarget && (bindShort || literalShort(eq.target) === null)) {
      hints.push({ name: eq.target, suggestions: suggestQuantities(eq.target, catalogNames, 5), byDimension: false });
    }
  }

  const declined = eq.sources
    .filter((s) => !bindShort && literalShort(s) !== null)
    .map((s) => ({ name: s, quantity: s, dim: dimsIn.get(s) as Dimension, bound: false as const }));
  const declinedTarget =
    !bindShort && literalShort(eq.target) !== null
      ? [{ name: eq.target, quantity: eq.target, dim: dimsIn.get(eq.target) as Dimension, bound: false as const }]
      : [];
  const boundShort = eq.sources
    .filter((s) => s.length === 1 && resolve(s) !== null)
    .map((s) => ({ name: s, quantity: resolve(s)!, dim: dimsIn.get(resolve(s)!) as Dimension }));

  let consistent = rhsDimension && targetDimension ? equals(rhsDimension, targetDimension) : null;
  let natural: string | undefined;
  if (
    consistent === false &&
    rhsDimension &&
    targetDimension &&
    options?.units !== undefined &&
    (hints.length === 0)
  ) {
    const powers = naturalPowers(rhsDimension, targetDimension, options.units);
    const note = powers === null ? null : naturalNote(powers, options.units);
    if (note) {
      consistent = true;
      natural = note;
    }
  }

  return {
    junction: {
      id: 'user-equation',
      label: eq.text,
      status: 'user',
      sources: eq.sources.map((s) => resolve(s) ?? s),
      target: resolvedTarget ?? eq.target,
    },
    parseError,
    rhsDimension,
    targetDimension,
    consistent,
    hints,
    shortBindings: [...declined, ...boundShort, ...declinedTarget],
    placeholders,
    ...(natural === undefined ? {} : { naturalNote: natural }),
  };
}
