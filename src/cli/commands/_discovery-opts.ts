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
import { CliError, UsageError } from '../errors.js';
import type { DiscoveryOptions } from '../../composition/discovery.js';
import { readNamedAssignments } from '../../numerical/binding-value.js';
import { UnitError } from '../../dimensional/units.js';

export function parseDiscoveryOpts(flags: ParsedArgs['flags']): DiscoveryOptions {
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
  const pending: { name: string; raw: string; pair: string }[] = [];
  for (const x of flags.get('anchor') ?? []) {
    for (const pair of x.split(',')) {
      const eq = pair.indexOf('=');
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      const v = eq >= 0 ? pair.slice(eq + 1) : '';
      if (eq < 0 || !k || v === '') {
        throw new UsageError(`upt: --anchor expects k=v with a finite numeric value, got "${pair}".`);
      }
      pending.push({ name: k, raw: v, pair });
    }
  }
  let rows: ReturnType<typeof readNamedAssignments> = [];
  try {
    rows = pending.length === 0 ? [] : readNamedAssignments(pending);
  } catch (e) {
    if (e instanceof UnitError && /is a temperature/.test(e.message)) {
      const hit = pending.find((p) => e.message.includes(p.name));
      throw new CliError(`upt: --anchor '${hit?.pair ?? ''}' is not a temperature. ${e.message}`);
    }
    const msg = e instanceof Error ? e.message : String(e);
    const hit = pending.find((p) => msg.includes(`'${p.raw.trim()}'`) || msg.includes(`${p.name}=`));
    throw new UsageError(`upt: --anchor expects k=v with a finite numeric value, got "${hit?.pair ?? pending[0]?.pair ?? ''}".`);
  }
  for (const row of rows) {
    if (!Number.isFinite(row.read.value)) {
      const pair = pending.find((p) => p.name === row.name)?.pair ?? `${row.name}=${row.raw}`;
      throw new UsageError(`upt: --anchor expects k=v with a finite numeric value, got "${pair}".`);
    }
    gt[row.name] = row.read.value;
  }
  if (Object.keys(gt).length) opts.groundTruth = gt;

  return opts;
}
