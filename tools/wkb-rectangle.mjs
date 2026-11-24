/** Reduce a tabulated constant-mass profile to an action-equivalent rectangle. */
import { readFileSync } from 'node:fs';

function reduce({ stateEnergyJ, points }) {
  if (!Number.isFinite(stateEnergyJ) || !Array.isArray(points) || points.length < 3) {
    throw new Error('expected a finite stateEnergyJ and at least three profile points');
  }
  const samples = points.map(({ positionM, potentialJ }, i) => {
    const gap = potentialJ - stateEnergyJ;
    if (!Number.isFinite(positionM) || !Number.isFinite(potentialJ) || !Number.isFinite(gap) ||
        (i > 0 && positionM <= points[i - 1].positionM)) {
      throw new Error('profile points must be finite and positions strictly increasing');
    }
    return { x: positionM, gap };
  });
  const first = samples.findIndex(({ gap }) => gap > 0);
  const last = samples.findLastIndex(({ gap }) => gap > 0);
  if (first <= 0 || last === samples.length - 1) {
    throw new Error('expected one forbidden interval bracketed by samples at or below the state energy');
  }
  const interior = samples.slice(first, last + 1);
  let height = 0;
  for (const { gap } of interior) {
    if (gap <= 0) throw new Error('multiple forbidden intervals are unsupported');
    height = Math.max(height, gap);
  }

  // Interpolate a crossing from its nonpositive endpoint towards its positive endpoint.
  const crossing = (outside, inside) => {
    const fraction = -outside.gap / (inside.gap - outside.gap);
    return { x: outside.x + fraction * (inside.x - outside.x), gap: 0 };
  };
  const left = crossing(samples[first - 1], samples[first]);
  const right = crossing(samples[last + 1], samples[last]);
  const knots = [left, ...interior, right];
  let width = 0;
  for (let i = 1; i < knots.length; i++) {
    const low = knots[i - 1];
    const high = knots[i];
    const a = Math.sqrt(low.gap / height);
    const b = Math.sqrt(high.gap / height);
    // Average sqrt(gap / height) across a linear segment, factored to
    // avoid cancellation for nearly flat segments. One endpoint is positive.
    width += (high.x - low.x) * (2 / 3) * (a * a + a * b + b * b) / (a + b);
  }
  if (!Number.isFinite(width) || width <= 0) throw new Error('equivalent width is outside the supported numeric range');
  return {
    barrierHeightJ: height,
    actualWidthM: width,
    turningPointsM: [left.x, right.x],
    interpolation: 'piecewise-linear',
  };
}

try {
  const profile = JSON.parse(readFileSync(process.argv[2] ?? 0, 'utf8'));
  console.log(JSON.stringify(reduce(profile), null, 2));
} catch (error) {
  console.error(`wkb-rectangle: ${error.message}`);
  process.exitCode = 1;
}
