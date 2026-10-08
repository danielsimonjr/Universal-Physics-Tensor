# Universal Physics Tensor Framework: Complete Formal Specification - Part II

> **Status note:** Each written-up equation carries a Status line. Where one is missing, treat the equation as unvalidated. The formulations are drawn from the literature where cited, or are original proposals.

> **Spec-scope note:** The specification writes up the 40 cross-domain bridges in the catalog `data/bridge-catalog.json`. Part I §II and this part hold those write-ups. A standard bridge stays a catalog record and has no heading here.

## V. Cross-domain bridges

### Category F: Condensed Matter - High Energy Bridges

**Bridge Equation 21: AdS/CMT Correspondence Equation**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.Kss.saturating`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Kss.lean) states the equality η/s = ℏ/(4π k_B). The inequality η/s ≥ ℏ/(4π k_B) is a different statement.

- **Status**: Established. The holographic dictionary for retarded Green's functions in AdS/CMT (anti-de Sitter / condensed matter correspondence) is a well-understood result (Son and Starinets 2002, *JHEP* 0209:042, arXiv:hep-th/0205051 — the canonical two-author paper; the formula below is the retarded-Green's-function recipe from that paper). The companion three-author paper (Policastro-Son-Starinets 2002, *JHEP* 0209:043, arXiv:hep-th/0205052) applies the recipe to AdS hydrodynamics. See also Iqbal and Liu 2009 (arXiv 0903.2596, *Fortsch. Phys.* 57). The canonical momentum-space dimension is `[L]^{d−2Δ}`. Derivation: the boundary two-point function ⟨O(x)O(0)⟩_R of an operator of conformal dimension Δ scales as `|x|^{−2Δ}` (dim `[L]^{−2Δ}`), and Fourier-transforming with measure `dt d^{d−1}x` (dim `[L]^d`) gives `G_R(ω,k)` dim `[L]^{d−2Δ}`. The `r^{2Δ−d}` factor in the displayed formula is the bulk-radial scaling that exactly cancels the bulk-field's leading-mode `r^{−(d−Δ)}` to extract the boundary correlator's coefficient — that radial factor has dim `[L]^{2Δ−d}` but is *internal* to the limit; the *result* G_R(ω,k) has dim `[L]^{d−2Δ}`.
- **Context**: Holographic duality between strongly correlated electrons and gravitational systems
- **Linked Formulas**: AdS/CFT correspondence, Fermi liquid theory
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7B%5Ceta%7D%7Bs%7D%20%3D%20%5Cfrac%7B%5Chbar%7D%7B4%5Cpi%20k_B%7D" alt="\frac{\eta}{s} = \frac{\hbar}{4\pi k_B}" />

<img src="https://i.upmath.me/svg/G_R(%5Comega%2Ck)%20%3D%20-i%20%5Clim_%7Br%20%5Cto%20%5Cinfty%7D%20r%5E%7B2%5CDelta-d%7D%20%5Cleft(%5Cfrac%7Bg%5E%7Brr%7D%7D%7B%5Csqrt%7Bg%5E%7Btt%7D%7D%7D%5Cright)%20%5Cfrac%7B%5Cpartial_r%20%5Cphi(r%2C%5Comega%2Ck)%7D%7B%5Cphi_0(%5Comega%2Ck)%7D" alt="G_R(\omega,k) = -i \lim_{r \to \infty} r^{2\Delta-d} \left(\frac{g^{rr}}{\sqrt{g^{tt}}}\right) \frac{\partial_r \phi(r,\omega,k)}{\phi_0(\omega,k)}" />

where:

- <img src="https://i.upmath.me/svg/G_R(%5Comega%2Ck)" alt="G_R(\omega,k)" /> is the retarded Green’s function of the boundary theory
- <img src="https://i.upmath.me/svg/%5Cphi(r%2C%5Comega%2Ck)" alt="\phi(r,\omega,k)" /> is the bulk field dual to the boundary operator
- <img src="https://i.upmath.me/svg/%5CDelta" alt="\Delta" /> is the conformal dimension of the boundary operator
- <img src="https://i.upmath.me/svg/d" alt="d" /> is the spatial dimension of the boundary

**Dimensions**: <img src="https://i.upmath.me/svg/%5BG_R%5D%20%3D%20%5BL%5D%5E%7Bd-2%5CDelta%7D" alt="[G_R] = [L]^(d - 2 Delta)" /> (depends on conformal dimension Δ and boundary dimension d). Note the `[L]^{2Δ−d}` exponent is the radial-factor exponent `r^{2Δ−d}` from the limit recipe, not the dimension of the *result* G_R(ω,k).

**Rationale**: Maps quantum critical phenomena in condensed matter to black hole horizon physics

**Bridge Equation 22: Topological Entanglement Entropy - Quantum Gravity Link**

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.ToricCode.toric`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/ToricCode.lean) states that four anyons of quantum dimension 1 have D = 2 and γ = ln 2. The Kitaev–Preskill theorem is missing in Mathlib. The lemma is not a quantum-gravity boundary.

> **AST encoding (Tier 5):** [`data/bridge-catalog.json`](../../data/bridge-catalog.json) (catalog record 22, evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts))

- **Status**: Speculative. **Reformulated 2026-05-05** to the canonical Kitaev-Preskill / Levin-Wen single-subsystem form (PRL 96:110404, 110405; 2006). The originally-stated three-term form `S_topo = -γ + α log(ξ/a) + β(T/T_c)^ν log(A_boundary/ℓ_P²)` had two unresolvable defects: (1) at finite temperature, topological order is destroyed (γ → 0 typically), making the `β(T/T_c)^ν` extension ill-defined as a TEE correction; (2) the `log(A_boundary/ℓ_P²)` factor reintroduces area-law scaling into a quantity that is, by construction, the area-law-*subtracted* constant part — those terms were not derivable from any standard TEE construction and have been removed. The Kitaev-Preskill formula itself is established in condensed-matter literature; the "QG link" framing — using TEE as a probe of gravitational entanglement — remains original to this catalog and is not in either Kitaev-Preskill or Levin-Wen, hence the preserved `speculative` status.
- **Context**: Connects topological phases to quantum error correction in gravity
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/S(R)%20%3D%20%5Calpha%20L(R)%20-%20%5Cgamma%20%2B%20%5Cmathcal%7BO%7D(L%5E%7B-1%7D)" alt="S(R) = \alpha L(R) - \gamma + \mathcal{O}(L^{-1})" />

where:

- <img src="https://i.upmath.me/svg/S(R)" alt="S(R)" /> is the von Neumann entanglement entropy of subsystem R (dimensionless, in nats)
- <img src="https://i.upmath.me/svg/%5Calpha" alt="\alpha" /> is the non-universal area-law coefficient, dim [L<sup>-1</sup>]
- <img src="https://i.upmath.me/svg/L(R)" alt="L(R)" /> is the perimeter (boundary length) of subsystem R, dim [L]
- <img src="https://i.upmath.me/svg/%5Cgamma" alt="\gamma" /> is the topological entanglement entropy (dimensionless). For an abelian topological phase, γ = log D where D = √(Σᵢ d²ᵢ) is the total quantum dimension. For the Z₂ toric code, D = 2 → γ = log 2.
- The <img src="https://i.upmath.me/svg/%5Cmathcal%7BO%7D(L%5E%7B-1%7D)" alt="\mathcal{O}(L^{-1})" /> correction is a finite-size term, dropped in the AST encoding.

**References**:

- Kitaev–Preskill 2006 *Phys. Rev. Lett.* 96:110404 (arXiv:hep-th/0510092), "Topological entanglement entropy".
- Levin–Wen 2006 *Phys. Rev. Lett.* 96:110405 (arXiv:cond-mat/0510613), "Detecting topological order in a ground state wave function".

**Dimensions**: Entropy S(R) is dimensionless `[1]` (nats). The AST round-trips through `format(infer(RHS))` to the registered `dimensional_signature: '[1]'`.

**Bridge Equation 23: Strange Metal - Black Hole Duality (SYK Planckian dissipation)**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the SYK Planckian linear-in-T resistivity.

- **Status**: Speculative. **Reformulated 2026-05-06.** Replaced the algebraically-vacuous `ρ(T) = ρ_0 + AT + B √(ℏ/(k_B T τ_P))` form (where the third term collapses to `B · 1` under the definitional identity `τ_P · k_B T = ℏ`) with the canonical SYK / Planckian-dissipation linear-in-T resistivity. The `m*` carrier effective-mass prefactor is required by the canonical Drude+Planckian decomposition; without it SI dimensional analysis yields `m³/(s·C²)` rather than the required `Ω·m = kg·m³/(s·C²)`. The remaining `phenomenological-ansatz` known_issue is for the *bridge-equation framing* (using SYK Planckian dissipation as the condensed-matter ↔ holography duality), not for the linear-in-T phenomenology itself, which is empirically established (Bruin 2013 *Science* 339:804; Legros 2019 *Nature Phys.* 15:142). Maldacena-Stanford 2016 (arXiv:1604.07818) gives the emergent SL(2,R) conformal symmetry; the explicit Green's function form follows standard SYK textbook references.
- **Context**: Planckian dissipation in strange metals: linear-in-T resistivity from a SYK / holographic relaxation rate `ℏ/τ ~ k_B T` (Sachdev-Ye-Kitaev limit; Hartnoll-Hofman holographic strange-metal phenomenology).
- **Mathematical Formulation** (canonical Drude + SYK Planckian-dissipation form):

<img src="https://i.upmath.me/svg/%5Crho(T)%20%3D%20%5Crho_0%20%2B%20%5Cfrac%7Bm%5E*%20k_B%20T%7D%7Bn_e%20e%5E2%20%5Chbar%7D%20%5Ccdot%20%5Calpha_%7B%5Ctext%7BSYK%7D%7D" alt="\rho(T) = \rho_0 + \frac{m^* k_B T}{n_e e^2 \hbar} \cdot \alpha_{\text{SYK}}" />

where:

- <img src="https://i.upmath.me/svg/%5Crho_0" alt="\rho_0" /> is the residual resistivity
- <img src="https://i.upmath.me/svg/m%5E*" alt="m^*" /> is the carrier effective mass (Drude prefactor; required for SI dimensional consistency `[ρ] = Ω·m`)
- <img src="https://i.upmath.me/svg/k_B%20T%2F%5Chbar" alt="k_B T/\hbar" /> is the Planckian relaxation rate (saturating the Maldacena–Shenker–Stanford chaos bound `λ_L ≤ 2π k_B T / ℏ`)
- <img src="https://i.upmath.me/svg/n_e" alt="n_e" /> is the carrier density and `e` the electric charge
- <img src="https://i.upmath.me/svg/%5Calpha_%7B%5Ctext%7BSYK%7D%7D" alt="\alpha_{\text{SYK}}" /> is a SYK-model dimensionless coefficient (~ O(1)) depending on the chosen SYK-q variant; for q=4 the conformal two-point function is `G(τ) ∝ |τ|^{-1/2}`

This form (i) recovers the empirical linear-in-T strange-metal resistivity, (ii) commits to a specific microscopic origin (SYK Schwinger-Dyson at strong coupling) consistent with the Hartnoll-Hofman 2010 holographic momentum-relaxed strange-metal model (arXiv:0912.0008), and (iii) connects to black-hole physics via Maldacena-Stanford's emergent near-extremal-AdS₂ dual.

### Category G: Quantum Biology Bridges

**Bridge Equation 26: DNA Mutation - Quantum Tunneling Rate**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the WKB mutation-rate integral.

> **AST encoding (Tier 5):** [`data/bridge-catalog.json`](../../data/bridge-catalog.json) (catalog record 26, evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts))

- **Status**: **Speculative** (WKB formula canonical, biological-relevance bridge framing speculative; the prior 'established' label was inconsistent with the predictive gap below). The WKB tunneling rate formula itself is standard quantum mechanics (Gamow 1928; Landau-Lifshitz QM Section 50) and remains canonical literature. The application to DNA base-pair tautomerization via proton tunneling is a real research area (Loewdin 1963) with ongoing debate about biological relevance. **Known issue:** the bare WKB rate `Γ_WKB` with reasonable barrier parameters overshoots observed mutation rates (~10⁻⁸-10⁻¹⁰ /bp/replication) by 2-4 orders of magnitude; the `f(T, pH, EM)` prefactor silently absorbs the dominant biological-mechanism corrections — polymerase proofreading (~10⁻⁵) and mismatch repair (MMR, ~10²) — without which the formula is not predictive of biological mutation rates. A defensible BE-26 must either (a) factor `f = f_proofreading × f_repair × f_environment` explicitly, or (b) replace tunneling-as-mutation-mechanism with the mainstream replication-error / polymerase-fidelity model. The status reflects the bridge framing's speculative element — the WKB formula stands; the claim that DNA mutations are dominantly tunneling-driven does not, as written.
- **Context**: Proton tunneling in base pair tautomerization
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5CGamma_%7B%5Ctext%7Bmutation%7D%7D%20%3D%20%5Cnu_0%20%5Cexp%5Cleft(-%5Cfrac%7B2%7D%7B%5Chbar%7D%5Cint_%7Bx_1%7D%5E%7Bx_2%7D%5Csqrt%7B2m(V(x)-E)%7D%20%2C%20dx%5Cright)%20%5Ccdot%20f(T%2C%5Ctext%7BpH%7D%2C%20%5Ctext%7BEM%7D)" alt="\Gamma_{\text{mutation}} = \nu_0 \exp\left(-\frac{2}{\hbar}\int_{x_1}^{x_2}\sqrt{2m(V(x)-E)} \, dx\right) \cdot f(T,\text{pH}, \text{EM})" />

