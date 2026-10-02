# Intelligent Index Layer — Tutorial

<!-- repo-map:no-verification -->

> **No `## Verification` block, deliberately.** This document is a tutorial. The tutorial teaches an API through worked examples. It asserts nothing about the size or shape of the repository.
> The drift gate treats a missing Verification section as a failure. This document states
> the opt-out here, so a reader does not have to infer it from its absence.

> The `LabeledTensor` wrapper carries
> persistent physics-axis identity over the existing
> `TensorEngine` einsum surface. Contractions match by identity,
> not by string-equality coincidence.

## What problem does this solve?

Two bridges in the catalog might both contract over the quantum
scale axis. On the AST side, an index label is a plain string like
`'μ'`. Bridge author A writes `'μ'`, bridge author B writes `'μ'`,
and they contract by happy coincidence. If A renames to `'mu'`,
the contraction breaks silently. If A and B *mean* different things
by `'μ'`, the contraction misfires silently.

The Intelligent Index layer introduces a singleton registry, `Axes`,
that holds stable `UniversalIndex` references at module load.
`Axes.scale.quantum` is the **same object** across every import
site in every consumer module. Two `LabeledTensor`s contract iff
their labels share the same `UniversalIndexId` — physics-axis
identity, not name coincidence.

## Five-minute walkthrough

```typescript
import {
  Axes,
  LabeledTensor,
  makeIndex,
} from 'universal-physics-tensor';
import { Float64ReferenceEngine } from 'universal-physics-tensor';

const engine = new Float64ReferenceEngine();

// 1. Build a labeled tensor — pick axes from the Axes registry.
const a = new LabeledTensor(
  engine.fromNested([[1, 2], [3, 4]], [2, 2]),
  engine,
  {
    i: Axes.force.gravitational,
    j: Axes.scale.quantum,
  },
);

// 2. Build another whose `j` axis is the SAME singleton identity.
const b = new LabeledTensor(
  engine.fromNested([[5, 6], [7, 8]], [2, 2]),
  engine,
  {
    j: Axes.scale.quantum,          // SAME object as a's j
    k: Axes.force.electromagnetic,
  },
);

// 3. Contract. The shared `UniversalIndexId` on Axes.scale.quantum
//    drives the contraction; the engine sees a 2×2 matrix product.
const c = a.contract(b);
// c.tensor.shape === [2, 2]
// c.labels keys: 'i' (gravitational), 'k' (electromagnetic)
// Axes.scale.quantum was contracted away.
```

### Identity vs name

```typescript
const a = new LabeledTensor(
  engine.fromNested([1, 2], [2]),
  engine,
  { i: makeIndex('scale', 'quantum') }, // fresh UUID
);

const b = new LabeledTensor(
  engine.fromNested([3, 4], [2]),
  engine,
  { j: makeIndex('scale', 'quantum') }, // ALSO fresh — distinct UUID
);

// a and b's indices have the same `axis` and `name` strings but
// DIFFERENT `id`s. contract throws IndexNameMismatchError and the
// message names both ids. It does not return an outer product.
a.contract(b);
```

Use the `Axes` registry for stable identity across import sites.
`makeIndex` mints a fresh id. Two fresh calls with one name are not
one index, and they are not a silent outer product.

### Cross-axis contractions fail loudly

`UniversalIndex` carries an `axis` discriminator (one of `'scale'`,
`'force'`, `'symmetry'`, `'information'`, `'dimension'`,
`'topology'`). Two contracting indices can share an `id` but
disagree on `axis`, only through direct `makeIndex` misuse or
off-registry index construction. When that happens, `contract`
throws `AxisMismatchError` before it calls `engine.einsum`. The
error names the shared index id and both axes.

### Bridge-level demo

`src/bridges/perihelion-precession-labeled.ts` is the
single-bridge demonstration. The file adds an alternative entry point,
`evaluatePerihelionPrecessionLabeled(inputs, engine)`, that wraps
the three perihelion-advance quantities in a rank-1 `LabeledTensor`
tagged with `Axes.scale.classical`. The original
`evaluatePerihelionPrecession` evaluator is left untouched —
Decision #1's adapter-on-top discipline is preserved.

See `tests/bridges/perihelion-precession-labeled.test.ts` for
end-to-end examples including cross-bridge contraction via the
singleton identity.

## Decisions and non-goals

The full design is in
`docs/planning/v0.7-Proposal-1-Design.md`. Highlights:

- **Decision #1 (adapter on top).** The wrapper does NOT replace
  the existing `TensorSymbolNode.indices` or rewire
  `computeContraction`. AST and engine layers stay intact;
  `LabeledTensor` sits as the catalog-facing surface.
- **Decision #2 (field set).** `UniversalIndex` has only the §2.2 sketch
  fields (`id`, `axis`, `name`, `tags?`, `limits?`, `notes?`).
  `prime` and `arrow` (ITensor-style) are not implemented.
- **Decision #3 (identity matching).** `contract` matches by
  `UniversalIndexId` equality only. The same `name` with different
  `id`s throws `IndexNameMismatchError` and the message names both
  ids. Distinct names stay free axes (an outer product).
- **Decision #7 (runtime axis-mismatch).** Caught by
  `AxisMismatchError` at runtime; compile-time detection via
  template literal types is not implemented.

Non-goals: bulk-migrating every catalog bridge, the
`migrate-strings-to-indices` codemod, AST-level integration, and
QN-aware sector storage (ITensor §8.2).
