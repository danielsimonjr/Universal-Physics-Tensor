import { describe, expect, it } from 'vitest';
import config from '../../vitest.config';

describe('vitest config timeouts', () => {
  it('gives hooks the same time budget as tests', () => {
    const t = config.test;
    expect(t?.testTimeout).toBeGreaterThan(0);
    expect(t?.hookTimeout).toBe(t?.testTimeout);
  });
});