where:

- <img src="https://i.upmath.me/svg/%5Cnu_0%20%5Csim%2010%5E%7B13%7D" alt="\nu_0 \sim 10^{13}" /> Hz is the attempt frequency
- <img src="https://i.upmath.me/svg/V(x)" alt="V(x)" /> is the potential barrier for proton transfer
- <img src="https://i.upmath.me/svg/f(T%2C%5Ctext%7BpH%7D%2C%20%5Ctext%7BEM%7D)" alt="f(T,\text{pH}, \text{EM})" /> nominally accounts for temperature, pH, and electromagnetic field effects, but in the spec as written it absorbs polymerase fidelity and mismatch-repair correction without naming them — see the Known Issue above.

### Category I: Emergent Spacetime

**Bridge Equation 30: Entanglement - Geometry Equation (FLM first-law / linear-response)**

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Entanglement.first_variation`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Entanglement.lean) is d/dt of S along a smooth curve of full-rank density matrices that stay diagonal in a fixed basis. The lemma is not the holographic first law. Ryu–Takayanagi is not in Mathlib, and chaining the area-law lemma does not identify the modular Hamiltonian with an area variation.

- **Status**: **Speculative (canonical formula, speculative QG-emergence framing). Reformulated 2026-05-06.** The previous form `g_{μν}(x) = η_{μν} + κ Σ_{ij} ⟨x|Tr_j(ρ_{ij} log ρ_{ij})|x⟩` was structurally ill-formed (rank-2 LHS vs scalar RHS, non-normalizable `|x⟩`, dimensionally wrong κ); replaced with the canonical **first-law-of-entanglement / FLM linear-response form**: `δS_EE(R) = ⟨δH_R⟩` where H_R is the modular Hamiltonian of the reduced density matrix on region R. Blanco-Casini-Hung-Myers 2013 (arXiv:1305.3182) states the form explicitly: "ΔS = ΔH for the first order variation of the entanglement entropy ΔS and the expectation value of the modular Hamiltonian ΔH". FLM 2013 (arXiv:1307.2892) uses this as the linear-response input to bulk one-loop corrections in AdS/CFT. The framework keeps `speculative` (not `established`) because the linear-response identity is canonical only inside its derivation domain (AdS/CFT, ball-shaped regions in conformally-flat space, etc.); the *use* of this identity as the basis for ER=EPR-style entanglement-geometry equivalence outside the strict AdS/CFT regime — which is the framing UPT proposes — remains conjectural. The phenomenological-ansatz tag is for the framing extension, not the linear-response math itself. See `tests/bridges/be-30-reformulation.test.ts` for the reformulation pin.
- **Context**: How spacetime emerges from quantum entanglement (FLM first-law / linear-response form)
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cdelta%20S_%7B%5Ctext%7BEE%7D%7D%28R%29%20%3D%20%5Cdelta%20%5Clangle%20H_R%20%5Crangle" alt="\delta S_{\text{EE}}(R) = \delta \langle H_R \rangle" />

<img src="https://i.upmath.me/svg/%5Cdelta%20S_%7B%5Ctext%7BEE%7D%7D(R)%20%3D%20%5Clangle%20%5Cdelta%20H_R%20%5Crangle" alt="\delta S_{\text{EE}}(R) = \langle \delta H_R \rangle" />

where:

- <img src="https://i.upmath.me/svg/%5Cdelta%20S_%7B%5Ctext%7BEE%7D%7D(R)" alt="\delta S_{\text{EE}}(R)" /> is the variation of entanglement entropy on region R under a small perturbation of the state
- <img src="https://i.upmath.me/svg/H_R%20%3D%20-%5Clog%20%5Crho_R" alt="H_R = -\log \rho_R" /> is the modular Hamiltonian of the reduced density matrix `ρ_R = Tr_{R̄} ρ` (trace over the complement region)
- <img src="https://i.upmath.me/svg/%5Clangle%20%5Cdelta%20H_R%20%5Crangle" alt="\langle \delta H_R \rangle" /> is the expectation value of the variation of H_R in the reference state
- The canonical (Blanco-Casini-Hung-Myers 2013, arXiv:1305.3182; FLM 2013, arXiv:1307.2892) regime is AdS/CFT with ball-shaped regions in conformally-flat backgrounds, where `H_R` admits a closed expression as an integral of `T^{tt}` over R weighted by a known boost generator; UPT extending the linear-response identity to non-AdS / non-holographic settings is the speculative element.

**Bridge Equation 31: Causal Set - Continuum Limit**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the Benincasa–Dowker d = 4 discrete Ricci scalar.

<img src="https://i.upmath.me/svg/R%28p%29%20%3D%20%5Cfrac%7B4%7D%7B%5Csqrt%7B6%7D%7D%20%5Cell_P%5E%7B-2%7D%20%5Cleft%5B1%20%2B%20N_0%28p%29%20-%209%20N_1%28p%29%20%2B%2016%20N_2%28p%29%20-%208%20N_3%28p%29%5Cright%5D%20%5Cquad%20%28d%3D4%29" alt="R(p) = \frac{4}{\sqrt{6}} \ell_P^{-2} \left[1 + N_0(p) - 9 N_1(p) + 16 N_2(p) - 8 N_3(p)\right] \quad (d=4)" />

- **Status**: Speculative. Benincasa-Dowker (arXiv:1001.2725) established discrete-to-continuum limits for causal set action and Ricci scalar. **Reformulated 2026-05-05:** replaced the originally-stated `R = (2/√π)(N/V^{2/4} - k_1 - k_2(ρ²ℓ_P⁴)^{1/4})` form — which contained both a `V^{2/4}→V^{1/2}` typo and a dimensional mismatch in the `(ρ²ℓ_P⁴)^{1/4}` term against Ricci-scalar dimensions `[L^{-2}]` — with the canonical Benincasa-Dowker d=4 inclusion-exclusion formula. The published Benincasa-Dowker (2010 *Phys. Rev. Lett.* 104:181301) form is additive (no sprinkling-density division). Status remains *speculative* because (a) the d≠4 generalization requires re-deriving coefficients and (b) using BD's discrete Ricci scalar as a *bridge equation* between causal-set discreteness and continuum spacetime — i.e., committing to causal-set dynamics as UPT's microstructure — is original to this catalog and is not in BD itself.
- **Context**: Discrete to continuous spacetime transition

- **Mathematical Formulation** (Benincasa-Dowker 2010, d=4):

<img src="https://i.upmath.me/svg/R(p)%20%3D%20%5Cfrac%7B4%7D%7B%5Csqrt%7B6%7D%7D%20%5Cell_P%5E%7B-2%7D%20%5Cleft%5B1%20%2B%20N_0(p)%20-%209%20N_1(p)%20%2B%2016%20N_2(p)%20-%208%20N_3(p)%5Cright%5D" alt="R(p) = \frac{4}{\sqrt{6}} \ell_P^{-2} \left[1 + N_0(p) - 9 N_1(p) + 16 N_2(p) - 8 N_3(p)\right]" />

where:

- <img src="https://i.upmath.me/svg/N_k(p)" alt="N_k(p)" /> counts causal-set inclusive intervals of cardinality `k+2` below point `p` (dimensionless integer counts)
- <img src="https://i.upmath.me/svg/%5Cell_P" alt="\ell_P" /> is the Planck length; the prefactor `4/√6` is the d=4 dimension-specific coefficient (different in d=2)
- The d=2 form has different coefficients; numerical convergence studied in Glaser-Surya 2014 *Class. Quantum Grav.* 31:045007

The original form (preserved here as historical record):

<img src="https://i.upmath.me/svg/R%20%3D%20%5Cfrac%7B2%7D%7B%5Csqrt%7B%5Cpi%7D%7D%20%5Cleft(%5Cfrac%7BN%7D%7BV%5E%7B2%2F4%7D%7D%20-%20k_1%20-%20k_2(%5Crho%5E2%20l_P%5E4)%5E%7B1%2F4%7D%5Cright)" alt="R = \frac{2}{\sqrt{\pi}} \left(\frac{N}{V^{2/4}} - k_1 - k_2(\rho^2 l_P^4)^{1/4}\right)" />

contained the `V^{2/4}→V^{1/2}` typo and the dimensionally-mismatched `(ρ²ℓ_P⁴)^{1/4}` term, and was not derivable from any standard causal-set-theory construction.

### Category J: Phase Transitions and Criticality

**Bridge Equation 34: Kibble-Zurek Mechanism in Curved Spacetime**

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.KibbleZurek.exponent`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/KibbleZurek.lean) is the freeze-out power only. The lemma does not include the Boltzmann factor and does not repair the missing 1/a^d.

> **AST encoding (Tier 5):** [`data/bridge-catalog.json`](../../data/bridge-catalog.json) (catalog record 34, evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts))

- **Status**: Established extension. The Kibble-Zurek defect density n ~ (tau_Q/tau_0)^(-d nu / (1 + z nu)) is established (Kibble 1976; Zurek 1985). The added exp(-m_defect c^2 / (k_B T_reh)) suppression for curved spacetime / reheating is a phenomenological extension not derived from the cited mechanism. **Temperature-scale issue:** the relevant temperature for defect-formation Boltzmann suppression is the symmetry-breaking / critical temperature T_c at the phase transition, not the (typically higher) reheating temperature T_reh. Using T_reh would weaken the suppression relative to the correct T_c scale. The displayed formula includes the explicit `1/a^d` prefactor; with `1/a^d` in front, the LHS dimensions `[L]^(-d)` are recovered.
- **Context**: Defect formation during cosmological phase transitions
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/n_%7B%5Ctext%7Bdefect%7D%7D%20%3D%20%5Cfrac%7B1%7D%7Ba%5Ed%7D%5Cleft(%5Cfrac%7B%5Ctau_Q%7D%7B%5Ctau_0%7D%5Cright)%5E%7B-%5Cfrac%7Bd%5Cnu%7D%7B1%2Bz%5Cnu%7D%7D%20%5Ccdot%20%5Cexp%5Cleft(-%5Cfrac%7Bm_%7B%5Ctext%7Bdefect%7D%7D%20c%5E2%7D%7Bk_B%20T_%7B%5Ctext%7Breh%7D%7D%7D%5Cright)" alt="n_{\text{defect}} = \frac{1}{a^d}\left(\frac{\tau_Q}{\tau_0}\right)^{-\frac{d\nu}{1+z\nu}} \cdot \exp\left(-\frac{m_{\text{defect}} c^2}{k_B T_{\text{reh}}}\right)" />

where:

- <img src="https://i.upmath.me/svg/%5Ctau_Q" alt="\tau_Q" /> is the quench time
- <img src="https://i.upmath.me/svg/%5Ctau_0" alt="\tau_0" /> is the microscopic time scale
- <img src="https://i.upmath.me/svg/T_%7B%5Ctext%7Breh%7D%7D" alt="T_{\text{reh}}" /> is the reheating temperature
- The exponential factor accounts for cosmic expansion effects

### Category L: Quantum Field Theory Extensions

**Bridge Equation 41: Swampland Distance Conjecture Equation**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the swampland distance-conjecture mass tower.

> **AST encoding (Tier 5):** [`data/bridge-catalog.json`](../../data/bridge-catalog.json) (catalog record 41, evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts))

- **Status**: Speculative. Swampland conjecture from string theory (Vafa, arXiv:hep-th/0509212). Active research; not confirmed.
- **Context**: Constraints on effective field theories from quantum gravity
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/m(%5Cphi)%20%3D%20m_0%20%5Cexp%5Cleft(-%5Calpha%5Cfrac%7B%7C%5Cphi-%5Cphi_0%7C%7D%7BM_P%7D%5Cright)" alt="m(\phi) = m_0 \exp\left(-\alpha\frac{|\phi-\phi_0|}{M_P}\right)" />

where:

- <img src="https://i.upmath.me/svg/%5Calpha%20%5Csim%20%5Cmathcal%7BO%7D(1)" alt="\alpha \sim \mathcal{O}(1)" /> is the swampland parameter
- <img src="https://i.upmath.me/svg/M_P" alt="M_P" /> is the Planck mass
- This limits field excursions to <img src="https://i.upmath.me/svg/%5CDelta%5Cphi%20%5Clesssim%20M_P" alt="\Delta\phi \lesssim M_P" />

### Category M: Information Paradox Resolutions

**Bridge Equation 42: Firewall Complement Principle**

