# Universal Physics Tensor Framework

**Computational framework for exploring unified physics through tensor formalism**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/danielsimonjr/universal-physics-tensor/actions/workflows/ci.yml/badge.svg)](https://github.com/danielsimonjr/universal-physics-tensor/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-blue)](https://www.typescriptlang.org/)

## Vision

Modern physics is fragmented across scales and domains: quantum mechanics governs the microscopic, general relativity explains the cosmic, and statistical mechanics bridges between them. Each regime has its own mathematics, assumptions, and approximations. **What if we could represent all of physics in a single mathematical object?**

The Universal Physics Tensor Framework (UPTF) proposes a rank-6 tensor **Π** living in a product space of:
- **Scale** (quantum → mesoscopic → classical → cosmological)
- **Force** (gravitational, electromagnetic, weak, strong, emergent)
- **Symmetry** (Poincaré, gauge, conformal, supersymmetry (`'susy'` in code))
- **Information** (von Neumann, Shannon, Kolmogorov, quantum discord)
- **Dimension** (dimensional analysis constraints)
- **Topology** (topological invariants)

This framework provides a computational laboratory for exploring:
- **Bridge equations** connecting different physical regimes
- **Emergence** of macroscopic laws from microscopic interactions
- **Information-geometry** connections between computation and spacetime
- **Unification** patterns across seemingly disparate phenomena

## Important Context

**I am not a physicist by trade.** I'm a systems engineer specializing in Test Program Set development for defense avionics. This project applies **engineering systems thinking** to theoretical physics questions.

Think of this as:
- **A computational framework** for exploring ideas
- **An engineering approach** to organizing physical knowledge
- **A collaboration platform** inviting physicists to validate/improve
- **NOT claiming to have "solved" or "unified" physics**
- **NOT peer-reviewed theoretical physics** (yet)

**Physicists:** Your expertise is welcomed and needed! Please contribute validation, corrections, and improvements.

## Quick Start

From npm, the CLI is `upt`:

```bash
npm install universal-physics-tensor
npx upt help
npx upt explain hawking-temperature mass=1.989e30
```

The npm package ships `dist/`, `bin/`, this README and the licence. The documentation, the examples
and the test fixtures linked below live in the GitHub repository. The steps below work from a clone
of it:

```bash
# Clone the repository
git clone https://github.com/danielsimonjr/universal-physics-tensor.git
cd universal-physics-tensor

# Install dependencies (Bun is the local/CI package manager; Node ≥ 18 is the runtime).
# Bun is not installed by Node. `corepack prepare bun@1.4.2 --activate` fails
# ("Unsupported package manager specification"). Install the pinned Bun from
# https://bun.sh/install (this repo pins bun@1.4.2), then:
bun install

# Build the project
bun run build

# Run the smoke test
node test-example.js

# Bridge-inference CLI (no TypeScript needed) — `upt` subcommands:
bun run upt -- explain hawking-temperature mass=1.989e30   # explain a built-in quantity
bun run upt -- priority                                    # triage speculative bridges
bun run upt -- audit                                       # derive the bridges by dimensions
bun run upt -- predict                                     # empty regime cells as link hypotheses
bun run upt -- discover                                    # vet link candidates (merge/unlock/consistency)
bun run upt -- discover --source=canonical                 # run the funnel on standard physics ALONE (no bridges)
bun run upt -- discover --derive                           # surface machine-derived identity consequences (--max-orders / --anchor flags available)
bun run upt -- probe scan                                  # experimental expression/residual frontier (Product B; not `upt discover`)
bun run upt -- probe run --problem=tests/fixtures/discovery/pendulum-scaling/public/problem.json   # a fixture in the clone
bun run upt -- connectors                                  # which isolated bridges can connect to the core
bun run upt -- coverage                                    # audit each bridge's empirical grounding
bun run upt -- canonical                                   # the standard-physics L-layer registry (answer key)
bun run upt -- recover                                     # validate bridges against standard physics
bun run upt -- symbolic --simplify                         # compose + fold bridges' SYMBOLIC forms (MathTS simplify)
bun run upt -- confront                                    # run the catalog's committed real-data confrontations (predicted vs observed)
bun run upt -- map --source=both --format=mermaid          # VISUAL map of the graph (Mermaid; also --format=dot|svg, --proposed, --out=PATH)
bun run upt -- map --equation "period = 2*pi*sqrt(length/gravity)"   # drop YOUR OWN equation onto the map: dimensional check + where it lands
# ...and YOUR OWN equations:
bun run upt -- eval "hbar*c^3/(8*pi*G*M*k_B)" hbar=1.054571817e-34 c=299792458 G=6.6743e-11 M=1.989e30 k_B=1.380649e-23
bun run upt -- derive period:time length:length gravity:acceleration --formula "2*pi*sqrt(length/gravity)"
#   → period ∝ length^0.5·gravity^-0.5 ; formula dimension: [time] ✓ matches target ;
#     formula MATCHES, recovered prefactor ≈ 6.2832 (2π)
bun run upt -- help
# From an npm install, run the same commands as `npx upt <cmd>`.
# (`bun run explain` and `bun run bridge-priority` remain as aliases.)
```

`eval`/`derive --formula` use the MathTS expression engine
(`@danielsimonjr/mathts-functions`) when the optional peers are installed,
and a built-in, dependency-free parser otherwise — transparently, via a
`FormulaParser` registry (`upt eval --debug` prints which is active; `upt version`
stays a bare semver line). A clone's `bun install` or `npm install` installs
the MathTS packages as devDependencies, so that path uses MathTS. A published
`npm install universal-physics-tensor` does not install the optional peers and
uses the builtin parser. The two are not the same language: MathTS accepts
`factorial`, `erf`, `gamma()`, and juxtaposition such as `2pi`; the builtin
parser does not. Both read a bare `e` as the elementary charge, `E` as energy,
and Euler's number only as `exp(x)`, for example `exp(1)`. The name `euler` is refused. On a machine that has Node
and not Bun, the clone path is `npm install`, `npm run build`, then
`node bin/upt.mjs <command>`. UPT keeps
**zero hard dependencies**; the MathTS packages and `@viz-js/viz` are optional peers, which a
default install does not pull in. Add the ones you want, for example
`npm install @danielsimonjr/mathts-functions` for the MathTS parser, or `npm install @viz-js/viz`
for `upt map --format=svg`. The `universal-physics-tensor/numerical/mathts-engine` subpath imports
`@danielsimonjr/mathts-tensor` directly, so importing it without that peer fails with
`ERR_MODULE_NOT_FOUND`. That is the opt-in, not a bug: install the peer to use the engine. The main
entry point never loads that subpath.

See [`cli/README.md`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/cli/README.md) for the full CLI reference — every command
and alias, the `--source=catalog|canonical|both` flag, input syntax, exit codes,
and troubleshooting. [`docs/architecture/PHYSICS_MAP.md`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/PHYSICS_MAP.md)
shows the rendered map (`upt map --format=mermaid|dot|svg`).

## Installation

```bash
npm install universal-physics-tensor
```

Or install directly from GitHub:

```bash
# Clone and build locally
git clone https://github.com/danielsimonjr/universal-physics-tensor.git
cd universal-physics-tensor
npm install
npm run build
```

```typescript
import { UniversalTensor } from 'universal-physics-tensor';
import type { PhysicalLaw, BridgeEquation } from 'universal-physics-tensor';

// Create a tensor instance
const tensor = new UniversalTensor({
  rank: 3, // Start simple
  scales: ['quantum', 'classical'],
  forces: ['electromagnetic', 'gravitational'],
});

// Register a known law (e.g., Schrödinger equation)
const schrodinger: PhysicalLaw = {
  id: 'schrodinger',
  name: 'Schrödinger Equation',
  equation: 'iℏ ∂ψ/∂t = Ĥψ',
  scales: ['quantum'],
  forces: ['electromagnetic'],
  symmetries: ['poincare'], // strictly Galilean for non-relativistic Schrödinger; 'poincare' used as placeholder (no 'galilean' in current Symmetry type)
  confidence: 1.0,
};
tensor.addLaw(schrodinger);

// Query laws applicable to the quantum regime
const quantumLaws = tensor.queryLaws({ scale: 'quantum' });
console.log(quantumLaws.map(l => l.name));
```

> **Note:** Each catalogued bridge ships a computable `evaluate*()` function, and
> the `BridgeEquations` facade (v0.14) gathers them under readable method names —
> e.g. `BridgeEquations.decoherenceRate({ gamma0_per_s, lambda, lambda0 })` (BE-11)
> or `BridgeEquations.hawkingTemperature({ M_kg })` (BE-42). The formal spec
> (Parts I–III) defines the underlying physics and AST encodings; the facade is
> the convenience layer over those evaluators.

## Core Concepts

### The Universal Tensor

The tensor **Π** is decomposed (classified) into three components:

**Π = L + B + E**

Where:
- **L** (Laws): Known physics on the diagonal (QM, GR, SM, etc.)
- **B** (Bridges): Off-diagonal equations connecting regimes
- **E** (Emergence): Higher-order correlations producing emergent phenomena

> **Note on notation:** the "+" here denotes disjoint union of catalog entries (each tensor slot holds content of exactly one category), not algebraic addition. The type system enforces this disjointness via the `Cell` discriminated union in [`src/core/cell.ts`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/src/core/cell.ts); `UniversalTensor.populatedCells()` is the canonical way to enumerate the populated catalog as typed `Cell` values. See also [Part I §1.2](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-I.md) for the spec-level treatment. Different slots may hold quantities of different physical dimensions (e.g., a Lagrangian density and a decoherence rate) and cannot be summed numerically.

### Bridge Equations

Bridge equations connect different physical regimes:

**Quantum ↔ Classical:**
- Decoherence Master Equation
- Mesoscopic Coherence Length

**Information ↔ Geometry:**
- Einstein trace reduction
- Holographic Quantum Error Correction

**Microscopic ↔ Macroscopic:**
- Universal Emergence Equation
- Complexity-Entropy Production Relation

Parts I–II of the formal specification document the original BE-11…54 corpus; later established additions BE-55…65 are captured in the live code/research record. The **authoritative current catalog** is the versioned, test-pinned JSON artifact at [`data/bridge-catalog.json`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/data/bridge-catalog.json), which currently spans BE-11…65. Part III covers algorithmic implementation.

### Composing Bridges (v0.8.0)

Bridges are edges in a typed quantity graph, and compatible edges
**compose** — with an exact dimensional check at the junction, validity
domains carried through, and confidence demoted to the weakest link:

```typescript
import { composeEdges, be42Edge, be16Edge, M_SUN_KG } from 'universal-physics-tensor';

// Hawking temperature (M → T_H) ∘ Landauer bound (T → E_min)
const erasureCost = composeEdges(be42Edge, be16Edge);
erasureCost.evaluate({ mass: M_SUN_KG }); // ≈ 5.9e-31 J — E_min(M) = ℏc³ln2/(8πGM)
erasureCost.confidence;                   // 'highly-speculative' (min of the operands)
```

`GM_SUN_SI` is the IAU 2015 nominal solar gravitational parameter, `1.3271244e20` m³/s². It is not `G_SI * M_SUN_SI`. `parseUnit`, `convertValue`, and `UnitError` read a number with a unit:

```typescript
import { GM_SUN_SI, convertValue } from 'universal-physics-tensor';

GM_SUN_SI;                    // 1.3271244e20
convertValue('25degC', 'K'); // { value: 298.15, given: 'degC' }
```

That derived relation — the minimum erasure cost at a black-hole
horizon — is the framework's first **derived** (rather than encoded)
literature-anchored result, pre-registered before implementation and
pinned to relErr ≤ 10⁻¹² (see [Part IX](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-IX-Composition.md)
and `docs/planning/v0.8.0-Design.md`). A computable **membership
criterion** (a bridge's endpoint quantities must differ in regime) now
adjudicates the catalog — 36 bridges · 5 not-a-bridge · 3 contested —
with rejections recorded in a reviewable negative catalog
(`src/bridges/rejected.ts`).

Since v0.12, composition is also **symbolic** (`composeSymbolic`): bridges may
carry an optional `symbolic` `ExprNode` form, and composing two of them
substitutes one AST into the other's junction, dimensionally validated and
numerically evaluable — not just a chained numeric closure. The composed form
can be folded by MathTS `simplify` (optional peer), so CT-1 reduces to
`ℏc³ln2/(8πGM)` with `k_B` cancelled. See `upt symbolic --simplify`.

## Documentation

### Formal Specification
Complete theoretical foundation of the Universal Physics Tensor Framework —
see the **[specification index](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/README.md)** for the full
reader's map and the **[spec revision history](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/CHANGELOG.md)**
for how the documents evolved.

- **[Part I: Foundation & Mathematical Framework](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-I.md)** - Tensor structure, Π = L + B + E decomposition, Bridge Equations 11-20
- **[Part II: Extended Bridge Equation Catalog](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-II.md)** - Bridge Equations 21-54 across condensed matter, quantum biology, emergent spacetime
- **[Part III: Computational Implementation](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-III.md)** - Algorithms, information-theoretic bounds, ML integration
- **[Part IV: Validation & Implications](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-IV.md)** - Experimental pathways, philosophical implications, applications
- **[Part V: Advanced Mathematics & Protocols](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-V.md)** - Category theory extensions, validation protocols, algorithmic analysis
- **[Part VI: Deployment & Governance](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-VI.md)** - Implementation strategies, applications, governance frameworks
- **Supplements** - [Part VII: Tensor Algebra](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-VII-Tensor-Algebra.md) · [Part VIII: Metric Layer](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-VIII-Metric-Layer.md) · [Part IX: Composition](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-IX-Composition.md) · [Part X: Curvature & Field Equations](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-X-Curvature-and-Field-Equations.md) · [Part XI: Proposed Equations](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/specification/Part-XI-Proposed-Equations.md) (non-normative; machine-derived identity consequences, unadjudicated)

### Planning & Development
- **[ROADMAP.md](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/ROADMAP.md)** - Strategic direction: from bridge catalog to a verified, regime-aware physics atlas (phased, with exit criteria)
- **[Development Plan](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/planning/Development-Plan.md)** - Phased implementation roadmap
- **[Implementation Plan](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/planning/Implementation-Plan.md)** - Technical architecture
- **[System Requirements](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/planning/System-Requirements.md)** - Functional requirements

### Architecture

Grounded in a real parse of the code. Every authored document ends with a `## Verification` block,
and `repo_map.py check` fails when a claim in one stops matching the source.

- **[Overview](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/OVERVIEW.md)** - What this is, what it does, how it is laid out
- **[Architecture](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/ARCHITECTURE.md)** - Why it is built this way; principles and key decisions
- **[Components](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/COMPONENTS.md)** - Each module, with real signatures
- **[Data Flow](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/DATAFLOW.md)** - How a request travels end to end
- **[API Reference](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/API.md)** - The public surface, per export
- **[File Inventory](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/FILE_INVENTORY.md)** - Every tracked file, by zone and disposition
- **[Test Coverage](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/TEST_COVERAGE.md)** - What is tested and what is not *(generated)*
- **[Dependency Graph](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/DEPENDENCY_GRAPH.md)** - Who imports whom *(generated)*
- **[Unused Analysis](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/unused-analysis.md)** - Files and exports with no importer *(generated)*
- **[Duplicate Symbols](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/duplicate-symbols.md)** - Names defined in more than one file
- **[Physics Map](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/PHYSICS_MAP.md)** - The bridge catalog as a map

Regenerate the three generated reports with `npm run docs:deps`; do not edit them by hand. The
`docs-fresh` CI job fails if what is committed differs from a fresh generation.

### Code Documentation
- **[Examples](https://github.com/danielsimonjr/universal-physics-tensor/tree/master/examples)** - Usage examples and code samples
- **[Documentation Index](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/README.md)** - Complete documentation guide

## Benchmarks

UPT ships benchmark infrastructure via [Vitest bench](https://vitest.dev/guide/features.html#benchmarking):

```bash
npm run bench        # interactive run (median, p99, ops/sec)
npm run bench:ci     # verbose run for CI log capture
```

Baseline results are recorded in [`docs/architecture/benchmarks.md`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/architecture/benchmarks.md).
These are **correctness-first baselines, not optimization targets**. Comparative
analysis has since landed: v0.6.0's BR-2 `christoffelFn` flat-array refactor
delivered a measured **5-6× RK4 geodesic-integrator speedup** (see [CHANGELOG](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/CHANGELOG.md)).

## Development Status

The current version is recorded in `package.json` and on npm; release chronology
lives in the [CHANGELOG](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/CHANGELOG.md). This README deliberately carries **no
version number and no release-by-release counts** — both drift, and nothing gates
this file. It said `v0.44.1` while the package was at `0.44.3`.

The current machine-checked state is:

| Surface | Current state |
|---|---|
| Bridge catalog | **55 entries (BE-11…65)**: 19 established, 33 speculative, 3 highly speculative; the JSON artifact is freshness-tested against the TypeScript registry |
| Empirical spine | **19 committed confrontations**, exposed through `upt confront` with rigor/caveat metadata |
| Composition layer | **41 bridge edges** plus the canonical L-layer graph; dimensional, symbolic, discovery, consequence, and visualization tooling |
| Canonical reference layer | **109 canonical equations** used as the non-speculative answer-key layer for bridge recovery/linkage |
| Architecture | Generated dependency graph reports **0 circular dependencies** and a clean unused-analysis report; `npm run docs:deps` is CI freshness-gated |
| Quality gates | Build, strict source+test TypeScript checks, full Vitest suite, active-plan audit, package-content smoke test, and nightly long-horizon GL4/Shapiro accuracy tests |
| Formal references | **10** atlas bridges derive `formally-proved` from a reviewed `lean4-physjs` reference. **16** catalog equations carry a counted reference and do not light that tag. **13** state the catalogued equation, so the kind is `bridge` while the covers line still begins with `derivation-step`; passing one to `deriveEvidence` lights `formally-proved`, and the catalog path still omits it. **3** carry a cross-check and **3** carry a property, and `be-28` is a property whose covers line begins with `derivation-step`. Nested statements are not second references. The pin and the split are [`NOTES.md`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/NOTES.md) |

The project is **engineering-complete for its stated goal**: it is a computational
laboratory and falsification/review instrument, not a claim that physics itself is
complete or unified. New physics claims remain reviewable hypotheses and require
external evidence/domain review before promotion.

### Remaining frontier (not code-completion blockers)

- Physics-curation decisions and literature validation are tracked as bounded
  contributor tasks in [CONTRIBUTING.md](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/CONTRIBUTING.md).
- Longer-horizon production ideas are explicitly non-blocking and live in
  [`docs/planning/Future-Production-Hardening.md`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/docs/planning/Future-Production-Hardening.md).
- Historical implementation plans are preserved as records; the live code-completion
  ledger is [`ACTIVE.md`](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/ACTIVE.md) and is what
  `npm run audit:plans` gates.

## Contributing

See **[CONTRIBUTING.md](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/CONTRIBUTING.md)** — it lists bounded,
no-code-required physics-review tasks (catalog adjudications, encoding
checks against the literature, quantity-identification reviews) plus
the dev quick-start, and explains the JSON catalog review surface.

Contributions are welcome, especially from:
- **Physicists** - Validate equations, suggest corrections, add physics insights
- **Mathematicians** - Verify formalism, improve rigor, suggest optimizations
- **Engineers** - Improve architecture, add features, optimize performance
- **Educators** - Create examples, improve documentation, develop tutorials

## Background & Philosophy

This project emerged from a simple question: **"If I had to design a test program set for all of physics, how would I structure it?"**

In Test Program Set (TPS) development for avionics, we create systems that:
- Interface across multiple domains (hardware, software, physics)
- Bridge different measurement scales (micro to macro)
- Maintain consistency across transformations
- Enable diagnostic troubleshooting

The same systems thinking applies to physics:
- Known laws = verified test procedures (diagonal elements)
- Bridge equations = interface adapters (off-diagonal elements)
- Emergence = higher-order system behaviors (correlations)
- Validation = experimental data matching (consistency checks)

This is an **engineer's approach to theoretical physics** — systematic, organized, and open to collaboration with domain experts.

## License

Code: MIT License - see [LICENSE](LICENSE). Exported atlas data (`data/atlas/`): CC BY 4.0 - see [LICENSE-DATA](https://github.com/danielsimonjr/universal-physics-tensor/blob/master/LICENSE-DATA).

## Author

**Daniel Simon Jr.**
- Systems Engineer specializing in Test Program Set Development
- Electrical Engineering, University of Texas at Dallas
- Currently: Senior Test Engineer, Lockheed Martin
- Interests: Integrating Philosophy, Science, and Technology

**Connect:**
- GitHub: [@danielsimonjr](https://github.com/danielsimonjr)
- LinkedIn: [danielsimonjr](https://linkedin.com/in/danielsimonjr)
- Substack: [Simon Says!](https://danielsimonjr.substack.com)
- Website: [danielsimonjr.github.io/resume](https://danielsimonjr.github.io/resume/)

## Acknowledgments

This work builds on the shoulders of giants:
- Tensor formalism from differential geometry
- Bridge equations inspired by effective field theory
- Information-theoretic insights from quantum information theory
- Emergence concepts from condensed matter physics
- Systems thinking from engineering practice

---

**Disclaimer:** This is an exploratory computational framework, not peer-reviewed physics research. All results should be validated against experimental data and theoretical physics literature. Collaboration with professional physicists is actively sought to improve accuracy and rigor.
