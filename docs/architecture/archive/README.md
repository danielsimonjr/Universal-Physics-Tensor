# Architecture Archive — Point-in-Time Records

> **Status as of 2026-10-02.** This file keeps the counts, names, and pins it was written with. The live split is [`NOTES.md`](../../../NOTES.md): ten atlas bridges and fourteen catalog ids (be-12, 16, 21, 27, 33, 37, 40, 43, 50, 54, 55, 59, 60, 63) are Lean kind `bridge` at PhysJS `c6958650f0be66b21f5cc3992d5474bf97ad5094`. `formally-proved` means that kind only. BE-13's catalog name is Einstein trace reduction. The gap list is [`docs/planning/Bridge-Gap-Inference.md`](../../planning/Bridge-Gap-Inference.md). The archived audits, including the `bridge-audit/` tree, keep the proof counts, theorem names, and pins they were written with.

Dated audit reports, baselines, vet reports, release drafts, and design
notes from **v0.4.x through v0.7.x**. Each document describes the
repository as it was on the date in its own header. A reader must not
read the counts, test totals, deferred-item lists, and "current state"
claims in these files as live. Those claims are HISTORICAL.

The archive holds documents moved here on 2026-06-11 (S3 of the
post-v0.10.0 audit). On that day, the same-day 3-agent task audit read
these files as current claims and produced two false positives.
Archiving stops the next audit from repeating that mistake.

Live documents remain in `docs/architecture/`. They are ARCHITECTURE,
OVERVIEW, COMPONENTS, API, DATAFLOW, and DEPENDENCY_GRAPH (with the
generated json and yaml files). They also include TEST_COVERAGE,
benchmarks.md, the tutorials, and BRIDGE-PHYSICS-AUDIT-v2 (it carries
the standing contested-trio dispositions). The older release records
also stay live beside them: v0.8.0-catalog-adjudication,
v0.9.0-baseline, v0.9.0-phase-1-vet, and v0.9.0-tsc-tests-baseline.txt.
