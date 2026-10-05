/**
 * `upt explain` — explain how the graph determines a quantity: the
 * identifiability verdict, recovered value, derivation chains, and whether
 * the inputs are dimensionally sufficient. Transposed verbatim from
 * bin/upt.mjs's `explain()` + `parseKnown()` (lines 183-235), plus
 * `--source` (the old CLI's module-level `GRAPH` was always the catalog
 * graph) and `--json`.
 *
 * `parseKnown`'s two-mode positional contract (bare names XOR name=value,
 * never mixed) and its malformed-input rejections are pinned by
 * `tests/cli/upt-explain-inputs.test.ts` against the old bin — ported here
 * unchanged, with `process.exit(2)` sites converted to `UsageError` (same
 * message text; `main.ts`'s catch maps it to exit 2).
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG, sourceFlag } from '../flag-help.js';
import { resolveGraph } from '../graphs.js';
import { emitJson } from '../output.js';
import { CarrierSignError } from '../../bridges/carrier-sign.js';
import { UsageError, CliError } from '../errors.js';
import { searchNameWords } from '../search-index.js';
import { alignTemperatureBinding, readNamedBinding } from '../../numerical/binding-value.js';
import { UnitError } from '../../dimensional/units.js';
import { kelvinScale } from '../temperature-bindings.js';
import {
  aliasesForTarget,
  nearQuantityNames,
  rewriteInputKey,
  shareSynonyms,
} from '../../composition/aliases.js';
import { CANONICAL_GROUP_PREFACTORS } from '../../composition/canonical-prefactors.js';
import { formatQuantity } from '../../composition/explain.js';

/** How many `upt search` hits a NOT COVERED answer lists before "… and N more". */
const SEARCH_HITS_SHOWN = 5;

const FLAGS: FlagSpec[] = [
  sourceFlag('catalog', 'Which graph to read: catalog, canonical, or both.'),
  JSON_FLAG,
];

const HELP = `upt explain <quantity> [name=value | name] ...
            [--source=catalog|canonical|both] [--json]
        Explain how the graph determines a quantity: the identifiability
        verdict, recovered value, derivation chains, and whether the inputs
        are dimensionally sufficient. A name that is not a quantity of the
        graph is reported NOT COVERED, with a one-edit name and what \`upt search\`
        finds for its words, and exits 1. A shared token such as \`length\` is
        not a near name. An evaluate key (\`I_W_per_m2\`, \`B_T\`, \`T_K\`, \`g_00\`)
        is the graph quantity that edge records. A name that does not resolve
        exits 1. --source picks the graph (default
        catalog); the result names the source it used.
        --source=both also prints the other quantity name when a canonical
        equation restates a catalog bridge under a different name, and says
        whether the two recovered values agree.
        A value is a number, a unit (mass=1Msun) or a constant expression
        (mass=1*M_sun). A bare number is already in the quantity's unit.
        T, temperature, temp, and T_K are kelvin: an energy on that name is
        k_B T, using boltzmann-constant, k_B, or kB when one of those is
        bound, and any other dimension is an error.
        A tagged quantity converts into that unit (GeV, bit, nat, J/K).
        magnetic-field and magnetic-flux-density are one vacuum B: a value
        given under either name is available under the other.
        e.g.  upt explain hawking-temperature mass=1.989e30`;

/**
 * Two modes, never mixed: bare names (structural analysis) OR name=value
 * (adds value recovery). Malformed inputs are rejected with a `UsageError`
 * rather than silently coerced — `mass=abc`→dropped, `mass=`→0,
 * `mass=1e500`→∞, and a bare name alongside a valued one were all silent
 * wrong-physics footguns.
 */
