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
import type { DiscoveryOptions } from '../../composition/discovery.js';
import type { Dimension } from '../../dimensional/types.js';

export function parseDiscoveryOpts(api: CommandCtx['api'], flags: ParsedArgs['flags']): DiscoveryOptions {
  const opts: { maxOrdersOfMagnitude?: number; groundTruth?: Record<string, number> } = {};

  const moValues = flags.get('max-orders');
  if (moValues && moValues.length > 0) {
    const raw = moValues[moValues.length - 1];
    const n = Number(raw);
    // Reject rather than silently ignore: an empty value coerces to 0 (every
    // pair would clash), a non-numeric one to NaN, and a negative threshold is
    // meaningless. The flag is well formed and its value is bad: exit 1, as for any bad value.
    if (raw === '' || !Number.isFinite(n) || n < 0) {
      throw new CliError(`upt: --max-orders must be a non-negative finite number, got "${raw}".`);
    }
    opts.maxOrdersOfMagnitude = n;
  }

  const gt: Record<string, number> = {};
  const pairs: { name: string; raw: string; pair: string }[] = [];
  for (const x of flags.get('anchor') ?? []) {
    for (const pair of x.split(',')) {
      const eq = pair.indexOf('=');
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      const v = eq >= 0 ? pair.slice(eq + 1) : '';
      if (eq < 0 || !k || v === '') {
        throw new UsageError(`upt: --anchor expects k=v with a finite numeric value, got "${pair}".`);
      }
      pairs.push({ name: k, raw: v, pair });
    }
  }
  const seenAnchor = new Set<string>();
  for (const p of pairs) {
    if (seenAnchor.has(p.name)) throw new CliError(`upt: --anchor '${p.name}' is given twice ('${p.pair}'); give one value per name`);
    seenAnchor.add(p.name);
  }
  const siblings = pairs.map((p) => ({ name: p.name, raw: p.raw }));
  // Every quantity either graph names, with its dimension: an anchor is a value of one of them.
  const quantities = new Map<string, Dimension>();
  for (const edge of [...api.CATALOG_GRAPH, ...api.CANONICAL_GRAPH]) {
    for (const q of [edge.target, ...edge.sources]) quantities.set(q.name, q.dim);
  }
  const quantityNames = new Set(quantities.keys());
  const rawValues: Record<string, number> = {};
  for (const p of pairs) {
    const resolved = api.resolveQuantityName(p.name, quantityNames);
    const dim = resolved === null ? undefined : quantities.get(resolved);
    if (resolved === null || dim === undefined) {
      // An anchor on a name no graph holds would be read, printed as the anchor, and change nothing.
      throw new CliError(`upt: --anchor '${p.pair}': '${p.name}' is not a quantity in either graph (\`upt search ${p.name}\` looks for one)`);
    }
    try {
      const read = api.readNamedBinding(p.name, p.raw, { siblings });
      if (!Number.isFinite(read.value)) {
        throw new CliError(`upt: --anchor expects k=v with a finite numeric value, got "${p.pair}".`);
      }
      // A bare number is already in SI. A value with a unit must be the quantity's dimension:
      // `mass=1s` is not a mass of 1 kg.
      if (read.dimensioned && !api.dimensionsEqual(read.dimension, dim)) {
        throw new CliError(
          `upt: --anchor '${p.pair}' is ${api.format(read.dimension)}, but ${resolved} is ${api.format(dim)}`,
        );
      }
      rawValues[p.name] = read.value;
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
  try {
    api.assertSynonymAgreement(rawValues);
  } catch (e) {
    if (e instanceof api.SynonymDisagreementError) throw new CliError(`upt: ${e.message}`);
    throw e;
  }
  for (const [name, value] of Object.entries(rawValues)) {
    const key = api.resolveQuantityName(name, quantityNames) ?? name;
    gt[key] = value;
  }
  if (Object.keys(gt).length) opts.groundTruth = gt;

  return opts;
}
