/**
 * `regimeHolds` says how many inequalities it evaluated, so a regime with no
 * inequality (the plasma, piezoelectricity and Tolman registrations) cannot be
 * read as "checked and held": `ok: true` with `checked: 0` is a vacuous pass,
 * a different fact from a pass over a non-empty list (9.0.0 audit §4 Low;
 * AGENTS law 4).
 *
 * @module tests/relations/regime-holds
 */
import { describe, expect, it } from 'vitest';
import '../../src/relations/domain-regimes.js';
import { domainRegimeRegistrations } from '../../src/relations/regime-registration.js';
import { regimeHolds } from '../../src/relations/regime.js';
import type { Regime } from '../../src/relations/types.js';

const regime = (groups: readonly string[]): Regime => ({
  family: 'test',
  inequalities: groups.map((group) => ({ group, op: '<', bound: 1 })),
  groupDefinitions: {},
});

describe('regimeHolds reports what it checked', () => {
  it('an empty inequality list is a vacuous pass: ok true, checked 0', () => {
    expect(regimeHolds(regime([]), {})).toMatchObject({ ok: true, checked: 0, violated: [], unchecked: [] });
  });

  it('checked counts the inequalities a finite value reached; an unmeasured group is unchecked, not checked', () => {
    expect(regimeHolds(regime(['a', 'b']), { a: 0.5, b: 0.5 })).toMatchObject({ ok: true, checked: 2 });
    expect(regimeHolds(regime(['a', 'b']), { a: 0.5 })).toMatchObject({ ok: 'unknown', checked: 1 });
    expect(regimeHolds(regime(['a', 'b']), { a: 2, b: Number.NaN })).toMatchObject({ ok: false, checked: 1 });
  });

  it('every registered domain regime with no inequality is a vacuous pass by this measure', () => {
    const vacuous = domainRegimeRegistrations().flatMap((d) => d.records.filter((r) => r.regime.inequalities.length === 0));
    expect(vacuous.map((r) => r.id).sort()).toEqual(['piezoelectricity', 'plasma', 'tolman']);
    for (const r of vacuous) expect(regimeHolds(r.regime, {})).toMatchObject({ ok: true, checked: 0 });
  });
});