function parseKnown(args: readonly string[]): { known: string[] | Record<string, number>; notes: string[] } {
  const valued = args.filter((a) => a.includes('='));
  if (valued.length === 0) return { known: [...args], notes: [] }; // names mode

  if (valued.length !== args.length) {
    const bare = args.filter((a) => !a.includes('=')).join(', ');
    throw new UsageError(
      `upt: cannot mix bare names (${bare}) with name=value inputs. `
        + 'Use all names (structural) or all name=value (with recovery). See `upt help`.'
    );
  }

  const pending: { name: string; raw: string; assignment: string; read: ReturnType<typeof readNamedBinding> }[] = [];
  for (const a of args) {
    const eq = a.indexOf('=');
    const name = a.slice(0, eq);
    const raw = a.slice(eq + 1);
    let read: ReturnType<typeof readNamedBinding>;
    try {
      read = readNamedBinding(name, raw);
    } catch {
      throw new UsageError(`upt: '${a}' is not a finite number. Expected ${name}=<number>. See \`upt help\`.`);
    }
    if (raw === '' || !Number.isFinite(read.value)) {
      throw new UsageError(`upt: '${a}' is not a finite number. Expected ${name}=<number>. See \`upt help\`.`);
    }
    pending.push({ name, raw, assignment: a, read });
  }

  // The same reading as `upt eval`: an energy on a temperature name is k_B T.
  // Eval wired this in parseScope. Explain used to keep the joule magnitude.
  const kB = kelvinScale(pending);
  const values: Record<string, number> = {};
  const notes: string[] = [];
  for (const p of pending) {
    try {
      const aligned = alignTemperatureBinding(p.name, p.raw, p.read, kB);
      if (!Number.isFinite(aligned.value)) {
        throw new UsageError(
          `upt: '${p.assignment}' is not a finite number. Expected ${p.name}=<number>. See \`upt help\`.`,
        );
      }
      values[p.name] = aligned.value;
      // Unit-convention notes were already on the binding and explain did not
      // print them. The temperature reading adds a note; that one is new.
      for (const note of aligned.notes) {
        if (p.read.notes.includes(note) || notes.includes(note)) continue;
        notes.push(note);
      }
    } catch (e) {
      if (e instanceof UsageError) throw e;
      if (e instanceof UnitError) {
        throw new CliError(`upt explain: '${p.assignment}' is not a temperature. ${e.message}`);
      }
      throw e;
    }
  }
  return { known: values, notes };
}

/**
 * A bridge id (`be-NN`) is a graph EDGE, not a quantity NODE — `explain`
 * derives quantities, so it can never resolve a bridge id and would emit a bare
 * "no derivation path". Recognise a catalog bridge id and redirect helpfully,
 * tailored by grounding tier (closed-form evaluator vs graph-computable,
 * data-confronted or not). Returns `null` for non-bridge targets (fall through
 * to the normal graph explain).
 */
function bridgeRedirect(
  api: CommandCtx['api'],
  target: string,
): { id: number; tier: string; hasGraphEdge: boolean; hasDataConfrontation: boolean; hint: string } | null {
  const m = /^be-(\d+)$/i.exec(target);
  if (!m) return null;
  const id = Number(m[1]);
  const b = api.auditCoverage().bridges.find((x) => x.id === id);
  if (!b) return null;

  let hint = `${target} is a bridge equation (a relation between quantities), not a graph quantity — \`explain\` derives quantities from the composition graph.`;
  hint += b.hasGraphEdge
    ? ` Its quantities appear in \`upt map\`; explain one of them to see its derivations.`
    : ` It is a closed-form evaluator bridge (no composition-graph edge), evaluated directly rather than through the graph.`;
  hint += b.hasDataConfrontation
    ? ` See \`upt confront ${target}\` for its real-data confrontation.`
    : ` It has no committed data confrontation (see \`upt coverage\`).`;
  return {
    id,
    tier: b.tier,
    hasGraphEdge: b.hasGraphEdge,
    hasDataConfrontation: b.hasDataConfrontation,
    hint,
  };
}

