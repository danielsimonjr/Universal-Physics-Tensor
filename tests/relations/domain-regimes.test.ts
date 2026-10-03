/**
 * A domain name is registered once. The second registration is the control
 * that the guard rejects a real collision.
 */
import { describe, expect, it } from 'vitest';
import '../../src/relations/domain-regimes.js';
import { registerRegimeDomain } from '../../src/relations/regime-registration.js';

describe('domain regime registration', () => {
  it('refuses a second registration of a name that is already registered', () => {
    expect(() =>
      registerRegimeDomain({
        name: 'plasma',
        records: [
          {
            id: 'plasma',
            kind: 'domain',
            regime: { family: 'plasma', inequalities: [], groupDefinitions: {} },
          },
        ],
      }),
    ).toThrow(/already registered/);
  });
});
