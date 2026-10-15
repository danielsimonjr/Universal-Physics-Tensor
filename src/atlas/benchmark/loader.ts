/**
 * Atlas Phase 5, S5.1 — load and validate benchmark items.
 *
 * Design note: `docs/planning/Atlas-Phase-5-Design.md` §0, §2.
 *
 * This module reads the PUBLIC half of a benchmark directory and nothing else.
 * The answers live in a sibling half that no `src/` file may read;
 * `tests/atlas/benchmark.test.ts` holds the import guard, with a positive
 * control proving the guard can fire.
 *
 * **The loader enforces the one part of the independence rule that code CAN
 * enforce: a frozen item whose `authorship` is not `'independent'` is refused.**
 * Whether the author really was independent is a fact about people, recorded in
 * the pre-registration note and checked by review.
 *
 * @module atlas/benchmark/loader
 * @internal
 */

import { readJsonFile } from '../../core/data-file.js';
import { join } from 'node:path';
import { HELD_OUT_FAMILY } from './types.js';
import type { BenchmarkItem } from './types.js';

/** One reason an item set is not admissible. @internal */
export interface ItemProblem {
  readonly id: string;
  readonly problem: string;
}

/**
 * Validate an item set against the schema and the rules that make it a benchmark.
 *
 * @param items - the items, as parsed.
 * @param frozen - true for the frozen set (authorship must be `'independent'`),
 * false for the contested staging area (authorship must be `'contested-draft'`).
 * @returns every problem found; empty means admissible. Never throws, so a
 * caller sees ALL problems at once rather than the first.
 * @internal
 */
export function validateItems(items: readonly BenchmarkItem[], frozen: boolean): ItemProblem[] {
  const problems: ItemProblem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const p = (problem: string): void => {
      problems.push({ id: item.id, problem });
    };
    if (seen.has(item.id)) p('duplicate id');
    seen.add(item.id);

    const wanted = frozen ? 'independent' : 'contested-draft';
    if (item.authorship !== wanted) {
      p(`authorship '${item.authorship}' where the ${frozen ? 'frozen' : 'contested'} set requires '${wanted}'`);
    }
    // The answer lives in the scorer half. A public item that carries it would
    // hand the key to any condition that reads the public file.
    if ('kind' in item || 'failureKind' in item) {
      p('the public half carries the answer (kind/failureKind); it belongs in scorer/labels.json');
    }
    if ((item.family === HELD_OUT_FAMILY) !== (item.split === 'held-out')) {
      p(`the held-out split is exactly the '${HELD_OUT_FAMILY}' family; got family '${item.family}' in split '${item.split}'`);
    }
    if (item.premises.length === 0) p('no premises');
    if (item.source.trim() === '') p('no source');
  }
  return problems;
}

/** Thrown when a benchmark directory holds an inadmissible item set. @internal */
export class BenchmarkAdmissionError extends Error {
  constructor(readonly problems: readonly ItemProblem[]) {
    super(
      `benchmark items are not admissible: ${problems
        .map((p) => `${p.id}: ${p.problem}`)
        .join('; ')}`,
    );
  }
}

function readItems(file: string): BenchmarkItem[] {
  const parsed = readJsonFile(file);
  if (!Array.isArray(parsed)) throw new Error(`${file}: expected a JSON array of items`);
  return parsed as BenchmarkItem[];
}

/**
 * Load the FROZEN items from `<benchmarkDir>/public/items.json`.
 *
 * @throws BenchmarkAdmissionError when any item is inadmissible — a frozen set
 * with one contested draft in it is not a smaller benchmark, it is a broken one.
 * @internal
 */
export function loadFrozenItems(benchmarkDir: string): BenchmarkItem[] {
  const items = readItems(join(benchmarkDir, 'public', 'items.json'));
  const problems = validateItems(items, true);
  if (problems.length > 0) throw new BenchmarkAdmissionError(problems);
  return items;
}

/**
 * Load the CONTESTED drafts from `<benchmarkDir>/contested/items.json`. These are
 * never scored; they wait for an independent author to accept or rewrite them.
 *
 * @internal
 */
export function loadContestedDrafts(benchmarkDir: string): BenchmarkItem[] {
  const items = readItems(join(benchmarkDir, 'contested', 'items.json'));
  const problems = validateItems(items, false);
  if (problems.length > 0) throw new BenchmarkAdmissionError(problems);
  return items;
}
