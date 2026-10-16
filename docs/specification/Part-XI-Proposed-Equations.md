# Part XI — Proposed Equations (machine-derived, UNADJUDICATED)

> **Status: NON-NORMATIVE review surface.** Every equation in this Part is
> **machine-derived** by the identity-consequence surfacer
> (`src/composition/proposed-bridges.ts`, `upt discover --derive`) and carries
> `status: 'unadjudicated'`. **None is a bridge equation, a law, or validated
> physics.** Each is the *algebraic consequence* of a hypothesised quantity
> identification the discovery funnel flagged as `promising` — a dimensional
> coincidence with **no asserted mechanism and no independent literature**. These
> entries are deliberately kept OUT of the 44-entry `BRIDGE_EQUATIONS` catalog
> (Part II); promotion of any one into the catalog requires the Status-Promotion
> Protocol (Part VI §XXVII-B): an adversarial + literature review recorded via
> `promoteProposal({citation, status, reviewRef})`. Where this Part and the code
> disagree, the code (`src/`) plus its test suite is authoritative.

## 1. What this Part is

The discovery funnel (`upt discover`) hypothesises identifications `a ≡ b` between
two equal-dimension quantities and vets each for structural and numerical
consequence. When both `a` and `b` are the *targets* of monomial equations
(canonical `CE-*` or a bridge edge with a clean-monomial `symbolic` form), the
identity makes their right-hand sides equal, and eliminating the shared quantity
yields one new relation among the union of their inputs. The surfacer derives that
relation by exact monomial division and records it here.

This is **not** equation discovery in the sense of new physics. By construction
the output is an algebraic restatement of a conjunction of two *existing*
equations under an *unadjudicated* identity. Its only claim is dimensional
consistency; its value is to put the consequence in front of a physicist to judge.

Admissibility (both source equations): a determinate monomial form, a closed
constant prefactor (canonical `epistemicStatus: 'fully-quantitative'`, or a bridge
`symbolic` monomial with no operator-valued stub), and — for the listing below —
the widest source scope, `upt discover --source=both --derive` (catalog ∪ canonical).

## 2. Catalog of proposed equations

Snapshot of **5 proposed equations** for `--source=both` (**3** for
`--source=canonical`; regenerate with the command in §4 — the count is a
measurement, not a fixed cardinality). The set **grew from 2 → 5 (1 → 3 canonical)**
when the Adam+Eve canonical-L-layer expansion (29 → 66 laws) added new
`fully-quantitative` monomial laws — chiefly `CE-mass-energy` (E = mc²) and
`CE-hubble-distance` (D_H = c/H) — that pair *cross-cluster* with existing ones.
This is exactly the growth condition this section predicted: it requires new clean
closed-form (monomial) relations, **physics content, not tuning**. The set remains
invariant under the discovery knobs — `--max-orders` and `--anchor` reshape the
candidate funnel but add no proposal (every extra promising candidate pairs a
clean-monomial source with a non-monomial one).

PE-1/PE-3/PE-5 are `--source=canonical` (standard-physics only); PE-2/PE-4 need the
speculative bridge BE-18 and so appear only under `--source=both`.

| ID | Derived relation | [dim] | From identification | Sources |
|---|---|---|---|---|
| PE-1 | `ν = k_B · ln2 · T / h` | [frequency] | `erasure-energy ≡ photon-energy` | CE-landauer, CE-planck-einstein |
| PE-2 | `T = v · g / (k_B · ln2)` | [temperature] | `dark-fermion-mass ≡ erasure-energy` | BE-18, CE-landauer |
| PE-3 | `m = h · ν / c²` | [mass] | `photon-energy ≡ rest-energy` | CE-planck-einstein, CE-mass-energy |
| PE-4 | `m = v · g / c²` | [mass] | `dark-fermion-mass ≡ rest-energy` | BE-18, CE-mass-energy |
| ~~PE-5~~ | ~~`T = b · H / c`~~ | ~~[temperature]~~ | ~~`peak-wavelength ≡ hubble-distance`~~ | ~~CE-hubble-distance, CE-wien~~ (no longer derived; see PE-5 below) |

> **Adjudicated 2026-06-21 — 0 promoted.** Independent Adam (gemini-2.5-pro) + Eve
> (o3) review (Part-VI §XXVII-B): PE-1/PE-2/PE-5 are **dimensional coincidences**
> (reject), PE-4 is **trivial/definitional** (reject), PE-3 (`m=hν/c²`, the
> Compton/de-Broglie frequency) is **recognized physics already entailed by the
> L-layer** — real but redundant, *not* a new bridge. No catalog change; the firewall
> holds. The proposals remain a documented review surface, not physics. Full record:
> `docs/research/proposed-equations-adjudication.md`.

---

### PE-1 — "Landauer photon"

