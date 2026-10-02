/**
 * TensorEngine conformance on MathTSEngine. The package is required, so a
 * missing import fails this file instead of skipping it.
 */
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { runEngineConformance } from './engine-conformance.js';

runEngineConformance(() => new MathTSEngine(), 'full');
