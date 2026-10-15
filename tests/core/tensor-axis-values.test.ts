/**
 * `UniversalTensor` checked that `scales` and `forces` were non-empty arrays
 * and nothing else: `scales: ['nope']` built a tensor over an axis value no
 * registry names. Each configured value is checked against the axis value
 * list (`Axes`), and a stranger is refused with the axis and the admitted
 * values named.
 */
import { describe, expect, it } from 'vitest';
import { UniversalTensor } from '../../src/core/tensor.js';
import type { TensorConfig } from '../../src/core/types.js';

const good: TensorConfig = { rank: 3, scales: ['quantum', 'classical'], forces: ['gravitational'] };

describe('TensorConfig axis values', () => {
  it('refuses an unknown scale, naming the axis and the admitted values', () => {
    const bad = { ...good, scales: ['nope'] } as unknown as TensorConfig;
    expect(() => new UniversalTensor(bad)).toThrow(RangeError);
    expect(() => new UniversalTensor(bad)).toThrow(/TensorConfig\.scales.*'nope'.*quantum/);
  });

  it('refuses an unknown force, symmetry and information measure', () => {
    expect(() => new UniversalTensor({ ...good, forces: ['magic'] } as unknown as TensorConfig)).toThrow(
      /TensorConfig\.forces.*'magic'/,
    );
    expect(() => new UniversalTensor({ ...good, symmetries: ['poincare', 'odd'] } as unknown as TensorConfig)).toThrow(
      /TensorConfig\.symmetries.*'odd'/,
    );
    expect(() => new UniversalTensor({ ...good, informationMeasures: ['gossip'] } as unknown as TensorConfig)).toThrow(
      /TensorConfig\.informationMeasures.*'gossip'/,
    );
  });

  it('the control: every registered value is admitted', () => {
    const t = new UniversalTensor({
      rank: 6,
      scales: ['quantum', 'mesoscopic', 'classical', 'cosmological'],
      forces: ['gravitational', 'electromagnetic', 'weak', 'strong', 'emergent'],
      symmetries: ['poincare', 'gauge', 'conformal', 'susy', 'emergent'],
      informationMeasures: ['vonNeumann', 'shannon', 'kolmogorov', 'quantumDiscord'],
    });
    expect(t).toBeInstanceOf(UniversalTensor);
  });
});
