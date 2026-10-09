# Candidate bridges from the applied-physicist dogfood

This note records the decisions, the composition refusals, the Lean targets,
and the open notes for three candidates named in
[`docs/persona-sessions/2026-10-03-applied-physicist-bridges.md`](../persona-sessions/2026-10-03-applied-physicist-bridges.md).
The catalog text is Part II §V-C. Part XI is the machine-derived coincidence
list and is the wrong home for a literature candidate.

The three statements are unproven. None has a PhysJS key, a `formalRef`, or
a `leanProof`. Kind is not `bridge`. Passing a units result to
`deriveEvidence` does not light `formally-proved`. The sketches below are
written against PhysJS `2e09357f9674bc60b60b378155a1623c27dc7b04`, toolchain
`leanprover/lean4:v4.34.1`, Mathlib `v4.34.1`, and Physlib
`af484f78ee0701290595f8bf892b157b10d64940`. The PhysJS lakefile at that pin
calls Physlib the library Daniel calls PhysLean, and it requires Mathlib and
Physlib directly. A later library can move a dependency. This note does not
track that move. UPT does not run Lean.

## What this reuses

| Piece | Role here |
|---|---|
| [`Bridge-Discovery-Pipeline-Design.md`](Bridge-Discovery-Pipeline-Design.md), decisions (a), (b), and (c) | A new chain stays provisional (`chain-` plus the ordered edge ids) until a vendored PhysJS proof exists. `parseBridgeId` rejects that id. A units-only result is kind `derivation-step`: the covers line begins `derivation-step:` and names the unfixed `f(1,…,1)` of `PhysJS.Dimensional.monomial_form`. Kind `bridge` requires Lean 4, axioms only `propext`, `Classical.choice`, and `Quot.sound`, `leanProof` complete, and no `sorry`. |
| [`src/bridges/tensor-index.ts`](../../src/bridges/tensor-index.ts) | The §VI.6.1 component is `tensorIndexComponent` of the catalog category letter. The `bridges` tuple, the formula rank, and the dimensional signature do not select it. A letter outside A–O throws. This note does not add a letter. |
| [`Regime-Aware-Join-Gate-Design.md`](Regime-Aware-Join-Gate-Design.md) | The domain facet is that component. Scale and force are `GATE_AXES`. Silence on a facet abstains. The same component is not permission to chain. |
| `proofTargetDraft` in `src/atlas/proof-target.ts` | The field list of a draft: `key`, `bridgeId`, `theorem`, `covers`, `coverage`, `leanProof`, `axioms`. `leanProof` is `absent`. The object is not a manifest entry. The sketches below are written by hand. They are not chain candidates, so `emitProofTarget` is not the producer. |
| Seeds | Kind `bridge` only. `be-64` is `derivation-step` (`PhysJS.Eddington.balance_iff`) and is not a seed. `be-42` is `cross-check` (`PhysJS.HawkingUnruh.dictionary`) and is not a seed. `CE-poynting-flux` and `CE-plasma-frequency` are canonical equations and are not seeds. |

A chain whose endpoints meet does not become a catalog id. The proposed
`be-*` ids below are names for a future catalog row. They are not `chain-`
ids, and they are not assigned by this note.

## Ids

The catalog sequence ends at 65. The owner assigned the next three integers
with no gap:

| Id | Statement | Category letter |
|---|---|---|
| be-66 | Radiation pressure | D |
| be-67 | Alfvén speed | D |
| be-68 | Tolman–Ehrenfest | I |

The astrophysics-cluster design deferred a Tolman–Oppenheimer–Volkoff maximum
mass and called that unused integer 66. Part II §V-C records that the deferred
mass is not BE-66 in this catalog. The owner assigned 66 to radiation pressure
anyway. The deferred mass stays deferred. It does not occupy 66.

## Category letters and the §VI.6.1 index

`tensorIndexComponent` maps the letter. The displayed patterns are already
the patterns for ids 11–65. No new pattern is introduced. The catalog Π is a
labeled index. The Maxwell stress, the MHD wave, and the metric are the
physics tensors of the formulas. They are not that index.

**be-66 and be-67, letter D.** The owner accepted the letter. Category D is
`field-unification`, with K and L. The displayed index is

<img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%2C%5Ctext%7Bforce%7D_i%2C%5Ctext%7Bsymmetry%7D%2C%5Cdelta%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\alpha,\text{force}_i,\text{symmetry},\delta,\epsilon,\zeta}" />

The force slot and the symmetry slot are the occupied indices of that
cluster. Scale stays free. A scalar pressure and a scalar speed do not add an
index: BE-56 is a pressure scalar in the quantum-classical component, and the
signature does not move it. The category name on the catalog is "Field
Unification Bridges". That name is the historical cluster name. It is not a
unification claim. BE-17 dropped the claim that torsion is sourced by the
electromagnetic field. Filing these two rows under D does not reopen that
claim. The bridges tuples are `optics` → `continuum` and `fluid` → `plasma`.
A tuple does not select the component: BE-39's tuple is `quantum` → `classical`
and category L stays in this same component.

**be-68, letter I.** The owner accepted the letter. Category I is
`information-geometry`, with B and M. The displayed index is

<img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%2C%5Cbeta%2C%5Ctext%7BPoincar%C3%A9%7D%2C%5Ctext%7Binfo%7D%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\alpha,\beta,\text{Poincaré},\text{info},\epsilon,\zeta}" />

The symmetry slot is Poincaré and the information slot is occupied. Scale and
force stay free. The information slot is occupied by the pattern. The
Tolman–Ehrenfest criterion is not an information measure. Jeans (BE-65) sits
in the same cluster under the category name "Emergent Spacetime" without the
formula being an emergence theorem, and the same historical-name limit
applies here. BE-57, BE-63, BE-64, and BE-65 are already this component.
BE-42 is category M and is the same component. That shared component does
not admit a chain. The refusal is in the be-68 section.

**Why be-66 is not filed beside BE-64 in category I.** BE-60 stays in
category F because it is the same conductance physics as BE-55. Radiation
pressure is the local force BE-64 takes as a premise. It is not the
Eddington luminosity, and it is not an emergent-spacetime limit. Sharing a
component with BE-64 would follow the dependency rule only if the two
equations were one physics. They are not.

**The three rows are catalog ids, in the form of BE-55 through BE-65.** A
`BridgeEdge` is a bridge when the endpoints differ in regime and a law when
they share regime attributes. Both ports of radiation pressure and of the
Alfvén speed are classical and electromagnetic, which is the shape of a
diagonal law. The dogfood's next step for the Alfvén speed was
`CE-alfven-speed`. The owner chose `be-*` entries instead, matching BE-55
through BE-65: a `BRIDGE_EQUATIONS` row, a §V-C section, and the §VI.6.1
index of the category letter. They are not `CE-*` rows. A new category
letter stays out of scope: `tensorIndexComponent` throws.

