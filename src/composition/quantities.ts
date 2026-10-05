/**
 * Centralized Quantity nodes — ONE object per canonical name (v0.11
 * namespacing gate, acceptance criterion 6). Per the Adam vet
 * (A-2/A-6.3), per-edge-module node definitions had drifted into
 * duplicate-name distinct-object pairs: 'mass' across
 * calibration/catalog-tranche, and two 'temperature' nodes within
 * calibration itself. Name uniqueness is pinned by
 * tests/composition/quantities.test.ts.
 *
 * Centralization removes the false-positive collision class; it does
 * NOT decide composition-level aliasing questions — those are
 * dispositions (compose.ts `SOURCE_ALIAS_DISPOSITIONS`).
 *
 *
 * Unit conventions that the dimension vector cannot see (GeV beside
 * joules, bits beside nats) are tagged in `unit-convention.ts`. The
 * binding reader converts a value into that unit. An identification
 * copies a number only after applying the scale between the two units.
 *
 * @module composition/quantities
 */

// Domain-split modules (2026-06-22 god-file split). This barrel re-exports
// every centralized Quantity node, so all existing importers are unchanged.
export * from './quantities/quantum.js';
export * from './quantities/gravitation-cosmology.js';
export * from './quantities/fields.js';
export * from './quantities/condensed-matter.js';
export * from './quantities/common.js';
export * from './quantities/applied-physicist.js';
export * from './quantities/condensed-r5.js';
export * from './quantities/plasma-space.js';
export * from './quantities/engineering-r7.js';