> **Proof status as of 2026-10-02.** Kind is `cross-check`. [`PhysJS.HawkingUnruh.dictionary`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/HawkingUnruh.lean) remains the manifest theorem. It names BE-57 and states T_H(2GM/c²) = T_H(M) together with T_U(c⁴/(4GM)) = T_H(M). The Hawking temperature is not proved: PhysJS `docs/feasibility/be-42.md` at this pin records that PhysLean has no Schwarzschild surface gravity and no KMS condition. A units monomial leaves the coefficient unfixed, and assuming surface gravity together with the KMS factor repeats the dictionary. Neither partial was taken. The kind stays `cross-check`. BE-57 has no PhysJS formalRef of its own at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`.

- **Status**: Highly speculative. Firewall paradox is unresolved. The specific "complement principle" formulation here is not a standard result; the decomposition |psi> = a|smooth> + b|firewall> is a tautological superposition without physics content unless f(observer, protocol) is independently specified.
- **Context**: Black hole information without firewalls
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/T_H%20%3D%20%5Cfrac%7B%5Chbar%20c%5E3%7D%7B8%5Cpi%20G%20M%20k_B%7D" alt="T_H = \frac{\hbar c^3}{8\pi G M k_B}" />

<img src="https://i.upmath.me/svg/%7C%5Cpsi%5Crangle_%7B%5Ctext%7Btotal%7D%7D%20%3D%20%5Calpha%7C%5Ctext%7Bsmooth%7D%5Crangle_%7B%5Ctext%7Bhorizon%7D%7D%20%2B%20%5Cbeta%7C%5Ctext%7Bfirewall%7D%5Crangle_%7B%5Ctext%7Bhorizon%7D%7D" alt="|\psi\rangle_{\text{total}} = \alpha|\text{smooth}\rangle_{\text{horizon}} + \beta|\text{firewall}\rangle_{\text{horizon}}" />

with observer-dependent state decomposition:
<img src="https://i.upmath.me/svg/%7C%5Calpha%7C%5E2%20%2B%20%7C%5Cbeta%7C%5E2%20%3D%201%2C%20%5Cquad%20%7C%5Calpha%7C%5E2%20%3D%20f(%5Ctext%7Bobserver%20location%7D%2C%20%5Ctext%7Bmeasurement%20protocol%7D)" alt="|\alpha|^2 + |\beta|^2 = 1, \quad |\alpha|^2 = f(\text{observer location}, \text{measurement protocol})" />

**Bridge Equation 43: ER=EPR Wormhole-Entropy Bound**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.PlanckArea.area_law`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/PlanckArea.lean) states k_B A/(4 ℓ_P²) = k_B c³ A/(4 G ℏ) for ℓ_P² = ℏ G/c³. The lemma is not ER=EPR.

- **Status**: **Speculative (canonical Bekenstein-Hawking bound, ER=EPR framing remains conjectural). Reformulated 2026-05-06.** The previous form `dℓ_wormhole/dt = -γ S_entanglement + δ ∫ T_μν u^μ u^ν dV` was structurally malformed (sign-backwards from the standard ER=EPR heuristic; entropy + stress-energy-integral cannot combine into length/time without unphysical coefficient roles for γ and δ). Replaced with the canonical **ER=EPR wormhole-entropy-bound form**: `S_entanglement ~ A_wormhole / (4 ℓ_P²)` — the Bekenstein-Hawking entropy bound (Bekenstein 1973 *Phys. Rev. D* 7:2333; Hawking 1975 *Commun. Math. Phys.* 43:199) applied to the minimal cross-section of an Einstein-Rosen bridge. Maldacena-Susskind 2013 (arXiv:1306.0533) states the canonical ER=EPR equivalence: "two distant black holes are connected through the interior via a wormhole, or Einstein-Rosen bridge...interpreted as maximally entangled states of two black holes that form a complex EPR pair." Stanford-Susskind 2014 *Phys. Rev. D* 90:126007 (arXiv:1406.2678, "Complexity and Shock Wave Geometries") develops complexity-volume duality on top; the companion Susskind-Zhao 2014 paper (arXiv:1408.2823, "Switchbacks and the Bridge to Nowhere") extends to switchback geometries. Status remains `speculative` because the ER=EPR conjecture itself remains conjectural outside the strict eternal-black-hole / thermofield-double AdS/CFT regime; the bound formula is canonical Bekenstein-Hawking, the framing is the speculative element. See `tests/bridges/be-43-reformulation.test.ts` for the reformulation pin.
- **Context**: Entanglement-wormhole equivalence: entanglement entropy bounded by wormhole cross-section area (ER=EPR canonical form)
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/S_%7B%5Ctext%7Bentanglement%7D%7D%20%5Csim%20%5Cfrac%7BA_%7B%5Ctext%7Bwormhole%7D%7D%7D%7B4%20%5Cell_P%5E2%7D" alt="S_{\text{entanglement}} \sim \frac{A_{\text{wormhole}}}{4 \ell_P^2}" />

where:

- <img src="https://i.upmath.me/svg/S_%7B%5Ctext%7Bentanglement%7D%7D%20%3D%20-%5Ctext%7BTr%7D(%5Crho_A%20%5Clog%20%5Crho_A)" alt="S_{\text{entanglement}} = -\text{Tr}(\rho_A \log \rho_A)" /> is the von Neumann entanglement entropy of the reduced density matrix
- <img src="https://i.upmath.me/svg/A_%7B%5Ctext%7Bwormhole%7D%7D" alt="A_{\text{wormhole}}" /> is the minimal cross-section area of the Einstein-Rosen bridge connecting the two entangled regions
- <img src="https://i.upmath.me/svg/%5Cell_P%20%3D%20%5Csqrt%7B%5Chbar%20G%2Fc%5E3%7D" alt="\ell_P = \sqrt{\hbar G/c^3}" /> is the Planck length
- The canonical Bekenstein-Hawking prefactor `1/(4 ℓ_P²)` is dimensionless / Planck-length squared, recovering `[area / area] = [dimensionless]` for `S` as expected

### Category N: Cosmological Puzzles

**Bridge Equation 45: Trans-Planckian Censorship Constraint**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the trans-Planckian censorship bound on the number of inflationary e-foldings.

- **Status**: Speculative / non-standard. The Trans-Planckian Censorship Conjecture (Bedroya-Vafa 2019, arXiv:1909.11063) bounds inflationary e-foldings via `N_e < ln(M_P / H_inf)`. The formula as written here adds an extra term `-gamma log(r / 0.01)` with no derivation; this extension is original to this framework and has no published reference. Additionally, the log base is unspecified — TCC uses natural logarithm (ln), not log base 10. Revisions should cite arXiv:1909.11063 and either remove the extra term or derive it.
- **Context**: Quantum gravity constraints on inflation
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/N_e%20%3C%20%5Clog%5Cleft(%5Cfrac%7BM_P%7D%7BH_%7B%5Ctext%7Binf%7D%7D%7D%5Cright)%20-%20%5Cgamma%20%5Clog%5Cleft(%5Cfrac%7Br%7D%7B0.01%7D%5Cright)" alt="N_e < \log\left(\frac{M_P}{H_{\text{inf}}}\right) - \gamma \log\left(\frac{r}{0.01}\right)" />

> **Correction (Round 6):** The term `-γ log(r/0.01)` is an **extension original to this framework**, not part of the Bedroya-Vafa TCC (arXiv:1909.11063). The standard TCC bound is `N_e < ln(M_P / H_inf)` (natural log). The `log` above should be read as `ln` unless otherwise specified.

where:

- <img src="https://i.upmath.me/svg/N_e" alt="N_e" /> is the number of e-foldings
- <img src="https://i.upmath.me/svg/H_%7B%5Ctext%7Binf%7D%7D" alt="H_{\text{inf}}" /> is the Hubble scale during inflation
- <img src="https://i.upmath.me/svg/r" alt="r" /> is the tensor-to-scalar ratio
- <img src="https://i.upmath.me/svg/%5Cgamma%20%5Csim%201%2F3" alt="\gamma \sim 1/3" /> is a numerical factor

**Bridge Equation 47: Big Bang Nucleosynthesis - Dark Sector Coupling**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the dark-sector transfer term in the light-element abundance equation.

> **AST encoding (Tier 5):** [`data/bridge-catalog.json`](../../data/bridge-catalog.json) (catalog record 47, evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts))

- **Status**: Speculative extension on top of an established base. Standard BBN Boltzmann rate equations are well-established (Wagoner, Fowler & Hoyle 1967, ApJ 148:3 (foundational BBN); Wagoner 1969, ApJS 18:247 (BBN network update); Kawano 1992 code; Pitrou-Coc-Uzan-Vangioni 2018 review, Phys. Rep. 754:1). The dark-sector coupling term `⟨σv⟩_dark n_χ² ε_transfer` is a novel extension for light-element abundance modification by dark matter interactions (cf. Pospelov 2008; Boehm-Dolan-McCabe 2013).
- **Context**: Dark matter effects on light element abundances
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7BdY%7D%7Bdt%7D%20%2B%203HY%20%3D%20%5Clangle%5Csigma%20v%5Crangle_%7B%5Ctext%7BSM%7D%7D%20n_p%20n_n%20-%20%5Clangle%5Csigma%20v%5Crangle_%7B%5Ctext%7Bdark%7D%7D%20n_%5Cchi%5E2%20%5Cepsilon_%7B%5Ctext%7Btransfer%7D%7D" alt="\frac{dY}{dt} + 3HY = \langle\sigma v\rangle_{\text{SM}} n_p n_n - \langle\sigma v\rangle_{\text{dark}} n_\chi^2 \epsilon_{\text{transfer}}" />

where:

- <img src="https://i.upmath.me/svg/Y" alt="Y" /> is the abundance of light elements (e.g., the deuterium abundance per baryon Y_D)
- <img src="https://i.upmath.me/svg/H" alt="H" /> is the Hubble expansion rate
- <img src="https://i.upmath.me/svg/n_p%2C%20n_n" alt="n_p, n_n" /> are proton and neutron number densities (the example two-body process is p + n → d + γ; for other reactions the appropriate unlike-species product applies)
- <img src="https://i.upmath.me/svg/n_%5Cchi" alt="n_\chi" /> is the dark matter number density (the dark-sector self-annihilation `n_χ²` form remains for χχ → SM)
- <img src="https://i.upmath.me/svg/%5Cepsilon_%7B%5Ctext%7Btransfer%7D%7D" alt="\epsilon_{\text{transfer}}" /> is the energy transfer efficiency between sectors

> **Corrected on 2026-05-01:** Added the Hubble dilution drag term `+3HY` to the LHS — every species-abundance Boltzmann equation in an FRW background carries this term to account for the comoving-vs-physical-density distinction; without it the equation describes flat spacetime, not cosmology (Kolb & Turner *The Early Universe* (1990) §5.2 Eq. 5.13–5.14; Pitrou-Coc-Uzan-Vangioni 2018, Phys. Rep. 754:1, Eq. 2.5). Replaced `n_b²` with `n_p n_n` for the SM-channel two-body reaction — `⟨σv⟩` between distinct species multiplies the *product* `n_p n_n`, not a single-species square; the `n_b²` form is only appropriate when both reactants are the same species (Kolb & Turner §5.2; Steigman 2007 Annu. Rev. Nucl. Part. Sci. 57:463, Eq. 27 for the standard p+n→d+γ rate). Status downgraded `Established base equation with speculative extension` → `Speculative extension` for consistency: the *base* form is now correct and corresponds to the canonical reduced BBN equation, but the dark-sector coupling term remains the unverified physics extension. See also Pitrou-Coc-Uzan-Vangioni 2018 Eq. 2.5 for the full BBN network template.

A bare `e` in the formulas below is the elementary charge. Euler's number is written `\exp`. §VI assigns each written-up equation the tensor index of its catalog category, via [`src/bridges/tensor-index.ts`](../../src/bridges/tensor-index.ts).

**Bridge Equation 56: Casimir effect (quantum-vacuum force between plates)** *(Category A: Quantum-Classical Bridges)*

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. PhysJS main at that commit has no Casimir file. The missing piece is the mode sum that produces `π²/240`. Units give `F/A = C ℏ c / d⁴` and do not fix `C = −π²/240`. That unfixed constant is not a Lean derivation-step at this pin.

> **Evaluator:** catalog record 56 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. Two neutral parallel conducting plates in vacuum attract because the boundary conditions restrict the electromagnetic vacuum modes between them. Casimir 1948. The ideal formula is perfect conductors at zero temperature. Lamoreaux 1997 reported agreement at about 5 percent, and Mohideen & Roy 1998 at about 1 percent, both after corrections. The catalog records the confrontation as systematics-dominated agreement with the corrected theory, and as a consistency record whose printed difference is 0.
- **Context**: Bridges the quantum vacuum to a classical macroscopic force. The bridges tuple is `quantum` → `classical`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7BF%7D%7BA%7D%20%3D%20-%5Cfrac%7B%5Cpi%5E2%20%5Chbar%20c%7D%7B240%5C%2C%20d%5E4%7D" alt="\frac{F}{A} = -\frac{\pi^2 \hbar c}{240\, d^4}" />

where:

- `F/A` is the force per unit area, in pascals. The sign is attractive
- `ℏ` is the reduced Planck constant, `c` is the speed of light, and `d` is the plate separation, in metres
- `π²/240` is dimensionless