**Rows in the §VI.6.1 table.** Part II is the catalog text.

| Proposed id | Category | Index | Why this pattern |
|---|---|---|---|
| 66 | D | field-unification, force and symmetry | Category D, with BE-17 and BE-18. Radiation pressure. Signature `[L^-1 M T^-2]`, the pressure signature BE-56 already carries in a different cluster, so the signature does not decide. The bridges tuple is `optics` → `continuum`. The tuple does not select the component. |
| 67 | D | field-unification, force and symmetry | Category D. Alfvén speed. Signature `[velocity]`. BE-11 and BE-48 both carry `[frequency]` and do not share a component, so a speed signature does not decide either. Same cluster as the proposed radiation-pressure row. The MHD coupling is not a new pattern. |
| 68 | I | information-geometry, Poincaré and info | Category I, with BE-57 and BE-63–65. Tolman–Ehrenfest. The catalog signature is `[temperature]`. The bridges tuple is `gravitation` → `thermodynamics`. The dependency is not BE-42. |

## Candidate sections

The proof block records that the statement is unproven until Lean proves it.

### Radiation pressure — proposed be-66

**Bridge Equation 66: Radiation pressure (optics to continuum)** *(Category D: Field Unification Bridges)* — catalog text is Part II.

> **Unproven.** There is no PhysJS key. `leanProof` is `absent`. The axiom list is empty. Kind is not `bridge`. [`PhysJS.Dimensional.monomial_form`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Dimensional.lean) would give `P = C I / c` with `C = f(1,…,1)` unfixed. The absorber hypothesis `C = 1`, the normal-incidence reflector hypothesis `C = 2`, and the opaque-surface hypothesis `C = (1+R) \cos^2\theta` are not that monomial. [`PhysJS.Eddington.balance_iff`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Eddington.lean) is the `r²` cancellation of BE-64. [`PhysJS.Eddington.wrong_dictionary_factor_two`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Eddington.lean) doubles the luminosity and keeps the Thomson force. That factor of 2 is a different hypothesis from the mirror factor.

> **Evaluator:** `evaluateRadiationPressure` in `src/bridges/be66-radiation-pressure.ts`.

- **Status**: The catalog row is established. The statement stays unproven until a vendored PhysJS proof exists.
- **Context**: The time-averaged pressure of a beam on a surface. The bridges tuple is `optics` → `continuum`. The relation is the local force law BE-64 assumes, with factor 1. It is not the Eddington luminosity.
- **Mathematical formulation**:

<img src="https://i.upmath.me/svg/P%20%3D%20%5Cbegin%7Bcases%7D%20I%2Fc%20%26%20%5Ctext%7Bperfect%20absorber%2C%20normal%20incidence%7D%20%5C%5C%202I%2Fc%20%26%20%5Ctext%7Bperfect%20reflector%2C%20normal%20incidence%7D%20%5Cend%7Bcases%7D" alt="P = \begin{cases} I/c & \text{perfect absorber, normal incidence} \\ 2I/c & \text{perfect reflector, normal incidence} \end{cases}" />

<img src="https://i.upmath.me/svg/P_n%20%3D%20%5Cfrac%7BI%7D%7Bc%7D%281%2BR%29%5Ccos%5E2%5Ctheta" alt="P_n = \frac{I}{c}(1+R)\cos^2\theta" />

where:

- `P` is the time-averaged pressure, in pascals
- `I` is the intensity of the beam, in watts per square metre, the magnitude of the time-averaged Poynting flux
- `c` is the speed of light
- `R` is the intensity reflectance, dimensionless, with transmission taken to be zero, so the absorbed fraction is `1 − R`
- `θ` is the angle between the propagation direction and the outward normal
- the second display is the catalog equation. The owner included it. `R = 0` and `θ = 0` is the absorber endpoint `I/c`. `R = 1` and `θ = 0` is the reflector endpoint `2I/c`. The display is this note's assembly of the normal-incidence factor `(1+R)` with the oblique factor `\cos^2\theta`. It is not a quotation of one source. Transmission is zero. The sail paper's `P` is a pressure, the `I/c` scale, not the intensity

The physics tensor, distinct from the catalog index, is the Maxwell stress in SI,

<img src="https://i.upmath.me/svg/T%5E%7Bij%7D%20%3D%20%5Cvarepsilon_0%5Cleft%28E%5Ei%20E%5Ej%20-%20%5Cdelta%5E%7Bij%7D%5Cfrac%7BE%5E2%7D%7B2%7D%5Cright%29%20%2B%20%5Cfrac%7B1%7D%7B%5Cmu_0%7D%5Cleft%28B%5Ei%20B%5Ej%20-%20%5Cdelta%5E%7Bij%7D%5Cfrac%7BB%5E2%7D%7B2%7D%5Cright%29" alt="T^{ij} = \varepsilon_0\left(E^i E^j - \delta^{ij}\frac{E^2}{2}\right) + \frac{1}{\mu_0}\left(B^i B^j - \delta^{ij}\frac{B^2}{2}\right)" />

For a plane wave in vacuum the time-averaged momentum flux along the
propagation direction equals the energy density `u = I/c`. The surface
pressure is the normal flux of that momentum, with the reflected piece
reversing the normal component. Physlib at the pin has no Maxwell-stress
module. The display is the classical tensor the proof would import. It is
not a theorem of this checkout.

**Dimensions**: `[P] = [M L^{-1} T^{-2}]`. Intensity has dimension
`[M T^{-3}]` and `c` has dimension `[L T^{-1}]`, so `I/c` is pressure. `R`,
`\cos\theta`, and the pure numbers 1 and 2 are dimensionless. Buckingham on
`{P, I, c}` has a unique monomial `P ∝ I c^{-1}`. The constant is unfixed.
The dogfood's `upt derive` recovered prefactor 1 because the typed formula
was `I/c`.

**Domain**: Classical electromagnetism, a time average, a plane wave, and a
surface that is either a perfect absorber or a perfect reflector at normal
incidence. A real surface is neither. The oblique form adds: opaque
(`τ = 0`), specular reflectance `R`, and `θ` measured from the normal. Diffuse
reflection, thermal emission from the surface, and a transmitting film are
outside the statement. The sail formula's extra optical coefficients are
outside it too.

**Regime of validity**: The same domain. There is no `upt regime` family for
it. A future edge would carry the domain as its `ValidityDomain`, not as a
new regime family, unless a later task adds one.

**Literature**:

- The LibreTexts reproduction of OpenStax University Physics Volume 2, section "16.5: Momentum and Radiation Pressure", was opened for this note. It states that the radiation pressure on a perfectly absorbing surface equals the energy density `u` of the wave, that a perfectly reflecting surface at normal incidence has pressure `2u` because the momentum reverses, and that the time average is `I/c` for the absorber and `2I/c` for the reflector. That page is a textbook restatement. The dogfood cites OpenStax §16.4 for the same two formulas. This note does not reconcile the section numbers.
- The English Wikipedia page "Radiation pressure" was opened for this note. It is a compilation. It states `P_incident = (I_f/c) \cos^2 \alpha` for a planar surface at angle `α`, `P_net = 2 I_f/c` for a perfect reflector, and `P_net = I_f (1+η)/c` when `η` is the intensity reflection coefficient. It states those pieces separately. The combined `(1+R)\cos^2\theta` display is this note's product of the normal-incidence factor and the oblique factor. It is not a sentence of that page.
- Simo and McInnes, AAS 16-483 (2016), Glasgow eprint 129011, PDF opened for this note. They write `F_n = P A [(1+\tilde\rho s)\cos^2\gamma + …]` and, for an ideal sail `\tilde\rho = s = 1`, `F = 2 P A \cos^2\gamma`. In that text `P` is the solar radiation pressure, already a pressure, and `A` is area. Their `P` is the `I/c` scale, not the intensity. McInnes, *Solar Sailing* (Springer-Praxis, 2004), was not opened.
- Maxwell, *Treatise on Electricity and Magnetism*, was not opened. The dogfood lists the 1873 text as not opened. A secondary identification of a treatise article with "pressure equals energy density" is not used here, and the isotropic cavity result `u/3` is a different statement from the beam pressure.
- Nichols and Hull, Phys. Rev. (Series I) **13**, 307 (1901) and **17**, 91 (1903), are the papers the dogfood names. They were not opened. No percent is stated.
- The unsigned note "Some Astronomical Consequences of the Pressure of Light", Nature **75**, 90–93 (1906), doi:10.1038/075090a0, was opened by the dogfood and was not re-opened here. The dogfood's reading is the record of that note.
- BE-64. The encoded balance is `L σ_T / (4π r² c) = G M m_p / r²`, so the force on one electron is `I σ_T / c` with `I = L / (4π r²)`. The factor in the catalogued force is 1. Rybicki and Lightman 1979 is the catalog's existing citation and was not re-opened. Eddington 1926 was not re-derived.

**Numeric sanity check**: Computed from `C_SI = 299792458`. Illustrative, not a measurement. `I = 10^6 W/m²` gives `I/c = 0.0033356409519815205 Pa` and `2I/c = 0.006671281903963041 Pa`. Those are the dogfood's printed stand-ins. They show the factor 2 in the arithmetic. They do not choose which surface the factor belongs to.

**Composition edges**: `be-66` is on `CATALOG_GRAPH`. Kind `law`. Not a seed.

- `poynting-flux` has dimension intensity and attributes `{ scale: 'classical', force: 'electromagnetic' }`. `CE-poynting-flux` is `S = E B / μ0`, fully quantitative, regime classical and electromagnetic, and not a seed. The canonical name is not a `Quantity` node on `CATALOG_GRAPH`.
- `c` is a constant, not a source. `R` and `θ` are hypotheses, not dimensional sources.
- The target is a new quantity `radiation-pressure`, dimension pressure. If its attributes are the same classical electromagnetic pair, the edge is `kind: 'law'`. The existing canonical target name `pressure` is the hydrostatic and force-per-area rows. Reusing that name would join this edge to `CE-hydrostatic-pressure`, whose regime force is gravitational.
- `CE-poynting-flux` is not a seed, so a chain through it receives a `chain-` id and stays provisional under decision (a).
- `be-64` is not a seed. An edge into the Eddington balance does not prove the Thomson premise. The premise is factor 1, not `(1+R)`.

**Lean 4 proof target** (PhysJS, not written, not vendored):

The partial target that the library can state now is the monomial and the
negative control on the constant. The surface theorem waits on a Maxwell
stress and a boundary condition. Physlib
`Electromagnetism.Vacuum.IsPlaneWave` and `HarmonicWave` are free-space plane
waves. `Electromagnetism.ThreeDimension.MaxwellEquations` is Maxwell's
equations in three dimensions. None of those modules is a surface stress.
Imports for the partial target are the ones `PhysJS.Eddington` already uses:
`Mathlib.Tactic.FieldSimp`, `Linarith`, `Positivity`, and `Ring`.

```lean
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity

namespace PhysJS.RadiationPressure

/-- Units give `P = C * I / c`. `C` is a hypothesis.
Covers a derivation step only. Not the optical boundary condition. -/
theorem coefficient_unfixed
    (I c C : ℝ) (hI : 0 < I) (hc : 0 < c) (hC : C ≠ 1) :
    C * I / c ≠ I / c := by
  sorry

/-- The reflector value is not the absorber value when `I ≠ 0`.
This fails on the true absorber claim. It does not choose `C` after the fact. -/
theorem reflector_not_absorber (I c : ℝ) (hI : I ≠ 0) (hc : 0 < c) :
    I / c ≠ 2 * I / c := by
  sorry

/-- Endpoint check for the oblique hypothesis, transmission zero.
`R = 0` and `θ = 0` is `I / c`. `R = 1` and `θ = 0` is `2 I / c`.
A third factor, `(1 + R) * cos θ` with only one cosine, fails at `θ ≠ 0`. -/
theorem oblique_endpoints
    (I c θ : ℝ) (hc : 0 < c) (hI : 0 < I) (hθ : Real.cos θ ≠ 0)
    (hθ1 : Real.cos θ ≠ 1) :
    (I / c) * (1 + 0) * Real.cos 0 ^ 2 = I / c ∧
      (I / c) * (1 + 1) * Real.cos 0 ^ 2 = 2 * I / c ∧
      (I / c) * (1 + 1) * Real.cos θ ≠ (I / c) * (1 + 1) * Real.cos θ ^ 2 := by
  sorry

end PhysJS.RadiationPressure
```

`sorry` marks the gap. A vendored proof has no `sorry`.
`reflector_not_absorber` fails on the absorber claim whenever `I ≠ 0`.
`oblique_endpoints` fails if the single-cosine factor is treated as the
normal pressure at an angle where `cos θ` is neither 0 nor 1. A control that
only checks that a matcher can be told `C = 2` after the answer is known is
not either control. The Maxwell-stress derivation of those endpoints is the
library gap named above.

Draft object, not written to `formal/physjs/manifest.json`:

```json
{
  "key": "be-66",
  "bridgeId": "be-66",
  "theorem": "PhysJS.RadiationPressure.reflector_not_absorber",
  "covers": "derivation-step: the constant is unfixed. PhysJS.Dimensional.monomial_form gives P = C I/c. f(1,…,1) is C. The absorber hypothesis C = 1, the normal-incidence reflector hypothesis C = 2, and the opaque reflectance hypothesis C = (1+R) cos^2 θ are not fixed by the monomial. The exponent vector and the unit-change hypothesis are hypotheses of monomial_form.",
  "coverage": "statement skeleton only",
  "leanProof": "absent",
  "axioms": []
}
```