- **Derived relation:** `ν = (k_B · ln₂ · T) / h`  →  `nu = \frac{k_B \cdot ln2 \cdot temperature}{h}`
- **Dimensional signature:** `[frequency]`  (verified: `validate(ast).inferredDimension`)
- **Solved for:** `nu` (photon frequency). Free input: `temperature`. Invertible.
- **Derivation:** Landauer's erasure bound `E = k_B T ln2` (`CE-landauer`) and the
  Planck–Einstein relation `E = h ν` (`CE-planck-einstein`) are identified through
  `erasure-energy ≡ photon-energy`; eliminating the shared energy gives the
  frequency of a photon whose quantum equals one bit's erasure cost,
  `ν = k_B T ln2 / h`.
- **Bridged regimes:** information ↔ quantum.
- **Also derivable from:** `landauer-erasure-energy ≡ photon-energy` (the bridge
  BE-16 form of Landauer's bound yields the identical relation; the two collapse
  under normal-form dedup).
- **Numeric illustration (NOT a prediction):** at `T = 300 K`, `ν ≈ 4.33 × 10¹² Hz`
  (≈ 4.33 THz).
- **References (honest):** machine-derived — the combined relation has no
  independent literature. Source equations: `CE-landauer` (Landauer 1961);
  `CE-planck-einstein` (Planck 1900; Einstein 1905).
- **Known issue:** `phenomenological-ansatz` — a dimensional coincidence with no
  mechanism; pending §XXVII-B review before any catalog promotion.

### PE-2 — dark-fermion / erasure temperature

- **Derived relation:** `T = (v · g) / (k_B · ln₂)`  →  `temperature = \frac{vacuum-expectation-value \cdot yukawa-coupling}{k_B \cdot ln2}`
- **Dimensional signature:** `[temperature]`
- **Solved for:** `temperature`. Free inputs: `vacuum-expectation-value` (v),
  `yukawa-coupling` (g). Invertible.
- **Derivation:** the hidden-sector mass relation `m_dark = g · v` (`BE-18`, the
  first machine-usable bridge symbolic form) and Landauer's bound `E = k_B T ln2`
  (`CE-landauer`) are identified through `dark-fermion-mass ≡ erasure-energy`;
  eliminating the shared energy gives the temperature at which one bit's erasure
  cost equals the dark-fermion mass-energy, `T = g v / (k_B ln2)`.
