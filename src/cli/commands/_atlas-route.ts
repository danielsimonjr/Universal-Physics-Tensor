/**
 * The atlas route between two models, and what composing it yields — shared by
 * `upt path` and `upt map --route` so the two cannot report different routes or
 * different refusals for the same pair.
 */
import type { CommandCtx } from '../command.js';
import { CliError } from '../errors.js';
import type { AppliedTransport, AtlasBridge } from '../../cli-api.js';
import { publishedUrl } from '../published-url.js';

/** What composing an atlas route yields: `boundPath`'s claim or refusal, or a refusal for a missing Lipschitz constant. */
export type RouteClaim =
  | ReturnType<CommandCtx['api']['boundPath']>
  | { kind: 'no-claim'; reason: 'missing-lipschitz'; detail: string };

/**
 * The shortest route from `from` to `to`, or `null` when none connects them.
 * Endpoints in one family are searched in that family first, so a route that
 * exists inside it is the one reported. Endpoints in different families, or a
 * same-family pair with no route inside it, are searched across the whole
 * atlas: a family is a filing label, and a bridge such as ab-kg-schrodinger
 * (waves → diffusion) is as qualified as any other.
 */
export function selectRoute(
  api: CommandCtx['api'],
  from: string,
  to: string,
  command: string,
): { bridges: readonly AtlasBridge[] | null; fromFamily: string | undefined; toFamily: string | undefined } {
  const familyOf = (id: string): string | undefined =>
    api.ATLAS_FAMILIES.find((f) => f.models.some((m) => m.id === id))?.family;
  const fromFamily = familyOf(from);
  const toFamily = familyOf(to);
  if (fromFamily === undefined || toFamily === undefined) {
    const missing = [
      ...(fromFamily === undefined ? [from] : []),
      ...(toFamily === undefined ? [to] : []),
    ];
    throw new CliError(
      `upt ${command}: unknown model ${missing.map((id) => `'${id}'`).join(' and ')}; \`upt atlas\` lists the models`,
    );
  }
  let bridges: readonly AtlasBridge[] | null;
  try {
    bridges = fromFamily === toFamily ? api.findPath(fromFamily, from, to) : null;
    bridges ??= api.findAtlasPath(from, to);
  } catch (e) {
    // RangeError: an unknown endpoint. Reported as a CliError (exit 1) rather
    // than surfaced as a crash — and NOT as `null`, which would be
    // indistinguishable from a genuinely disconnected pair.
    throw new CliError(`upt ${command}: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { bridges, fromFamily, toFamily };
}

/**
 * What a non-empty route supports. boundPath throws, rather than inventing a
 * constant, when a step with no Lipschitz constant is followed by another
 * (ab-kg-oscillator then ab-spring-lc); that is a refusal like any other.
 */
export function routeClaim(api: CommandCtx['api'], bridges: readonly AtlasBridge[]): RouteClaim {
  try {
    return api.boundPath(bridges);
  } catch (e) {
    if (!(e instanceof api.MissingLipschitzError)) throw e;
    const unbounded = bridges.slice(0, -1).find((b) => b.bound === undefined && b.relation !== 'exact-equivalence');
    return {
      kind: 'no-claim',
      reason: 'missing-lipschitz',
      detail:
        `'${unbounded?.id ?? '?'}' (${unbounded?.relation ?? '?'}) states no Lipschitz constant and is not the ` +
        'last step, so the error after it is unbounded and the path carries no bound',
    };
  }
}

/**
 * What a refused route lacks, stated as requirements rather than supplied. For
 * a `no-composite-claim`, the first silent table cell is named. Then, for that
 * refusal and for `norm-not-stated`: every exact map after a bound that declares
 * no transport of the bound's norm for the direction the route crosses it
 * (docs/planning/ADR-transported-norm-composition.md), and every exact map
 * before a bound, which would have to state how its mapping acts on that later
 * bound's norm (the exact-then-approximation cell stays silent, ADR §3).
 * Nothing here widens the table or declares a transport.
 */
export function missingForComposite(api: CommandCtx['api'], bridges: readonly AtlasBridge[]): string[] {
  const missing: string[] = [];
  let relation: AtlasBridge['relation'] = bridges[0]!.relation;
  for (let i = 1; i < bridges.length; i++) {
    const next = bridges[i]!;
    const composed = api.composeRelation(relation, next.relation);
    if (composed === 'no-composite-claim') {
      missing.push(
        `a composition-table cell for ${relation} then ${next.relation} (silent by design; widening it is a ` +
          `reviewed act, ${publishedUrl('docs/planning/Atlas-Phase-1-Design.md')} §2.2)`,
      );
      break;
    }
    relation = composed;
  }
  const entries = api.routeEntryModels(bridges);
  let norm: string | undefined;
  bridges.forEach((b, i) => {
    if (b.bound !== undefined) {
      norm = b.bound.norm;
      return;
    }
    if (b.relation !== 'exact-equivalence' || norm === undefined) return;
    const entry = entries[i] ?? null;
    const exit = entry === b.conclusion ? (b.premises[0] ?? null) : entry === b.premises[0] ? b.conclusion : null;
    const nt = (b.normTransports ?? []).find(
      (x) => x.from === norm && x.fromModel === entry && x.toModel === exit && x.timeMap.uniform,
    );
    if (nt !== undefined) {
      norm = nt.to;
      return;
    }
    missing.push(
      `'${b.id}' to declare a norm transport of '${norm}' for ${entry ?? '?'} → ${exit ?? '?'}, with its own ` +
        `witness (${publishedUrl('docs/planning/ADR-transported-norm-composition.md')}); an exact map carries no norm without one`,
    );
  });
  for (let i = 0; i < bridges.length; i++) {
    const b = bridges[i]!;
    if (b.relation !== 'exact-equivalence' || b.bound !== undefined) continue;
    const later = bridges.slice(i + 1).find((x) => x.bound !== undefined);
    if (later === undefined) continue;
    missing.push(
      `'${b.id}' to state how its mapping acts on '${later.bound!.norm}', the norm of the later bound on ` +
        `'${later.id}' (it states no norm)`,
    );
  }
  return missing;
}

/** The refusals {@link missingForComposite} explains. */
export function explainsRefusal(claim: RouteClaim): boolean {
  return claim.kind === 'no-claim' && (claim.reason === 'no-composite-claim' || claim.reason === 'norm-not-stated');
}

/** The declarative fields of an applied norm transport, as a JSON envelope carries them (no functions). */
export function transportReport(a: AppliedTransport) {
  const nt = a.transport;
  return {
    index: a.index,
    bridgeId: a.bridgeId,
    id: nt.id,
    fromModel: nt.fromModel,
    toModel: nt.toModel,
    from: nt.from,
    to: nt.to,
    K: nt.K,
    domain: nt.domain,
    derivation: nt.derivation,
    timeMap: { map: nt.timeMap.map, uniform: nt.timeMap.uniform, horizon: nt.timeMap.horizon },
    uniformity: nt.uniformity,
    witness: { id: nt.witness.id, kind: nt.witness.kind, test: nt.witness.test, tolerance: nt.witness.tolerance },
    basis: nt.basis,
  };
}

/** The JSON form of an applied norm transport, as {@link transportReport} builds it. */
export type TransportReport = ReturnType<typeof transportReport>;

/** A route claim with its transports reduced to their declarative fields, so it serializes as data. */
export function claimReport(claim: RouteClaim) {
  if (claim.kind !== 'bound' || claim.transports === undefined) return claim;
  const { transports, ...rest } = claim;
  return { ...rest, transports: transports.map(transportReport) };
}