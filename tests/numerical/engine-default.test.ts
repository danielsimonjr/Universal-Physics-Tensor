/**
 * The active engine is MathTSEngine. There is no absent-peer fallback.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { getActiveEngine, setActiveEngine } from '../../src/numerical/index.js';
import { resetEngineForTesting } from '../../src/numerical/engine-registry.js';

describe('active engine is MathTSEngine', () => {
  beforeEach(() => {
    resetEngineForTesting();
  });

  it('getActiveEngine returns a MathTSEngine', async () => {
    const engine = await getActiveEngine();
    expect(engine).toBeInstanceOf(MathTSEngine);
    expect(engine.name).toBe('MathTSEngine');
  });

  it('setActiveEngine round-trips the same instance', async () => {
    const custom = new MathTSEngine();
    setActiveEngine(custom);
    expect(await getActiveEngine()).toBe(custom);
  });
});
