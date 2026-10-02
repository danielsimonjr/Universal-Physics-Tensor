# Documentation

Index of this repository's documents. A count that moves is recorded in `NOTES.md`. This page names the document.

## Formal specification (`specification/`)

Eleven parts. The reader's map, including which claims are speculative, is [`specification/README.md`](specification/README.md).

- **[Part I](specification/Part-I.md)** — foundation, and Bridge Equations 11–20.
- **[Part II](specification/Part-II.md)** — Bridge Equations 21–65.
- **[Part III](specification/Part-III.md)** — algorithms and information-theoretic definitions. The numbered pseudocode remains a specification.
- **[Part IV](specification/Part-IV.md)** — validation pathways.
- **[Part V](specification/Part-V.md)** — advanced mathematics. Read its status note first.
- **[Part VI](specification/Part-VI.md)** — implementation framing and the Status-Promotion Protocol.
- **[Parts VII–XI](specification/README.md)** — tensor algebra, the metric layer, composition, curvature and field equations, and proposed equations (Part XI is non-normative).

The runtime catalog is `BRIDGE_EQUATIONS` in `src/bridges/index.ts`: 55 entries, ids 11–65, 19 established, 33 speculative, 3 highly-speculative. Parts I–II write up those ids. Part II §V-C is BE-55–65. Entries 51 and 53–65 keep `source_part: 'III'`; BE-52 keeps `source_part: 'I'`. Re-count from the array. `NOTES.md` is the rolling note.

## Atlas, roadmap, and formal references

- **[ROADMAP.md](../ROADMAP.md)** — atlas phases.
- **[ACTIVE.md](../ACTIVE.md)** — the authorization ledger. The last promoted sprint heading is Sprint 6.
- **[docs/design/](design/)** — designs written after the roadmap's DONE mark (Lean milestones, tiers, frontier, BE-53).
- **Reviewed `formalRef`s.** Each is `system: 'lean4-physjs'`, naming public [PhysJS](https://github.com/danielsimonjr/PhysJS). The pin is [`formal/physjs/manifest.json`](../formal/physjs/manifest.json). The count is [`NOTES.md`](../NOTES.md).

## Research (`research/`)

Physicist-facing notes: [`research/README.md`](research/README.md). Dated notes keep the counts they were written with. The live confrontation registry has 19 entries.

## Architecture (`architecture/`)

[`architecture/OVERVIEW.md`](architecture/OVERVIEW.md) is the project overview, including the atlas layer. Module design, components, data flow, and the API are the siblings named at the bottom of that file.

## Planning (`planning/`)

Historical plans and design notes. Three plans from 2026-05-04 are **superseded**. They describe a v0.1.0 formalization phase (TypeScript 5.x, ESLint, npm, a catalog of about 40 bridges):

- **[Development Plan](planning/Development-Plan.md)** — superseded.
- **[Implementation Plan](planning/Implementation-Plan.md)** — superseded.
- **[System Requirements](planning/System-Requirements.md)** — superseded.

Later planning lives in [`ROADMAP.md`](../ROADMAP.md), [`todo.md`](../todo.md), and [`planning/Future-Production-Hardening.md`](planning/Future-Production-Hardening.md). The other files under `planning/` are design and review records. Their unchecked boxes preserve those documents. `ACTIVE.md` is the live ledger.

## Purpose

This documentation serves two purposes:

1. **Theoretical foundation** — the specification, for review by physicists.
2. **Engineering context** — the plans and the code that implement it.

## Important note

I (Daniel Simon Jr.) am **not a physicist by trade**. This is an engineering implementation of a theoretical framework. The formal specification documents are shared to:

- Provide complete context for the software implementation
- Enable physicists to review and validate the theoretical foundations
- Invite collaboration from domain experts
- Demonstrate rigorous systems thinking applied to theoretical physics

## Collaboration

If you're a physicist interested in reviewing, validating, or extending this framework, please see the main [README](../README.md) for contribution guidelines.
