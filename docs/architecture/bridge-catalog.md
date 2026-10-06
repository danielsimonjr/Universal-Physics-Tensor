# Bridge catalog

A bridge equation is a record in `data/bridge-catalog.json`. Adding a record does not add a TypeScript module.

## Record

`type` is required and is `standard` or `cross-domain`. `cross-domain` means the equation joins quantities or constants from two distinct fields. `standard` means the equation stays inside one field. Dogfood rows keep the label the proposal printed. `type` does not light an evidence tag. The catalog field is authoritative. The human-readable ledger is [`bridge-type-classification.md`](bridge-type-classification.md).

`derivedFrom` and `basis` are optional. They stay off the record until a derivation theorem is pinned. `basis: false` is not a state. `formalKey` names a vendored PhysJS manifest entry. `formalRef` is derived from that key. The schema is version 3.

A closed form is a relation: an expression string, a target, sources, a `holds` domain, and an optional reference value. A confrontation is a record plus the generic residual. A numerical method is named by the method. A record may name that method. The method is not named by a bridge number.

## Engine

One parser reads the expression. MathTS evaluates it. The same parse builds the dimensional tree, with the sign of a unary minus kept. Solving for an unknown, a composition edge, a dimension check, a listing, and the public evaluation all read the record. `evaluateRelation` is that evaluation.

Hyphenated quantity names are rewritten to underscores, longest first, before the parse. A hyphen is otherwise subtraction.

## Quantity registry

`data/quantities.json` is the registry: canonical id, aliases, dimension, and kind. Synonym agreement is the aliases. An interval-versus-point reading is the declared kind. `temperature-change` is an interval. `dT` is its own interval record and is not an alias of temperature. An evaluator parameter keeps its unit on the catalog record. The registry records no unit for a quantity.

## Specification

The specification writes up each cross-domain record and does not write up a standard record. The section's formula and formal reference agree with the record.

## Guard

A filename that contains a bridge number (`be` followed by digits), a round tag (`-r` and digits), the word `dogfood`, or `round` as its own path segment fails. A code identifier `BE` followed by digits, or a string whose entire content is `be-` and digits, fails outside the catalog loader. The loader is the only module that parses a bridge id out of text.
