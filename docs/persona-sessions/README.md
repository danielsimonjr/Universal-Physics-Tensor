# Persona dogfood sessions

A round exercises the latest published `universal-physics-tensor` as a model persona (not a human reviewer) and records what it found. The persona changes every round, so each round looks at a region of physics the earlier ones did not. Which persona ran last, and which is next, is state: it is in `NOTES.md`, not here.

## The rotation

One persona per round, in this order. After the last, go back to the first, or add a persona for an area the catalog still covers thinly.

1. Condensed-matter physicist: transport, superconductivity, band and phonon relations.
2. Plasma and space physicist: MHD, wave modes, kinetic and fluid closures.
3. Thermal and chemical engineer: heat and mass transfer, phase equilibria, dimensionless groups.
4. Relativist and astrophysicist: GR limits, radiative transfer, stellar structure.
5. Optics and photonics engineer: EM in media, dispersion, radiometry.
6. Acoustics and continuum-mechanics engineer: elasticity, fluid–structure, wave propagation.

The engineering and applied-physicist personas ran earlier and sit outside the list.

## Each round

- Run against the latest published package, the same way as earlier rounds.
- Look for candidate bridges that **units alone cannot establish**: numeric factors (the 2 in `B²/(2μ0)`), non-unique monomials, sums of terms with units. Those need a Lean proof in PhysJS (axioms `propext`, `Classical.choice`, `Quot.sound`; no `sorry`), then a vendored manifest and a catalog record here (`WORKFLOWS.md`).
- File every bug and fix each at its root cause.
- A candidate is unproven until PhysJS proves it. A negative result is a result: record it.
- Name the persona in the report header, and update the persona line in `NOTES.md` so the next round picks the next one.

## Report template

File: `docs/persona-sessions/<date>-<persona>-bridges-session-<n>.md`

```
# <Persona> dogfood, session <n>, <date>

Persona: <name> (rotation position <k> of 6, or "outside the rotation")
Package under test: universal-physics-tensor@<version>
Next persona: <name>

## What was run
## Candidate bridges (unproven; units cannot establish these)
## Bugs filed (issue numbers)
## Negative results
```