**Dimensions**: The catalog signature is `[L^-1 M T^-2]`, pressure. `ℏ` has dimension `[M L^2 T^-1]` and `c` has dimension `[L T^-1]`, so `ℏ c / d⁴` has dimension `[M L^-1 T^-2]`.

**Domain**: The evaluator requires `d > 0`. The ideal formula is the leading term. Real measurements use sphere-plate geometry and subtract finite-conductivity, roughness, temperature, and electrostatic-patch corrections. A formula for those corrections is not in the catalog equation, and a numerical ideal pressure at a stated separation is not in the catalog, in PhysJS, in `NOTES.md`, or in the gap list.

**References**:

- Casimir 1948 *Proc. K. Ned. Akad. Wet.* 51:793.
- Lamoreaux 1997 *Phys. Rev. Lett.* 78:5.
- Mohideen & Roy 1998 *Phys. Rev. Lett.* 81:4549, arXiv:physics/9805038.

**Rationale**: The boundary condition on the vacuum modes produces a macroscopic pressure.

**Bridge Equation 57: Unruh effect (acceleration-induced thermality)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. [`PhysJS.HawkingUnruh.dictionary`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/HawkingUnruh.lean) is the catalog formalRef on BE-42. It names BE-57 and states `T_U(a) = ℏ a / (2π c k_B)` together with `T_U(c⁴/(4 G M)) = T_H(M)`. `T_U(c⁴/(2 G M))` is not `T_H(M)`. The lemma is not the Unruh effect as a theorem about the Rindler wedge. Units give `T = C ℏ a / (c k_B)`. `C = 1/(2π)` is not fixed by units, and that monomial is not a derivation-step on this id.

> **Evaluator:** catalog record 57 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established on the theoretical formula. A uniformly accelerated observer in the Minkowski vacuum perceives a thermal bath at the Unruh temperature. Fulling 1973, Davies 1975, Unruh 1976. The catalog has no confrontation: laboratory accelerations give `T ≈ 4×10⁻²⁰ K` at `1 g`, which the notes call unmeasurable, and analog-gravity results are called indirect. No analog dataset is among the three references.
- **Context**: Bridges proper acceleration to a temperature, with the same `2π` that BE-42 uses for surface gravity. The bridges tuple is `quantum` → `classical`. The catalog dependency is BE-42. BE-57 does not receive a second key for the BE-42 cross-check.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/T%20%3D%20%5Cfrac%7B%5Chbar%20a%7D%7B2%5Cpi%20c%20k_B%7D" alt="T = \frac{\hbar a}{2\pi c k_B}" />

where:

- `T` is the Unruh temperature, in kelvin
- `a` is the proper acceleration, in metres per second squared
- `ℏ`, `c`, and `k_B` are the reduced Planck constant, the speed of light, and Boltzmann's constant

**Dimensions**: The catalog signature is `[temperature]`. It does not record a seven-base tuple for this id. `ℏ a / c` has dimension `[M L^2 T^-2]`, energy, and dividing by `k_B` (energy per kelvin) leaves temperature. The factor `1/(2π)` is dimensionless and is not fixed by that cancellation.

**Domain**: The evaluator requires `a ≥ 0`. The proper acceleration that would bring `T` to a stated laboratory scale is not given in the catalog, in PhysJS, in `NOTES.md`, or in the gap list. The catalog states the `1 g` temperature above and defers the confrontation.

**References**:

- Unruh 1976 *Phys. Rev. D* 14:870.
- Davies 1975 *J. Phys. A* 8:609.
- Fulling 1973 *Phys. Rev. D* 7:2850.

**Rationale**: Uniform acceleration assigns a temperature to the Minkowski vacuum, with the factor that matches Hawking's temperature at `a = c⁴/(4 G M)` under the BE-42 dictionary.

**Bridge Equation 58: Johnson-Nyquist noise / fluctuation-dissipation theorem** *(Category H: Non-Equilibrium Statistical Mechanics)*

> **Proof status as of 2026-10-01.** Kind is `limit`. [`PhysJS.JohnsonNyquist.tendsto_classical`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/JohnsonNyquist.lean) states that `S_V = 4 k_B T R` is the `ω → 0⁺` limit of the quantum parent `S_V^q(ω) = 4 R ℏ ω / (exp(ℏ ω / (k_B T)) − 1)`, for `k_B T > 0` and `ℏ ≠ 0`. The same expression with `+ 1` in the denominator does not tend to `4 k_B T R`. The lemma is not the fluctuation–dissipation theorem. The parent is a premise. Units do not derive the exponential.

> **Evaluator:** catalog record 58 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. A resistor in thermal equilibrium generates a fluctuating voltage whose one-sided power spectral density is fixed by `R` and `T`. Johnson 1928 measured it. Nyquist 1928 derived `S_V = 4 k_B T R` from the second law, transmission-line mode counting, and equipartition. The catalog comment says that reading Nyquist's classical formula as the `h f ≪ k_B T` limit of his Planck-weighted formula is this repository's gloss. Flowers-Jacobs et al. 2017 determined `k_B` by Johnson noise thermometry. The catalog notes record the factor 4 as confirmed, and `NOTES.md` records a printed difference of 0 for the consistency record.
- **Context**: Bridges thermal fluctuation to electrical dissipation. BE-27 is the catalog's speculative active-matter violation of the fluctuation–dissipation theorem. BE-58 is the theorem that entry names. The bridges tuple is `quantum` → `classical`. The catalog dependency is BE-27.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/S_V%20%3D%204%20k_B%20T%20R" alt="S_V = 4 k_B T R" />

<img src="https://i.upmath.me/svg/S_V%5E%7Bq%7D%28%5Comega%29%20%3D%20%5Cfrac%7B4%20R%20%5Chbar%20%5Comega%7D%7B%5Cexp%28%5Chbar%20%5Comega%2F%28k_B%20T%29%29-1%7D" alt="S_V^{q}(\omega) = \frac{4 R \hbar \omega}{\exp(\hbar \omega/(k_B T))-1}" />

where:

- `S_V` is the one-sided voltage-noise power spectral density, in volt squared per hertz
- `T` is the temperature, in kelvin, and `R` is the resistance, in ohms
- `k_B` is Boltzmann's constant
- the second display is the quantum parent in PhysJS. `ω` is angular frequency. `\exp` is the exponential. The catalog equation is the classical limit, not the parent

**Dimensions**: The catalog signature is `[L^4 M^2 T^-5 I^-2]`. `k_B T` has dimension energy, `[M L^2 T^-2]`, and resistance has dimension `[M L^2 T^-3 I^-2]`, so the product has dimension `[M^2 L^4 T^-5 I^-2]`. The factor 4 is the one-sided spectrum. The catalog comment records that the one-sided choice is what makes the prefactor 4 rather than 2, and that `Conventions` has no field for that choice.

**Domain**: The evaluator requires `T ≥ 0` and `R ≥ 0`. The classical formula is the low-frequency regime. The relation overlay states that regime as `h f ≪ k_B T` and does not type it as an approximation, because no Lipschitz constant, error, and horizon for that truncation are sourced. A numerical bound on `h f / k_B T` is not in the catalog.

**References**:

- Johnson 1928 *Phys. Rev.* 32:97.
- Nyquist 1928 *Phys. Rev.* 32:110.
- Flowers-Jacobs et al. 2017 *Metrologia* 54:730.

**Rationale**: Equilibrium voltage fluctuations of a resistor are fixed by its resistance and its temperature.

**Bridge Equation 61: Wiedemann-Franz law (Lorenz number)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Sommerfeld.integral_eq`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Sommerfeld.lean) states that `∫_ℝ x² exp(x) / (1 + exp(x))² dx = π²/3`. The integrand is even, so the integral over the positive half-line is half of `π²/3`. Claiming the half-line equals `π²/3` fails. The lemma is not the transport law that identifies the Lorenz number with that integral. Units give `L = C (k_B/e)²` and do not give `C = π²/3`.

> **Evaluator:** catalog record 61 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established, as a consistency statement with a degenerate-limit caveat. The ratio of thermal conductivity to electrical conductivity in a metal is `L_0 T`, with the Sommerfeld Lorenz number `L_0 = (π²/3)(k_B/e)²`. Wiedemann & Franz 1853 stated the empirical proportionality. The catalog context dates Sommerfeld's derivation to 1927. The references line dates the free-electron paper to 1928 *Z. Phys.* 47:1. This section uses the references line for the citation and does not resolve the year. The catalog context states `L_0 ≈ 2.44×10⁻⁸ W·Ω·K⁻²`. The references record copper at `0 °C` near `2.23×10⁻⁸`, about 9 percent below `L_0`, and silver at low temperature recovering `L_0`. The catalog notes say the statistics tag was removed. `NOTES.md` records that the observed Lorenz number in this confrontation is the predicted constant by construction, so the record cannot show a discrepancy, and that the printed difference is 0.
- **Context**: Bridges charge transport and heat transport by the same carriers at the Fermi surface. The bridges tuple is `quantum` → `classical`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7B%5Ckappa%7D%7B%5Csigma%20T%7D%20%3D%20L_0%20%3D%20%5Cfrac%7B%5Cpi%5E2%7D%7B3%7D%5Cleft%28%5Cfrac%7Bk_B%7D%7Be%7D%5Cright%29%5E2" alt="\frac{\kappa}{\sigma T} = L_0 = \frac{\pi^2}{3}\left(\frac{k_B}{e}\right)^2" />

where:

- `κ` is the thermal conductivity and `σ` is the electrical conductivity
- `T` is the temperature, in kelvin
- `L_0` is the Lorenz number, in watt-ohm per kelvin squared
- `k_B` is Boltzmann's constant and `e` is the elementary charge
- `π²/3` is the value of the Sommerfeld integral proved in PhysJS. The transport step that inserts it into `L_0` is the gap

**Dimensions**: The catalog signature is `[L^4 M^2 T^-6 I^-2 Theta^-2]`. `k_B` has dimension `[M L^2 T^-2 Θ^-1]` and `e` has dimension `[I T]`, so `(k_B/e)²` has dimension `[M^2 L^4 T^-6 I^-2 Θ^-2]`. `π²/3` is dimensionless. The evaluator returns `κ = L_0 σ T`.

**Domain**: The evaluator requires finite `σ ≥ 0` and `T ≥ 0`. The law is the degenerate, elastic-scattering limit. Inelastic scattering suppresses `L` at intermediate temperature. A single crossover temperature is not stated in the catalog, in PhysJS, in `NOTES.md`, or in the gap list. The copper and silver examples above are the stated regimes.

**References**:

- Wiedemann & Franz 1853 *Ann. Phys.* 165:497.
- Sommerfeld 1928 *Z. Phys.* 47:1.
- Kumar, Auton et al. 2023, arXiv:2308.12349. Kittel, *Introduction to Solid State Physics*, for the copper figure in the catalog reference.

**Rationale**: The same degenerate carriers carry charge and heat, so `κ/(σ T)` is a constant built from `k_B` and `e`.

**Bridge Equation 63: Chandrasekhar mass (white-dwarf degeneracy limit)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.Chandrasekhar.prefactor`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Chandrasekhar.lean) states that with `n = ρ/(μ_e m_u)`, `p_F = ℏ (3π² n)^{1/3}`, and `P = (1/4) n p_F c`, the pressure is `P = K_ρ ρ^{4/3}`, and for the `n = 3` Lane–Emden scale the central density cancels, leaving `M = (ω₃⁰ √(3π)/2) (ℏ c/G)^{3/2} (μ_e m_u)^{−2}`. `ω₃⁰` stays symbolic. The decimal `2.01824` is not in the theorem. `√π/2` in place of `√(3π)/2` fails when `ω₃⁰ ≠ 0`, and dropping `ω₃⁰` fails when `ω₃⁰ ≠ 1`. The lemma is not stellar rotation or magnetic support.

> **Evaluator:** catalog record 63 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established, as an upper-bound consistency statement. The maximum mass of a white dwarf supported by electron degeneracy pressure is the Chandrasekhar mass. Chandrasekhar 1931 (Nobel Prize 1983). The catalog context states `≈ 1.44 M_⊙` at `μ_e = 2`. The evaluator notes state `≈ 1.456 M_⊙` at `μ_e = 2` under the module's atomic-mass constant. The confrontation uses an observed white-dwarf maximum of about `1.35 M_⊙` and an agreement bound `0.12`. `NOTES.md` records a printed difference of `−7.27%`. Super-Chandrasekhar supernovae in the catalog references reach about `2.4–2.8 M_⊙` with rotation or magnetic support. Both reviewers marked the tight reading yellow.
- **Context**: Bridges quantum degeneracy pressure to a gravitational stellar-structure limit. The bridges tuple is `quantum` → `classical`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/M_%7BCh%7D%20%3D%20%5Cfrac%7B%5Comega_3%5E0%20%5Csqrt%7B3%5Cpi%7D%7D%7B2%7D%5Cleft%28%5Cfrac%7B%5Chbar%20c%7D%7BG%7D%5Cright%29%5E%7B3%2F2%7D%5Cfrac%7B1%7D%7B%28%5Cmu_e%20m_u%29%5E2%7D" alt="M_{Ch} = \frac{\omega_3^0 \sqrt{3\pi}}{2}\left(\frac{\hbar c}{G}\right)^{3/2}\frac{1}{(\mu_e m_u)^2}" />

