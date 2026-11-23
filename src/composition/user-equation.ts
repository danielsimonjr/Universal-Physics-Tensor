/**
 * User-equation injection — turn a free-form `TARGET = EXPR` string into a graph
 * junction (a target quantity + its source quantities), resolve the user's
 * symbols onto the catalog vocabulary, suggest near-misses, and report where the
 * injected junction lands in a built {@link VizModel}.
 *
 * Free-form means no dimensions: source quantities are the RHS's free variables
 * — extracted by the MathTS expression parser via {@link getFormulaParser},
 * which already drops constants like `pi`/`tau`, numbers, and functions —
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
import { rewriteConstantSpellings } from '../dimensional/constant-rows.js';
import { CONSTANTS, isRegisteredConstant } from '../dimensional/symbolic-constants.js';
import { CANONICAL_GROUP_PREFACTORS } from './canonical-prefactors.js';
import { formulaNameDimensions } from '../dimensional/formula-names.js';
import { naturalNote, naturalPowers, type UnitMode } from '../dimensional/natural-units.js';
import { aliasesForTarget, editDistance, symbolIndex } from './aliases.js';
import { greekLetter, resolveQuantityName } from '../dimensional/formula-names.js';
import { CATALOG_GRAPH } from './catalog-graph.js';
import { CANONICAL_GRAPH } from './canonical-graph.js';
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

import { rewriteCatalogHyphens } from '../dimensional/hyphen-names.js';
/** Rewrite a catalog hyphenated name to underscores before the expression parse. */
export { rewriteCatalogHyphens };

/** A hyphen-joined run of names, `a-b` or `a-b-c`, not the exponent of `1e-5`. */
const HYPHEN_RUN = /(?<![A-Za-z0-9_.])[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)+/g;

/**
 * When the parse read a hyphen-joined run (`thermal-mass`) as a subtraction of
 * its pieces, and the run read as one name is a catalog quantity, tell the user
 * `-` is arithmetic here and to use underscores. Persona finding I2.
 *
 * Decided from the parse, not from an error's text: `variables` are the free
 * variables the formula parser read from `rhs`. The parser has no hyphenated
 * identifier, so a run whose underscored name is not a variable and whose
 * pieces are was parsed as a subtraction.
 *
 * @internal
 */
export function hyphenSubtractHint(
  rhs: string,
  variables: readonly string[],
  catalogNames: ReadonlySet<string>,
): string | null {
  const read = new Set(variables);
  const split = (rhs.match(HYPHEN_RUN) ?? []).filter(
    (run) =>
      !read.has(run.replace(/-/g, '_')) &&
      run.split('-').some((piece) => read.has(piece)) &&
      resolveQuantityName(run, catalogNames) !== null,
  );
  if (split.length === 0) return null;
  const example = split.sort((a, b) => b.length - a.length)[0]!;
  return (
    `'-' is arithmetic here; multi-word catalog names use underscores ` +
    `(${example} → ${example.replace(/-/g, '_')})`
  );
}

/**
 * Spellings that must not be a bare `e`. Constant aliases come from
 * {@link rewriteConstantSpellings}. `1-eccentricity^2` is the perihelion factor
 * `one_minus_e_sq`.
 */
function rewriteFormulaSpellings(text: string): string {
  return rewriteConstantSpellings(text).replace(
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

/** Parse a `TARGET = EXPR` equation into its target and source quantities. A malformed equation throws. */
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
    // No parse tree, so no subtraction was read: the hyphen hint needs the parsed variables.
    throw new UserEquationError(`could not parse the right-hand side '${rhs}': ${(e as Error).message}`);
  }
  const sources = variables.filter((v) => !isRegisteredConstant(v));
  // An all-constant right-hand side (the Planck length) is an equation about a catalog quantity
  // only when its target is one; otherwise it names nothing to check (persona finding W5).
  const targetIsCatalog = names !== undefined && resolveQuantityName(target, names) !== null;
  if (sources.length === 0 && !targetIsCatalog) {
    throw new UserEquationError(
      `no source quantities in '${rhs}' (only constants/numbers?)`,
    );
  }
  return { target, sources, text: rewritten.trim() };
}

