/**
 * A {ℏ, c, e} closure whose prefactor times α is a recognized constant is μ0
 * rewritten through α. The audit text does not call that empirical. JSON
 * `cleanPrefactor` stays false: the printed factor is not itself that constant.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const lines: string[] = [];
  return {
    lines,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => lines.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

describe('vacuum constant rewritten through α', () => {
  it('tags be-74 in the text and leaves Stefan–Boltzmann, Wien, and be-48 empirical', async () => {
    const catalog = capture();
    expect(await runCli(['audit'], catalog.io)).toBe(0);
    const text = catalog.lines.join('');
    expect(text).toMatch(/be-74\s+\+\[ℏ,c,e\]\s+×5\.452e\+0\s+\(vacuum constant; μ0 rewritten through α\)/);
    expect(text).not.toMatch(/be-74[^\n]*empirical\/tuned/);
    expect(text).toMatch(/be-48[^\n]*\(empirical\/tuned constant\)/);
    expect(text).toMatch(/be-59[^\n]*\(empirical\/tuned constant\)/);
    expect(text).toMatch(/be-80[^\n]*\(empirical\/tuned constant\)/);
    expect(text).toMatch(/be-84[^\n]*\(empirical\/tuned constant\)/);

    const canonical = capture();
    expect(await runCli(['audit', '--source=canonical'], canonical.io)).toBe(0);
    const canon = canonical.lines.join('');
    expect(canon).toMatch(/CE-stefan-boltzmann\s+\+\[ℏ,c,k_B\]\s+×1\.645e-1\s+\(empirical\/tuned constant\)/);
    expect(canon).toMatch(/CE-wien\s+\+\[ℏ,c,k_B\]\s+×1\.265e\+0\s+\(empirical\/tuned constant\)/);
  });

  it('keeps be-74 cleanPrefactor false in JSON', async () => {
    const cap = capture();
    expect(await runCli(['audit', '--json'], cap.io)).toBe(0);
    const env = JSON.parse(cap.lines.join('')) as {
      result: { derived: { id: string; cleanPrefactor: boolean; subset: string[] }[] };
    };
    const be74 = env.result.derived.find((d) => d.id === 'be-74');
    expect(be74?.subset).toEqual(['ℏ', 'c', 'e']);
    expect(be74?.cleanPrefactor).toBe(false);
  });
});
