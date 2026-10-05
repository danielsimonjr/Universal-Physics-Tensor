/**
 * Phase 4: `assertSameCarrierSign` has one caller, the sign policy.
 * The BE-70 edge domain does not call `sameCarrierSign`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function functionSpan(src: string, name: string): { start: number; end: number } {
  const match = new RegExp(`function ${name}\\s*\\(`).exec(src);
  if (match === null || match.index === undefined) throw new Error(`missing function ${name}`);
  const open = src.indexOf('{', match.index);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start: match.index, end: i };
    }
  }
  throw new Error(`unbalanced function ${name}`);
}

describe('sign policy has one owner', () => {
  it('calls assertSameCarrierSign only from the sign policy', () => {
    const policy = readFileSync('src/bridges/carrier-sign.ts', 'utf8');
    const owner = functionSpan(policy, 'applyCarrierSignPolicy');
    const definition = functionSpan(policy, 'assertSameCarrierSign');
    const calls = [...policy.matchAll(/\bassertSameCarrierSign\s*\(/g)];
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      const at = call.index ?? -1;
      const isDefinition = at >= definition.start && at < policy.indexOf('{', definition.start);
      const isOwnerCall = at > owner.start && at < owner.end;
      expect(isDefinition || isOwnerCall).toBe(true);
    }
    const domain = readFileSync('src/composition/edges/applied-physicist.ts', 'utf8');
    expect(domain).not.toMatch(/sameCarrierSign\s*\(/);
    const einstein = readFileSync('src/bridges/be70-einstein-relation.ts', 'utf8');
    expect(einstein).not.toMatch(/assertSameCarrierSign\s*\(/);
    const graph = readFileSync('src/composition/canonical-graph.ts', 'utf8');
    expect(graph).not.toMatch(/assertCarrierProductSign\s*\(/);
    expect(graph).not.toMatch(/magnitudeBase\s*\(/);
  });
});