where:

- `M_Ch` is the limiting mass
- `ω₃⁰` is the Lane–Emden `n = 3` surface constant, `−ξ² θ'` at the first zero. The catalog context states `≈ 2.018`. The evaluator stores `2.01824`. The theorem leaves the symbol unexpanded
- `ℏ`, `c`, and `G` are the reduced Planck constant, the speed of light, and Newton's constant
- `μ_e` is the mean molecular weight per electron, dimensionless (`2` for carbon/oxygen). `m_u` is the atomic mass constant, in kilograms

**Dimensions**: The catalog signature is `[mass]`. `ℏ c / G` has dimension `[M²]`, so `(ℏ c / G)^{3/2}` has dimension `[M³]`. Dividing by `(μ_e m_u)²`, dimension `[M²]`, leaves mass. `ω₃⁰` and `√(3π)/2` are dimensionless.

**Domain**: The evaluator requires `μ_e > 0`. The ideal limit omits rotation and magnetic support. Those supports are the catalog's stated reason the observed supernova progenitors can lie above the ideal mass. The numerical value of `ω₃⁰` is an input of the evaluator and is not a theorem.

**References**:

- Chandrasekhar 1931 *Astrophys. J.* 74:81.
- Shapiro & Teukolsky 1983 *Black Holes, White Dwarfs and Neutron Stars*, §3.
- Howell et al. 2006 *Nature* 443:308.

**Rationale**: Electron degeneracy pressure supports a white dwarf only up to a mass fixed by `ℏ`, `c`, `G`, and the composition, once the Lane–Emden factor is given.

**Bridge Equation 64: Eddington luminosity (radiation-pressure limit)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Eddington.balance_iff`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Eddington.lean) states that, for `r > 0`, `σ_T > 0`, and `c > 0`, `L σ_T / (4π r² c) = G M m_p / r²` if and only if `L = 4π G M m_p c / σ_T`. The Thomson force and the gravitational force are premises. Twice that luminosity fails the same balance when the constants in the formula are positive. The lemma is not a claim that the luminosity is a hard cap. Once both forces are inverse-square, the `r²` cancellation is the lemma. Units do not say the balance is a maximum.

> **Evaluator:** catalog record 64 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established, as a spherical-symmetry scale with a super-Eddington caveat. The luminosity at which radiation pressure on ionized hydrogen balances gravity is the Eddington luminosity. Eddington 1926. The catalog context states `L_Edd ≈ 1.26×10³¹ W · (M/M_⊙)`. The evaluator notes state `≈ 1.257×10³¹ W` per solar mass. The catalog records that most accreting sources respect this scale and that super-Eddington sources exist, including the ultraluminous X-ray pulsar of Bachetti et al. 2014. `NOTES.md` records a printed difference of 0 for the consistency record. The reviewers split on calling the scale tight, and the catalog resolved that split as consistency with the caveat.
- **Context**: Bridges a gravitational mass to a radiative luminosity through the Thomson cross-section. The bridges tuple is `quantum` → `classical`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/L_%7BEdd%7D%20%3D%20%5Cfrac%7B4%5Cpi%20G%20M%20m_p%20c%7D%7B%5Csigma_T%7D" alt="L_{Edd} = \frac{4\pi G M m_p c}{\sigma_T}" />

<img src="https://i.upmath.me/svg/%5Cfrac%7BL%20%5Csigma_T%7D%7B4%5Cpi%20r%5E2%20c%7D%20%3D%20%5Cfrac%7BG%20M%20m_p%7D%7Br%5E2%7D" alt="\frac{L \sigma_T}{4\pi r^2 c} = \frac{G M m_p}{r^2}" />

where:

- `L_Edd` is the luminosity, in watts
- `M` is the mass, in kilograms
- `m_p` is the proton mass. The evaluator stores `1.67262192369×10⁻²⁷ kg`
- `σ_T` is the Thomson cross-section. The evaluator stores `6.6524587321×10⁻²⁹ m²`
- `G` and `c` are Newton's constant and the speed of light
- `r` is the radius at which the two forces are compared. It cancels
- the second display is the force balance the lemma proves equivalent to the luminosity. Both forces are premises

**Dimensions**: The catalog signature is `[power]`. `G M m_p c` has dimension `[M L^4 T^-3]`. Dividing by `σ_T`, dimension `[L²]`, leaves `[M L^2 T^-3]`, which is power. `4π` is dimensionless. The two sides of the force balance are accelerations times mass, and `r²` is common.

**Domain**: The evaluator requires `M > 0`. The balance is the spherical inverse-square comparison. Beaming and anisotropy are the catalog's stated setting for sources above `L_Edd`. A luminosity threshold that separates those sources is not given as a formula in the catalog, in PhysJS, in `NOTES.md`, or in the gap list.

**References**:

- Eddington 1926 *The Internal Constitution of the Stars*.
- Rybicki & Lightman 1979 *Radiative Processes in Astrophysics*, §1.
- Bachetti et al. 2014 *Nature* 514:202.

**Rationale**: Equating the Thomson force on the electrons to the gravitational force on the protons cancels the radius and leaves a luminosity proportional to mass.

**Bridge Equation 65: Jeans mass (gravitational collapse criterion)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Jeans.mass_eq`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Jeans.lean) derives the encoded mass from the virial convention `3 M k T / (μ m_u) = 3 G M² / (5 R)` and `M = 4π R³ ρ / 3`, with positive parameters. The catalog writes that `k` as `k_B`. Replacing `5` by `3` fails. The lemma is not the virial theorem. Units give the monomial `M ∼ (k_B T / (G μ m_u))^{3/2} ρ^{−1/2}`. The `5` and the `3/(4π)` are not fixed by units.

> **Evaluator:** catalog record 65 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established, as an order-of-magnitude collapse scale. The critical mass above which a self-gravitating gas cloud collapses against thermal pressure is the Jeans mass. Jeans 1902. The numerical factor `5` is convention-dependent, which the catalog notes, the confrontation, and the Lean negative control all record. The confrontation evaluates dense-core conditions `T = 10 K`, `ρ ≈ 3.8×10⁻¹⁶ kg/m³`, `μ = 2.3`, against an observed core mass of `1 M_⊙`, with fractional agreement `1.5`. The module comment says the agreement is a factor of a few. A bound of `1.5` places the lower edge below zero, so a non-negative observed mass cannot fail the low side of this record. `NOTES.md` records a printed difference of `−43.7%` and states that the `±150%` reading of this bound accepts any observed value from `0` to `4.44 M_⊙`. Turbulence, magnetic fields, and rotation are named in the confrontation and are not in the formula.
- **Context**: Bridges thermal pressure to gravitational collapse. The bridges tuple is `quantum` → `classical`. The catalog comment records that a neutron-star maximum mass was deferred and is not BE-66 in this catalog.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/M_J%20%3D%20%5Cleft%28%5Cfrac%7B5%20k_B%20T%7D%7BG%20%5Cmu%20m_u%7D%5Cright%29%5E%7B3%2F2%7D%5Cleft%28%5Cfrac%7B3%7D%7B4%5Cpi%5Crho%7D%5Cright%29%5E%7B1%2F2%7D" alt="M_J = \left(\frac{5 k_B T}{G \mu m_u}\right)^{3/2}\left(\frac{3}{4\pi\rho}\right)^{1/2}" />

where:

- `M_J` is the Jeans mass, in kilograms
- `T` is the temperature, in kelvin, and `ρ` is the mass density, in kilograms per cubic metre
- `μ` is the mean molecular weight, dimensionless. The confrontation uses `2.3` for molecular hydrogen and helium. That value is an input, not a derived constant
- `m_u` is the atomic mass constant, `k_B` is Boltzmann's constant, and `G` is Newton's constant
- the `5` is the virial convention in the theorem. The `3/(4π)` is the uniform-sphere mass `M = 4π R³ ρ / 3` solved for the radius

**Dimensions**: The catalog signature is `[mass]`. `k_B T / (G μ m_u)` has dimension `[M L^-1]`. Raised to `3/2` and multiplied by `ρ^{−1/2}`, dimension `[M^{-1/2} L^{3/2}]`, the product is mass. The pure numbers `5` and `3/(4π)` do not enter that cancellation.

**Domain**: The evaluator requires `T > 0`, `ρ > 0`, and `μ > 0`. The theorem also requires a positive radius and a positive mass satisfying the two premises. The cloud-average regime, in which the module comment says `M_J` is tens of solar masses, is a different density from the dense-core confrontation. A single formula that adds turbulence or a magnetic field is not in the catalog.

**References**:

- Jeans 1902 *Phil. Trans. R. Soc. A* 199:1.
- Binney & Tremaine 2008 *Galactic Dynamics*, 2nd ed., §5.

**Rationale**: Balancing thermal energy against self-gravity, under the stated virial factor and a uniform sphere, fixes a mass in terms of temperature, density, and composition.

**Bridge Equation 68: Tolman–Ehrenfest effect (static thermal equilibrium)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-03.** Kind is `bridge`: the theorem states the catalogued equation. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.TolmanEhrenfest.hydrostatic_constant`](https://github.com/danielsimonjr/PhysJS/blob/d917fa328039d19c3659f74ea73569effb3ed4fb/PhysJS/TolmanEhrenfest.lean) states that on a static interval with `g_00 < 0`, hydrostatic balance and the equilibrium Gibbs relation give `T √(−g_00)` equal at the endpoints. The 1930 writing `T √g_44` agrees when `g_44 = −g_00`. `Real.sqrt g_00 = 0` when `g_00 < 0`, so the product without the minus is 0. `d ln T = 0` is not `g dr/c²`. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The lemma is not a horizon temperature and not `PhysJS.HawkingUnruh.dictionary`. `T ‖ξ‖ = const` is out of scope. The hydrostatic equation is not derived from `∇_μ T^{μν} = 0`, and the Gibbs relation is not derived from an equation of state.

> **Evaluator:** catalog record 68 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established as the static equilibrium gradient. The edge confidence stays `established`. Not a horizon temperature.
- **Context**: Bridges a gravitational metric component to a thermodynamic temperature. The bridges tuple is `gravitation` → `thermodynamics`. Category I selects the information-geometry component, with BE-57 and BE-63–65. That shared component does not admit a chain through BE-42. The proper temperature is not `hawking-temperature` and is not `temperature`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/T%5Csqrt%7B-g_%7B00%7D%7D%20%3D%20%5Cmathrm%7Bconst%7D" alt="T\sqrt{-g_{00}} = \mathrm{const}" />

where:

- `T` is the proper temperature, in kelvin
- `g_00` is the static metric component and is negative in this signature
- the 1930 writing `T0 √g_44` uses the other sign convention for the same component
- `tolmanTemperatureAt` recovers `T` from the invariant and `g_00`

**Dimensions**: The catalog signature is `[temperature]`. `g_00` is dimensionless in the coordinate convention of this formula, so `√(−g_00)` does not change the dimension of `T`. The relation is not a monomial in `{T, g, c, r}`: those quantities leave two invariants.

**Domain**: The evaluator requires `T > 0` and `g_00 < 0`. The regime is static thermal equilibrium. The Killing-field form is out of scope. A chain through the Hawking temperature is not this row.

**References**:

- Tolman and Ehrenfest 1930 *Phys. Rev.* 36:1791. The abstract states that `T0 √g_44` is constant.
- Rovelli and Smerlak, arXiv:1005.2985, for the Killing form that this catalog leaves out.

**Rationale**: Thermal equilibrium in a static gravitational field holds the product `T √(−g_00)` fixed. Units alone do not force that identification.

**Bridge Equation 70: Einstein relation (drift–diffusion)** *(Category H: Non-Equilibrium Statistical Mechanics)*

> **Proof status as of 2026-10-03.** Kind is `bridge`. [`PhysJS.EinsteinRelation.diffusion_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/EinsteinRelation.lean) states that a nonzero field at which the drift flux `μ n E` cancels the diffusion flux `D dn/dx`, on the Boltzmann profile `n = n_ref exp(−q V/(k_B T))`, gives `D = μ k_B T / q`. Dropping `q` fails when `q ≠ 1`. The force-mobility writing needs `μ_force = μ/q`. Stokes–Einstein and the Fermi-liquid form are different equations. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 70 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`. `μ` is the electrical mobility.
- **Context**: Bridges a kinetic mobility to an electromagnetic carrier charge. The bridges tuple is `kinetic` → `electromagnetic`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/D%20%3D%20%5Cfrac%7B%5Cmu%20k_B%20T%7D%7Bq%7D" alt="D = \frac{\mu k_B T}{q}" />

where:

- `D` is the diffusivity, in square metres per second
- `μ` is the electrical mobility, drift speed per electric field
- `T` is the absolute temperature and `q` is the carrier charge
- `k_B` is Boltzmann's constant

**Dimensions**: The catalog signature is `[L^2 T^-1]`. `μ k_B T / q` has that dimension when `μ` is a drift speed per electric field.

**Domain**: The evaluator requires finite `μ`, nonzero `T`, and nonzero `q`. A master equation and a Fermi liquid are outside the statement.

**References**:

- The Boltzmann profile and the flux cancellation are the hypotheses of the theorem.

**Rationale**: Drift and diffusion cancel on that profile only at this diffusivity. The charge in the denominator is part of the equation.

**Bridge Equation 73: Kelvin relation (Peltier–Seebeck)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-03.** Kind is `bridge`. [`PhysJS.KelvinRelation.peltier_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/KelvinRelation.lean) states that for the linear fluxes `J_e` and `J_q`, the open-circuit Seebeck coefficient `S = E/∇T` and the isothermal Peltier coefficient `Π = J_q/J_e` satisfy `Π = S T` when `L12 = L21`. That equality is `ThermoelectricOnsager.onsager`, a structure field naming microscopic reversibility, not an axiom. Without it the two coefficients disagree. The first Thomson relation `μ = T dS/dT` is not this equation, and neither is a measured thermopower. The linear fluxes are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 73 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`. Onsager reciprocity is not a numeric input.
- **Context**: Bridges a thermal gradient to an electrical flux. The bridges tuple is `thermal` → `electrical`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5CPi%20%3D%20S%20T" alt="\Pi = S T" />

where:

- `Π` is the isothermal Peltier coefficient, in volts
- `S` is the open-circuit Seebeck coefficient, in volts per kelvin
- `T` is the absolute temperature
- `L12 = L21` is the structure field, not a third input

**Dimensions**: The catalog signature is `[L^2 M T^-3 I^-1]`, the dimension of voltage. `S` carries an extra inverse temperature, and multiplying by `T` removes it.

**Domain**: The evaluator requires finite `S` and nonzero `T`. The regime is the linear flux laws with the Onsager equality stated.

**References**:

- The linear fluxes are hypotheses of the theorem. The structure field is `ThermoelectricOnsager.onsager`.

**Rationale**: Open-circuit thermopower and isothermal Peltier heat are the same coefficient times `T` when the cross coefficients agree.

**Bridge Equation 82: Shockley diode equation** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.ShockleyDiode.shockley_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/ShockleyDiode.lean) states that quasi-equilibrium multiplies the equilibrium flux by `exp(e V/(η k_B T))`. Ideality 1 sets `η = 1`. Detailed balance sets the reverse flux equal to the forward flux at `V = 0`, and low injection keeps that reverse flux under bias. The net current is `I = I_s (exp(e V/(k_B T)) − 1)`. Zero bias carries zero current. Ideality 2 is not this current when `e V ≠ 0`. `e` is the elementary charge. Not a diffusion-length ODE. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 82 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`. Euler's number is written `exp`.
- **Context**: Bridges an electromagnetic bias to a condensed-matter current. The bridges tuple is `electromagnetic` → `condensed`.
- **Mathematical Formulation**: `I = I_s (exp(e V/(k_B T)) − 1)`.

