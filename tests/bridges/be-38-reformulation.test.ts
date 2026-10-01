/**
 * Wave I.B C4 (2026-05-05): BE-38 reformulated to the canonical Milgrom
 * 1983 MOND interpolation μ(x) = x/√(1+x²). The catalog name is
 * `Milgrom MOND interpolation ν(z)`.
 *
 * Replaces tests/bridges/be-38-r2-spec.test.ts (deleted).
 *
 * Honest-archaeology pattern (Wave-G precedent, BE-37): when a bridge
 * equation undergoes a disposition change (here: R2 gap → reformulation
 * landed), the prior gap-pinning tests are deleted and replaced.
 *
 * Per Physicist I12 (Wave H paper review).
 */
import { describe, it, expect } from 'vitest';
import { expectBridgeInIndex, expectHasReformulationIssue } from './_helpers.js';

describe('BE-38 Milgrom MOND interpolation ν(z) (Wave I.B C4 reformulation)', () => {
  it('exists in the index', () => {
    expectBridgeInIndex(38);
  });

  it('is named for the Milgrom interpolation, and the bridges pair stays the framing', () => {
    const entry = expectBridgeInIndex(38);
    expect(entry.name).toBe('Milgrom MOND interpolation ν(z)');
    expect(entry.bridges).toEqual(['information', 'gravity']);
  });

  it("status remains 'speculative' (interpolation is canonical, framing is conjectural)", () => {
    expectBridgeInIndex(38, 'speculative');
  });

  it('formula_latex contains the canonical Milgrom interpolation (μ-form OR explicit ν-form)', () => {
    const entry = expectBridgeInIndex(38);
    // Wave U 2026-05-06: BE-38 was reformulated from the implicit
    // F = F_N · μ⁻¹(a/a_0) form (Wave I.B C4) to the explicit
    // F = F_N · ν(z), z = F_N/(m·a_0), ν(z) = √[(1+√(1+4/z²))/2] form
    // for AST encoding. Both forms are equivalent (Famaey-McGaugh 2012);
    // the explicit ν-form is directly evaluable in closed form. Either
    // passes — the test pins "canonical Milgrom-class interpolation" not
    // a specific syntactic form.
    expect(entry.formula_latex).toMatch(/sqrt\{1\+x\^2\}|sqrt.*1\+x|\\nu\(z\)|sqrt.*1.*\+.*sqrt/);
    expect(entry.formula_latex).toMatch(/mu|\\nu/i);
    expect(entry.formula_latex).toMatch(/a_0/);
  });

  it('does not retain the broken α√(a₀/a) tanh(...) form', () => {
    const entry = expectBridgeInIndex(38);
    // The old form had `tanh` in the formula — the canonical Milgrom
    // form does not.
    expect(entry.formula_latex).not.toMatch(/tanh/);
  });

  it('references include Milgrom MOND, Verlinde 2016, and Famaey-McGaugh review', () => {
    const entry = expectBridgeInIndex(38);
    const refs = entry.references.join(' | ');
    expect(refs).toMatch(/Milgrom 1983/i);
    expect(refs).toMatch(/Verlinde 2016|1611\.02269/);
    expect(refs).toMatch(/Famaey-McGaugh|1112\.3960/);
  });

  it('notes record the 2026-05-05 reformulation', () => {
    const entry = expectBridgeInIndex(38);
    expect(entry.notes).toMatch(/Reformulated 2026-05-05/);
    expect(entry.notes).toMatch(/Wave I\.B C4/);
  });

  it('notes flag the BE-36 cross-check (shared a_0 scale)', () => {
    const entry = expectBridgeInIndex(38);
    expect(entry.notes).toMatch(/BE-36/);
  });

  it('known_issues retains a phenomenological-ansatz / reformulation entry for the framing gap', () => {
    const entry = expectBridgeInIndex(38);
    expectHasReformulationIssue(entry);
  });
});
