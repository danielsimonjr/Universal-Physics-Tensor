/**
 * JSON output envelope for the UPT CLI.
 *
 * Physics results genuinely contain non-finite numbers (e.g. `anchoring:
 * Infinity` in the priority board). `JSON.stringify` silently turns those
 * into `null`, which is indistinguishable from an absent value. `sanitize`
 * deep-copies a value into a JSON-safe shape first, encoding NaN/Infinity
 * as explicit strings so round-tripping through JSON preserves them.
 */

export interface JsonEnvelope {
  command: string;
  /**
   * The graph a command read. `'poster'` is `upt map --source=poster` only —
   * the Atlas Phase 3 poster index, which is not a `BridgeEdge` graph and is
   * therefore not a value `resolveGraph` (or any other command) accepts.
   */
  source?: 'catalog' | 'canonical' | 'both' | 'poster';
  options?: Record<string, unknown>;
  epistemics?: string;
  /** `upt confront` — count of confrontations by rigor tier (stringent/moderate/loose). */
  rigorDistribution?: Record<string, number>;
  /** `upt confront` — count of confrontations by statistical object (σ-test, limit, consistency ratio, table). */
  statisticDistribution?: Record<string, number>;
  result: unknown;
}

export function sanitize(v: unknown): unknown {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return 'NaN';
    if (v === Infinity) return 'Infinity';
    if (v === -Infinity) return '-Infinity';
    return v;
  }

  if (typeof v === 'function') {
    // Caller decides how to represent "no value here" (omit vs. null) based
    // on context (object key vs. array slot); signal via undefined and let
    // the array/object branches below handle it.
    return undefined;
  }

  if (Array.isArray(v)) {
    const out: unknown[] = [];
    for (const item of v) {
      const sanitized = sanitize(item);
      out.push(typeof item === 'function' ? null : sanitized);
    }
    return out;
  }

  if (v instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of v) {
      if (typeof value === 'function') continue;
      out[String(key)] = sanitize(value);
    }
    return out;
  }

  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(v)) {
      if (value === undefined || typeof value === 'function') continue;
      out[key] = sanitize(value);
    }
    return out;
  }

  return v;
}

export function emitJson(env: JsonEnvelope, write: (s: string) => void = (s) => process.stdout.write(s)): void {
  write(JSON.stringify(sanitize(env), null, 2) + '\n');
}
