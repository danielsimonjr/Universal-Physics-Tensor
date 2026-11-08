/**
 * MathTS leverage plan task U7: the simplifier is a static import of the
 * required `@danielsimonjr/mathts-functions`, not an optional-peer loader.
 * `isSimplifierAvailable` stays and returns true. A simplify that fails its
 * cancellation smoke is a defect of the dependency and throws; it is not read
 * as an absent peer.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isSimplifierAvailable, simplifyExpr } from '../../src/composition/expr-simplify.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string): string => readFileSync(join(here, '../../src', p), 'utf8');

const sym = (name: string): ExprNode => ({ kind: 'symbol', name, dim: { ...DIMENSIONLESS } });

describe('expr-simplify reads MathTS through a static import (U7)', () => {
  it('has no dynamic import and no async console window', () => {
    const s = read('composition/expr-simplify.ts');
    expect(s).not.toMatch(/await import\(/);
    expect(s).toMatch(/^import \{[^}]*\bsimplify\b[^}]*\} from '@danielsimonjr\/mathts-functions';$/m);
    expect(s).not.toMatch(/\bquietly\(/);
    expect(read('composition/mathts-quiet.ts')).not.toMatch(/export async function quietly\b/);
  });

  it('reports the simplifier present and cancels a shared leaf', async () => {
    expect(await isSimplifierAvailable()).toBe(true);
    const product: ExprNode = { kind: 'op', op: '*', args: [sym('g0'), { kind: 'op', op: '/', args: [sym('g1'), sym('g0')] }] };
    const r = await simplifyExpr(product);
    expect(r.simplified).toBe(true);
    expect(r.expr).toEqual(sym('g1'));
  });
});
