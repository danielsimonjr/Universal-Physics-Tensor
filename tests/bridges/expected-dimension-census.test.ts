import { describe, it, expect } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { scanCatalog } from '../../src/bridges/catalog-adapter.js';
import { EXPECTED_DIMENSION_BY_BRIDGE } from '../../src/dimensional/bridge-check.js';

describe('expected dimension census', () => {
  it('every catalog row has an expected dimension', () => {
    const missing = BRIDGE_EQUATIONS.filter((e) => !EXPECTED_DIMENSION_BY_BRIDGE.has(e.id)).map((e) => e.id);
    expect(missing, `rows without a dimension: ${missing.join(', ')}`).toEqual([]);
    expect(EXPECTED_DIMENSION_BY_BRIDGE.size).toBe(BRIDGE_EQUATIONS.length);
  });

  it('the dimension rule skips no catalog row', () => {
    const skipped = scanCatalog(BRIDGE_EQUATIONS).info.filter((d) => d.ruleName === 'dimensional-consistency');
    expect(skipped).toEqual([]);
  });
});
