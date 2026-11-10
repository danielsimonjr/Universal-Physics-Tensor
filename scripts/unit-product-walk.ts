/**
 * The exhaustive product walk of the unit grammar, with no time limit.
 *
 * It reads every left factor before every unit (`tests/helpers/unit-product-walk.ts`) and
 * exits 1 when one token reads wrong. `tests/dimensional/unit-grammar.test.ts` runs a seeded
 * sample of the same walk. CI runs this script in the quality job.
 *
 * Usage:
 *   bun scripts/unit-product-walk.ts            the walk
 *   bun scripts/unit-product-walk.ts --control  expects a wrong scale for `Vs`; must exit 1
 *
 * @module scripts/unit-product-walk
 */
import { productWalkTokens, walkProducts } from '../tests/helpers/unit-product-walk.js';

function main(): number {
  const control = process.argv.includes('--control');
  const t0 = performance.now();
  const result = walkProducts(productWalkTokens(), (token, scale) => (control && token === 'Vs' ? scale * 2 : scale));
  const seconds = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`tokens ${result.tokens}; products ${result.products}; ambiguous ${result.ambiguous}; failures ${result.failures.length}; ${seconds} s`);
  for (const failure of result.failures.slice(0, 20)) console.log(`  ${failure}`);
  if (result.failures.length > 0 || result.products === 0 || result.ambiguous === 0) {
    console.log('FAIL');
    return 1;
  }
  console.log('PASS');
  return 0;
}

process.exitCode = main();
