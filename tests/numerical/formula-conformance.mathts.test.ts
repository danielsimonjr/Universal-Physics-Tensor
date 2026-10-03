/**
 * The MathTS formula parser against the shared conformance suite.
 * The package is required, so a missing import fails this file.
 */
import { mathtsFormulaParser } from '../../src/numerical/formula-mathts.js';
import { runFormulaConformance } from './formula-conformance.js';

if (mathtsFormulaParser.parse('a*b^2+1').evaluate({ a: 3, b: 4 }) !== 49) {
  throw new Error('mathts parser smoke check failed');
}
runFormulaConformance(mathtsFormulaParser, 'mathts');
