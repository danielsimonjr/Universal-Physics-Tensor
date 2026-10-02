/**
 * §VI.6.1 tensor-index assignment.
 *
 * The component is the catalog category cluster. The specification lists and
 * `tensorIndexComponent` are the same map: every catalog id appears once.
 *
 * @module tests/bridges/tensor-index
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import {
  TENSOR_INDEX_BY_CATEGORY,
  TENSOR_INDEX_PATTERN,
  tensorIndexComponent,
  type TensorIndexComponent,
} from '../../src/bridges/tensor-index.js';

const SPEC = 'docs/specification/Part-II.md';

const HEADING_COMPONENT: Readonly<Record<string, TensorIndexComponent>> = {
  'Quantum-Classical Bridges': 'quantum-classical',
  'Information-Geometry Bridges': 'information-geometry',
  'Emergence Patterns': 'emergence',
  'Field Unification': 'field-unification',
  'Scale Transitions': 'scale-transition',
  'Cosmological Puzzles': 'unassigned',
};

/** Expand `11-12, 33-35, 56` into sorted ids. An en dash is a hyphen. */
export function expandIdList(spec: string): number[] {
  const ids: number[] = [];
  for (const raw of spec.split(',')) {
    const part = raw.trim().replaceAll('–', '-');
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      if (hi < lo) throw new Error(`inverted range ${part}`);
      for (let id = lo; id <= hi; id++) ids.push(id);
      continue;
    }
    if (/^\d+$/.test(part)) {
      ids.push(Number(part));
      continue;
    }
    throw new Error(`unparsed tensor-index id token ${JSON.stringify(raw)}`);
  }
  return ids;
}

/** Id → component, read from the parenthetical lists under §VI.6.1. */
export function specTensorIndex(markdown: string): Map<number, TensorIndexComponent> {
  const start = markdown.indexOf('### 6.1 Tensor Index Assignment');
  const end = markdown.indexOf('### 6.2', start);
  if (start < 0 || end < 0) throw new Error('§VI.6.1 bounds not found');
  const section = markdown.slice(start, end);
  const found = new Map<number, TensorIndexComponent>();
  const re = /^\d+\. \*\*([^(]+)\(([^)]+)\)\*\*:/gm;
  for (const match of section.matchAll(re)) {
    const label = match[1].trim();
    const component = HEADING_COMPONENT[label];
    if (component === undefined) throw new Error(`unknown §VI.6.1 heading ${label}`);
    for (const id of expandIdList(match[2])) {
      if (found.has(id)) throw new Error(`BE-${id} is listed twice in §VI.6.1`);
      found.set(id, component);
    }
  }
  return found;
}

describe('§VI.6.1 tensor index', () => {
  const listed = specTensorIndex(readFileSync(SPEC, 'utf8'));

  it('places every catalog id in exactly one component, matching its category', () => {
    expect(BRIDGE_EQUATIONS).toHaveLength(55);
    expect(listed.size).toBe(55);
    for (const entry of BRIDGE_EQUATIONS) {
      expect(
        listed.get(entry.id),
        `BE-${entry.id} category ${entry.category}`,
      ).toBe(tensorIndexComponent(entry.category));
    }
  });

  it('displays the five index patterns and leaves category N without one', () => {
    const section = readFileSync(SPEC, 'utf8');
    const start = section.indexOf('### 6.1 Tensor Index Assignment');
    const end = section.indexOf('### 6.2', start);
    const body = section.slice(start, end);
    for (const pattern of Object.values(TENSOR_INDEX_PATTERN)) {
      expect(body).toContain(pattern);
    }
    expect(tensorIndexComponent('N')).toBe('unassigned');
    expect(TENSOR_INDEX_PATTERN).not.toHaveProperty('unassigned');
  });

  it('reproduces the original 11–50 lists from the category letters alone', () => {
    const original: Record<TensorIndexComponent, number[]> = {
      'quantum-classical': [11, 12, 33, 34, 35],
      'information-geometry': [13, 14, 30, 31, 32, 42, 43, 44],
      emergence: [15, 16, 27, 28, 29, 48, 49, 50],
      'field-unification': [17, 18, 36, 37, 38, 39, 40, 41],
      'scale-transition': [19, 20, 21, 22, 23, 24, 25, 26],
      unassigned: [45, 46, 47],
    };
    for (const entry of BRIDGE_EQUATIONS) {
      if (entry.id > 50) continue;
      const component = tensorIndexComponent(entry.category);
      expect(original[component], `BE-${entry.id}`).toContain(entry.id);
    }
  });

  it('files BE-55 through BE-65 with their category cluster', () => {
    const expected: Record<number, TensorIndexComponent> = {
      55: 'scale-transition',
      56: 'quantum-classical',
      57: 'information-geometry',
      58: 'emergence',
      59: 'scale-transition',
      60: 'scale-transition',
      61: 'scale-transition',
      62: 'scale-transition',
      63: 'information-geometry',
      64: 'information-geometry',
      65: 'information-geometry',
    };
    for (const [id, component] of Object.entries(expected)) {
      const entry = BRIDGE_EQUATIONS.find((e) => e.id === Number(id));
      expect(entry).toBeDefined();
      expect(tensorIndexComponent(entry!.category)).toBe(component);
      expect(listed.get(Number(id))).toBe(component);
    }
  });

  it('refuses a category letter the lists do not name', () => {
    expect(() => tensorIndexComponent('Z')).toThrow(/category Z/);
    expect(TENSOR_INDEX_BY_CATEGORY.Z).toBeUndefined();
  });

  it('does not let the bridges tuple override the category', () => {
    // BE-11: the tuple and the category agree, so a tuple-only rule matches.
    // That is the control that the disagreement check can come out equal.
    const agree = BRIDGE_EQUATIONS.find((e) => e.id === 11)!;
    expect(agree.bridges).toEqual(['quantum', 'classical']);
    expect(tensorIndexComponent(agree.category)).toBe('quantum-classical');

    // BE-39: the same tuple, category L. The tuple-only rule says
    // quantum-classical. The list says field-unification. The tuple rule fails
    // on this row.
    const disagree = BRIDGE_EQUATIONS.find((e) => e.id === 39)!;
    expect(disagree.bridges).toEqual(['quantum', 'classical']);
    expect(disagree.category).toBe('L');
    const tupleOnly = 'quantum-classical' as const;
    expect(tensorIndexComponent(disagree.category)).toBe('field-unification');
    expect(tupleOnly).not.toBe(tensorIndexComponent(disagree.category));
  });

  it('does not let a shared dimensional signature override the category', () => {
    const be11 = BRIDGE_EQUATIONS.find((e) => e.id === 11)!;
    const be48 = BRIDGE_EQUATIONS.find((e) => e.id === 48)!;
    expect(be11.dimensional_signature).toBe('[frequency]');
    expect(be48.dimensional_signature).toBe(be11.dimensional_signature);
    expect(tensorIndexComponent(be11.category)).toBe('quantum-classical');
    expect(tensorIndexComponent(be48.category)).toBe('emergence');
  });

  it('does not let a stated tensor rank override the category', () => {
    const be13 = BRIDGE_EQUATIONS.find((e) => e.id === 13)!;
    const be17 = BRIDGE_EQUATIONS.find((e) => e.id === 17)!;
    expect(be13.encoded_form).toMatch(/rank-2/);
    expect(be17.encoded_form).toMatch(/rank-3/);
    expect(tensorIndexComponent(be13.category)).toBe('information-geometry');
    expect(tensorIndexComponent(be17.category)).toBe('field-unification');
  });
});
