# Bridge catalog

A bridge equation is a record in [`data/bridge-catalog.json`](../../data/bridge-catalog.json). Adding a record does not add a TypeScript module. [`catalog-load.ts`](./catalog-load.ts) reads the file. [`evaluateRelation`](../composition/evaluate-relation.ts) evaluates a record. The design is [`docs/architecture/bridge-catalog.md`](../../docs/architecture/bridge-catalog.md).

## Record

The fields that decide what a row is:

- `type` is required. It is `standard` or `cross-domain`. The catalog field is authoritative. The human-readable ledger is [`docs/architecture/bridge-type-classification.md`](../../docs/architecture/bridge-type-classification.md).
- `formalKey` names a vendored PhysJS manifest entry. `formalRef` is derived from that key. It is not stored as its own object on the row.
- A relation is the closed form: an expression string, a target, sources, a `holds` domain, and a reference point. Several relations may share one catalog id. The on-disk list is the catalog `relations` array. A relation's `confidence` is its row's `status`, derived when the catalog loads; the file stores one only on a relation with no row.
- The row owns its relation contract, regime, conventions and counterexamples; a relation carries no copy.
- `rejections` is the negative catalog (rows adjudicated not-a-bridge); `rejected.ts` projects it.
- Every field the schema declares has a reader in `src/`. A field nothing reads is not declared.

## Engine

One parser reads the expression. MathTS evaluates it. The same parse builds the dimensional tree, and the sign of a unary minus is kept. Solving for an unknown, a composition edge, a dimension check, a listing, and the public evaluation all read the record.

## Quantity registry

[`data/quantities.json`](../../data/quantities.json) is the registry: canonical id, aliases, dimension, and temperature kind. Synonym groups are the aliases. An interval-versus-point reading is the declared kind. A unit on an evaluator parameter stays on that catalog record.

## Specification

The specification writes up each cross-domain record and does not write up a standard record. The section's formula and formal reference agree with the record.
