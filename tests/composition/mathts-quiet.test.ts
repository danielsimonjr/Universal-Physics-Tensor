/**
 * The MathTS console silencer is one helper, used only around the peer's
 * one-time load, and never around a per-call parse or simplify.
 *
 * MathTS writes to `console.warn`/`console.error` directly and has no option
 * to silence it, so the only mechanism is to replace the process-global sinks.
 * That mechanism is process-wide, so a concurrent caller loses its console for
 * the window (9.0.0 audit §1). The window is therefore confined to the load:
 * this file scans `src/` for any other reassignment, traps the sinks during a
 * call after the peer is loaded, and checks the helper restores on a throw.
 *
 * @module tests/composition/mathts-quiet
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { quietly, quietlySync } from '../../src/composition/mathts-quiet.js';
import { scalarSymbolsFromMathTs } from '../../src/composition/mathts-scalar-symbols.js';
import { isSimplifierAvailable, simplifyExpr } from '../../src/composition/expr-simplify.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
const OWNER = 'composition/mathts-quiet.ts';

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts')) yield p;
  }
}

/** A reassignment of a console sink or of stderr's write. */
const REASSIGNMENT = /console\.(?:warn|error)\s*=[^=]|\.write\s*=[^=]|stderr as \{ write/;

const sym = (name: string): ExprNode => ({ kind: 'symbol', name, dim: { ...DIMENSIONLESS } });
const product: ExprNode = { kind: 'op', op: '*', args: [sym('g0'), { kind: 'op', op: '/', args: [sym('g1'), sym('g0')] }] };

/** Trap the three sinks with setters that record any assignment while `fn` runs. */
async function assignmentsDuring(fn: () => Promise<unknown> | unknown): Promise<string[]> {
  const hits: string[] = [];
  const trap = (target: object, key: string): (() => void) => {
    const original = Object.getOwnPropertyDescriptor(target, key);
    let current = (target as Record<string, unknown>)[key];
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get: () => current,
      set: (v: unknown) => {
        hits.push(key);
        current = v;
      },
    });
    return () => {
      if (original) Object.defineProperty(target, key, original);
      else delete (target as Record<string, unknown>)[key];
    };
  };
  const untraps = [trap(console, 'warn'), trap(console, 'error'), trap(process.stderr, 'write')];
  try {
    await fn();
  } finally {
    for (const untrap of untraps) untrap();
  }
  return hits;
}

describe('the MathTS console silencer', () => {
  it('is reassigned in exactly one file under src/', () => {
    const offenders: string[] = [];
    for (const file of walk(src)) {
      const rel = relative(src, file).replace(/\\/g, '/');
      if (rel === OWNER) continue;
      const text = readFileSync(file, 'utf8');
      if (REASSIGNMENT.test(text)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
    // The scan can find a reassignment: the owner itself has one.
    expect(REASSIGNMENT.test(readFileSync(join(src, OWNER), 'utf8'))).toBe(true);
  });

  it('restores the sinks after a return and after a throw', async () => {
    const before = { warn: console.warn, error: console.error, write: process.stderr.write };
    expect(quietlySync(() => 7)).toBe(7);
    expect(() => quietlySync(() => { throw new RangeError('inside'); })).toThrow(RangeError);
    await expect(quietly(async () => { throw new RangeError('inside'); })).rejects.toThrow(RangeError);
    expect(console.warn).toBe(before.warn);
    expect(console.error).toBe(before.error);
    expect(process.stderr.write).toBe(before.write);
  });

  it('a parse and a simplify after the peer is loaded do not touch the sinks (the window is the load only)', async () => {
    // Load first, outside the trap: the one-time window is allowed there.
    scalarSymbolsFromMathTs(product);
    if (!(await isSimplifierAvailable())) return;
    await simplifyExpr(product);
    const hits = await assignmentsDuring(async () => {
      scalarSymbolsFromMathTs(product);
      await simplifyExpr(product);
    });
    expect(hits).toEqual([]);
  });

  it('control: the trap sees a reassignment the helper makes', async () => {
    const hits = await assignmentsDuring(() => quietlySync(() => 0));
    expect(hits).toEqual(['warn', 'error', 'write', 'warn', 'error', 'write']);
  });
});
