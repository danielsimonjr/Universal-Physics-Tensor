import { describe, it, expect } from 'vitest';
import {
  ADJUDICATIONS,
  adjudicationFor,
  candidateId,
} from '../../src/composition/adjudication.js';

describe('ADJUDICATIONS registry', () => {
  it('carries the seeded verdicts, including the Förster decoy', () => {
    expect(ADJUDICATIONS.map((a) => a.id)).toContain('foerster-radius~schwarzschild-radius');
    expect(ADJUDICATIONS).toHaveLength(9);
  });
  it('every entry has grounds, a source doc, and a date', () => {
    for (const a of ADJUDICATIONS) {
      expect(a.grounds.length).toBeGreaterThan(10);
      expect(a.source).toMatch(/^docs\/research\/.+\.md$/u);
      expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(a.id).toBe(candidateId(...(a.id.split('~') as [string, string])));
    }
  });
  it('lookup is order-insensitive', () => {
    const c1 = adjudicationFor('mutation-rate', 'decoherence-rate');
    const c2 = adjudicationFor('decoherence-rate', 'mutation-rate');
    expect(c1).toBeDefined();
    expect(c1).toBe(c2);
    expect(c1?.verdict).toBe('decoy');
  });
  it('unknown pairs return undefined', () => {
    expect(adjudicationFor('mass', 'no-such-quantity')).toBeUndefined();
  });
});
