/**
 * M6 agreement harness: the live `segmentations` (MathTS `Unit.readingsWithSource`)
 * against a frozen copy of the local splitter.
 *
 * The frozen copy below is `trySymbol`, `tryOneFactor`, `formatReading`, `attachedUnit`,
 * `prefixRun` and the split loop of `segmentations`, verbatim from
 * `src/dimensional/units.ts` at commit eb8f4bcd (git blob of that file at eb8f4bcd:
 * see FROZEN_BLOB). It reads the live unit tables of `unit-data.ts`.
 *
 * For each token set the script prints the token count and the tokens that differ:
 *   - old ⊆ new: a multi-factor reading of the old splitter that the new one lacks,
 *     compared by label, exact scale, dimension, power and cycle count;
 *   - new ⊆ old: the reverse, for the record (every new field comes from `tryOneFactor`);
 *   - drops: MathTS readings that the new code refuses because a source is unreadable;
 *   - outcomes: a SHA-256 of every `parseUnit('1/<token>')` result or error text.
 * The script exits 1 on any difference in either direction.
 *
 * Usage:
 *   bun scripts/m6-readings-agreement.ts            the gate
 *   bun scripts/m6-readings-agreement.ts --control  injects one wrong label; must exit 1
 *   bun scripts/m6-readings-agreement.ts --timing   parseUnit timing, median of 9 runs
 *
 * @module scripts/m6-readings-agreement
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { Unit } from '@danielsimonjr/mathts-core';
import { multiplyScales, type ExactScale } from '../src/dimensional/exact-scale.js';
import type { Dimension } from '../src/dimensional/types.js';
import { superscriptPower, splitPrefix, UNIT_DATA } from '../src/dimensional/unit-data.js';
import { formatReading, parseUnit, segmentations, type FactorReading } from '../src/dimensional/units.js';

/** The source of the frozen copy. */
export const FROZEN_BLOB = 'src/dimensional/units.ts at eb8f4bcd';

const UNITS = UNIT_DATA.units;

/** The installed core version, for the timing record. */
const CORE_VERSION: string = (createRequire(import.meta.url)('@danielsimonjr/mathts-core/package.json') as { version: string }).version;

// ---- frozen copy, verbatim from eb8f4bcd ----------------------------------

interface SymbolReading {
  readonly scale: ExactScale;
  readonly dim: Dimension;
  readonly cycles: number;
}

function trySymbol(sym: string): SymbolReading | null {
  const exact = UNITS.get(sym);
  if (exact !== undefined) return { scale: exact.scale, dim: exact.dim, cycles: exact.cycles === true ? 1 : 0 };
  const split = splitPrefix(sym);
  if (split === null) return null;
  return { scale: multiplyScales(split.factor, split.row.scale), dim: split.row.dim, cycles: split.row.cycles === true ? 1 : 0 };
}

/** One factor, or null when `token` is not exactly one unit with an optional exponent. */
function tryOneFactor(token: string): FactorReading | null {
  let base = token;
  let exp = 1;
  const caret = /^(.+)\^([+-]?\d+)$/.exec(token);
  if (caret !== null) {
    base = caret[1]!;
    exp = Number(caret[2]);
  } else {
    const sup = superscriptPower(token);
    if (sup !== null) {
      base = sup.base;
      exp = sup.exp;
    } else {
      const glued = /^(.*?)([1-9]\d*)$/.exec(token);
      if (glued !== null && glued[1]!.length > 0 && trySymbol(glued[1]!) !== null) {
        base = glued[1]!;
        exp = Number(glued[2]);
      }
    }
  }
  const parsed = trySymbol(base);
  if (parsed === null || !Number.isFinite(exp)) return null;
  return { base, exp, scale: parsed.scale, dim: parsed.dim, cycles: parsed.cycles };
}

function oldFormatReading(factors: readonly FactorReading[]): string {
  return factors.map((factor) => (factor.exp === 1 ? factor.base : `${factor.base}^${factor.exp}`)).join('·');
}

/** The unprefixed unit a prefix spelling attaches to, or null when `symbol` is exact. */
function attachedUnit(symbol: string): string | null {
  if (UNITS.has(symbol)) return null;
  return splitPrefix(symbol)?.base ?? null;
}

