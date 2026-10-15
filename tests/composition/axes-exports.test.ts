/**
 * The axis registry's export surface. The information, topology and statistics value lists are
 * read by their `AXES` rows alone (nothing under `src/`, `tests/` or the package root imports
 * them), so they are module-private; the scale, force and symmetry lists have importers and
 * stay exported.
 *
 * @module tests/composition/axes-exports
 */
import { describe, it, expect } from 'vitest';
import * as axes from '../../src/composition/axes.js';

describe('composition/axes exports', () => {
  it('exports the registry, the gate list, and only the value lists something imports', () => {
    expect(Object.keys(axes).sort()).toEqual([
      'AXES',
      'FORCE_AXIS_VALUES',
      'GATE_AXES',
      'SCALE_AXIS_VALUES',
      'SYMMETRY_AXIS_VALUES',
    ]);
  });

  it('the private lists still back their registry rows', () => {
    const values = (name: string): readonly string[] => axes.AXES.find((a) => a.name === name)!.values;
    expect(values('information')).toEqual(['von-neumann', 'shannon', 'kolmogorov', 'discord']);
    expect(values('topology')).toEqual(['trivial', 'chern', 'winding', 'z2', 'berry']);
    expect(values('statistics')).toEqual(['bosonic', 'fermionic', 'anyonic', 'parastatistic']);
  });
});
