/**
 * Part A step A3: scale expressions in `data/units.json` read through MathTS
 * `readScaleExpression` with UPT's resolver for shared scales and constants.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const unitDataSource = readFileSync(resolve(root, 'src/dimensional/unit-data.ts'), 'utf8');
const stripped = unitDataSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('unit-data.ts reads scale expressions through MathTS (A3)', () => {
  it('imports readScaleExpression from @danielsimonjr/mathts-core', () => {
    expect(stripped).toMatch(/from '@danielsimonjr\/mathts-core'/);
    expect(stripped).toMatch(/\breadScaleExpression\b/);
    expect(stripped).not.toMatch(/readScaleExpression[^;]*from '\.\/exact-scale\.js'/);
  });
});