<img src="https://i.upmath.me/svg/I%20%3D%20I_s%20%5Cleft%28%5Cexp%5Cleft%28%5Cfrac%7Be%20V%7D%7Bk_B%20T%7D%5Cright%29%20-%201%5Cright%29" alt="I = I_s \left(\exp\left(\frac{e V}{k_B T}\right) - 1\right)" />
- **Dimensions**: The catalog signature is `[I]`.
- **Domain**: `I_s` and `V` finite, `T ≠ 0`. Ideality is 1.
- **References**: Quasi-equilibrium, detailed balance at zero bias, and low injection are the hypotheses of `PhysJS.ShockleyDiode.shockley_eq`.
- **Rationale**: The minus one is the reverse flux. Ideality 2 is a different current when `e V ≠ 0`.

**Bridge Equation 83: Thomson coefficient** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.Thomson.thomson_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/Thomson.lean) states that the Kelvin relation `Π(t) = S(t) t`, which is `PhysJS.KelvinRelation.peltier_eq` read along temperature, and the Thomson split `μ = dΠ/dT − S`, give `μ = T dS/dT` by the product rule. `dΠ/dT` is not `μ` when `S T ≠ 0`. Not a second copy of `Π = S T`. The functional Kelvin relation and the Thomson split are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`. The file reads the Kelvin relation along temperature. The catalog dependency is Bridge Equation 73. The quantities do not meet, so the edges do not compose.

> **Evaluator:** catalog record 83 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`. `dS/dT` is an input, not a sampled difference of `S`.
- **Context**: Bridges a thermal slope to an electrical coefficient. The bridges tuple is `thermal` → `electrical`. Category F is the same component as BE-73. This is the first Thomson relation. Search for the Thomson coefficient names this row. It does not name BE-73.
- **Mathematical Formulation**: `μ_T = T dS/dT`.

<img src="https://i.upmath.me/svg/%5Cmu_T%20%3D%20T%20%5Cfrac%7B%5Cmathrm%7Bd%7DS%7D%7B%5Cmathrm%7Bd%7DT%7D" alt="\mu_T = T \frac{\mathrm{d}S}{\mathrm{d}T}" />
- **Dimensions**: The catalog signature is `[L^2 M T^-3 I^-1 Theta^-1]`.
- **Domain**: `T` and `dS/dT` finite.
- **References**: `PhysJS.Thomson.thomson_eq` reads `PhysJS.KelvinRelation.peltier_eq` along temperature. The Thomson split is a hypothesis.
- **Rationale**: The product rule removes the convected `S`. `dΠ/dT` still contains it.

**Bridge Equation 87: Capacitor voltage variance** *(Category H: Non-Equilibrium Statistical Mechanics)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.CapacitorNoise.noise_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/CapacitorNoise.lean) states that `dU/dV = C V` and `U(0) = 0` integrate to `U = (C/2) V²`. The normalized Boltzmann weight of that energy is the Gaussian of mean 0 and variance `k_B T/C`, because the partition function is the Gaussian integral. The mean square on that law is `⟨v²⟩ = k_B T/C`, and `(C/2)` of it is `(1/2) k_B T`. `(3/2) k_B T/C` is not this variance. Dropping the energy half replaces it by `k_B T/(2 C)`. Not three kinetic degrees of freedom. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 87 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: Bridges a thermal energy to an electrical variance. The bridges tuple is `thermal` → `electrical`. Category H is the same component as BE-70.
- **Mathematical Formulation**: `⟨v²⟩ = k_B T / C`.

<img src="https://i.upmath.me/svg/%5Clangle%20v%5E2%20%5Crangle%20%3D%20%5Cfrac%7Bk_B%20T%7D%7BC%7D" alt="\langle v^2 \rangle = \frac{k_B T}{C}" />
- **Dimensions**: The catalog signature is `[L^4 M^2 T^-6 I^-2]`.
- **Domain**: `T` finite, `C > 0`. The energy is one quadratic term.
- **References**: `U = (C/2) V²` and the Boltzmann weight of that term are the hypotheses of `PhysJS.CapacitorNoise.noise_eq`.
- **Rationale**: The two halves cancel. Three kinetic degrees of freedom are a different variance.

