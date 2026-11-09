/**
 * Issues 536, 539 and 546. A possessive name word (`youngs`) matches the plain
 * query word (`young`) inside a phrase. A query word of one or two letters is
 * a symbol in a phrase too, so `f` does not match the letter in `N_f` and `v`
 * does not match `V/A` in a description. An evaluator input's meaning is a
 * searchable field, so the Coulomb logarithm finds the Lorentz resistivity.
 */
import { allText, capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function search(query: string): Promise<{ code: number; text: string }> {
  const cap = capture();
  const code = await runCli(['search', query], cap.io);
  return { code, text: allText(cap) };
}

describe('search: possessive words, short words in a phrase, evaluator inputs', () => {
  it('finds youngs-modulus for "young modulus" (#539)', async () => {
    const r = await search('young modulus');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/youngs-modulus/);
  });

  it("finds youngs-modulus for \"young's modulus\" (#539)", async () => {
    const r = await search("young's modulus");
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/youngs-modulus/);
  });

  it('does not answer f-number with flavor-number (#546)', async () => {
    const r = await search('f-number');
    expect(r.text).not.toMatch(/flavor-number/);
    expect(r.text).toMatch(/no entry matches/);
  });

  it('does not answer "v number" with the Biot number (#546)', async () => {
    const r = await search('v number');
    expect(r.text).not.toMatch(/be-156/);
    expect(r.text).toMatch(/no entry matches/);
  });

  it('finds the Lorentz resistivity for "coulomb logarithm" (#536)', async () => {
    const r = await search('coulomb logarithm');
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/be-116/);
    expect(r.text).toMatch(/words in: inputs/);
  });

  it('controls: thermal noise, landau, prandtl number, debye', async () => {
    const t = await search('thermal noise');
    expect(t.code, t.text).toBe(0);
    expect(t.text).toMatch(/be-58/);
    const l = await search('landau');
    expect(l.text).toMatch(/landau is a prefix of landauer/);
    const p = await search('prandtl number');
    expect(p.text).toMatch(/be-86/);
    const d = await search('debye');
    expect(d.text).toMatch(/CE-debye-frequency/);
  });
});
