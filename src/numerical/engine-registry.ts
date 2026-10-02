/**
 * Engine registry — the active TensorEngine is `MathTSEngine`.
 *
 * The MathTS packages are required dependencies. There is no absent-peer
 * branch.
 *
 * The Promise itself is cached, so concurrent first-time callers share one
 * resolution. `setActiveEngine` replaces that promise, including one that
 * has not been awaited yet.
 *
 * @module numerical/engine-registry
 */
import type { TensorEngine } from './tensor-engine.js';
import { MathTSEngine } from './mathts-engine.js';

let _activeEngineP: Promise<TensorEngine> | undefined;

// An explicit setActiveEngine override. Read when the cached promise is
// created, so a set that lands first wins for the first awaiter.
let _override: TensorEngine | undefined;

// @public: getActiveEngine/setActiveEngine are part of the consumer-facing
// engine-switching contract (re-exported from the root barrel).

/**
 * The TensorEngine used by the `evaluateNumerical*` entry points when no
 * per-call `EvaluateOptions.engine` is supplied. Always a `MathTSEngine`
 * unless {@link setActiveEngine} replaced it.
 *
 * @public
 */
export async function getActiveEngine(): Promise<TensorEngine> {
  _activeEngineP ??= Promise.resolve(_override ?? new MathTSEngine());
  return _activeEngineP;
}

/**
 * Set the process-wide active TensorEngine.
 * Wraps the engine in a resolved Promise to match the async getActiveEngine
 * contract.
 * @public
 */
export function setActiveEngine(engine: TensorEngine): void {
  _override = engine;
  _activeEngineP = Promise.resolve(engine);
}

/**
 * Reset the Promise-cache for testing purposes only.
 * Not part of the public API surface; NOT exported from the root barrel.
 * @internal
 */
export function resetEngineForTesting(): void {
  _activeEngineP = undefined;
  _override = undefined;
}
