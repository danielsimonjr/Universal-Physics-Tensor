/**
 * Autodiff conformance on MathTSEngine. The MathTS packages are required,
 * so a missing import fails this file instead of skipping it.
 */
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { runADConformance } from './ad-conformance.js';

runADConformance(new MathTSEngine(), 'MathTSEngine');
