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

export function parseDiscoveryOpts(api: CommandCtx['api'], flags: ParsedArgs['flags']): DiscoveryOptions {
  const opts: { maxOrdersOfMagnitude?: number; groundTruth?: Record<string, number> } = {};

  const moValues = flags.get('max-orders');
  if (moValues && moValues.length > 0) {
    const raw = moValues[moValues.length - 1];
    const n = Number(raw);
    // Reject rather than silently ignore: an empty value coerces to 0 (every
    // pair would clash), a non-numeric one to NaN, and a negative threshold is
    // meaningless.
    if (raw === '' || !Number.isFinite(n) || n < 0) {
      throw new UsageError(`upt: --max-orders must be a non-negative finite number, got "${raw}".`);
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
  const siblings = pairs.map((p) => ({ name: p.name, raw: p.raw }));
  const rawValues: Record<string, number> = {};
  for (const p of pairs) {
    try {
      const read = api.readNamedBinding(p.name, p.raw, { siblings });
      if (!Number.isFinite(read.value)) {
        throw new UsageError(`upt: --anchor expects k=v with a finite numeric value, got "${p.pair}".`);
      }
      rawValues[p.name] = read.value;
    } catch (e) {
      if (e instanceof UsageError) throw e;
      if (e instanceof api.TemperatureBindingError) {
        throw new CliError(`upt: --anchor '${p.pair}' is not a temperature. ${e.message}`);
      }
      throw new UsageError(`upt: --anchor expects k=v with a finite numeric value, got "${p.pair}".`);
    }
  }
  try {
    api.assertSynonymAgreement(rawValues);
  } catch (e) {
    if (e instanceof api.SynonymDisagreementError) throw new CliError(`upt: ${e.message}`);
    throw e;
  }
  const quantityNames = new Set(
    [...api.CATALOG_GRAPH, ...api.CANONICAL_GRAPH].flatMap((edge) => [edge.target.name, ...edge.sources.map((s) => s.name)]),
  );
  for (const [name, value] of Object.entries(rawValues)) {
    const key = api.resolveQuantityName(name, quantityNames) ?? name;
    gt[key] = value;
  }
  if (Object.keys(gt).length) opts.groundTruth = gt;

  return opts;
}