When a future proof is complete, the axiom list must be only `propext`,
`Classical.choice`, and `Quot.sound`. This note does not claim that list.

### Alfvén speed — proposed be-67

**Bridge Equation 67: Alfvén speed (fluid to plasma)** *(Category D: Field Unification Bridges)* — catalog text is Part II.

> **Unproven.** There is no PhysJS key. `leanProof` is `absent`. The axiom list is empty. Kind is not `bridge`. A unique monomial is `v = C B (μ0 ρ)^{-1/2}` with `C` unfixed. `C = 1` is the SI hypothesis. `ρ` is the total mass density. Proton-only is a named special case. The Gaussian factor `1/√(4π)` is a unit dictionary. None of those is an MHD theorem. `CE-plasma-frequency` is a dimensional canonical equation and is not this derivation.

> **Evaluator:** `evaluateAlfvenSpeed` in `src/bridges/be67-alfven-speed.ts`. `alfvenProtonOnlyDensity` is the named special case.

- **Status**: The catalog row is established. The statement stays unproven until a vendored PhysJS proof exists.
- **Context**: The phase speed of an ideal-MHD wave along a uniform background field. The bridges tuple is `fluid` → `plasma`. The catalog gap sits beside `CE-plasma-frequency`, which is `ω_p ∝ √(n q² / (ε0 m))` and is not a wave speed.
- **Mathematical formulation**:

<img src="https://i.upmath.me/svg/v_A%20%3D%20%5Cfrac%7BB%7D%7B%5Csqrt%7B%5Cmu_0%20%5Crho%7D%7D%2C%20%5Cqquad%20%5Cmathbf%7Bv%7D_A%20%3D%20%5Cfrac%7B%5Cmathbf%7BB%7D%7D%7B%5Csqrt%7B%5Cmu_0%20%5Crho%7D%7D" alt="v_A = \frac{B}{\sqrt{\mu_0 \rho}}, \qquad \mathbf{v}_A = \frac{\mathbf{B}}{\sqrt{\mu_0 \rho}}" />

where:

- `v_A` is the speed, in metres per second. The vector form points along `B`
- `B` is the magnetic flux density, in tesla
- `μ0` is the vacuum permeability, in SI
- `ρ` is the total mass density, in kilograms per cubic metre. Proton-only density is a named special case, not the default

The incompressible ideal-MHD wave with wavevector parallel to a uniform `B`
has phase speed `|v_A|`. That sentence is the regime, not a theorem of this
checkout. The Gaussian writing, when `B` is in gauss, `ρ` is in grams per
cubic centimetre, and the speed is in centimetres per second, is
`v = B / √(4π ρ)`. A primary that displays that writing was not opened for
this note. The conversion below is computed.

**Dimensions**: `B` has dimension `[M T^{-2} I^{-1}]`. `μ0` has dimension
`[M L T^{-2} I^{-2}]`. `ρ` has dimension `[M L^{-3}]`. Then `√(μ0 ρ)` has
dimension `[M L^{-1} T^{-1} I^{-1}]`, and `B` over that quantity is
`[L T^{-1}]`. The monomial is unique. The constant is unfixed. A named
dimension `permeability` is rejected by `upt derive`; the dimension that the
dogfood records as accepted is `L.M.T^-2.I^-2`.

**Domain**: Ideal MHD, a single-fluid density, SI when `C = 1`. Not a kinetic
dispersion relation. Not `CE-plasma-frequency`.

**Regime of validity**: The background field is uniform, the equilibrium is
static, and the velocity perturbation is incompressible. The dogfood states
that regime as ideal MHD. Alfvén 1942 was not opened past the Nature abstract,
so this note does not attribute a list of hypotheses to the 1942 symbols.

**Mass density**: The owner set the default to the total mass density. Proton-only is a named special case.

- Default: `ρ = n_i m_i + n_e m_e`, the definition the PlasmaPy 2026.2.0 `Alfven_speed` page states, with `n_e = Z n_i` under quasineutrality. That page cites Alfvén 1942. The citation is theirs. The 1942 text opened here does not display the formula. Helium and any other ion sit in `n_i m_i`. The evaluator takes `ρ`. It does not invent an abundance.
- Named special case, proton-only: `ρ_p = n m_p`. The Louarn stand-in below uses this case and says so. It is not the default.
- Electrons at the rounded solar-wind inputs below change the speed from 69.954 km/s to 69.935 km/s (`m_e / m_p = 5.446×10^{-4}` with `M_E_SI`). That is not the gap.
- A helium loading that would hit 60 km/s at the exact rounded inputs is a density ratio `ρ/ρ_p = 1.359`. This note does not invent an abundance that produces 1.359. A 4 percent helium number fraction is not in the paragraph the dogfood read, and `1 + 4×0.04 = 1.16` does not close 1.359. The density choice is a hypothesis of the row. It does not by itself turn `∼ 60` into a helium measurement.

**SI and Gaussian**:

- SI hypothesis: `C = 1` in `v = C B / √(μ0 ρ)`, with tesla, kilograms per cubic metre, and `μ0 = MU0_SI`.
- Consistent cgs dictionary: `B_gauss = B_tesla × 10^4`, `ρ_cgs = ρ_SI × 10^{-3}`, `v = B_gauss / √(4π ρ_cgs)` in cm/s. On the proton-only inputs below this returns 69.954 km/s, the SI value.
- Dropping the dictionary and inserting tesla and the SI density into `B/√(4πρ)` returns 0.02212 km/s, smaller by `√(4π/μ0) ≈ 3162`. `4π×10^{-7}` and `MU0_SI` differ by a relative `5.44×10^{-10}`. That difference is not the 60 km/s gap. The Gaussian factor is a unit dictionary, not a second law.

**Literature**:

- Alfvén, Nature **150**, 405–406 (1942), doi:10.1038/150405d0. The Nature page was opened. The description begins "If a conducting liquid is placed in a constant magnetic field…" and calls the result a combined electromagnetic-hydrodynamic wave. The speed formula is not in that abstract. The paper body was not opened. The modern SI form is not a quotation of 1942.
- PlasmaPy 2026.2.0 documentation, `plasmapy.formulary.speeds.Alfven_speed`, opened for this note: `B / √(μ0 ρ)` with `ρ = n_i m_i + n_e m_e`.
- Louarn et al., Astron. Astrophys. **656**, A36 (2021), doi:10.1051/0004-6361/202141095. Crossref confirms that bibliographic record and the title "Multiscale views of an Alfvénic slow solar wind: 3D velocity distribution functions observed by the Proton-Alpha Sensor of Solar Orbiter". The PDF was not re-opened here (the journal returned 403 and the HAL landing returned a bot wall). The dogfood's reading of the HAL text is the record of the paragraph with tildes: `B ∼ 12 nT`, `N ∼ 14 cm^{-3}`, `V_a ∼ 60 km/s`, and `b = B / (μ0 ρ)^{1/2}`. That paragraph, as the dogfood records it, does not define `ρ` as `N m_p` and does not state a helium fraction.