/** Resolve equation-local symbols when exactly one declared variable mapping fits. @internal */
export function equationSymbolBindings(eq: UserEquation, catalog: ReadonlySet<string>): ReadonlyMap<string, string> {
  const sameToken = (token: string, quantity: { name: string; symbol: string }): boolean =>
    token === quantity.name || token.replaceAll('_', '-') === quantity.name ||
    token === quantity.symbol || greekLetter(token) === quantity.symbol;
  const alternatives = new Map<string, ReadonlyMap<string, string>>();
  for (const edge of CANONICAL_GRAPH) {
    if (![edge.target, ...edge.sources].some((quantity) => quantity.symbol !== quantity.name) ||
        !catalog.has(edge.target.name) || edge.sources.length !== eq.sources.length ||
        !sameToken(eq.target, edge.target)) continue;
    const bindings = new Map<string, string>([[eq.target, edge.target.name]]);
    for (const token of eq.sources) {
      const possible = edge.sources.filter((quantity) => catalog.has(quantity.name) && sameToken(token, quantity));
      if (possible.length === 1) bindings.set(token, possible[0]!.name);
    }
    if (bindings.size !== eq.sources.length + 1 || new Set(bindings.values()).size !== bindings.size) continue;
    alternatives.set(JSON.stringify([...bindings]), bindings);
  }
  return alternatives.size === 1 ? alternatives.values().next().value! : new Map();
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
  /**
   * The other catalog quantities whose symbol or alias is this letter (`a` is also the symbol of
   * `unruh-acceleration`). Present only when there is one or more.
   */
  readonly otherMeanings?: readonly string[];
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
  /**
   * The user junction with each resolved name, or the raw name when it did not bind. Use it for
   * the label and the comparisons. Do not give it to `buildVizModel`: use `graphJunction`.
   */
  readonly junction: VizJunction;
  /**
   * The junction as the graph reads it. A name that did not bind is keyed `<name> (unbound)`,
   * so it never joins a catalog node that has the same spelling.
   */
  readonly graphJunction: VizJunction;
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
   * The placeholder supports parsing and hints. The RHS dimension is withheld
   * until these names are bound.
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
  const contextual = equationSymbolBindings(eq, catalogNames);
  const literalShort = (n: string): string | null =>
    n.length === 1 && catalogNames.has(n) && !contextual.has(n) ? n : null;
  const resolveCatalog = (n: string): string | null => {
    if (!bindShort && literalShort(n) !== null) return null;
    return contextual.get(n) ?? resolveQuantityName(n, catalogNames);
  };
  // Evaluate keys are aliases of this target's sources. `R` is reflectance
  // on radiation-pressure and is not a global name.
  const aliasMap = aliasesForTarget(CATALOG_GRAPH, resolveCatalog(eq.target) ?? '');
  const resolve = (n: string): string | null => {
    if (!bindShort && literalShort(n) !== null) return null;
    return contextual.get(n) ?? resolveQuantityName(n, catalogNames, aliasMap);
  };
  // The symbol table `upt search` reads: a quantity's symbol and its edge aliases (#684). A Greek
  // name (`omega`) also reads its letter (`ω`).
  const symbols = symbolIndex([...CATALOG_GRAPH, ...CANONICAL_GRAPH]);
  const symbolOf = (n: string): string[] =>
    [...new Set([...(symbols.get(n) ?? []), ...(symbols.get(greekLetter(n) ?? '') ?? [])])]
      .filter((q) => catalogNames.has(q)).sort((x, y) => x.localeCompare(y));
  // A quantity whose symbol is the name reads before a spelling neighbour.
  const suggest = (n: string): string[] =>
    [...new Set([...symbolOf(n), ...suggestQuantities(n, catalogNames, 5)])].slice(0, 5);
  const withMeanings = <B extends { name: string; quantity: string }>(b: B): B & { otherMeanings?: string[] } => {
    const alternatives = [...symbolOf(b.name), ...(catalogNames.has(b.name) ? [b.name] : [])];
    const others = [...new Set(alternatives)].filter((q) => q !== b.quantity);
    return others.length > 0 ? { ...b, otherMeanings: others } : b;
  };

  // dims for parsePhysics: physics constants carry their REAL dimensions; matched
  // sources their catalog dimension; the (≤1) unmatched source a DIMENSIONLESS
  // placeholder so the RHS still parses.
  const dims: Record<string, Dimension> = {};
  for (const [name, c] of Object.entries(CONSTANTS)) dims[name] = c.dim;
  const dimensionlessGroups = new Set(CANONICAL_GROUP_PREFACTORS.map((prefactor) => prefactor.group));
  const placeholders: string[] = [];
  for (const source of eq.sources) {
    const resolved = resolve(source);
    const knownDimension = resolved !== null
      ? dimsIn.get(resolved)
      : !bindShort && literalShort(source) !== null
        ? undefined
        : dimensionlessGroups.has(source) ? DIMENSIONLESS : formulaSymbolDimension(source);
    if (knownDimension === undefined) placeholders.push(source);
    dims[source] = knownDimension ?? DIMENSIONLESS;
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
    // The formula parser already read this right-hand side (parseUserEquation), so its variables are the tree's.
    const { variables } = (await getFormulaParser()).parse(rhsText);
    const hint = hyphenSubtractHint(rhsText, variables, catalogNames);
    parseError = hint ? `${msg}. ${hint}` : msg;
  }

  const resolvedTarget = resolve(eq.target);
  const targetDimension = resolvedTarget ? (dimsIn.get(resolvedTarget) as Dimension) : null;

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
          : { name: s, suggestions: suggest(s), byDimension: false, ...withConstants },
      );
    }
    if (!resolvedTarget && (bindShort || literalShort(eq.target) === null)) {
      hints.push({ name: eq.target, suggestions: suggest(eq.target), byDimension: false });
    }
  }

  const declined = eq.sources
    .filter((s) => !bindShort && literalShort(s) !== null)
    .map((s) => ({ name: s, quantity: s, dim: dimsIn.get(s) as Dimension, bound: false as const }));
  const declinedTarget =
    !bindShort && literalShort(eq.target) !== null
      ? [{ name: eq.target, quantity: eq.target, dim: dimsIn.get(eq.target) as Dimension, bound: false as const }]
      : [];
  const boundShort = [...new Set([...eq.sources, eq.target])]
    .filter((s) => s.length === 1 && resolve(s) !== null)
    .map((s) => ({ name: s, quantity: resolve(s)!, dim: dimsIn.get(resolve(s)!) as Dimension }));

  // Placeholder dimensions are useful for inferring hints, but cannot establish
  // the dimension of the formula.
  if (placeholders.length > 0) rhsDimension = null;
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

  const junction: VizJunction = {
    id: 'user-equation',
    label: eq.text,
    status: 'user',
    sources: eq.sources.map((s) => resolve(s) ?? s),
    target: resolvedTarget ?? eq.target,
  };
  const unbound = (n: string): string => `${n} (unbound)`;

  return {
    junction,
    graphJunction: {
      ...junction,
      sources: eq.sources.map((s) => resolve(s) ?? unbound(s)),
      target: resolvedTarget ?? unbound(eq.target),
    },
    parseError,
    rhsDimension,
    targetDimension,
    consistent,
    hints,
    shortBindings: [...declined, ...boundShort, ...declinedTarget].map(withMeanings),
    placeholders,
    ...(natural === undefined ? {} : { naturalNote: natural }),
  };
}
