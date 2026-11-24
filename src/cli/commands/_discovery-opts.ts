/**
 * Shared `--max-orders`/`--anchor` parsing — used by both `discover` and
 * `map`'s `--proposed` overlay. In the old CLI, `map`'s `proposedJunctions`
 * passed the raw args straight through `parseDiscoveryOpts` (bin/upt.mjs line
 * 392), so `map --proposed --max-orders=N` genuinely tuned the proposed
 * overlay — the two commands share this validation, not just the shape.
 *
 * Transposed verbatim from bin/upt.mjs's `parseDiscoveryOpts()` (lines
 * 596-632). The two error messages are pinned byte-exact by
 * `tests/cli/upt-discover-opts.test.ts` (which drives the OLD bin, still
 * green and untouched) — do not reword them.
 */
import type { ParsedArgs } from '../args.js';
import type { CommandCtx } from '../command.js';
import { CliError, UsageError } from '../errors.js';
import { realFlag } from '../numeric-flag.js';
import type { DiscoveryOptions, VettedCandidate } from '../../composition/discovery.js';
import type { Dimension } from '../../dimensional/types.js';
import { resolveGraph } from '../graphs.js';

/** Read the `--max-orders` and `--anchor` flags into discovery options. A bad value throws. */
export function parseDiscoveryOpts(api: CommandCtx['api'], flags: ParsedArgs['flags']): DiscoveryOptions {
  const opts: { maxOrdersOfMagnitude?: number; groundTruth?: Record<string, number> } = {};

  const moValues = flags.get('max-orders');
  if (moValues && moValues.length > 0) {
    const raw = moValues[moValues.length - 1];
    // The grammar first: an empty, hex or non-numeric token is a malformed invocation (exit 2,
    // naming the flag and the token). A well-formed negative value is a bad value: exit 1.
    const n = realFlag('', '--max-orders', raw);
    if (n < 0) {
      throw new CliError(`upt: --max-orders must be a non-negative finite number, got "${raw}".`);
    }
    opts.maxOrdersOfMagnitude = n;
  }

  const pairs: { name: string; raw: string; pair: string }[] = [];
  for (const x of flags.get('anchor') ?? []) {
    for (const pair of x.split(',')) {
      const split = api.splitAssignment(pair);
      if (split === null) {
        throw new UsageError(`upt: --anchor expects k=v with a finite numeric value, got "${pair}".`);
      }
      const { name: k, raw: v } = split;
      // An empty value is a bad value (exit 1), as `x=` is on every other binding.
      if (v === '') throw new CliError(`upt: --anchor '${k}' has no value ('${pair}'); give k=v with a finite numeric value`);
      pairs.push({ name: k, raw: v, pair });
    }
  }
  if (pairs.length === 0) return opts;

  const { graph, source } = resolveGraph(api, flags);
  const quantities = new Map<string, Dimension>();
  for (const { target, sources } of graph) {
    for (const quantity of [target, ...sources]) quantities.set(quantity.name, quantity.dim);
  }
  const quantityNames = new Set(quantities.keys());
  const resolvedNames = new Map<string, string>();
  const scopedPairs = pairs.map((p) => {
    const resolved = api.resolveQuantityName(p.name, quantityNames);
    if (resolved === null) {
      const allNames = new Set(
        [...api.CATALOG_GRAPH, ...api.CANONICAL_GRAPH].flatMap(({ target, sources }) =>
          [target.name, ...sources.map(({ name }) => name)]),
      );
      const availableElsewhere = api.resolveQuantityName(p.name, allNames) !== null;
      const where = availableElsewhere ? `in the selected ${source} graph` : 'in either graph';
      throw new CliError(`upt: --anchor '${p.pair}': '${p.name}' is not a quantity ${where} (\`upt search ${p.name}\` looks for one)`);
    }
    const previous = resolvedNames.get(resolved);
    if (previous === p.name) {
      throw new CliError(`upt: --anchor '${p.name}' is given twice ('${p.pair}'); give one value per name`);
    }
    if (previous !== undefined) {
      throw new CliError(`upt: --anchor '${p.name}' resolves to '${resolved}', which is already bound by '${previous}'`);
    }
    resolvedNames.set(resolved, p.name);
    return { ...p, resolved };
  });
  const siblings = scopedPairs.map(({ resolved, raw }) => ({ name: resolved, raw }));
  const values = new Map<string, number>();
  for (const p of scopedPairs) {
    const { resolved } = p;
    const dim = quantities.get(resolved)!;
    try {
      const read = api.readNamedBinding(resolved, p.raw, { siblings });
      if (!Number.isFinite(read.value)) {
        throw new CliError(`upt: --anchor expects k=v with a finite numeric value, got "${p.pair}".`);
      }
      // A bare value is already in the resolved quantity's evaluator unit.
      // A unit-bearing value still has to match its dimension.
      if (read.dimensioned && !api.dimensionsEqual(read.dimension, dim)) {
        throw new CliError(
          `upt: --anchor '${p.pair}' is ${api.format(read.dimension)}, but ${resolved} is ${api.format(dim)}`,
        );
      }
      values.set(resolved, read.value);
    } catch (e) {
      // A bad value is exit 1 on every command; a missing `=` was refused as usage above.
      if (e instanceof CliError) throw e;
      if (e instanceof api.TemperatureBindingError) {
        throw new CliError(`upt: --anchor '${p.pair}' is not a temperature. ${e.message}`);
      }
      // Not a number: the pinned sentence. Any other unit error (an unknown unit, an ambiguous
      // one) says what it found, so it is passed on with the anchor it came from.
      if (e instanceof api.BindingNumberError) {
        throw new CliError(`upt: --anchor expects k=v with a finite numeric value, got "${p.pair}".`);
      }
      if (e instanceof api.UnitError) {
        throw new CliError(`upt: --anchor '${p.pair}': ${e.message}`);
      }
      throw e;
    }
  }
  const groundTruth = Object.fromEntries(values);
  try {
    api.assertSynonymAgreement(groundTruth);
  } catch (e) {
    if (e instanceof api.SynonymDisagreementError) throw new CliError(`upt: ${e.message}`);
    throw e;
  }
  opts.groundTruth = groundTruth;

  return opts;
}

/** Render one downstream scenario with its input provenance and evaluation outcome. */
export function formatSubstitution(check: NonNullable<VettedCandidate['substitutions']>[number]): string {
  const inputs = Object.entries(check.inputs).map(([name, input]) =>
    `${name}=${input.value} ${input.unit} (${input.source})`,
  ).join(', ');
  const prediction = check.prediction ? ` · prediction ${check.prediction.value} ${check.prediction.unit}` : '';
  const original = check.baselineInput;
  const originalValue = original
    ? ` with ${check.to}=${original.value} ${original.unit} (${original.source})`
    : '';
  const baseline = check.baselinePrediction
    ? ` · baseline ${check.baselinePrediction.value} ${check.baselinePrediction.unit}${originalValue}` : '';
  return [
    `substitution ${check.from} → ${check.to} via ${check.edgeId} (${check.target}) · ${check.status}`,
    check.scenario ? ` · scenario ${check.scenario}` : '',
    inputs ? ` · inputs ${inputs}` : '',
    baseline,
    prediction,
    check.reason ? ` · ${check.reason}` : '',
  ].join('');
}
