/**
 * The atlas route between two models, and what composing it yields — shared by
 * `upt path` and `upt map --route` so the two cannot report different routes or
 * different refusals for the same pair.
 */
import type { CommandCtx } from '../command.js';
import { CliError } from '../errors.js';
import type { AtlasBridge } from '../../cli-api.js';

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
  const family = fromFamily ?? toFamily ?? api.ATLAS_FAMILIES[0]!.family;
  let bridges: readonly AtlasBridge[] | null;
  try {
    if (fromFamily !== undefined && toFamily !== undefined) {
      bridges = fromFamily === toFamily ? api.findPath(family, from, to) : null;
      bridges ??= api.findAtlasPath(from, to);
    } else {
      bridges = api.findPath(family, from, to);
    }
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
 * What a `no-composite-claim` path lacks, stated as requirements rather than
 * supplied. The first silent table cell is named; then every exact map after a
 * bound, which states no norm and so records nothing about carrying that
 * bound's quantity through its mapping; then every exact map before a bound,
 * which would have to state how its mapping acts on that later bound's norm.
 * Nothing here widens the table.
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
          'reviewed act, docs/planning/Atlas-Phase-1-Design.md §2.2)',
      );
      break;
    }
    relation = composed;
  }
  let norm: string | undefined;
  for (const b of bridges) {
    if (b.bound !== undefined) norm = b.bound.norm;
    else if (b.relation === 'exact-equivalence' && norm !== undefined) {
      missing.push(`'${b.id}' to state that it carries '${norm}' through its mapping (it states no norm)`);
    }
  }
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
