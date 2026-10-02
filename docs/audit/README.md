# CLI applied-physics audit archive

> **Status as of 2026-10-02.** This file keeps the counts, names, and pins it was written with. The live split is [`NOTES.md`](../../NOTES.md): ten atlas bridges and fourteen catalog ids (be-12, 16, 21, 27, 33, 37, 40, 43, 50, 54, 55, 59, 60, 63) are Lean kind `bridge` at PhysJS `c6958650f0be66b21f5cc3992d5474bf97ad5094`. `formally-proved` means that kind only. BE-13's catalog name is Einstein trace reduction. The gap list is [`docs/planning/Bridge-Gap-Inference.md`](../planning/Bridge-Gap-Inference.md). The report's formal-reference lines, including fidelity `sanity-lemmas` and `formally-proved`, are that 2026-09-26 session.

This is an **AI model-persona audit**, not an independent human physicist review,
peer review, or experimental validation. It records a CLI-only exploration of
UPT 0.47.1 at commit `c2c9dfce905f14f2cce48526bab1417b38c62541` on 2026-09-26.

Start with [the detailed report](Universal_Physics_Tensor_CLI_Audit.md).
Section 14 contains 20 prioritized improvement recommendations with rationale,
acceptance examples, and applied-physics benefits. These are recommendations,
not implemented changes or a new commitment to extend the completed project.

## Evidence

- [Full readable transcript](UPT_CLI_Transcript.md)
- [Machine-readable session](upt-cli-session.jsonl)
- [File hashes and run counts](audit-manifest.json)
- [Canonical map (Mermaid)](canonical-physics-map.mmd)
- [Combined map (SVG)](combined-physics-map.svg)
- [Raw JSON-oriented batch capture](cli-json-capture.txt)
- [Original downloadable bundle](Universal_Physics_Tensor_CLI_Audit_Bundle.zip)

The report and supporting artifacts are preserved byte-for-byte from the
user-approved output. Absolute paths in the record describe that original
execution environment; they are not paths required in a new checkout.
The transcript preserves unsuccessful commands and negative controls.
No physics source code, external literature, or proof artifacts were inspected
to obtain the audit's physics findings. Setup/build operations and explicit-formula
CLI cross-checks are distinguished from independent verification in the report.

The archive is a dated observation, not a statement that every finding remains
open on later versions. The surrounding repository's task and release records
remain authoritative for implementation status.
