/**
 * Basic usage example for Universal Physics Tensor
 *
 * This example demonstrates:
 * 1. Creating a tensor instance
 * 2. Adding known physical laws
 * 3. Adding bridge equations
 * 4. Querying the tensor
 */

import { UniversalTensor, PhysicalConstants } from 'universal-physics-tensor';
import type { PhysicalLaw, BridgeEquation } from 'universal-physics-tensor';

// Create a simple rank-3 tensor with quantum and classical scales
const tensor = new UniversalTensor({
  rank: 3,
  scales: ['quantum', 'classical'],
  forces: ['electromagnetic', 'gravitational'],
  symmetries: ['poincare', 'gauge'],
});

// Add Schrödinger equation (quantum mechanics)
const schrodinger: PhysicalLaw = {
  id: 'schrodinger',
  name: 'Schrödinger Equation',
  equation: 'iℏ ∂ψ/∂t = Ĥψ',
  scales: ['quantum'],
  forces: ['electromagnetic'],
  symmetries: ['poincare'],
  confidence: 1.0,
  references: ['Schrödinger, E. (1926)'],
};

tensor.addLaw(schrodinger);

// Add Newton's second law (classical mechanics)
const newton: PhysicalLaw = {
  id: 'newton-second',
  name: "Newton's Second Law",
  equation: 'F = ma',
  scales: ['classical'],
  forces: ['gravitational', 'electromagnetic'],
  symmetries: ['poincare'],
  confidence: 1.0,
  references: ['Newton, I. (1687)'],
};

tensor.addLaw(newton);

// Add Ehrenfest theorem (quantum-classical bridge)
const ehrenfest: BridgeEquation = {
  id: 'ehrenfest',
  name: 'Ehrenfest Theorem',
  source: { scale: 'quantum', force: 'electromagnetic' },
  target: { scale: 'classical', force: 'electromagnetic' },
  equation: 'd⟨p⟩/dt = -⟨∇V⟩',
  confidence: 1.0,
  validated: true,
  description: 'Shows how quantum expectation values follow classical equations of motion',
};

tensor.addBridge(ehrenfest);

// Query for quantum laws
console.log('\n=== Quantum Laws ===');
const quantumLaws = tensor.queryLaws({ scale: 'quantum' });
quantumLaws.forEach(law => {
  console.log(`${law.name}: ${law.equation}`);
});

// Query for classical laws
console.log('\n=== Classical Laws ===');
const classicalLaws = tensor.queryLaws({ scale: 'classical' });
classicalLaws.forEach(law => {
  console.log(`${law.name}: ${law.equation}`);
});

// Find bridges between quantum and classical
console.log('\n=== Quantum ↔ Classical Bridges ===');
const bridges = tensor.findBridges(
  { scale: 'quantum' },
  { scale: 'classical' }
);
bridges.forEach(bridge => {
  console.log(`${bridge.name}: ${bridge.equation}`);
  console.log(`  Confidence: ${bridge.confidence * 100}%`);
  console.log(`  Validated: ${bridge.validated ? 'Yes' : 'No'}`);
});

// Display tensor statistics
console.log('\n=== Tensor Statistics ===');
const stats = tensor.getStats();
console.log(`Rank: ${stats.rank}`);
console.log(`Known Laws: ${stats.knownLaws}`);
console.log(`Bridge Equations: ${stats.bridgeEquations}`);
console.log(`Emergent Phenomena: ${stats.emergentPhenomena}`);
console.log(`Occupied Cells: ${stats.occupiedCells}`);
console.log(`Total Entries: ${stats.totalEntries}`);

// Display some physical constants
console.log('\n=== Physical Constants ===');
console.log(`Speed of light: ${PhysicalConstants.c} m/s`);
console.log(`Planck constant: ${PhysicalConstants.h} J⋅s`);
console.log(`Planck length: ${PhysicalConstants.lP} m`);
console.log(`Fine structure constant: ${PhysicalConstants.alpha}`);