**Numeric sanity check**: Computed. Not a measurement. Constants: `B = 12×10^{-9} T`, `n = 14×10^6 m^{-3}`, `m_p = 1.67262192369×10^{-27} kg` (the value the BE-64 evaluator stores), `μ0 = MU0_SI = 1/(EPS0_SI C_SI²) = 1.2566370621200546×10^{-6}`. Proton-only `ρ_p = 2.3416706931660002×10^{-20} kg/m³` and `v_A = 69954.13706220593 m/s = 69.954 km/s`. The dogfood prints 69.95 km/s. The paper's own sentence, in the dogfood's reading, is `V_a ∼ 60 km/s`. The density that yields exactly 60 km/s at this `B` and this `μ0` is `3.183098860104967×10^{-20} kg/m³`, a ratio 1.359 against `ρ_p`. The speed ratio 69.954/60 is 1.166. The inputs carry tildes, so rounding alone can move the result. This is not a precision test.

**Composition edges**: `be-67` is on `CATALOG_GRAPH`. Kind `law`. Not a seed.

- The source of `B` is `magnetic-flux-density`, attributes `{ scale: 'classical', force: 'electromagnetic' }`. The canonical name exists on `CE-poynting-flux` and on the cyclotron row. It is not a `Quantity` node. The dogfood records that `upt explain` accepts `magnetic-field` and does not accept `magnetic-flux-density` for the cyclotron path. This edge must not depend on that alias.
- The density is a new quantity `plasma-mass-density`, same classical electromagnetic attributes. The default value is the total mass density. A proton-only input is the named special case and is a different number. The graph node `mass-density` has attributes `{ scale: 'cosmological', force: 'gravitational' }` because it is the BE-19 input. Reusing it would put a plasma density on a cosmological gravitational port. The regime gate would then reject a join on scale and on force if the other port states classical and electromagnetic, and it would abstain if the other port is silent. Abstention is not a reason to reuse the node.
- `μ0` is a constant, not a source.
- Do not chain through `CE-plasma-frequency`. That equation is dimensional, its regime scale is mesoscopic, and a chain id would be provisional and would not be an Alfvén theorem.
- If both ports share the classical electromagnetic attributes, the edge is `kind: 'law'`.

**Lean 4 proof target**:

```lean
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

namespace PhysJS.AlfvenSpeed

/-- `v = C * B / sqrt(μ0 * ρ)`. `C` is unfixed. Covers a derivation step only. -/
theorem coefficient_not_fixed
    (B μ0 ρ C : ℝ) (hB : B ≠ 0) (hμ : 0 < μ0) (hρ : 0 < ρ) (hC : C ≠ 1) :
    C * B / Real.sqrt (μ0 * ρ) ≠ B / Real.sqrt (μ0 * ρ) := by
  sorry

/-- Proton-only density and a heavier density are different speeds when `B ≠ 0`. -/
theorem proton_only_differs
    (B μ0 ρp r : ℝ) (hB : B ≠ 0) (hμ : 0 < μ0) (hρ : 0 < ρp) (hr : 0 < r) (hne : r ≠ 1) :
    B / Real.sqrt (μ0 * ρp) ≠ B / Real.sqrt (μ0 * (r * ρp)) := by
  sorry

/-- The Gaussian formula agrees with SI only after the unit dictionary.
Inserting tesla and the SI density into `B / sqrt(4π ρ)` fails. -/
theorem gaussian_needs_dictionary
    (B ρ vSi : ℝ) (hB : 0 < B) (hρ : 0 < ρ)
    (hv : vSi = B / Real.sqrt ((4 * Real.pi * 1e-7) * ρ)) :
    B / Real.sqrt (4 * Real.pi * ρ) ≠ vSi := by
  sorry

end PhysJS.AlfvenSpeed
```

