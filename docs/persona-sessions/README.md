# Persona dogfood sessions

A round exercises the published `universal-physics-tensor` package as a model persona (not a human reviewer) and records what it found. The persona changes every round, so each round looks at a region of physics the earlier ones did not. Which persona ran last, and which is next, is state: it is in `NOTES.md`, not here.

## The rotation

Seven personas, one per round, in this order. They are the seven that ran against published 8.0.0 (sessions 10 to 16, PRs #459, #468, #464, #487, #481, #476 and #472). After the last, go back to the first, or add a persona for an area the catalog still covers thinly.

1. Engineering physicist: devices, circuits, sensors, applied mechanics (session 10).
2. Condensed-matter physicist: transport, superconductivity, band and phonon relations (session 11).
3. Plasma and space physicist: MHD, wave modes, kinetic and fluid closures (session 12).
4. Thermal and chemical engineer: heat and mass transfer, phase equilibria, dimensionless groups (session 13).
5. Relativist and astrophysicist: GR limits, radiative transfer, stellar structure (session 14).
6. Optics and photonics engineer: EM in media, dispersion, radiometry (session 15).
7. Acoustics and continuum-mechanics engineer: elasticity, fluid–structure, wave propagation (session 16).

The applied-physicist and library-API sessions ran earlier and sit outside the list.

## What a round runs against

Only the package published on npm: `npm install universal-physics-tensor@<latest>` in an empty directory, then the installed `upt` binary and the installed library. Never a checkout, a branch, `dist/` built from the tree, or a packed tarball. A round tests what a user gets; the report header names the exact version.

## What a round proposes

Every round proposes both kinds of candidate bridge, and labels each one with its type, the same `type` a catalog record carries:

- **standard**: a relation inside one domain of physics.
- **cross-domain**: a relation that joins two domains.

A candidate is worth proposing when units alone cannot establish it: a numeric factor (the 2 in `B²/(2μ0)`), a non-unique monomial, a sum of terms with units. A candidate stays unproven until PhysJS proves it. A negative result is a result: record it.

## From reports to fixes and records

1. **All personas report.** Each round files its report under the template below. Bugs are listed in the report; nothing is fixed during a round.
2. **Joint review with the owner.** Once every persona in the batch has reported, the findings are reviewed together with the owner and grouped by root cause, before any fix starts.
3. **Bugs become root-cause PRs in UPT.** One PR per root cause, not one per report or per symptom.
4. **Every bridge proposal, standard or cross-domain, goes to PhysJS first.** It needs a Lean proof there (axioms `propext`, `Classical.choice`, `Quot.sound` only; no `sorry`), stated in a flat `lean/` file with a `PhysJS.*` theorem name.
5. **Then the catalog record.** After the proof is on PhysJS `main`, UPT re-pins the manifest and adds the record to `data/bridge-catalog.json` (`WORKFLOWS.md`). Proof status comes from the Lean proof only.
6. **Only a cross-domain bridge gets a specification write-up.** A standard bridge is a catalog record and has no specification heading.

## Report template

File: `docs/persona-sessions/<date>-<persona>-bridges-session-<n>.md`

```
# <Persona> dogfood, session <n>, <date>

Persona: <name> (rotation position <k> of 7, or "outside the rotation")
Package under test: universal-physics-tensor@<version> (installed from npm)
Next persona: <name>

## What was run
## Candidate bridges (unproven)
### Standard
### Cross-domain
## Bugs found (for the joint review)
## Negative results
```

After the round, update the persona line in `NOTES.md` so the next round picks the next persona.
