/**
 * JSON output envelope for the UPT CLI.
 *
 * Physics results genuinely contain non-finite numbers (e.g. `anchoring:
 * Infinity` in the priority board). `JSON.stringify` silently turns those
 * into `null`, which is indistinguishable from an absent value. `sanitize`
 * deep-copies a value into a JSON-safe shape first, encoding NaN/Infinity
 * as explicit strings so round-tripping through JSON preserves them.
 */

import { definitionsFor } from './statuses.js';
import type { AnchorScope } from './graphs.js';

/** The shape of every `--json` output: the command, what it read, and its result. */
export interface JsonEnvelope {
  command: string;
  /**
   * The graph a command read. `'atlas'` is `upt map --route` / `--family`,
   * which read the atlas families rather than an equation graph.
   */
  source?: 'catalog' | 'canonical' | 'both' | 'atlas';
  /** What the result is anchored to (audit I3): the discovery ground truth, the established core, or both. */
  anchor?: AnchorScope;
  options?: Record<string, unknown>;
  epistemics?: string;
  /** `upt confront` — count of confrontations by rigor tier (stringent/moderate/loose). */
  rigorDistribution?: Record<string, number>;
  /** `upt confront` — count of confrontations by statistical object (σ-test, limit, consistency ratio, table). */
  statisticDistribution?: Record<string, number>;
  /** `upt confront` — preprocessing and independence counts, recorded vs not recorded, each counted apart. */
  dataHandlingDistribution?: Record<string, Record<string, number>>;
  /**
   * The meaning of each status the command can emit, from STATUS_GLOSSARY (audit I13). `emitJson`
   * fills it in; a command never sets it.
   */
  definitions?: Record<string, string>;
  result: unknown;
  /**
   * `upt recover` — two-edge symbolic chains examined against the canonical
   * registry, and the structural matches. A chain is never restates-canonical.
   */
  compositionRecovery?: unknown;
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
  const definitions = definitionsFor(env.command);
  const { result, ...head } = env;
  const full = Object.keys(definitions).length > 0 ? { ...head, definitions, result } : env;
  write(JSON.stringify(sanitize(full), null, 2) + '\n');
}