`coefficient_not_fixed` fails on the SI claim whenever `C ≠ 1` and `B ≠ 0`.
`proton_only_differs` fails if a proof treats `r ≠ 1` as the same speed.
`gaussian_needs_dictionary` uses `4π×10^{-7}` as the permeability stand-in so
the comparison is inside one unit system; the exact `MU0_SI` differs from
that stand-in at relative `5×10^{-10}`, which the proof must not ignore if it
claims bit-level agreement. The ideal-MHD theorem (incompressible, uniform
`B`, ideal Ohm's law, phase speed along `B`) needs a Lorentz force. Physlib
`FluidDynamics.CauchyFlow.BodyForce` defines `specificBodyForce = -grad Phi`,
a conservative potential, not `J×B`. There is no MHD module at this Physlib
revision (`Physlib/FluidDynamics/MHD/Alfven.lean` is absent). That theorem is
a library gap. The three lemmas above are the partial target.

Draft object, not written to the manifest:

```json
{
  "key": "be-67",
  "bridgeId": "be-67",
  "theorem": "PhysJS.AlfvenSpeed.coefficient_not_fixed",
  "covers": "derivation-step: the constant is unfixed. v = C B (μ0 ρ)^{-1/2}. f(1,…,1) is C. C = 1 is the SI hypothesis. ρ is the total mass density. Proton-only ρ = n m_p is a named special case, not the default. The Gaussian factor 1/sqrt(4π) is a unit dictionary, not a second law. The exponent vector and the unit-change hypothesis are hypotheses of monomial_form.",
  "coverage": "statement skeleton only",
  "leanProof": "absent",
  "axioms": []
}
```

### Tolman–Ehrenfest — proposed be-68

**Bridge Equation 68: Tolman–Ehrenfest (gravitation to thermodynamics)** *(Category I: Emergent Spacetime)* — catalog text is Part II.

> **Unproven.** There is no PhysJS key. `leanProof` is `absent`. The axiom list is empty. Kind is not `bridge`. The statement is not a monomial. `{d ln T, g, c, dr}` has two invariants, so `buckinghamFilter` must not emit this row as a unique-monomial survivor. [`PhysJS.HawkingUnruh.dictionary`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/HawkingUnruh.lean) assumes the Hawking and Unruh temperatures and does not derive this equilibrium criterion. BE-57 does not receive a second key for that cross-check, and this row does not either.

> **Evaluator:** `evaluateTolmanEhrenfest` in `src/bridges/be68-tolman-ehrenfest.ts`. `tolmanTemperatureAt` recovers `T` from the invariant.

- **Status**: The catalog row is established. The statement stays unproven until a vendored PhysJS proof exists.
- **Context**: Proper temperature in static thermal equilibrium. The bridges tuple is `gravitation` → `thermodynamics`. UPT has the Hawking temperature at infinity on be-42, a cross-check. This row does not chain through it.
- **Mathematical formulation**:

<img src="https://i.upmath.me/svg/T_0%5Csqrt%7Bg_%7B44%7D%7D%20%3D%20%5Cmathrm%7Bconst%7D" alt="T_0\sqrt{g_{44}} = \mathrm{const}" />

<img src="https://i.upmath.me/svg/T%5Csqrt%7B-g_%7B00%7D%7D%20%3D%20%5Cmathrm%7Bconst%7D" alt="T\sqrt{-g_{00}} = \mathrm{const}" />

where:

- `T0` is the proper temperature measured by a local observer at rest
- in the 1930 line element, `g_44` is the positive coefficient of `dt²`, and the first display is the criterion the abstract states
- the repository metric signature is `(−,+,+,+)`, the signature `upt metric` and the canonical Einstein-equation node both use, so `g_00 < 0` outside a horizon and the second display is the same criterion with a minus under the square root
- the catalog equation is the second display, `T √(-g_00) = const`, the repository signature `(−,+,+,+)`. The first display, `T0 √g_44 = const`, is the 1930 writing and stays in the section as a reference. The minus sign is the signature translation. It is not a new law

The index form of the later stationary statement, opened on arXiv:1005.2985 and not in the 1930 paper as read for this note, is `T ‖ξ‖ = const` for a timelike Killing field `ξ`, with `‖ξ‖ = √(g_{ab} ξ^a ξ^b)`. The owner left that generalization out of scope. The catalog equation is the static repository form only.

**Dimensions**: `T` is a temperature. `g_00` is dimensionless in the coordinate writing where `c` has been left explicit in `ds²`, and it is not dimensionless in every convention. The product that is constant is therefore not a seven-base monomial until the convention is fixed. The differential form people write in the weak field, `d ln T = g dr / c²`, has two dimensionless groupings of `{d ln T, g, c, dr}`: `d ln T` itself, and `g c^{-2} dr`. Dimensions do not identify them. Units alone cannot entail the criterion. A unique-monomial covers line would be a false claim.

**Domain**: A static metric, local thermodynamic equilibrium, and the matter model the 1930 abstract allows (a perfect fluid, or the solid-capable extension the dogfood records from that abstract). The 1930 PDF was not re-opened for this note; the abstract was opened by the dogfood. Not a horizon temperature. Not the Unruh temperature. Not `PhysJS.HawkingUnruh.dictionary`.

**Regime of validity**: The static region, away from a horizon, where `g_00 ≠ 0` and the local observers at rest exist. A horizon limit that identifies this `T` with a Hawking temperature is a different statement and is out of scope.

**Literature**:

- Tolman and Ehrenfest, Phys. Rev. **36**, 1791–1798 (1930), doi:10.1103/PhysRev.36.1791. The dogfood opened the abstract and records that it states `T0 √g_44` is constant. This note did not re-open the PDF. The body of the derivation is therefore unverified here.
- Rovelli and Smerlak, arXiv:1005.2985, HTML opened for this note. The abstract derives the Tolman–Ehrenfest effect in a stationary spacetime from thermal time and the equivalence principle. The introduction states `T ‖ξ‖ = const` for a timelike Killing field, and the Newtonian limit `∇T / T = g / c²`. The journal pagination was not on that HTML and is not stated here. This is a later derivation. It is not a quotation of the 1930 paper.

**Numeric sanity check**: No laboratory gradient was opened. Computed weak-field scale at `R = 6.957×10^8 m`, the radius the dogfood used. The IAU resolution PDF was not opened. `GM_SUN_SI / (R C_SI²) = 2.1225025701453566×10^{-6}`. `G_SI M_SUN_SI / (R C_SI²) = 2.1231324960869663×10^{-6}`. `GM_SUN_SI` is the IAU 2015 nominal parameter and is not `G_SI * M_SUN_SI`. Both figures are the fractional scale of the linearization `ΔT/T ~ GM/(R c²)`. They are not a measured `ΔT/T`. The dogfood prints the same two numbers (the last digit of the `GM_SUN_SI` figure rounds to the digit the dogfood shows).

**Composition edges**: `be-68` is on `CATALOG_GRAPH`. Kind `law`. Not a seed. No identification row was added.

- The temperature port is `proper-temperature`, dimension temperature, attributes `{ scale: 'classical', force: 'gravitational' }`. The target of the edge is `tolman-invariant`, the same attributes.
- Do not use `hawking-temperature`. That node is `{ scale: 'quantum', force: 'gravitational' }`.
- Do not use the generic `temperature` node. Its attributes are empty, so scale and force would abstain. `QUANTITY_IDENTIFICATIONS` folds `hawking-temperature` onto `temperature`. A junction through that fold meets be-42. Categories I and M share the information-geometry component, so the domain facet would not reject the pair. Abstention on the empty `temperature` attributes would not reject it either. be-42 is not a seed, and a chain would stay provisional, and the identification is still the wrong port. This note adds no identification row.
- `g_00` is a metric component, not an existing quantity. A chain that starts from `CE-einstein-field-eq` does not entail thermal equilibrium.
- The edge, if both ports state classical and gravitational, is `kind: 'law'` on those two axes. The thermodynamic content is the criterion, which the axes do not encode.

**Lean 4 proof target**:

Physlib `Thermodynamics.Temperature.Basic` defines `structure Temperature` wrapping `ℝ≥0`. That is a nonnegative real in arbitrary units. It is not a proper temperature on a static metric. `Relativity.Tensors.MetricTensor` builds the metric tensor of a `TensorSpecies`. It is not a static Lorentzian line element. `PhyslibAlpha.Relativity.General.Schwarzschild.IncompressibleSphere` says the file takes the two metrics and the pressure as given and that the field equations are not verified there. None of those imports is this criterion.

```lean
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith

namespace PhysJS.TolmanEhrenfest

/-- Two dimensionless groups do not force the identification.
A constant temperature has `dlnT = 0` while `g dr / c^2` need not vanish. -/
theorem units_do_not_entail
    (dlnT g c dr : ℝ) (hc : 0 < c) (hgroups : dlnT = 0) (hg : g * dr / c ^ 2 ≠ 0) :
    dlnT ≠ g * dr / c ^ 2 := by
  rw [hgroups]
  exact hg.symm

/-- In the repository signature, `g00 < 0`. Mathlib's `Real.sqrt` returns 0
on a negative input, so `sqrt g00 = 0` and is not the criterion.
The minus sign is the signature hypothesis. -/
theorem mostly_plus_needs_the_minus
    (T g00 : ℝ) (hT : 0 < T) (hg : g00 < 0) :
    T * Real.sqrt (-g00) ≠ T * Real.sqrt g00 := by
  sorry

end PhysJS.TolmanEhrenfest
```

`units_do_not_entail` is the negative control: the Buckingham output and the
equilibrium criterion are different statements, and the control fails if a
proof treats every pair of dimensionless groups as equal. The static-line-element
theorem (`T0 * sqrt g44` constant, under the 1930 hypotheses) is the library
gap. It is not `monomial_form`.

Draft object, not written to the manifest. The covers line does not begin
with a unique-monomial claim:

```json
{
  "key": "be-68",
  "bridgeId": "be-68",
  "theorem": "PhysJS.TolmanEhrenfest.units_do_not_entail",
  "covers": "The static equilibrium criterion only, in the repository signature: T sqrt(-g_00) = const. Units give two invariants, d ln T and g c^{-2} dr, and do not identify them. Not a horizon temperature. Not PhysJS.HawkingUnruh.dictionary. The 1930 writing T0 sqrt(g_44) = const, with g_44 > 0, is a reference for the signature translation. T ||ξ|| = const is out of scope.",
  "coverage": "statement skeleton only",
  "leanProof": "absent",
  "axioms": []
}
```

## Further rows: BE-69 through BE-73

These five rows are the next integers after BE-68, with no gap. Each formalRef is the theorem named below. A nested field is not that reference. The bridges tuples differ on the two sides, so membership counts each row as a bridge. The composition edges are kind `law` because the quantity attributes match. The catalog text is Part II §V-C.

| Id | Statement | Category letter | Tuple |
|---|---|---|---|
| be-69 | Perpendicular fast magnetosonic phase speed | D | `fluid` → `plasma` |
| be-70 | Einstein relation | H | `kinetic` → `electromagnetic` |
| be-71 | Clapeyron slope | J | `thermodynamics` → `continuum` |
| be-72 | Gravitational frequency ratio | I | `gravitation` → `radiation` |
| be-73 | Kelvin relation | F | `thermal` → `electrical` |

Letter J selects the quantum-classical component, the same component letter BE-34 already uses. The tuple does not select the component.

### Fast magnetosonic speed — be-69

**Bridge Equation 69: perpendicular fast magnetosonic phase speed (fluid to plasma)** *(Category D: Field Unification Bridges)*

`|ω/k| = √(c_s² + B²/(μ₀ ρ))` for a monochromatic compressional polarization perpendicular to a uniform field, from the linearized ideal-MHD premises. `μ₀ > 0`, `ρ > 0`, and `k ≠ 0`. `c_s² = γ p / ρ` is a reading of the closure, not an energy equation.

The formalRef is `PhysJS.FastMagnetosonic.speed_eq`. The nested field `perpendicularQuartic` is `PhysJS.FastMagnetosonic.perpendicular_of_dispersion`, the quartic at `k_∥ = 0`. That theorem is not the formalRef. The oblique fast mode and a kinetic dispersion relation are out of scope.

`c_s = 0` recovers `B/√(μ₀ ρ)`, the Alfvén number of a different polarization. The target is `fast-magnetosonic-speed`. It is not `alfven-speed`. The sources reuse `magnetic-flux-density` and `plasma-mass-density`, the same `B` and `ρ` as BE-67, and add `sound-speed`. Neither target is the other's source, so the two edges do not compose. `√(c_s² + v_A²)` is not `c_s`, not `v_A`, and not `c_s + v_A` when the other speed is nonzero.

The evaluator is `evaluateFastMagnetosonic({ cs_m_per_s, B_T, rho_kg_per_m3 })`. `c_s` is finite and at least zero. `B` is finite. `ρ` is finite and positive.

### Einstein relation — be-70

**Bridge Equation 70: Einstein relation (kinetic to electromagnetic)** *(Category H: Non-Equilibrium Statistical Mechanics)*

`D = μ k_B T / q`. `μ` is the electrical mobility, drift speed per electric field. The premises are a Boltzmann profile `n = n_ref exp(−q V/(k_B T))` and a nonzero field at which the drift flux cancels the diffusion flux. The force-mobility writing needs `μ_force = μ/q`. Dropping `q` fails when `q ≠ 1`. Stokes–Einstein and a Fermi-liquid form are different equations. There is no second formalRef for an entropy.

The formalRef is `PhysJS.EinsteinRelation.diffusion_eq`.

The ports are `electrical-mobility`, `einstein-temperature`, `carrier-charge`, and `diffusivity`. `einstein-temperature` is not `temperature` and not `proper-temperature`. `carrier-charge` is not the constant `e`. The evaluator is `evaluateEinsteinRelation({ mu_m2_per_Vs, T_K, q_C })`. `μ` is finite. `T` and `q` are finite and nonzero.

### Clapeyron slope — be-71

**Bridge Equation 71: Clapeyron slope (thermodynamics to continuum)** *(Category J: Phase Transitions and Criticality)*

Where the specific Gibbs energies agree and each phase obeys `dg = −s dT + v dP`, `dP/dT = (s2−s1)/(v2−v1)`. With `L = T (s2−s1)`, `T ≠ 0`, and `Δv ≠ 0`, `dP/dT = L/(T Δv)`. The entropy slope is that companion reading inside `slope_eq`. It is not a second formalRef and not a second key. Dropping `T` fails when `T ≠ 1`. Replacing `Δv` by one phase volume fails when the other volume is nonzero. The ideal-gas integrated vapor-pressure law is not this slope. The Gibbs differential is a hypothesis, not a Legendre transform derived in the theorem.

The formalRef is `PhysJS.Clapeyron.slope_eq`.

`L` is specific, joules per kilogram. The source is `specific-latent-heat`. It is not `latent-heat`, the energy `Q = m L`. The other ports are `clapeyron-temperature`, `specific-volume-change`, and `clapeyron-slope`. The evaluator is `evaluateClapeyron({ L_J_per_kg, T_K, delta_v_m3_per_kg })`. `L` is finite. `T` and `Δv` are finite and nonzero.

### Gravitational redshift — be-72

**Bridge Equation 72: gravitational frequency ratio (gravitation to radiation)** *(Category I: Emergent Spacetime)*

Two static observers of one coordinate period, with `ν √(−g_00) = 1/Δt` and both `g_00 < 0`, have `ν1/ν2 = √(g2/g1)`. This is not BE-68. The bridges tuple is `gravitation` → `radiation`, not `gravitation` → `thermodynamics`.

The formalRef is `PhysJS.GravitationalRedshift.frequency_ratio`. The nested field `tolmanRatio` is `PhysJS.GravitationalRedshift.tolman_same_ratio`: if the Tolman products also agree, then `T1/T2 = ν1/ν2`. Neither factor is derived from the other. That nested theorem is not the formalRef, and it is not an equality edge from this row into BE-68.

Equal temperatures on `g_00 = −1` and `g_00 = −4` are not a Tolman equilibrium. The frequency ratio at those components is 2. The ratio of the two Tolman products `T √(−g_00)` is also 2 when the temperatures are equal, and the products themselves are not equal. The frequency ratio is not the Tolman invariant.

The ports are `redshift-metric-g00-1`, `redshift-metric-g00-2`, and `gravitational-frequency-ratio`. They are not `metric-g00`, `proper-temperature`, or `tolman-invariant`. `g_00` is not an alias of either redshift component. Category I is the same component as BE-68. That shared component is not a composition. `composeEdges` in either order has no shared quantity. The evaluator is `evaluateGravitationalRedshift({ g1, g2 })`. Both components are finite and negative. This is not a horizon temperature and not `PhysJS.HawkingUnruh.dictionary`.

### Kelvin relation — be-73

**Bridge Equation 73: Kelvin relation (thermal to electrical)** *(Category F: Condensed Matter - High Energy Bridges)*

For the linear fluxes `J_e` and `J_q`, the open-circuit Seebeck coefficient `S = E/∇T` and the isothermal Peltier coefficient `Π = J_q/J_e` satisfy `Π = S T` when `L12 = L21`. That equality is the structure field `ThermoelectricOnsager.onsager`. It names microscopic reversibility. It is not an axiom, and it is not a numeric evaluator input. Without it the two coefficients disagree. The first Thomson relation `μ = T dS/dT` is not this equation, and neither is a measured thermopower.

The formalRef is `PhysJS.KelvinRelation.peltier_eq`.

The ports are `seebeck-coefficient`, `peltier-temperature`, and `peltier-coefficient`. `peltier-coefficient` is a voltage. It is not the Josephson `voltage` node. The evaluator is `evaluateKelvinPeltier({ S_V_per_K, T_K })`. `S` is finite. `T` is finite and nonzero.

## Open notes

These are not specification sections. They stay unresolved. The dogfood is
the record. This note does not re-open the PDFs named there unless the line
says so.

**Abraham–Minkowski.** People write an electromagnetic momentum density
`g = S/c²` (Abraham) or a factor `n` larger (Minkowski). Buckingham gives
`g ∝ S c^{-2}` and stops. The factor is the controversy. Pfeifer, Nieminen,
Heckenberg, and Rubinsztein-Dunlop, Rev. Mod. Phys. **79**, 1197 (2007),
erratum **81**, 443 (2009), doi:10.1103/RevModPhys.79.1197. The dogfood opened
the abstract: no electromagnetic energy-momentum tensor is complete on its
own; with the material tensor the predictions agree; the preferred form is a
choice. Do not encode a preferred tensor.

**Magnetostriction.** Saturation strain `λ_s` is dimensionless.
`buckinghamPi` on `{λ_s, B, M_s}` returns the group `λ_s` alone, and
`dimensionallyDetermines` is false. No Terfenol number was opened. There is
no candidate equation.

**Nernst.** The scale is `k_B T / e`. A decade of activity for a one-electron
reaction multiplies by `ln(10)`. The reaction quotient and the electron count
sit outside the monomial, so the result is partial in the sense of decision
(b) and is not a bridge. Computed from the package constants:
`(K_B_SI * 298.15 / E_SI) * ln(10) = 0.05915934968478234 V`, and
`K_B_SI / E_SI = 8.617333262145179×10^{-5} V/K`. Nernst's 1889 paper was not
opened. No laboratory cell table was opened. This is the thermodynamic decade
slope. An encoding, if one is approved later, is an L1 non-monomial in the
style of `CE-boltzmann-factor`, not `monomial_form`.

**Piezoelectric Maxwell relation.** At constant temperature,
`(∂D/∂σ)_E = (∂ε/∂E)_σ`. Dimensions give `[d] = C/N = m/V` and two groups.
The equality is the equality of mixed derivatives of a thermodynamic
potential. Buckingham does not force it. Papet et al., J. Appl. Phys. **126**,
144102 (2019), doi:10.1063/1.5116026, is the dogfood's comparison table:
α-SiO₂ `d_11 = 2.31 pC/N`, with the cell's marker pointing at Frankel et al.
2008, which was not opened. Bechmann, Phys. Rev. **110**, 1060 (1958), was
not opened. Do not attribute 2.31 to Bechmann. A future Lean target would be
the equality of mixed partials under a stated potential. It is not a scalar
monomial, and it is not a bridge id that claims `d` is determined.

**Larché–Cahn.** An open-system diffusion potential shifts by a term of
dimension partial molar volume times stress, `μ ∝ Ω σ`. The monomial leaves
the trace factor `1/3` and the sign unfixed. Larché and Cahn, Acta Metallurgica
**21**, 1051–1063 (1973), were not opened, in the dogfood or for this note, so
the `1/3` is not quoted from them. No primary partial molar volume was opened.
`monomial_form` recovers `μ = C Ω σ` with `C` unfixed. A proof needs a
free-energy differential. That is a library gap, and this note does not draft
the section.

The dogfood's other rows (Debye length as a composition, plasma β, Mott
thermopower) stay in that report. They are not sections of this note.

