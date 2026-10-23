# Bridge catalog

<!-- repo-map:no-verification -->

> **No `## Verification` block, deliberately.** This document describes the shape of a catalog record and the guards on it. It states no count that `repo-tools map` measures. `tests/bridges/catalog-record.test.ts` and `tests/architecture/source-guard.test.ts` hold the rules it describes.
> The drift gate treats a missing Verification section as a failure, so the opt-out is stated here instead of being inferred from the absence.

A bridge equation is a record in `data/bridge-catalog.json`. Adding a record does not add a TypeScript module. `src/bridges/README.md` lists the fields that decide what a row is. This document gives the design behind them.

## Record

`type` is required and is `standard` or `cross-domain`. `cross-domain` means the equation joins quantities or constants from two distinct fields. `standard` means the equation stays inside one field. `type` does not light an evidence tag. The catalog field is authoritative. The human-readable ledger is [`bridge-type-classification.md`](bridge-type-classification.md).

The record has no `derivedFrom` field and no `basis` field. The schema refuses both.

`formalKey` names an entry of the Lean manifest `formal/lean/manifest.json`. `formalRef` is derived from that key. `theorem` and `proofStatus` are that entry's projections, and `catalogProofProblems` checks them.

A closed form is a relation: an expression string, a target, sources, a `holds` domain, and a reference point. A confrontation is a record plus the generic residual.

## Engine

One parser reads the expression. MathTS evaluates it. The same parse builds the dimensional tree, with the sign of a unary minus kept. Solving for an unknown, a composition edge, a dimension check, a listing, and the public evaluation all read the record. `evaluateRelation` in `src/composition/evaluate-relation.ts` is that evaluation.

Declared hyphenated names are rewritten to underscores before the parse. The rewrite takes the leftmost longest match. A hyphen that is not part of a declared name stays subtraction.

## Quantity registry

`data/quantities.json` is the registry. Each record has an id, a symbol, a dimension and a `graphNode` flag. A record can add aliases, a `kind` and a `signRole`. Synonym agreement is the aliases. An interval-versus-point reading is the declared `kind`. `temperature-change` is an interval. `dT` is its own interval record and is not an alias of temperature. An evaluator parameter keeps its unit on the catalog record. The registry records no unit for a quantity.

## Specification

The specification writes up each cross-domain record and does not write up a standard record. The section's formula and formal reference agree with the record.

## Guard

`tests/architecture/source-guard.test.ts` enforces three rules.

- A file or directory name fails in four cases. The name holds a bridge number (`be` and digits, with or without a hyphen). The name holds a round tag (`-r` and digits). The name holds the word `dogfood`. The name holds `round` as a word. The scan covers the whole tree.
- A code identifier that is `BE` and digits, `confrontBE` and digits, or `evaluateBE` and digits fails in any code file. The files in `data/` and `formal/`, the generated PhysJS table, the reviewed-row table and the catalog loader are exempt.
- A string whose whole content is `be-` and digits fails in `src/`. The same files are exempt.

The catalog loader is the only module that parses a bridge id out of text.
