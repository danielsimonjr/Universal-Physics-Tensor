/**
 * A notice is data, a constant's caveat is the constant's, and a formal
 * reference's kind is a field of the catalog entry. Nothing switches on a
 * bridge number or on a string that stands in for one.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogEntries, catalogRelations, primaryRelation } from '../../src/bridges/catalog-load.js';
import { relationNotices } from '../../src/bridges/notices.js';
import { constantRecord } from '../../src/dimensional/symbolic-constants.js';
import { DomainViolationError } from '../../src/composition/edge.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { runCli } from '../../dist/cli/main.js';

const SRC = join(import.meta.dirname, '../../src');
const code = (rel: string): string =>
  readFileSync(join(SRC, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const SUN = 1.989e30;
/** 10 r_s of the Sun is about 29.5 km; 20 km is inside the cut. */
const INSIDE = 20000;

describe('a notice is data (issue: notice strings were an id switch)', () => {
  it('every notice is an object with text, and only the Jeans relation carries one', () => {
    const withNotice = catalogRelations().filter((r) => r.notice !== undefined);
    expect(withNotice.map((r) => r.id)).toEqual(['be-65']);
    for (const r of withNotice) expect(typeof r.notice!.text).toBe('string');
  });

  it('relationNotices returns the Jeans text and the hbar caveat for a relation that names hbar', () => {
    expect(relationNotices(primaryRelation(65)!).join('\n')).toMatch(/convention-dependent/);
    expect(relationNotices(primaryRelation(56)!).join('\n')).toMatch(/exact reduced Planck constant/);
    expect(relationNotices(primaryRelation(88)!)).toEqual([]);
  });

  it('the hbar caveat is the registry row’s note, with the relative difference computed, not typed', () => {
    const note = constantRecord('hbar')!.note!;
    expect(note).toMatch(/6\.127e-10/);
  });

  it('be-51 and be-52 refuse the same way inside 10 r_s', () => {
    expect(() => evaluateRelation(51, { M_kg: SUN, b_m: INSIDE })).toThrow(DomainViolationError);
    expect(() => evaluateRelation(52, { M_kg: SUN, a_m: INSIDE, e: 0 })).toThrow(DomainViolationError);
    // the control: Mercury is far outside the cut
    expect(evaluateRelation(52, { M_kg: SUN, a_m: 5.79e10, e: 0.2056 }).kind).toBe('value');
  });

  it('the CLI has no notice switch, no weak-field physics, and no bridge-number branch', () => {
    const evaluate = code('cli/commands/evaluate.ts');
    expect(evaluate).not.toMatch(/notice ===/);
    expect(evaluate).not.toMatch(/G_SI|C_SI|10 \* rs/);
    expect(code('cli/commands/atlas.ts')).not.toMatch(/=== 16/);
    expect(code('cli/commands/symbolic.ts')).not.toMatch(/=== 16/);
    expect(code('atlas/physjs-ref.ts')).not.toMatch(/catalogEdgeKey\(28\)|12, 16, 21, 27/);
  });

  it('the speculative sentence follows the entry status, not the number', async () => {
    const lines: string[] = [];
    const io = { out: (s?: string) => lines.push(`${s ?? ''}\n`), err: (s?: string) => lines.push(`${s ?? ''}\n`), write: (s: string) => lines.push(s) };
    await runCli(['atlas', 'be-16'], io);
    expect(lines.join('')).toMatch(/catalog edge for id 16 is speculative/);
    lines.length = 0;
    // the control: an established entry prints no grade sentence
    await runCli(['atlas', 'be-55'], io);
    expect(lines.join('')).not.toMatch(/catalog edge for id 55 is/);
  });
});

describe('the formal reference kind is a field of the catalog entry', () => {
  it('every reviewed override is recorded on the entry, and the derived kind agrees', () => {
    const overrides = catalogEntries().filter((e) => e.formalKind !== undefined);
    expect(overrides.length).toBe(96);
    expect(overrides.filter((e) => e.formalKind === 'property').map((e) => e.id)).toEqual([28]);
    expect(catalogFormalRef(16)?.kind).toBe('bridge');
    expect(catalogFormalRef(28)?.kind).toBe('property');
    expect(catalogFormalRef(13)?.kind).toBe('reduction');
  });
});