/** A canonical equation and the catalog bridge it restates, when those two target names differ. */
function restatementPartner(
  api: CommandCtx['api'],
  target: string,
): { name: string; canonicalId: string; bridgeId: number } | null {
  const norm = (s: string): string => s.replaceAll('_', '-').toLowerCase();
  const want = norm(target);
  for (const eq of api.CANONICAL_EQUATIONS) {
    if (eq.restatesBridge === undefined) continue;
    const bridgeId = Number(eq.restatesBridge);
    if (!Number.isInteger(bridgeId)) continue;
    const catalog = api.CATALOG_GRAPH.find((e) => e.beId === bridgeId);
    if (catalog === undefined) continue;
    const canonName = eq.dimensional.target.name;
    const catName = catalog.target.name;
    if (norm(canonName) === norm(catName)) continue;
    if (norm(canonName) === want) return { name: catName, canonicalId: eq.id, bridgeId };
    if (norm(catName) === want) return { name: canonName, canonicalId: eq.id, bridgeId };
  }
  return null;
}

function printExplanation(
  out: CommandCtx['out'],
  target: string,
  label: string,
  x: ReturnType<CommandCtx['api']['explainQuantity']>,
): void {
  out(`\n● ${target}  [source: ${label}]`);
  out(`  ${x.summary}`);
  if (x.derivations.length) {
    out('  derivations:');
    for (const d of x.derivations) {
      const val = d.value !== undefined ? ` = ${formatQuantity(d.value)}` : '';
      const chain =
        d.leafInputs.join(',') !== d.sources.join(',') ? `  [from leaves: ${d.leafInputs.join(', ')}]` : '';
      out(`    - ${d.edge} (${d.label})${val}${chain}`);
      if (d.dimensionalForm) out(`        ${d.dimensionalForm.formula}`);
    }
  }
  if (x.blockingFrontier.length) {
    out(`  to determine it, also supply: ${x.blockingFrontier.join(', ')}`);
  }
}

/** Relative agreement of two recovered values. Absent when either value is missing. */
function valuesAgree(a: number | undefined, b: number | undefined): boolean | undefined {
  if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale === 0) return a === b;
  return Math.abs(a - b) / scale <= 1e-6;
}

