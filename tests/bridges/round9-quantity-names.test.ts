/**
 * Issues 533 and 552: the round-9 rows (`be-147` to `be-170`) published their
 * quantities as glued slugs (`sahamass`, `prandtlmu`). Each parameter line
 * printed the caller's key as the symbol (`mu_Pa_s [Pa*s] prandtlmu mu_Pa_s`).
 *
 * The rows before the round-9 rows use kebab-case ids (`damping-dashpot`,
 * `coax-inner`) and the mathematical symbol (`c`, `a`). The round-9 ids are
 * kebab-case now. Each old spelling is an alias of its row. A parameter symbol
 * is the registry symbol of its quantity.
 */
import { describe, expect, it } from 'vitest';
import { bridgeCatalog } from '../../src/bridges/catalog-load.js';
import { quantityRecord } from '../../src/dimensional/quantity-registry.js';
import { quantityIdForSpelling, synonymGroup } from '../../src/dimensional/formula-names.js';

const ROUND_9 = (id: number): boolean => id >= 147 && id <= 170;
const catalog = bridgeCatalog();
const relations = catalog.relations.filter((r) => ROUND_9(r.catalogId));
const evaluators = catalog.evaluators.filter((e) => ROUND_9(e.catalogId));

describe('round-9 quantity ids are kebab-case (issues 533 and 552)', () => {
  it('CONTROL: the scan sees the round-9 rows', () => {
    expect(relations.length).toBe(24);
    expect(evaluators.length).toBeGreaterThan(20);
  });

  it('every target and source of be-147 to be-170 is a hyphenated id', () => {
    const glued = relations.flatMap((r) => [r.target, ...r.sources]).filter((name) => !name.includes('-'));
    expect(glued).toEqual([]);
  });

  it('every parameter symbol is its quantity symbol, not the caller key', () => {
    const wrong = evaluators.flatMap((e) =>
      e.parameters
        .filter((p) => p.symbol !== quantityRecord(p.quantity)?.symbol)
        .map((p) => `be-${e.catalogId} ${p.key}: ${p.symbol}`),
    );
    expect(wrong).toEqual([]);
  });

  it('an old spelling still resolves, as an alias of the renamed row', () => {
    expect(quantityIdForSpelling('saha-mass')).toBe('saha-mass');
    expect(synonymGroup('sahamass')).toContain('saha-mass');
    expect(synonymGroup('prandtlmu')).toContain('prandtl-mu');
    expect(synonymGroup('arrhbarrier')).toContain('arrhenius-barrier');
    expect(synonymGroup('newtontheta0')).toContain('newton-theta-0');
  });
});
