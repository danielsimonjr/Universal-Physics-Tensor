/**
 * AD forward + reverse mode benchmark.
 *
 * Function: fn(x) = x * x  (element-wise self-multiplication)
 * Engines: MathTSEngine (always), MathTSEngine (optional — skipped
 *   if @danielsimonjr/mathts-tensor or @danielsimonjr/mathts-autograd is absent)
 * Shapes: [10], [100], [10, 10], [100, 100]
 *
 * v0.4.5: establishes AD performance baselines. No threshold gates.
 *
 * Bench discipline (F4): tensors are pre-built OUTSIDE the bench callback
 * to measure AD cost, not allocator/GC cost.
 *
 * fromNested is sync on MathTSEngine (no async wrapper overhead).
 * forwardGrad / reverseGrad are async per the v0.4.0 contract (Promise
 * overhead is included in the measurement — there is no internal sync path
 * exposed on the public API).
 *
 * Method names confirmed via src/numerical/tensor-engine.ts (F2 precondition):
 *   element-wise multiply → engine.mul(a, b)
 *   add → engine.add(a, b)
 *   sub → engine.sub(a, b)
 *   scale → engine.scale(t, k)
 *
 * Skipping MathTSEngine: vitest bench has no native bench.skip(); use a
 * conditional wrapper that no-ops when the engine is unavailable.
 */
import { bench, describe } from 'vitest';
import { MathTSEngine } from '../src/numerical/mathts-engine.js';
import { hasAutogradSupport } from '../src/numerical/tensor-engine.js';
import type { TensorEngine, EngineTensor } from '../src/numerical/tensor-engine.js';

// ---------------------------------------------------------------------------
// Engine setup (hoisted outside all bench loops)
// ---------------------------------------------------------------------------

const f64 = new MathTSEngine();

let mathts: TensorEngine | null = null;
let mathtsAvailable = false;

// Attempt to load MathTSEngine (optional dependency).
try {
  const { MathTSEngine } = await import('../src/numerical/mathts-engine.js');
  mathts = new MathTSEngine();
  mathtsAvailable = hasAutogradSupport(mathts);
} catch {
  // @danielsimonjr/mathts-tensor or @danielsimonjr/mathts-autograd not installed.
  console.warn('[bench/ad] MathTSEngine unavailable — skipping MathTS AD benchmarks.');
}

// ---------------------------------------------------------------------------
// Helper: build a NestedArray of the given shape filled with 1.0
// ---------------------------------------------------------------------------
function ones(shape: number[]): number | number[] | number[][] {
  if (shape.length === 0) return 1.0;
  if (shape.length === 1) return Array.from({ length: shape[0] }, () => 1.0);
  return Array.from({ length: shape[0] }, () => ones(shape.slice(1)) as number[]);
}

// ---------------------------------------------------------------------------
// Bench suites — one per shape.
// All tensors are pre-built outside the bench callback so the bench loop
// measures AD cost only, not allocator / GC cost (F4 requirement).
// fromNested is sync on MathTSEngine — no await needed.
// ---------------------------------------------------------------------------

for (const shape of [[10], [100], [10, 10], [100, 100]] as number[][]) {
  const label = `[${shape.join('×')}]`;
  const xData = ones(shape);

  // Pre-build Float64 tensor outside the bench callback (sync fromNested).
  const f64X: EngineTensor = f64.fromNested(xData as never, shape);

  describe(`AD — shape ${label}`, () => {
    bench(`Float64 forward fn=x*x shape=${label}`, async () => {
      await f64.forwardGrad!((t) => f64.mul(t, t), f64X);
    });

    bench(`Float64 reverse fn=x*x shape=${label}`, async () => {
      await f64.reverseGrad!((t) => f64.mul(t, t), f64X);
    });

    if (mathtsAvailable && mathts !== null) {
      const mt = mathts;
      // Pre-build MathTS tensor outside the bench callback.
      // fromNested on MathTSEngine may be sync or async; treat as sync here
      // (MathTSEngine matches the TensorEngine sync contract for fromNested).
      const mtX: EngineTensor = mt.fromNested(xData as never, shape);

      bench(`MathTS forward fn=x*x shape=${label}`, async () => {
        await mt.forwardGrad!((t) => mt.mul(t, t), mtX);
      });

      bench(`MathTS reverse fn=x*x shape=${label}`, async () => {
        await mt.reverseGrad!((t) => mt.mul(t, t), mtX);
      });
    }
  });
}