## Decisions

The owner decided these five points. They are the catalog text in Part II
§V-C. The three statements stay unproven until a vendored PhysJS proof
exists. The bridges tuples are `optics` → `continuum`, `fluid` → `plasma`,
and `gravitation` → `thermodynamics`, so the membership criterion counts
them as bridges. The composition edges are kind `law` because the quantity
attributes match.

1. The ids are be-66 radiation pressure, be-67 Alfvén speed, and be-68 Tolman–Ehrenfest. There is no gap. Integer 66 is radiation pressure. The deferred Tolman–Oppenheimer–Volkoff mass stays deferred and does not occupy 66.
2. All three are `be-*` catalog entries, in the form of BE-55 through BE-65. They are not `CE-*` rows. The letters are D, D, and I.
3. The radiation-pressure equation is `P_n = (I/c)(1+R)\cos^2\theta`. The absorber `I/c` and the reflector `2I/c` are the endpoints `R = 0`, `θ = 0` and `R = 1`, `θ = 0`.
4. Tolman–Ehrenfest uses the repository form `T √(-g_00) = const`. The 1930 form `T0 √g_44 = const` stays as a reference for the signature translation. `T ‖ξ‖ = const` is out of scope.
5. The Alfvén default is the total mass density. Proton-only `ρ = n m_p` is a named special case. The 69.95 km/s stand-in is that special case. It is not the default, and it does not close the `∼ 60 km/s` sentence.

## What this note does not do

It does not write `formal/physjs/manifest.json`. It does not call
`deriveEvidence` to light `formally-proved`. It does not treat a `chain-`
id as a catalog id. It does not treat a units monomial as a proof. The
open notes below stay notes.