function rebind(
  known: string[] | Record<string, number>,
  aliases: ReadonlyMap<string, string>,
  graphNames: ReadonlySet<string>,
): string[] | Record<string, number> {
  const rewrite = (key: string): string => {
    const hit = rewriteInputKey(key, aliases, graphNames);
    if (hit === null) {
      throw new CliError(
        `upt explain: '${key}' did not resolve to a quantity. ` +
          'A failed lookup is not a derivation, and this command does not exit 0.',
      );
    }
    return hit;
  };
  if (Array.isArray(known)) return known.map(rewrite);
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(known)) {
    const name = rewrite(key);
    if (Object.hasOwn(out, name) && out[name] !== value) {
      throw new CliError(`upt explain: '${name}' is given twice.`);
    }
    out[name] = value;
  }
  return out;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;

  const [target, ...rest] = args.positionals;
  if (!target) {
    throw new UsageError('upt explain needs a quantity name. See `upt help`.');
  }

  // A bridge id is an edge, not a quantity — redirect before touching the graph.
  const redirect = bridgeRedirect(api, target);
  if (redirect) {
    // A bridge id names a CATALOG bridge whatever --source says; say so rather than print a source it did not use.
    if (args.flags.has('json')) {
      emitJson({ command: 'explain', source: 'catalog', result: { kind: 'bridge-redirect', ...redirect } }, ctx.write);
      return 0;
    }
    out(`\n● ${target}  [source: catalog bridge registry; a bridge id names a catalog bridge whatever --source says]`);
    out(`  ${redirect.hint}`);
    return 0;
  }

  const { graph, label, source } = resolveGraph(api, args.flags);
  // A name that is not a quantity of this graph is NOT COVERED (persona finding
  // C4). It used to get the same "no derivation path" answer as a real quantity
  // the inputs cannot reach, and exit 0. Underscores resolve like hyphens.
  const names = new Set(graph.flatMap((e) => [e.target.name, ...e.sources.map((s) => s.name)]));
  // A dimensionless group the equation multiplies (sound-speed's gamma) is an
  // optional input, not a graph node. It resolves as a binding and not as a target.
  const inputNames = new Set(names);
  const edgeIds = new Set(graph.map((e) => e.id));
  for (const group of CANONICAL_GROUP_PREFACTORS) {
    if (edgeIds.has(group.id)) inputNames.add(group.group);
  }
  let resolvedTarget = api.resolveToCatalogName(target, names);
  if (resolvedTarget === null) {
    const near = nearQuantityNames(target, names);
    // A single token one edit from exactly one quantity is that quantity.
    // A hyphenated miss stays a suggestion: `hawkng-temperature` exits 1.
    if (!/[-_\s]/.test(target) && near.length === 1) {
      resolvedTarget = near[0]!;
    }
  }
  if (resolvedTarget === null) {
    const near = nearQuantityNames(target, names);
    // Audit I5: a law or model name (`schrodinger-equation`) is not a quantity; name what
    // `upt search` finds for its words. A shared token is not a near name.
    const found = searchNameWords(api, target);
    const shown = found?.matches.slice(0, SEARCH_HITS_SHOWN) ?? [];
    const searchLine =
      found === null
        ? ''
        : `\n  \`upt search ${found.words.join(' ')}\` finds ${found.matches.length}:` +
          shown.map((m) => `\n    ${m.entry.id} (${m.entry.kind.replace('-', ' ')}) — ${m.entry.command}`).join('') +
          (found.matches.length > shown.length ? `\n    … and ${found.matches.length - shown.length} more` : '');
    throw new CliError(
      `upt explain: '${target}' is not a quantity in the ${source} graph: NOT COVERED.` +
        (near.length > 0
          ? ` did you mean: ${near.join(', ')}?`
          : ' `upt canonical` and `upt map` list the vocabulary.') +
        searchLine,
    );
  }
  const aliases = aliasesForTarget(graph, resolvedTarget);
  const parsed = parseKnown(rest);
  for (const note of parsed.notes) ctx.err(note);
  const rebound = rebind(parsed.known, aliases, inputNames);
  const known = shareSynonyms(rebound, names);
  let x;
  try {
    x = api.explainQuantity(graph, resolvedTarget, known);
  } catch (e) {
    if (e instanceof CarrierSignError) throw new CliError(`upt explain: ${e.message}`);
    throw e;
  }
  const partner = source === 'both' ? restatementPartner(api, resolvedTarget) : null;
  const partnerKnown = partner !== null && names.has(partner.name);
  const partnerExplanation = partnerKnown ? api.explainQuantity(graph, partner!.name, known) : undefined;
  const agree = valuesAgree(x.recoveredValue, partnerExplanation?.recoveredValue);

  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'explain',
        source,
        result:
          partner !== null && partnerExplanation !== undefined
            ? {
                ...x,
                restatement: {
                  canonicalId: partner.canonicalId,
                  bridgeId: partner.bridgeId,
                  otherName: partner.name,
                  valuesAgree: agree,
                  explanation: partnerExplanation,
                },
              }
            : x,
      },
      ctx.write,
    );
    return 0;
  }

  printExplanation(out, target, label, x);
  if (partner !== null && partnerExplanation !== undefined) {
    printExplanation(out, partner.name, label, partnerExplanation);
    const who = `${partner.canonicalId} restates be-${partner.bridgeId}`;
    if (agree === true) {
      out(`  ${resolvedTarget} and ${partner.name} are one restatement (${who}). Values agree.`);
    } else if (agree === false) {
      const ratio = x.recoveredValue! / partnerExplanation.recoveredValue!;
      out(
        `  ${resolvedTarget} and ${partner.name} are one restatement (${who}). ` +
          `Values DISAGREE: ${resolvedTarget} / ${partner.name} = ${formatQuantity(ratio)}.`,
      );
    } else {
      out(`  ${resolvedTarget} and ${partner.name} are one restatement (${who}).`);
    }
  }
  return 0;
}

export const command: Command = {
  name: 'explain',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Show how the graph determines a quantity, or say that it does not cover that name.',
  example: 'upt explain hawking-temperature mass=1Msun',
  group: 'explore',
  run,
};

registerCommand(command);