**Bridge Equation 118: Parker critical radius** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-05.** Kind is `bridge`. [`PhysJS.ParkerCritical.critical_radius`](https://github.com/danielsimonjr/PhysJS/blob/d519c2c6504e7fbbd2cf6932f9e52981ce595a0f/lean/ParkerCritical.lean) states that an isothermal spherical wind factors as (v − c_s²/v) dv = (2 c_s²/r − G M/r²) dr. The critical point is both factors vanishing: v² = c_s² and r_c = G M/(2 c_s²). The 2 is spherical divergence. A vanishing coefficient alone does not force the geometric side to vanish. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 118 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: an isothermal spherical wind factors as (v − c_s²/v) dv = (2 c_s²/r − G M/r²) dr. The critical point is both factors vanishing: v² = c_s² and r_c = G M/(2 c_s²). The 2 is spherical divergence. A vanishing coefficient alone does not force the geometric side to vanish
- **Mathematical Formulation**: `r_c = G M / (2 c_s^2)`.
- **Dimensions**: The catalog signature is `[length]`.
- **Domain**: finite inputs named by the evaluator. Hypotheses stay in the proof-status paragraph.
- **References**: The hypotheses named above are the hypotheses of `PhysJS.ParkerCritical.critical_radius`.
- **Rationale**: The catalog value is the statement in the proof-status paragraph.

**Bridge Equation 127: Subthreshold swing** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-05.** Kind is `bridge`. [`PhysJS.SubthresholdSwing.swing_eq`](https://github.com/danielsimonjr/PhysJS/blob/8515c621d1c6e6d31c2eea4467181eb85d58234b/lean/SubthresholdSwing.lean) states that ln(I2/I1) = e (ψ2 − ψ1)/(k_B T) and the capacitive divider ψ2 − ψ1 = C_ox/(C_ox + C_d) (Vg2 − Vg1). One decade, I2/I1 = 10, gives S = ln(10) (k_B T/e) (1 + C_d/C_ox). Dropping C_d is not the swing when C_d ≠ 0. Not the ideal diode of be-82. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 127 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: ln(I2/I1) = e (ψ2 − ψ1)/(k_B T) and the capacitive divider ψ2 − ψ1 = C_ox/(C_ox + C_d) (Vg2 − Vg1). One decade, I2/I1 = 10, gives S = ln(10) (k_B T/e) (1 + C_d/C_ox). Dropping C_d is not the swing when C_d ≠ 0. Not the ideal diode of be-82
- **Mathematical Formulation**: `S = \ln(10)\,(k_B T / e)\,(1 + C_d / C_{ox})`.
- **Dimensions**: The catalog signature is `[L^2 M T^-3 I^-1]`.
- **Domain**: T ≠ 0, C_ox ≠ 0, and C_ox + C_d ≠ 0. e is the elementary charge.
- **References**: The hypotheses named above are the hypotheses of `PhysJS.SubthresholdSwing.swing_eq`.
- **Rationale**: The catalog value is the statement in the proof-status paragraph.

**Bridge Equation 130: Thermoelectric generator efficiency** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-05.** Kind is `bridge`. [`PhysJS.ThermoelectricGenerator.efficiency_eq`](https://github.com/danielsimonjr/PhysJS/blob/8515c621d1c6e6d31c2eea4467181eb85d58234b/lean/ThermoelectricGenerator.lean) states that hot-junction heat is Q = S Th I − I² R/2 − K ΔT with ΔT = Tc − Th, and load power is P = I (S (Th − Tc) − I R). The Joule 1/2 and the 2 in P' are derivatives. Stationarity P' Q = P Q' at I = S Δ/(R (1 + m)), with m = √(1 + Z Tm), Z = S²/(R K), Δ = Th − Tc, and Tm = (Th + Tc)/2, gives η = (1 − Tc/Th) (m − 1)/(m + Tc/Th). Matched load m = 1 is not stationary when Z Tm ≠ 0. The Carnot factor alone is not this efficiency. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 130 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: hot-junction heat is Q = S Th I − I² R/2 − K ΔT with ΔT = Tc − Th, and load power is P = I (S (Th − Tc) − I R). The Joule 1/2 and the 2 in P' are derivatives. Stationarity P' Q = P Q' at I = S Δ/(R (1 + m)), with m = √(1 + Z Tm), Z = S²/(R K), Δ = Th − Tc, and Tm = (Th + Tc)/2, gives η = (1 − Tc/Th) (m − 1)/(m + Tc/Th). Matched load m = 1 is not stationary when Z Tm ≠ 0. The Carnot factor alone is not this efficiency
- **Mathematical Formulation**: `\eta = (1 - T_c/T_h) (\sqrt{1 + Z T_m} - 1) / (\sqrt{1 + Z T_m} + T_c/T_h)`.
- **Dimensions**: The catalog signature is `[1]`.
- **Domain**: T_h ≠ 0, 1 + Z T_m ≥ 0, and the denominator ≠ 0.
- **References**: The hypotheses named above are the hypotheses of `PhysJS.ThermoelectricGenerator.efficiency_eq`.
- **Rationale**: The catalog value is the statement in the proof-status paragraph.

## Black-body radiation, quantum statistics, and reciprocal transport

These equations link thermal radiation to quantum electromagnetism, an entropy to the thermal wavelength, an ionization constant to that wavelength, a thermionic current to a quantum phase-space factor, and a transport coefficient to its transpose. A textbook relation that stays inside one field is a catalog record and has no heading here.

**Bridge Equation 164: Planck spectrum**

> **Proof status as of 2026-10-06.** Kind is `bridge`. [`PhysJS.PlanckSpectrum.planck_eq`](https://github.com/danielsimonjr/PhysJS/blob/10e48f140c0e9fad3c50e5e5538124c52b3e732c/lean/PlanckSpectrum.lean) states that the Bose factor `1/(exp(x) − 1) = Σ_{n≥1} exp(−n x)` is proved, and that the mode density `8 π ν²/c³` for two polarizations is a hypothesis. Their product is `u (exp(hν/k_B T) − 1) c³ = 8 π h ν³`. The frequency integral is a different record. One polarization is not this density. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 164 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: Spectral energy density of a black-body, thermal radiation joined to quantum electromagnetism. A bare `h` is Planck's constant. Euler's number is `\exp`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/u%20%28%5Cexp%28h%5Cnu%2Fk_B%20T%29%20-%201%29%20c%5E3%20%3D%208%20%5Cpi%20h%20%5Cnu%5E3" alt="u (\exp(h\nu/k_B T) - 1) c^3 = 8 \pi h \nu^3" />

where:

- `u` is the spectral energy density per frequency
- `ν` is the frequency and `T` is the absolute temperature
- `h` is Planck's constant, `c` is the speed of light, and `k_B` is Boltzmann's constant
- the factor `8π` counts two polarizations

**Dimensions**: The catalog signature is `[L^-1 M T^-1]`.

**Domain**: `ν > 0` and `T > 0`. One polarization is outside this statement.

**References**:

- The hypotheses named above are the hypotheses of `PhysJS.PlanckSpectrum.planck_eq`.

**Rationale**: The catalog value is the product of the mode density and the Bose factor.

**Bridge Equation 165: Stefan–Boltzmann constant**

> **Proof status as of 2026-10-06.** Kind is `bridge`. [`PhysJS.StefanBoltzmann.stefan_boltzmann_eq`](https://github.com/danielsimonjr/PhysJS/blob/10e48f140c0e9fad3c50e5e5538124c52b3e732c/lean/StefanBoltzmann.lean) states that `∫_0^∞ x³/(exp(x) − 1) dx = π⁴/15`, from `Σ n^{−4} = π⁴/90` and `Γ(4) = 6`. The hemisphere integrals give the factor `c/4`. With `h = 2 π ℏ`, `σ = π² k_B⁴/(60 ℏ³ c²) = 2 π⁵ k_B⁴/(15 h³ c²)`. The mode density `8π` is the hypothesis of the Planck spectrum, not re-proved here. This value is not a radiometer measurement. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 165 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: The constant in the radiated flux, obtained by integrating the Planck spectrum. The flux law that takes `σ` as an input is not this record.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Csigma%20%3D%20%5Cpi%5E2%20k_B%5E4%20%2F%20%2860%20%5Chbar%5E3%20c%5E2%29" alt="\sigma = \pi^2 k_B^4 / (60 \hbar^3 c^2)" />

where:

- `σ` is the Stefan–Boltzmann constant
- `k_B` is Boltzmann's constant, `ℏ` is the reduced Planck constant, and `c` is the speed of light
- the `60` is the Bose integral together with the hemisphere factor

**Dimensions**: The catalog signature is `[M T^-3 Theta^-4]`.

**Domain**: No variable input. The integral's `60` is part of the value. A rounded display of the same constant is not this record.

**References**:

- The hypotheses named above are the hypotheses of `PhysJS.StefanBoltzmann.stefan_boltzmann_eq`.

**Rationale**: The catalog value is that exact quotient.

**Bridge Equation 166: Wien displacement constant**

> **Proof status as of 2026-10-06.** Kind is `bridge`. [`PhysJS.WienDisplacement.wien_eq`](https://github.com/danielsimonjr/PhysJS/blob/10e48f140c0e9fad3c50e5e5538124c52b3e732c/lean/WienDisplacement.lean) states that `spectral(x) = x⁵/(exp(x) − 1)` has derivative zero for `x > 0` exactly when `5 − x = 5 exp(−x)`. That equation has a unique positive root and the root lies in `(4, 5)`. The decimal is not evaluated. `x = 0` is an extraneous root. The displacement constant is `b k_B x = h c`. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 166 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: The constant in `λ T = b`, thermal radiation joined to quantum electromagnetism. `x` is an input. The wavelength law that takes `b` as an input is not this record.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/b%20k_B%20x%20%3D%20h%20c" alt="b k_B x = h c" />

where:

- `b` is the Wien displacement constant
- `x` is the positive root of `5 − x = 5 exp(−x)`
- `h` is Planck's constant, `c` is the speed of light, and `k_B` is Boltzmann's constant

**Dimensions**: The catalog signature is `[L Theta]`.

**Domain**: `4 < x < 5`. The values `0`, `4`, and `5` are outside the domain. The decimal root is not evaluated.

**References**:

- The hypotheses named above are the hypotheses of `PhysJS.WienDisplacement.wien_eq`.

**Rationale**: The catalog value is `h c / (k_B x)` at that root.

**Bridge Equation 167: Sackur–Tetrode entropy**

> **Proof status as of 2026-10-06.** Kind is `bridge`. [`PhysJS.SackurTetrode.sackur_tetrode`](https://github.com/danielsimonjr/PhysJS/blob/10e48f140c0e9fad3c50e5e5538124c52b3e732c/lean/SackurTetrode.lean) states that `n_Q = λ_T^{−3}` uses `PhysJS.ThermalDeBroglie.wavelength_eq` and is not re-proved here. Stirling `ln N! = N ln N − N` is a hypothesis, and `U = (3/2) N k_B T` is equipartition. They give `S = N k_B (ln(n_Q/n) + 5/2)`. The Stirling series is not this statement. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 167 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: The entropy of a monatomic ideal gas, thermodynamics joined to the thermal wavelength. `n_Q` is an input.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/S%20%3D%20N%20k_B%20%28%5Cln%28n_Q%2Fn%29%20%2B%205%2F2%29" alt="S = N k_B (\ln(n_Q/n) + 5/2)" />

where:

- `S` is the entropy and `N` is the particle number
- `n_Q` is the quantum concentration and `n` is the number density
- `k_B` is Boltzmann's constant
- the `5/2` is equipartition plus the Stirling term

**Dimensions**: The catalog signature is `[entropy]`.

**Domain**: `n_Q > 0` and `n > 0`. Stirling here is `ln N! = N ln N − N`, not the series.

**References**:

- The hypotheses named above are the hypotheses of `PhysJS.SackurTetrode.sackur_tetrode`. `n_Q` uses `PhysJS.ThermalDeBroglie.wavelength_eq`.

**Rationale**: The catalog value is that entropy. The thermal wavelength is an input.

**Bridge Equation 168: Saha ionization constant**

> **Proof status as of 2026-10-06.** Kind is `bridge`. [`PhysJS.Saha.saha_eq`](https://github.com/danielsimonjr/PhysJS/blob/10e48f140c0e9fad3c50e5e5538124c52b3e732c/lean/Saha.lean) states that the thermal factor is `PhysJS.ThermalDeBroglie.wavelength_eq`, so `K = (2 π m k_B T/h²)^{3/2} exp(−I/(k_B T))`. The electron statistical weight `2` and the internal partition functions are not in this statement. The thermal wavelength is not re-proved. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 168 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: The ionization constant, chemistry joined to the thermal wavelength.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/K%20%3D%20%282%5Cpi%20m%20k_B%20T%2Fh%5E2%29%5E%7B3%2F2%7D%20%5Cexp%28-I%2F%28k_B%20T%29%29" alt="K = (2\pi m k_B T/h^2)^{3/2} \exp(-I/(k_B T))" />

where:

- `K` is the ionization constant
- `m` is the electron mass, `I` is the ionization energy, and `T` is the absolute temperature
- `h` is Planck's constant and `k_B` is Boltzmann's constant

**Dimensions**: The catalog signature is `[L^-3]`.

**Domain**: `m > 0` and `T > 0`. The electron weight `2` is not in this statement.

**References**:

- The hypotheses named above are the hypotheses of `PhysJS.Saha.saha_eq`.

**Rationale**: The catalog value is that constant. The thermal wavelength is not re-derived.

**Bridge Equation 169: Richardson–Dushman current**

> **Proof status as of 2026-10-06.** Kind is `bridge`. [`PhysJS.RichardsonDushman.richardson_eq`](https://github.com/danielsimonjr/PhysJS/blob/10e48f140c0e9fad3c50e5e5538124c52b3e732c/lean/RichardsonDushman.lean) states that `∫_a^∞ exp(−c x) dx = exp(−c a)/c` is proved. The current is the hypothesis `4 π m e/h³` times one factor `k_B T` from each tail, so `J h³ exp(φ/(k_B T)) = 4 π m e k_B² T²`. Here `e` is the elementary charge. The Boltzmann tail replaces Fermi–Dirac. The reflection coefficient is `1`. A reflection of `1/2` is a different number. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 169 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: Thermionic current density, emission joined to a quantum phase-space factor. A bare `e` is the elementary charge.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/J%20h%5E3%20%5Cexp%28%5Cvarphi%2F%28k_B%20T%29%29%20%3D%204%20%5Cpi%20m%20e%20k_B%5E2%20T%5E2" alt="J h^3 \exp(\varphi/(k_B T)) = 4 \pi m e k_B^2 T^2" />

where:

- `J` is the current density and `φ` is the work function
- `m` is the electron mass and `T` is the absolute temperature
- `e` is the elementary charge, `h` is Planck's constant, and `k_B` is Boltzmann's constant

**Dimensions**: The catalog signature is `[L^-2 I]`.

**Domain**: `T > 0`. The reflection coefficient is `1`.

**References**:

- The hypotheses named above are the hypotheses of `PhysJS.RichardsonDushman.richardson_eq`.

**Rationale**: The catalog value is that current. Fermi–Dirac statistics are not this tail.

**Bridge Equation 170: Onsager reciprocity**

> **Proof status as of 2026-10-06.** Kind is `bridge`. [`PhysJS.OnsagerReciprocity.onsager_eq`](https://github.com/danielsimonjr/PhysJS/blob/10e48f140c0e9fad3c50e5e5538124c52b3e732c/lean/OnsagerReciprocity.lean) states that the mixed partials of `Φ = ½ L11 X1² + L12 X1 X2 + ½ L22 X2²` are both `L12`, so `L12 = L21`. The thermoelectric instance applies `PhysJS.KelvinRelation.peltier_eq` and does not re-prove `Π = S T`. An antisymmetric cross term produces no entropy. The magnetic case `L12(B) = L21(−B)` is not this row. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** catalog record 170 in [`data/bridge-catalog.json`](../../data/bridge-catalog.json), evaluated by [`evaluateRelation`](../../src/composition/evaluate-relation.ts)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: Equality of the cross coefficients, nonequilibrium thermodynamics joined to linear transport. The catalog value is `L12` when the equality holds.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/L_%7B12%7D%20%3D%20L_%7B21%7D" alt="L_{12} = L_{21}" />

where:

- `L12` and `L21` are the cross coefficients of a linear flux law
- the equality is the statement at zero magnetic field

**Dimensions**: The catalog signature is `[1]`.

**Domain**: `B = 0`. The antisymmetric statement `L12(B) = L21(−B)` is not this row.

**References**:

- The hypotheses named above are the hypotheses of `PhysJS.OnsagerReciprocity.onsager_eq`.

**Rationale**: The catalog value is `L12` under that equality.

**Open candidates, unproved.** These two statements have no bridge id and no `formalRef`.

- **Landau diamagnetism.** `χ_L = −χ_P / 3` for free electrons in three dimensions. No Lean theorem in the pinned PhysJS manifest states it. It is not catalog record 94, the Pauli spin susceptibility, which is a standard record and has no heading here.
- **BCS coherence length.** `ξ₀ = ℏ v_F / (π Δ)`. No Lean theorem in the pinned PhysJS manifest states it. It is not Bridge Equation 12 and not catalog record 75. Catalog record 96 takes a coherence length as an input and does not derive this length. Records 75 and 96 are standard and have no heading here.

## VI. Integration with Universal Physics Tensor

These additional equations fill crucial gaps in the tensor structure according to the following mapping:

### 6.1 Tensor Index Assignment

Each written-up bridge maps to a tensor component. The component is the catalog category cluster, the letter on the catalog record, via [`src/bridges/tensor-index.ts`](../../src/bridges/tensor-index.ts). The `bridges` tuple does not select it. That tuple is advisory. The formula's tensor rank and its `dimensional_signature` do not open a further component. Bridge Equation 34 (`quantum` → `cosmological`, category J) stays in the quantum-classical component. Bridge Equation 17 is a scalar contraction of a rank-3 torsion tensor and stays in category D. The six patterns below are the clusters of the 40 cross-domain bridges this specification writes up. A standard record is not in these lists. No new pattern is introduced.

1. **Quantum-classical bridges (12, 34, 56)**:
   <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Ctext%7Bquantum%7D%2C%5Ctext%7Bclassical%7D%2C%5Cgamma%2C%5Cdelta%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\text{quantum},\text{classical},\gamma,\delta,\epsilon,\zeta}" />
   Categories A and J. The scale pair is named `quantum`, `classical`. The other four indices stay free.
2. **Information-geometry bridges (14, 30, 31, 42, 43, 57, 63, 64, 65, 68)**:
   <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%2C%5Cbeta%2C%5Ctext%7BPoincar%C3%A9%7D%2C%5Ctext%7Binfo%7D%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\alpha,\beta,\text{Poincaré},\text{info},\epsilon,\zeta}" />
   Categories B, I, and M. The symmetry slot is Poincaré and the information slot is occupied. Scale and force stay free.
3. **Emergence patterns (16, 58, 70, 87)**:
   Higher-rank correlations <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%5Cbeta%5Cgamma%5Cdelta%5Cepsilon%5Czeta%E2%80%A6%7D" alt="\boldsymbol{\Pi}^{\alpha\beta\gamma\delta\epsilon\zeta…}" />
   Categories C and H. The ellipsis is the mark of this cluster (Part I §1.2, the emergent component). Bridge Equations 58, 70, and 87 are scalars and keep the ellipsis.
4. **Field unification (17, 41, 118, 127, 130, 164, 165, 166, 167, 168, 169, 170)**:
   <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%2C%5Ctext%7Bforce%7D_i%2C%5Ctext%7Bsymmetry%7D%2C%5Cdelta%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\alpha,\text{force}_i,\text{symmetry},\delta,\epsilon,\zeta}" />
   Categories D and L. The force slot and the symmetry slot are the occupied indices.
5. **Scale transitions (19, 21, 22, 23, 26, 61, 73, 82, 83)**:
   Off-diagonal elements <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Ctext%7Bscale%7D_i%2C%5Ctext%7Bscale%7D_j%2C%5Cgamma%2C%5Cdelta%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\text{scale}_i,\text{scale}_j,\gamma,\delta,\epsilon,\zeta}" />
   Categories E, F, and G. The scale pair stays symbolic. The cluster's domains are not one pair: quantum–cosmological, quantum–condensed-matter, condensed-matter–holography, quantum–biological.
6. **Cosmological puzzles (45, 47)**:
   Bridge Equations 45 (Trans-Planckian Censorship) and 47 (BBN dark sector) connect cosmological phenomena and do not sit in groups 1–5. Category N. The component is unassigned. No index is displayed.

**Written-up ids past the original lists.** Each row names the category-cluster rule. `e` in a formula is the elementary charge. A standard id is absent.

| ID | Category | Index | Why this pattern |
|---|---|---|---|
| 56 | A | quantum-classical, `quantum`, `classical` | Category A, with Bridge Equation 12. Casimir pressure. Signature `[L^-1 M T^-2]`. The bridges tuple `quantum` → `classical` agrees with the cluster. A pressure scalar does not add an index. |
| 57 | I | information-geometry, Poincaré and info | Category I. Unruh temperature. Signature `[temperature]`. The dependency on Bridge Equation 42 is the same component family and is not a second rule. |
| 58 | H | emergence, higher-rank ellipsis | Category H. Johnson-Nyquist spectral density. Signature `[L^4 M^2 T^-5 I^-2]`. The formula is a scalar. The ellipsis stays. |
| 61 | F | scale-transition, `scale_i`, `scale_j` | Category F. Wiedemann-Franz Lorenz number. Signature `[L^4 M^2 T^-6 I^-2 Theta^-2]`. The temperature base does not pin the dimension index; group 5 leaves it free, as it does for Bridge Equation 23. |
| 63 | I | information-geometry, Poincaré and info | Category I. Chandrasekhar mass. Signature `[mass]`. The bridges tuple is `quantum` → `classical`. Bridge Equation 31 is already in this component with a different tuple, so the tuple does not move Bridge Equation 63 either. |
| 64 | I | information-geometry, Poincaré and info | Category I. Eddington luminosity. Signature `[power]`. Same cluster as Bridge Equation 63. |
| 65 | I | information-geometry, Poincaré and info | Category I. Jeans mass. Signature `[mass]`, the same signature word as Bridge Equation 63. The formula balances thermal energy against Newtonian gravity. |
| 68 | I | information-geometry, Poincaré and info | Category I, with Bridge Equations 57 and 63–65. Tolman–Ehrenfest. Signature `[temperature]`, the same signature word as Bridge Equation 57. The bridges tuple is `gravitation` → `thermodynamics`. The shared component with Bridge Equation 42 is not a chain. |
| 70 | H | emergence, higher-rank ellipsis | Category H, with Bridge Equation 58. Einstein relation. Signature `[L^2 T^-1]`. The bridges tuple is `kinetic` → `electromagnetic`. The formula is a scalar. The ellipsis stays. |
| 73 | F | scale-transition, `scale_i`, `scale_j` | Category F. Kelvin relation. Signature `[L^2 M T^-3 I^-1]`. The bridges tuple is `thermal` → `electrical`. |
| 82 | F | scale-transition, `scale_i`, `scale_j` | Category F. Shockley diode. Signature `[I]`. The bridges tuple is `electromagnetic` → `condensed`. |
| 83 | F | scale-transition, `scale_i`, `scale_j` | Category F, with Bridge Equation 73. Thomson coefficient. Signature `[L^2 M T^-3 I^-1 Theta^-1]`. The bridges tuple is `thermal` → `electrical`. The dependency on Bridge Equation 73 is not a composition: the quantities do not meet. |
| 87 | H | emergence, higher-rank ellipsis | Category H, with Bridge Equation 70. Capacitor voltage variance. Signature `[L^4 M^2 T^-6 I^-2]`. The bridges tuple is `thermal` → `electrical`. The formula is a scalar. The ellipsis stays. |
| 118 | D | field-unification, force and symmetry | Category D, with Bridge Equation 17. Parker critical radius. The bridges tuple joins gravitation to an isothermal sound speed. |
| 127 | D | field-unification, force and symmetry | Category D. Subthreshold swing. The bridges tuple joins a thermal voltage to a capacitive divider. |
| 130 | D | field-unification, force and symmetry | Category D. Thermoelectric generator efficiency. The bridges tuple joins a Carnot factor to a thermoelectric figure of merit. |
| 164 | D | field-unification, force and symmetry | Category D. Planck spectrum. Thermal radiation joined to quantum electromagnetism. |
| 165 | D | field-unification, force and symmetry | Category D. Stefan–Boltzmann constant. The same radiation law, integrated. |
| 166 | D | field-unification, force and symmetry | Category D. Wien displacement constant. The peak of that spectrum. |
| 167 | D | field-unification, force and symmetry | Category D. Sackur–Tetrode entropy. An entropy joined to the thermal wavelength. |
| 168 | D | field-unification, force and symmetry | Category D. Saha ionization constant. An ionization constant joined to that wavelength. |
| 169 | D | field-unification, force and symmetry | Category D. Richardson–Dushman current. A thermionic current joined to a quantum phase-space factor. |
| 170 | D | field-unification, force and symmetry | Category D. Onsager reciprocity. A transport coefficient joined to its transpose. |

**Topology slot left free.** Group 5 leaves ζ free, as it does for Bridge Equation 22, whose area law carries a topological constant. A per-equation index that pins ζ to a Chern label is not a pattern these lists use. It is not introduced here. Catalog records 55 and 60 name a Chern number; they are standard records and have no heading in this specification.

### 6.2 Consistency Matrix

> **Known-issue note (see also Part-V §19.2):** The consistency requirements below — `det(C) != 0` AND all eigenvalues `lambda_k >= 0` — are **not simultaneously satisfiable in general** given the allowed {-1, 0, +1} entry values. For a real symmetric matrix with off-diagonal entries in {-1, 0, +1}, requiring positive-semi-definiteness (all eigenvalues >= 0) combined with non-singularity (det != 0) is equivalent to strict positive-definiteness, which generally rules out configurations with -1 off-diagonal entries. Treat this definition as **aspirational / target-for-future-reformulation**, not as an operational criterion. See Part-V §19.2 for the **canonical replacement (balance-theoretic, Harary 1953)**; the Gram-form alternative was retired because the embedding was unspecified, leaving the check parametric. Use the balance-theoretic check exclusively.

The bridge equations form a consistency matrix <img src="https://i.upmath.me/svg/%5Cmathbf%7BC%7D" alt="\mathbf{C}" /> where:

<img src="https://i.upmath.me/svg/C_%7Bij%7D%20%3D%20%5Cbegin%7Bcases%7D%0A1%20%26%20%5Ctext%7Bif%20bridge%20equations%20%7D%20i%20%5Ctext%7B%20and%20%7D%20j%20%5Ctext%7B%20are%20mutually%20consistent%7D%20%5C%0A0%20%26%20%5Ctext%7Bif%20they%20are%20independent%7D%20%5C%0A-1%20%26%20%5Ctext%7Bif%20they%20are%20contradictory%7D%0A%5Cend%7Bcases%7D" alt="C_{ij} = \begin{cases}
1 & \text{if bridge equations } i \text{ and } j \text{ are mutually consistent} \
0 & \text{if they are independent} \
-1 & \text{if they are contradictory}
\end{cases}" />

#### 6.2.1 Entry-construction recipe — illustrative

> **Why this is needed:** the balance-theoretic check that replaced `det(C) != 0 ∧ λ_k ≥ 0` is well-defined as a structural test (Harary 1953), but it is **operationally empty** without a recipe for assigning the actual `C_ij ∈ {-1, 0, +1}` to the 780 unordered pairs among the 40 cross-domain bridges this specification writes up. "Mutually reinforcing / independent / contradictory" is not an operational predicate — it requires per-pair physics judgment. The candidate recipe below applies to two worked example pairs and is **illustrative, not authoritative**: full population of that matrix requires the per-pair physics judgment of a domain expert, which is precisely the deep open question the framework is supposed to address.

**Candidate recipe (illustrative).** Given two bridge equations `BE_i` and `BE_j`, assign:

- `C_{ij} = +1` if **both** of the following hold:
  - they share at least one fundamental constant (e.g., both use `ℏ`, or both use `G`, or both use `c`), **AND**
  - their dimensional signatures of LHS and RHS are mutually compatible after a domain-acceptable change of variable (e.g., both produce an entropy density, or both produce a stress-energy density).
- `C_{ij} = 0` if **none** of the following holds: they share no fundamental constants, AND they reference no overlapping symbol families, AND their domains are disjoint (e.g., one is a quantum-mechanical decoherence rate, the other is a cosmological-scale entropy bound). The pair is operationally independent.
- `C_{ij} = -1` if there is at least one **shared physical quantity** (a constant, a state, or a derived observable) that the two BEs assign **mutually inconsistent values or behaviors** (e.g., one BE predicts `dℓ/dt > 0` and the other predicts `dℓ/dt < 0` for the same length `ℓ` under the same conditions).

**Worked example 1 — catalog record 11 (Lindblad master equation; a standard record, no heading here) vs Bridge Equation 19 (LQC bounce):**

| Test | Result |
|---|---|
| Shared fundamental constants | `ℏ`, `c` (catalog record 11 uses `ℏ` for quantum dynamics; BE-19 uses `ℏ` indirectly through `ℓ_P = √(ℏG/c³)`). |
| Symbol-family overlap | Marginal: catalog record 11's decoherence rate `γ_k(λ)` and BE-19's `ρ_crit` operate at different scales (lab vs cosmological). |
| Dimensional compatibility | LHS dimensions are different categories (decoherence rate `[T]^{-1}` vs critical density `[E][L]^{-3}`); not directly compatible without a thermodynamic embedding. |
| Mutual inconsistency? | None known. The two BEs operate in disjoint physical regimes; the LQC bounce makes no prediction about laboratory decoherence rates, and Caldeira-Leggett makes no prediction about cosmological bounce density. |
| **`C_{11, 19}` (illustrative)** | **`0`** (operationally independent). |

**Worked example 2 — BE-22 (entanglement-entropy area scaling) vs BE-14 (Ryu-Takayanagi):**

| Test | Result |
|---|---|
| Shared fundamental constants | None directly displayed (BE-22 uses dimensionless `α`, `γ`, BE-14 uses `G_N`, `ℓ_P` implicitly via the Bekenstein-Hawking 1/4 prefactor). The shared *physics* is the area-scaling principle. |
| Symbol-family overlap | **YES**: both use `S(R)` or `S_A` for an entanglement entropy of a spatial region/surface; both involve a length / area as the scaling variable. |
| Dimensional compatibility | **YES**: both LHS are dimensionless (entropy in nats / bits); both RHS scale linearly with a length-times-coefficient or area-times-coefficient. The BE-22 `S(R) = αL(R) − γ + O(L^{-1})` is the (1+1)D limit of the BE-14 RT formula `S_A = Area(γ_A) / (4G_N)` in `(d+1)`-dimensional bulks. |
| Mutual inconsistency? | None known; BE-22 is a special-case-of pattern of BE-14 in low dimension. |
| **`C_{BE-22, BE-14}` (illustrative)** | **`+1`** (mutually reinforcing — both express the same area-scaling principle in different dimensional regimes). |

**Caveat.** The two worked examples above demonstrate that the recipe can be applied operationally for at least some pairs, but they do not constitute a *proof* that the recipe is well-defined for all 780 unordered pairs among the 40 cross-domain bridges this specification writes up. In practice, populating the full matrix requires:
- a per-pair physics judgment (domain expertise; not all pairs admit a clean verdict),
- a tie-breaking convention for borderline cases (e.g., whether marginal symbol-family overlap counts as `+1` or `0`),
- and a versioning convention for entries that change as bridge equations themselves are reformulated (e.g., BE-30 `R3 invalid` makes all `C_{30, *}` entries undefined; the matrix must be re-evaluated when canonical forms change).

For these reasons the spec's `tractability_class` field on each `BridgeEquation` is set to `'undefined'` for off-diagonal pairs at present; the full consistency-matrix population is **not** a goal of the current framework version. The balance-theoretic check (Part-V §19.2, Harary 1953) is therefore conditional on a future entry-construction recipe being adopted; until then, the check is **structurally well-defined but operationally inactive**.