function prefixRun(last: FactorReading, next: FactorReading): boolean {
  return last.base === next.base && attachedUnit(last.base + next.base) === last.base;
}

function oldSegmentations(token: string): FactorReading[][] {
  const ways: FactorReading[][][] = Array.from({ length: token.length + 1 }, () => []);
  ways[0]!.push([]);
  for (let i = 0; i < token.length; i++) {
    if (ways[i]!.length === 0) continue;
    for (let j = i + 1; j <= token.length; j++) {
      const factor = tryOneFactor(token.slice(i, j));
      if (factor === null) continue;
      for (const prev of ways[i]!) {
        if (prev.length > 0 && prefixRun(prev[prev.length - 1]!, factor)) continue;
        ways[j]!.push([...prev, factor]);
      }
    }
  }
  const unique = new Map<string, FactorReading[]>();
  for (const way of ways[token.length]!) unique.set(oldFormatReading(way), way);
  return [...unique.values()];
}

// ---- end of the frozen copy ------------------------------------------------

/** Label, exact scale, dimension, power and cycles of one reading. */
function key(way: readonly FactorReading[], label: string): string {
  const factors = way.map((f) => `${f.exp}:${f.scale.num}/${f.scale.den}:${Object.values(f.dim).join(',')}:${f.cycles}`);
  return `${label}|${factors.join(';')}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYMBOLS = [...UNITS.keys()];
const PREFIX_SPELLINGS = [...UNIT_DATA.prefixes.keys()];

function pairs(): string[] {
  const out: string[] = [];
  for (const a of SYMBOLS) for (const b of SYMBOLS) out.push(a + b);
  return out;
}

function baseSet(): string[] {
  const out = new Set(pairs());
  const rand = mulberry32(20261108);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
  const prefixes = ['', '', '', 'k', 'M', 'G', 'm', 'c', 'u', 'n'];
  const powers = ['', '', '', '2', '3'];
  for (let i = 0; i < 20_000; i++) {
    const n = 1 + Math.floor(rand() * 3);
    let token = '';
    for (let f = 0; f < n; f++) token += pick(prefixes) + pick(SYMBOLS) + pick(powers);
    out.add(token);
  }
  return [...out];
}

function prefixSet(): string[] {
  const out = new Set<string>();
  for (const p of PREFIX_SPELLINGS) for (const pair of pairs()) out.add(p + pair);
  return [...out];
}

function powerSet(): string[] {
  const out = new Set<string>();
  for (const a of SYMBOLS) {
    for (const b of SYMBOLS) {
      for (const t of [`${a}^2${b}`, `${a}²${b}`, `${a}${b}^2`, `${a}${b}²`, `${a}^-1${b}`, `${a}⁻¹${b}`, `${a}³${b}`]) out.add(t);
    }
  }
  return [...out];
}

/** The 35-token edge probe of NOTES.md, 2026-11-09, and the tokens of the M6 pin test. */
const EDGE = [
  'm0K', 'mK0', 'm00K', 'm01K', 'm⁺²K', 'umK', 'mAs', 'm⁺K', 'm⁻K', 'm⁻⁰K', 'm^0K', 'm^+2K', 'm^-0K',
  'm^02K', 'm²⁺K', 'm⁰⁰K', 'm⁰¹K', 'mK⁺²', 'mK⁰', 'm10K', 'm2K3', 'mK10', 'm^2^3K', 'm²³K', 'm2²K',
  'µmK', 'μmK', 'degRm', '°Rm', 'Hzpc', 'mmK', 'mm2K', 'kgm2', 'Nm', 'Pas',
  'Ωm', '°m', 'Åm', 'µm', 'μm', 'm⁺²', 'kWh', 'mm', '℃', 'W℃',
];

function outcome(token: string): string {
  try {
    const p = parseUnit(`1/${token}`);
    return `${p.scale}|${Object.values(p.dim).join(',')}`;
  } catch (error) {
    return `${(error as Error).name}: ${(error as Error).message}`;
  }
}

interface SetResult {
  readonly name: string;
  readonly tokens: number;
  readonly multi: number;
  readonly oldNotInNew: string[];
  readonly newNotInOld: string[];
  readonly drops: number;
  readonly ambiguous: number;
  readonly digest: string;
}

function drops(token: string): number {
  if (typeof Unit.readingsWithSource !== 'function') return 0;
  let n = 0;
  for (const reading of Unit.readingsWithSource(token)) {
    if (reading.length < 2) continue;
    if (reading.some((f) => f.source === '' || tryOneFactor(f.source) === null)) n++;
  }
  return n;
}

function runSet(name: string, tokens: readonly string[], control: boolean): SetResult {
  const oldNotInNew: string[] = [];
  const newNotInOld: string[] = [];
  const hash = createHash('sha256');
  let multi = 0;
  let dropCount = 0;
  let ambiguous = 0;
  let injected = !control;
  for (const token of tokens) {
    const oldKeys = new Set(oldSegmentations(token).filter((w) => w.length > 1).map((w) => key(w, oldFormatReading(w))));
    const newWays = segmentations(token).filter((w) => w.length > 1);
    const newKeys = new Set(newWays.map((w) => key(w, formatReading(w))));
    if (!injected && newWays.length > 0) {
      newKeys.delete(key(newWays[0]!, formatReading(newWays[0]!)));
      newKeys.add(key(newWays[0]!, `${formatReading(newWays[0]!)}-control`));
      injected = true;
    }
    multi += oldKeys.size;
    if ([...oldKeys].some((k) => !newKeys.has(k))) oldNotInNew.push(token);
    if ([...newKeys].some((k) => !oldKeys.has(k))) newNotInOld.push(token);
    dropCount += drops(token);
    const o = outcome(token);
    if (o.startsWith('AmbiguousUnitError')) ambiguous++;
    hash.update(`${token}\u0000${o}\u0001`);
  }
  return { name, tokens: tokens.length, multi, oldNotInNew, newNotInOld, drops: dropCount, ambiguous, digest: hash.digest('hex').slice(0, 16) };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function timeRuns(work: () => void): number[] {
  const runs: number[] = [];
  for (let r = 0; r < 9; r++) {
    const t0 = performance.now();
    work();
    runs.push(performance.now() - t0);
  }
  return runs;
}

function timing(): void {
  const tokens = baseSet();
  const show = (runs: number[]): string => `median of 9 = ${median(runs).toFixed(0)} ms; runs ${runs.map((x) => x.toFixed(0)).join(' ')}`;
  console.log(`core ${CORE_VERSION}; base set, ${tokens.length} tokens`);
  console.log(`parseUnit('1/<token>'): ${show(timeRuns(() => tokens.forEach(outcome)))}`);
  console.log(`frozen splitter: ${show(timeRuns(() => tokens.forEach(oldSegmentations)))}`);
  console.log(`live segmentations: ${show(timeRuns(() => tokens.forEach(segmentations)))}`);
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.includes('--timing')) {
    timing();
    return 0;
  }
  const control = args.includes('--control');
  const sets: Array<[string, string[]]> = [
    ['base', baseSet()],
    ['prefixes', prefixSet()],
    ['powers', powerSet()],
    ['edge', EDGE],
  ];
  let failed = false;
  console.log(`core ${CORE_VERSION}; symbols ${SYMBOLS.length}, prefix spellings ${PREFIX_SPELLINGS.length}; ${FROZEN_BLOB}`);
  console.log('set | tokens | old multi-factor readings | old not in new | new not in old | MathTS drops | ambiguous | outcome digest');
  for (const [name, tokens] of sets) {
    const r = runSet(name, tokens, control && name === 'edge');
    console.log(`${r.name} | ${r.tokens} | ${r.multi} | ${r.oldNotInNew.length} | ${r.newNotInOld.length} | ${r.drops} | ${r.ambiguous} | ${r.digest}`);
    for (const t of [...r.oldNotInNew, ...r.newNotInOld].slice(0, 20)) console.log(`  differs: ${t}`);
    if (r.oldNotInNew.length > 0 || r.newNotInOld.length > 0) failed = true;
  }
  console.log(failed ? 'FAIL: the readings differ' : 'PASS: 0 differences in both directions');
  return failed ? 1 : 0;
}

process.exitCode = main();