- **Bridged regimes:** field-A ↔ field-B (BE-18, speculative) ↔ information.
- **Also derivable from:** `landauer-erasure-energy ≡ dark-fermion-mass` (via the
  BE-16 bridge form of Landauer's bound; collapses under dedup).
- **Numeric illustration (NOT a prediction):** with `g ≈ 1` and `v` at the
  electroweak scale (246 GeV ≈ 3.94 × 10⁻⁸ J), `T ≈ 4.12 × 10¹⁵ K` — i.e. the
  electroweak energy scale expressed as a temperature.
- **References (honest):** machine-derived — no independent literature for the
  combined relation. Source equations: `BE-18` (Peskin & Schroeder 1995 §20.1;
  arXiv:1311.0029; arXiv:2005.01515; PDG 2022 — the VEV/Yukawa mass-generation
  references carried by the bridge); `CE-landauer` (Landauer 1961).
- **Known issue:** `phenomenological-ansatz` — a cross-sector dimensional
  coincidence (a hidden-sector mass set equal to a thermodynamic erasure cost) with
  no mechanism; the `dark-fermion-mass` source is itself a `speculative` bridge.
  Pending §XXVII-B review.

### PE-3 — mass–frequency (photon ≡ rest energy)

- **Derived relation:** `m = h · ν / c²`  →  `mass = \frac{h \cdot nu}{c^{2}}`
- **Dimensional signature:** `[mass]`
- **Solved for:** `mass`. Free input: `nu`. Invertible (`ν = m c² / h`).
- **Derivation:** Planck–Einstein `E = h ν` (`CE-planck-einstein`) and mass–energy
  `E = m c²` (`CE-mass-energy`) are identified through `photon-energy ≡ rest-energy`;
  eliminating the shared energy gives the mass whose rest energy equals a photon's
  quantum, `m = h ν / c²`. Unlike most proposals this is a *recognised* physics
  identity — the pair-production / inverse-Compton threshold `h ν = m c²` — which is
  why it surfaces cleanly; it is still listed as machine-derived and unadjudicated.
- **Bridged regimes:** quantum ↔ mechanics (relativistic).
- **Numeric illustration (NOT a prediction):** `h ν = m_e c²` at `ν ≈ 1.24 × 10²⁰ Hz`
  (a 511 keV γ-ray) — the electron pair-production threshold.
- **References (honest):** machine-derived; source equations `CE-planck-einstein`
  (Planck 1900; Einstein 1905) and `CE-mass-energy` (Einstein 1905).
- **Known issue:** `phenomenological-ansatz` — surfaced as a dimensional identity;
  the *physical* threshold reading is standard, but the surfacer asserts no mechanism.
  Pending §XXVII-B review.

### PE-4 — dark-fermion rest-mass (dark-fermion ≡ rest energy)

- **Derived relation:** `m = v · g / c²`  →  `mass = \frac{vacuum-expectation-value \cdot yukawa-coupling}{c^{2}}`
- **Dimensional signature:** `[mass]`
- **Solved for:** `mass`. Free inputs: `vacuum-expectation-value` (v),
  `yukawa-coupling` (g).
- **Derivation:** the hidden-sector mass relation `m_dark = g v` (`BE-18`) and
  mass–energy `E = m c²` (`CE-mass-energy`) are identified through
  `dark-fermion-mass ≡ rest-energy`; the result is the same VEV/Yukawa mass
  re-expressed via E = mc² rather than via Landauer (cf. PE-2).
- **Bridged regimes:** field-A ↔ field-B (BE-18, speculative) ↔ mechanics.
- **Numeric illustration (NOT a prediction):** with `g ≈ 1` and `v` at the
  electroweak scale (246 GeV), `m ≈ 4.4 × 10⁻²⁵ kg` — the electroweak mass scale.
- **References (honest):** machine-derived; source equations `BE-18` (Peskin &
  Schroeder 1995 §20.1; the VEV/Yukawa references carried by the bridge) and
  `CE-mass-energy` (Einstein 1905).
- **Known issue:** `phenomenological-ansatz` — the `dark-fermion-mass` source is a
  `speculative` bridge; no mechanism asserted. Pending §XXVII-B review.

### ~~PE-5 — Hubble–Wien length coincidence (peak-wavelength ≡ hubble-distance)~~

The funnel no longer derives PE-5: once the Hubble distance has a representative
magnitude (c/H0), the magnitude gate falsifies `peak-wavelength ≡ hubble-distance` at
the default anchor, so the identification is a magnitude clash and not a promising
candidate (the measured orders are in `NOTES.md`).

- ~~**Derived relation:** `T = b · H / c`  →  `temperature = \frac{b \cdot hubble-rate}{c}`~~
- ~~**Dimensional signature:** `[temperature]`~~
- ~~**Solved for:** `temperature`. Free input: `hubble-rate` (H).~~
- ~~**Derivation:** Wien's displacement `λ_max = b / T` (`CE-wien`) and the Hubble distance `D_H = c / H` (`CE-hubble-distance`) are identified through `peak-wavelength ≡ hubble-distance` (both `[length]`); eliminating the shared length gives `T = b H / c`.~~
- ~~**Bridged regimes:** thermodynamics ↔ cosmology.~~
- ~~**Numeric illustration (NOT a prediction):** at the present Hubble rate `H₀ ≈ 2.2 × 10⁻¹⁸ s⁻¹`, `T ≈ 2 × 10⁻²⁹ K` — a physically meaningless value, flagging this as a pure dimensional coincidence (the honest expected outcome).~~
- ~~**References (honest):** machine-derived; source equations `CE-hubble-distance` (Hubble 1929) and `CE-wien` (Wien 1893). No independent literature.~~
- ~~**Known issue:** `phenomenological-ansatz` — equating a blackbody peak wavelength with a cosmological horizon scale has no mechanism; the clearest "coincidence, not physics" case in the set. Pending §XXVII-B review.~~

## 3. Epistemic firewall (why these are not in Part II)

The surfacer cannot author physics, only restate it under a hypothesis, so the
implementation enforces:

1. **Separate registry.** Proposals live in `PROPOSED_BRIDGES` /
   `ProposedBridgeEntry`, never in `BRIDGE_EQUATIONS`; the generator is pinned not
   to mutate the catalog (reference-identity + content-hash test).
2. **Distinct status.** `status: 'unadjudicated'` is **not** a
   `BridgeEquationStatus`, so a proposal is not assignable where a catalog entry is
   expected, and the type omits every physics-judgment field.
3. **No fabricated literature.** `references` is a derivation note plus the *source*
   equations' citations, clearly tagged — never an unqualified citation for the
   derived relation.
4. **Gated promotion.** `promoteProposal` throws unless given a `{citation, status,
   reviewRef}`, operationalising "null, not guessed".
5. **No graph feedback.** A proposal is never added to a composition graph, so a
   coincidence cannot re-enter discovery as an input.

## 4. Regeneration

```bash
npm run build
node bin/upt.mjs discover --source=both --derive   # full catalog ∪ canonical scope
node bin/upt.mjs discover --source=canonical --derive   # standard-physics-only subset
# discovery knobs (reshape the candidate funnel; do NOT change the proposal set):
node bin/upt.mjs discover --source=both --derive --max-orders=12   # looser magnitude gate
node bin/upt.mjs discover --source=both --derive --anchor=mass=1.673e-27   # atomic-scale anchor
```

The registry and renderer are `deriveProposedBridges` / `toProposedEntry` in
`src/composition/proposed-bridges.ts`, pinned by
`tests/composition/proposed-bridges.test.ts`. Design, implementation plan, and the
Adam+Eve adversarial review: `docs/planning/v0.24.0-{Design,Implementation-Plan,Review-Findings}.md`.
This Part is a snapshot; the code and its tests are authoritative.
