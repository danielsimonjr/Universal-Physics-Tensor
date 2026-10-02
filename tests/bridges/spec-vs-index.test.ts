/**
 * Spec-markdown ↔ index consistency test.
 *
 * Closes the highest-leverage drift gap: the R0/R1/R2 audit fix loops
 * added "**Corrected on 2026-05-0X**" / "**R2 reformulation gap**"
 * blocks to the spec markdown, but the audit-fix tests assert only
 * against `BRIDGE_EQUATIONS` (the index TS array). Nothing reads the
 * markdown, so a future contributor could update the spec but forget
 * the index (or vice versa) and every audit-fix test would still pass.
 *
 * For each BE entry whose `notes` advertises a correction or
 * reformulation gap, parse the spec section (bounded by
 * `**Bridge Equation N:` / next `**Bridge Equation`), and assert that
 * the spec carries the same disposition marker the index claims.
 *
 * Source: test-analyzer F4.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const PART_BY_ID = (id: number): 'I' | 'II' => (id <= 20 ? 'I' : 'II');

function readSpec(part: 'I' | 'II'): string {
  return readFileSync(
    resolve(repoRoot, 'docs', 'specification', `Part-${part}.md`),
    'utf-8',
  );
}

/** Extract section for `**Bridge Equation N:` up to the next bridge or category header. */
function extractBridgeSection(spec: string, id: number): string | null {
  const startRe = new RegExp(`\\*\\*Bridge Equation ${id}:`);
  const m = startRe.exec(spec);
  if (!m) return null;
  const start = m.index;
  // End at the next bridge equation header or a category header.
  const tail = spec.slice(start + m[0].length);
  const endRe = /\*\*Bridge Equation \d+:|^### Category /m;
  const e = endRe.exec(tail);
  const end = e ? start + m[0].length + e.index : spec.length;
  return spec.slice(start, end);
}

function normalize(s: string): string {
  // Collapse whitespace and treat \\ as \ for cross-format substring match.
  return s.replace(/\s+/g, ' ').replace(/\\\\/g, '\\').trim();
}

describe('spec markdown ↔ BRIDGE_EQUATIONS index consistency', () => {
  it('every entry with an "Corrected on YYYY-MM-DD" notes block has a matching spec block', () => {
    const specs = { I: readSpec('I'), II: readSpec('II') };
    for (const e of BRIDGE_EQUATIONS) {
      const m = /Corrected\s+on\s+(\d{4}-\d{2}-\d{2})/i.exec(e.notes) ||
                /Corrected\s+(\d{4}-\d{2}-\d{2})/i.exec(e.notes);
      if (!m) continue;
      const date = m[1];
      const part = PART_BY_ID(e.id);
      const section = extractBridgeSection(specs[part], e.id);
      expect(section, `BE-${e.id}: spec section not found in Part-${part}.md`).not.toBeNull();
      const norm = normalize(section!);
      // Spec uses `Corrected on YYYY-MM-DD` in the disposition block.
      expect(
        norm,
        `BE-${e.id}: index notes claim "Corrected on ${date}" but spec section does not mention that date`,
      ).toMatch(new RegExp(`Corrected\\s+on\\s+${date.replace(/-/g, '\\-')}`));
    }
  });

  it('every entry with an "R2 reformulation gap" notes block has a matching spec block', () => {
    const specs = { I: readSpec('I'), II: readSpec('II') };
    for (const e of BRIDGE_EQUATIONS) {
      if (!/R2\s+reformulation\s+gap/i.test(e.notes) &&
          !/What would unblock a real fix/i.test(e.notes)) continue;
      const part = PART_BY_ID(e.id);
      const section = extractBridgeSection(specs[part], e.id);
      expect(section, `BE-${e.id}: spec section not found in Part-${part}.md`).not.toBeNull();
      const norm = normalize(section!);
      expect(
        norm,
        `BE-${e.id}: index notes claim R2 gap but spec section has no "R2 reformulation gap" or "What would unblock" block`,
      ).toMatch(/R2 reformulation gap|What would unblock a real fix|What CANNOT be done/i);
    }
  });

  it('every populated dimensional_signature has a corresponding spec section that exists', () => {
    // Lightweight presence-only sanity check: an index entry whose
    // dimensional_signature has been populated must at least have a spec
    // section in the right Part-{I,II}.md file (i.e., it was not
    // hand-written for an entry that doesn't exist in the spec).
    // Ids 11–20 are Part I. Every later id, including the Part-II §V-B
    // and §V-C extensions, is Part II. `source_part` on the catalog row
    // is not that file.
    const specs = { I: readSpec('I'), II: readSpec('II') };
    for (const e of BRIDGE_EQUATIONS) {
      if (e.dimensional_signature === null) continue;
      const part = PART_BY_ID(e.id);
      const section = extractBridgeSection(specs[part], e.id);
      expect(section, `BE-${e.id} (dimensional_signature populated): no spec section in Part-${part}.md`).not.toBeNull();
      expect(
        section,
        `BE-${e.id}: spec section has no PhysJS proof-status block`,
      ).toMatch(/\*\*Proof status as of \d{4}-\d{2}-\d{2}\.\*\*/);
    }
  });
});
