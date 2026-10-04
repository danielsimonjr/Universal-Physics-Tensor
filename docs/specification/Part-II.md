# Universal Physics Tensor Framework: Complete Formal Specification - Part II

> **Status note:** This document catalogs Bridge Equations 21-76 (BE-21–50 from the original spec catalog; BE-51–54 in §V-B; BE-55–76 in §V-C). Equations span a wide range of physical credibility: some (e.g., Eq 21 AdS/CMT; Eq 26 WKB tunneling; Eq 35 conformal bootstrap; Eqs 55–76) are established results from mainstream physics; others (e.g., Eq 25 consciousness, Eq 42 firewall, Eq 46 multiverse, Eq 50 retrocausal QFT) are highly speculative. Each equation should carry a **Status** line indicating this; where one is missing, treat the equation as unvalidated. Several equations have known issues flagged in their Status notes (Eqs 22, 23, 24, 25, 31, 37, 38, 50). The mathematical formulations reproduced here are drawn from the literature (where cited) or are original proposals; formal citations are being retroactively added — see the Part-VI conclusion for the current citation-completeness status.

> **Spec-scope note (catalog count):** The specification catalogs **77 bridge equations, IDs 11–87** (Part-I §II covers BE-11–BE-20; this Part-II covers BE-21–BE-87: §V is BE-21–50, §V-B is BE-51–54, §V-C is BE-55–87). The original spec catalog was 40 bridges (IDs 11–50). BE-51 (gravitational lensing — Eddington 1919 weak-field deflection) and BE-52 (Mercury perihelion precession — Einstein 1915) were added in v0.4.0 as GR-foundation bridges, and BE-53 (Yang-Mills one-loop β-function) and BE-54 (Randall-Sundrum brane cosmology) were added in the v0.7 BE-X re-encoding sprint. BE-55–65 were added to the runtime catalog on 2026-07-05, BE-66–68 are written up in §V-C, BE-69–73 are the PhysJS #57 rows in that same section, and BE-74–76 are the PhysJS #62 rows, and BE-77–87 are the PhysJS #64 rows. The shipped codebase catalog is `src/bridges/index.ts`, `BRIDGE_EQUATIONS`, **77 entries, IDs 11–87**. Entries 51 and 53–87 keep `source_part: 'III'`; BE-52 keeps `source_part: 'I'`. The wave-note history now lives in `docs/specification/CHANGELOG.md`; prose there that says "40 bridges" / "IDs 11–50" refers to the original pre-v0.4.0 spec catalog, prose that says "44 bridges" / "IDs 11–54" refers to the write-up before §V-C, prose that says "58 equations" / "IDs 11–68" is the record from before BE-69–73, and prose that says "63 equations" / "IDs 11–73" is the record from before BE-74–76. Status distribution across the 66-entry catalog, counted from each entry's `status` in `BRIDGE_EQUATIONS`: 30 established · 33 speculative · 3 highly-speculative · 0 invalid.

## V. Extended Catalog of Bridging Equations (21-50)

### Category F: Condensed Matter - High Energy Bridges

**Bridge Equation 21: AdS/CMT Correspondence Equation**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.Kss.saturating`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Kss.lean) states the equality η/s = ℏ/(4π k_B). The inequality η/s ≥ ℏ/(4π k_B) is a different statement.

- **Status**: Established. The holographic dictionary for retarded Green's functions in AdS/CMT (anti-de Sitter / condensed matter correspondence) is a well-understood result (Son and Starinets 2002, *JHEP* 0209:042, arXiv:hep-th/0205051 — the canonical two-author paper; the formula below is the retarded-Green's-function recipe from that paper). The companion three-author paper (Policastro-Son-Starinets 2002, *JHEP* 0209:043, arXiv:hep-th/0205052) applies the recipe to AdS hydrodynamics. See also Iqbal and Liu 2009 (arXiv 0903.2596, *Fortsch. Phys.* 57). The canonical momentum-space dimension is `[L]^{d−2Δ}`. Derivation: the boundary two-point function ⟨O(x)O(0)⟩_R of an operator of conformal dimension Δ scales as `|x|^{−2Δ}` (dim `[L]^{−2Δ}`), and Fourier-transforming with measure `dt d^{d−1}x` (dim `[L]^d`) gives `G_R(ω,k)` dim `[L]^{d−2Δ}`. The `r^{2Δ−d}` factor in the displayed formula is the bulk-radial scaling that exactly cancels the bulk-field's leading-mode `r^{−(d−Δ)}` to extract the boundary correlator's coefficient — that radial factor has dim `[L]^{2Δ−d}` but is *internal* to the limit; the *result* G_R(ω,k) has dim `[L]^{d−2Δ}`.
- **Context**: Holographic duality between strongly correlated electrons and gravitational systems
- **Linked Formulas**: AdS/CFT correspondence, Fermi liquid theory
- **Mathematical Formulation**:

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

> **AST encoding (Tier 5):** [`src/bridges/equations/be-22-topological-entanglement.ts`](../../src/bridges/equations/be-22-topological-entanglement.ts)

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

**Bridge Equation 24: Quantum Coherence in Photosynthesis Efficiency (Förster FRET)**

> **Proof status as of 2026-10-01.** Kind is `cross-check`. [`PhysJS.Fret.dictionary`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Fret.lean) states that the three writings of η agree. The lemma is not the dipole–dipole law.

- **Status**: Speculative. **Reformulated 2026-05-06.** Replaced the bound-violating multiplicative `η_classical(1 + κ exp(-t/τ_coh) |⟨ψ_d|ψ_a⟩|²)` form (admits `η > 1` for `κ ∈ [0.1, 0.3]` and `η_classical ≈ 1`) with the canonical Förster (1948) FRET dipole-dipole rate `k_FRET = (1/τ_D)(R_0/R)⁶` and the bound-respecting transfer efficiency `η = R_0⁶/(R_0⁶ + R⁶) = 1/(1 + (R/R_0)⁶) ∈ [0,1]` by construction. The remaining `phenomenological-ansatz` known_issue is for the *bridge-equation framing* — interpreting FRET in photosynthetic light-harvesting complexes (FMO, LH2, LHCII) as a UPT quantum ↔ biological bridge — not for the FRET formulas themselves which are textbook-canonical (Lakowicz 2006). FRET is incoherent: it does not encode "quantum-coherent enhancement," and the contested-coherence question (Cao 2020 *Sci. Adv.* 6:eaaz4888 / Duan 2017 *PNAS* 114:8493 / Thyrhaug 2018 *Nat. Chem.* 10:780) is documented in the references list.
- **Context**: Förster resonance energy transfer (FRET): dipole-dipole transfer rate and transfer efficiency for donor-acceptor pairs separated by distance `R`, with Förster radius `R_0` (typically 2-10 nm) at which `η = 1/2`.
- **Mathematical Formulation** (canonical Förster FRET):

<img src="https://i.upmath.me/svg/%5Ceta_%7B%5Ctext%7Btransfer%7D%7D%20%3D%20%5Cfrac%7BR_0%5E6%7D%7BR_0%5E6%20%2B%20R%5E6%7D%20%3D%20%5Cfrac%7B1%7D%7B1%20%2B%20(R%2FR_0)%5E6%7D" alt="\eta_{\text{transfer}} = \frac{R_0^6}{R_0^6 + R^6} = \frac{1}{1 + (R/R_0)^6}" />

<img src="https://i.upmath.me/svg/k_%7B%5Ctext%7BFRET%7D%7D%20%3D%20%5Cfrac%7B1%7D%7B%5Ctau_D%7D%20%5Cleft(%5Cfrac%7BR_0%7D%7BR%7D%5Cright)%5E6" alt="k_{\text{FRET}} = \frac{1}{\tau_D} \left(\frac{R_0}{R}\right)^6" />

where:

- `R` is the donor-acceptor distance
- <img src="https://i.upmath.me/svg/R_0" alt="R_0" /> is the Förster radius (typically 2-10 nm; the distance at which `η = 0.5`)
- <img src="https://i.upmath.me/svg/%5Ctau_D" alt="\tau_D" /> is the donor radiative lifetime in the absence of the acceptor
- The Förster radius is set by `R_0⁶ ∝ κ² Q_D J / n⁴`, with `κ²` the dipole orientation factor, `Q_D` the donor quantum yield, `J` the spectral overlap integral, and `n` the medium refractive index

**Dimensions**: Dimensionless `η ∈ [0,1]`; `k_FRET` has units of `[time^-1]`.

**Bridge Equation 25: Consciousness - Information Integration Bridge (IIT Φ)**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is Φ_max, the integrated information under the minimum information partition.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-25-iit-phi.ts`](../../src/bridges/equations/be-25-iit-phi.ts) — the **live** BE-25 encoding (the IIT Φ_max form; `dimensional_signature: '[1]'`, since Φ is dimensionless / measured in bits when log₂ is used). The earlier module [`src/bridges/equations/be-25-orch-or.ts`](../../src/bridges/equations/be-25-orch-or.ts) is **archived**: it encodes the dropped Penrose-Hameroff `t_OR` form, is no longer load-bearing for any BE-25 dimensional claim under the IIT Φ_max reformulation, and is preserved only with an archive banner for historical traceability. The archived module has been removed from `EXPECTED_DIMENSION_BY_BRIDGE` and from the round-trip catalog test. (Note: Φ_max is exponential in system size, so the encoding is tractable only for small substrates — see the **Tractability** note below.)

- **Status**: Speculative (IIT canonical and calculable; bridge framing speculative). **Reformulated 2026-05-06.** Replaced the Tegmark-falsified Penrose-Hameroff Orch-OR form `t_OR = ℏ/(Δm c² Δx/ℓ_P)` — which combined a non-Penrose `Δx/ℓ_P` factor (Penrose's canonical gravitational self-energy is `E_G ~ G(Δm)²/Δx`) with a microtubule-coherence mechanism that Tegmark (*Phys. Rev. E* 61, 4194 (2000); arXiv:quant-ph/9907009) falsified by ~10 orders of magnitude (decoherence ~10⁻¹³ s vs. neural processing ~10⁻³ s at biological temperature) — with the canonical **Integrated Information Theory (Tononi) Φ_max** form: irreducibility of a system's cause-effect structure under the minimum information partition (MIP), with intrinsic information `ii(s,s̃) = p(s̃|s) log₂[p(s̃|s)/p(s̃)]`. The "consciousness ↔ *quantum* information" framing is dropped in favor of "consciousness ↔ information integration": IIT is substrate-agnostic, calculable for small systems (Oizumi-Albantakis-Tononi 2014, IIT 3.0; Albantakis et al. 2023, IIT 4.0, arXiv:2212.14787), and consistent with the Tegmark-decoherence rebuttal (no claim about microtubule quantum coherence). **Important — downstream excisions retained:** Part-IV §12.3, Part-V §21.2.2, and Part-VI §28.2 were excised because BE-25 was Penrose-Hameroff. Those excisions are **not restored** under this IIT reformulation: the original sections were tied to the Penrose-Hameroff cosmic-consciousness / clinical-applications framings, and IIT-based clinical applications (e.g., perturbational complexity index PCI in disorders of consciousness — Casali et al. 2013 *Sci. Transl. Med.* 5:198ra105) are an active research area outside UPT's current scope. See `tests/bridges/be-25-reformulation.test.ts` for the reformulation pin.
- **Context**: Integrated Information Theory (IIT, Tononi) Φ_max — substrate-agnostic measure of integrated information. Consistent with the Tegmark-decoherence rebuttal of Penrose-Hameroff Orch-OR (IIT makes no claim about quantum coherence).

- **Mathematical Formulation** (canonical IIT minimum-information-partition form):

<img src="https://i.upmath.me/svg/%5CPhi_%7B%5Cmax%7D(S)%20%3D%20%5Cmin_%7B%5Ctheta%20%5Cin%20%5Ctext%7Bpartitions%7D(S)%7D%20%5Cleft%5B%20ii(s%2C%20%5Ctilde%7Bs%7D)%20-%20ii_%7B%5Ctheta%7D(s%2C%20%5Ctilde%7Bs%7D)%20%5Cright%5D" alt="\Phi_{\max}(S) = \min_{\theta \in \text{partitions}(S)} \left[ ii(s, \tilde{s}) - ii_{\theta}(s, \tilde{s}) \right]" />

with the intrinsic-information component

<img src="https://i.upmath.me/svg/ii(s%2C%20%5Ctilde%7Bs%7D)%20%3D%20p(%5Ctilde%7Bs%7D%20%5Cmid%20s)%20%5Clog_2%20%5Cfrac%7Bp(%5Ctilde%7Bs%7D%20%5Cmid%20s)%7D%7Bp(%5Ctilde%7Bs%7D)%7D" alt="ii(s, \tilde{s}) = p(\tilde{s} \mid s) \log_2 \frac{p(\tilde{s} \mid s)}{p(\tilde{s})}" />

where:

- `S` is a candidate substrate (a system of mechanism-elements with cause-effect structure)
- `s` is the system's current state; `s̃` ranges over candidate cause/effect states
- `θ` ranges over bipartitions of `S` (the minimum information partition / MIP is the partition that minimally reduces intrinsic information)
- `ii(s, s̃)` is the intrinsic information — how much the system's state constrains potential cause/effect states (relative to the unconstrained marginal)
- `Φ_max(S)` is the system's integrated information; in IIT, a system has phenomenal experience iff `Φ_max > 0`
- IIT 3.0 (Oizumi-Albantakis-Tononi 2014) computes Φ via earth-mover's distance / Wasserstein metric over partitions; IIT 4.0 (Albantakis et al. 2023) is the current canonical formulation with explicit axiom-postulate framework

**Tractability**: `numerical-asymptotic` — Φ_max computation is exponential in the number of elements (EXPTIME; intractable beyond ~10 elements but computable / Turing-decidable for any finite substrate). Approximate measures (Φ*, Φ^G, geometric Φ) exist for larger systems but each gives different numbers and is not interchangeable with Φ_max.

**Contested-framework note**: Tononi's identification of phenomenal consciousness with maximally-integrated information is a **postulate**, contested by Aaronson 2014 (computational counterexamples yielding arbitrarily large Φ for systems generally not regarded as conscious) and Doerig et al. 2019 *Conscious Cogn.* 72:49 (unfolding argument). The phenomenological-ansatz known_issue is for the *bridge framing* (using Φ_max as the canonical UPT consciousness ↔ information bridge), not for the IIT framework itself which is canonical.

**Bridge Equation 26: DNA Mutation - Quantum Tunneling Rate**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the WKB mutation-rate integral.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-26-dna-tunneling.ts`](../../src/bridges/equations/be-26-dna-tunneling.ts)

- **Status**: **Speculative** (WKB formula canonical, biological-relevance bridge framing speculative; the prior 'established' label was inconsistent with the predictive gap below). The WKB tunneling rate formula itself is standard quantum mechanics (Gamow 1928; Landau-Lifshitz QM Section 50) and remains canonical literature. The application to DNA base-pair tautomerization via proton tunneling is a real research area (Loewdin 1963) with ongoing debate about biological relevance. **Known issue:** the bare WKB rate `Γ_WKB` with reasonable barrier parameters overshoots observed mutation rates (~10⁻⁸-10⁻¹⁰ /bp/replication) by 2-4 orders of magnitude; the `f(T, pH, EM)` prefactor silently absorbs the dominant biological-mechanism corrections — polymerase proofreading (~10⁻⁵) and mismatch repair (MMR, ~10²) — without which the formula is not predictive of biological mutation rates. A defensible BE-26 must either (a) factor `f = f_proofreading × f_repair × f_environment` explicitly, or (b) replace tunneling-as-mutation-mechanism with the mainstream replication-error / polymerase-fidelity model. The status reflects the bridge framing's speculative element — the WKB formula stands; the claim that DNA mutations are dominantly tunneling-driven does not, as written.
- **Context**: Proton tunneling in base pair tautomerization
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5CGamma_%7B%5Ctext%7Bmutation%7D%7D%20%3D%20%5Cnu_0%20%5Cexp%5Cleft(-%5Cfrac%7B2%7D%7B%5Chbar%7D%5Cint_%7Bx_1%7D%5E%7Bx_2%7D%5Csqrt%7B2m(V(x)-E)%7D%20%2C%20dx%5Cright)%20%5Ccdot%20f(T%2C%5Ctext%7BpH%7D%2C%20%5Ctext%7BEM%7D)" alt="\Gamma_{\text{mutation}} = \nu_0 \exp\left(-\frac{2}{\hbar}\int_{x_1}^{x_2}\sqrt{2m(V(x)-E)} \, dx\right) \cdot f(T,\text{pH}, \text{EM})" />

where:

- <img src="https://i.upmath.me/svg/%5Cnu_0%20%5Csim%2010%5E%7B13%7D" alt="\nu_0 \sim 10^{13}" /> Hz is the attempt frequency
- <img src="https://i.upmath.me/svg/V(x)" alt="V(x)" /> is the potential barrier for proton transfer
- <img src="https://i.upmath.me/svg/f(T%2C%5Ctext%7BpH%7D%2C%20%5Ctext%7BEM%7D)" alt="f(T,\text{pH}, \text{EM})" /> nominally accounts for temperature, pH, and electromagnetic field effects, but in the spec as written it absorbs polymerase fidelity and mismatch-repair correction without naming them — see the Known Issue above.

### Category H: Non-Equilibrium Statistical Mechanics

**Bridge Equation 27: Fluctuation-Dissipation Violation in Active Matter**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.EffectiveTemperature.sum_eq`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/EffectiveTemperature.lean) is the sum form of T_eff. The lemma is not the frequency-dependent Cugliandolo–Kurchan T_eff(ω).

- **Status**: Speculative extension. Frequency-dependent effective temperature is a standard concept in active-matter / non-equilibrium statistical mechanics (Cugliandolo 2011, J. Phys. A 44:483001). The specific functional form used here is phenomenological. The classical FDT (Kubo 1966, Rep. Prog. Phys. 29:255; Callen-Welton 1951, Phys. Rev. 83:34) relates the response function χ(ω) to a correlation via the canonical form `χ''(ω) = (1/2k_B T) · S_FF(ω)` (Kubo) or equivalently `χ(ω) = (1/k_B T) · ∫dt e^{iωt} d/dt⟨δx(t)δx(0)⟩` (Callen-Welton form). The form displayed below uses the `1/(k_B T_eff(ω))` prefactor outside an integral over `⟨δF(t)δx(0)⟩` — a non-standard cross-correlator; standard FDT uses either the auto-correlator `⟨δx(t)δx(0)⟩` (Callen-Welton) or `⟨δF(t)δF(0)⟩` (force-noise form). Treat the displayed integral as schematic; for any operational use, replace with the canonical `χ''(ω) = (1/2k_B T_eff(ω)) S(ω)` plus the active-matter `Σ_active` correction.
- **Context**: Living systems violate equilibrium relations
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cchi(%5Comega)%20%3D%20%5Cfrac%7B1%7D%7Bk_B%20T_%7B%5Ctext%7Beff%7D%7D(%5Comega)%7D%20%5Cint%20dt%20%2C%20e%5E%7Bi%5Comega%20t%7D%20%5Clangle%20%5Cdelta%20F(t)%20%5Cdelta%20x(0)%20%5Crangle%20%2B%20%5CSigma_%7B%5Ctext%7Bactive%7D%7D(%5Comega)" alt="\chi(\omega) = \frac{1}{k_B T_{\text{eff}}(\omega)} \int dt , e^{i\omega t} \langle \delta F(t) \delta x(0) \rangle + \Sigma_{\text{active}}(\omega)" />

where:

- <img src="https://i.upmath.me/svg/T_%7B%5Ctext%7Beff%7D%7D(%5Comega)" alt="T_{\text{eff}}(\omega)" /> is a frequency-dependent effective temperature
- <img src="https://i.upmath.me/svg/%5CSigma_%7B%5Ctext%7Bactive%7D%7D(%5Comega)" alt="\Sigma_{\text{active}}(\omega)" /> represents active contributions to the response
- For active matter: <img src="https://i.upmath.me/svg/T_%7B%5Ctext%7Beff%7D%7D(%5Comega)%20%3D%20T%20%2B%20%5Cfrac%7B%5Calpha%20v_0%5E2%7D%7B%5Comega%5E2%20%2B%20%5Cgamma%5E2%7D" alt="T_{\text{eff}}(\omega) = T + \frac{\alpha v_0^2}{\omega^2 + \gamma^2}" />

**Bridge Equation 28: Maximum Entropy Production Principle**

> **Proof status as of 2026-10-01.** Kind is `property`, even though the covers line begins with derivation-step. [`PhysJS.EntropyProduction.nonneg`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/EntropyProduction.lean) is the non-negativity of σ = Σ_i J_i X_i when every product is ≥ 0. The lemma is not the variational principle. Catalog membership stays not-a-bridge.

- **Status**: Contested principle. Maximum Entropy Production (MEPP) is a proposed but contested principle in non-equilibrium thermodynamics (Dewar 2005; rebutted by Grinstein and Linsker 2007). It conflicts with Prigogine's minimum entropy production for near-equilibrium linear systems. Treat as speculative.
- **Context**: Why nature chooses specific non-equilibrium steady states
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cdelta%20%5Cint%20%5Cleft(%5Cfrac%7BdS%7D%7Bdt%7D%20-%20%5Clambda%20%5Csum_i%20J_i%20X_i%20-%20%5Cmu(%5Cnabla%20%5Ccdot%20%5Cmathbf%7Bv%7D)%5Cright)%20dt%20%3D%200" alt="\delta \int \left(\frac{dS}{dt} - \lambda \sum_i J_i X_i - \mu(\nabla \cdot \mathbf{v})\right) dt = 0" />

subject to constraints, where:

- <img src="https://i.upmath.me/svg/J_i" alt="J_i" /> are thermodynamic fluxes
- <img src="https://i.upmath.me/svg/X_i" alt="X_i" /> are thermodynamic forces
- <img src="https://i.upmath.me/svg/%5Clambda%2C%20%5Cmu" alt="\lambda, \mu" /> are Lagrange multipliers

**Bridge Equation 29: Jarzynski Equality Extension to Gravity**

> **Proof status as of 2026-10-01.** Kind is `property`. [`PhysJS.Jarzynski.jensen_work`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Jarzynski.lean) gives ⟨W⟩ ≥ ΔF by Jensen. The lemma is not Jarzynski's equality and it is not a gravity extension.

- **Status**: Speculative extension. The Jarzynski equality for free-energy differences from non-equilibrium work (Jarzynski 1997, Phys. Rev. Lett. 78:2690) is established in flat-spacetime statistical mechanics. The curved-spacetime extension proposed here, where the gravitational work is the matter-action variation under metric perturbation, is novel to this framework and requires independent derivation.
- **Context**: Work fluctuations in gravitational fields
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Clangle%20%5Cexp(-%5Cbeta%20W)%20%5Crangle%20%3D%20%5Cexp(-%5Cbeta%20%5CDelta%20F)%20%5Ccdot%20%5Cexp%5Cleft(-%5Cfrac%7B%5Cbeta%7D%7B2c%5E4%7D%20%5Cint%20T%5E%7B%5Cmu%5Cnu%7D%20%5Cdelta%20g_%7B%5Cmu%5Cnu%7D%20%5Csqrt%7B-g%7D%20%5C%2C%20d%5E4%20x%5Cright)" alt="\langle \exp(-\beta W) \rangle = \exp(-\beta \Delta F) \cdot \exp\left(-\frac{\beta}{2c^4} \int T^{\mu\nu} \delta g_{\mu\nu} \sqrt{-g} \, d^4 x\right)" />

where the second exponential includes gravitational work contributions:
<img src="https://i.upmath.me/svg/W_%7B%5Ctext%7Bgrav%7D%7D%20%3D%20%5Cfrac%7B1%7D%7B2c%5E4%7D%20%5Cint%20T%5E%7B%5Cmu%5Cnu%7D%20%5Cdelta%20g_%7B%5Cmu%5Cnu%7D%20%5Csqrt%7B-g%7D%20%5C%2C%20d%5E4%20x" alt="W_{\text{grav}} = \frac{1}{2c^4} \int T^{\mu\nu} \delta g_{\mu\nu} \sqrt{-g} \, d^4 x" />

> **Corrected on 2026-05-01:** Replaced the ill-defined `dT^{μν}` (a rank-2 tensor differential with no specified integration manifold) with the canonical Hilbert action variation `T^{μν} δg_{μν} √(-g) d⁴x`. This is the standard expression for the matter-action change under a metric variation in general relativity (Misner-Thorne-Wheeler *Gravitation* §21.3 Eq. 21.51; Wald *General Relativity* (1984) §E.1 Eq. E.1.14, defining `T^{μν} := (2/√(-g)) δ(√(-g) L_matter)/δg_{μν}`, whence `δS_matter = (1/2) ∫ T^{μν} δg_{μν} √(-g) d⁴x` in geometric units; the `1/c⁴` factor restores SI dimensions of action). The factor `1/2` (vs. the original `1/1`) follows directly from the standard definition of `T^{μν}` via metric variation. The covariant volume element `√(-g) d⁴x` is required for diffeomorphism invariance. Status remains *speculative* — the *form* of the gravitational work is now standard GR, but applying Jarzynski's flat-spacetime equality to this curved-spacetime work is the conjectural extension and is unverified.

### Category I: Emergent Spacetime

**Bridge Equation 30: Entanglement - Geometry Equation (FLM first-law / linear-response)**

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Entanglement.first_variation`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Entanglement.lean) is d/dt of S along a smooth curve of full-rank density matrices that stay diagonal in a fixed basis. The lemma is not the holographic first law. Ryu–Takayanagi is not in Mathlib, and chaining the area-law lemma does not identify the modular Hamiltonian with an area variation.

- **Status**: **Speculative (canonical formula, speculative QG-emergence framing). Reformulated 2026-05-06.** The previous form `g_{μν}(x) = η_{μν} + κ Σ_{ij} ⟨x|Tr_j(ρ_{ij} log ρ_{ij})|x⟩` was structurally ill-formed (rank-2 LHS vs scalar RHS, non-normalizable `|x⟩`, dimensionally wrong κ); replaced with the canonical **first-law-of-entanglement / FLM linear-response form**: `δS_EE(R) = ⟨δH_R⟩` where H_R is the modular Hamiltonian of the reduced density matrix on region R. Blanco-Casini-Hung-Myers 2013 (arXiv:1305.3182) states the form explicitly: "ΔS = ΔH for the first order variation of the entanglement entropy ΔS and the expectation value of the modular Hamiltonian ΔH". FLM 2013 (arXiv:1307.2892) uses this as the linear-response input to bulk one-loop corrections in AdS/CFT. The framework keeps `speculative` (not `established`) because the linear-response identity is canonical only inside its derivation domain (AdS/CFT, ball-shaped regions in conformally-flat space, etc.); the *use* of this identity as the basis for ER=EPR-style entanglement-geometry equivalence outside the strict AdS/CFT regime — which is the framing UPT proposes — remains conjectural. The phenomenological-ansatz tag is for the framing extension, not the linear-response math itself. See `tests/bridges/be-30-reformulation.test.ts` for the reformulation pin.
- **Context**: How spacetime emerges from quantum entanglement (FLM first-law / linear-response form)
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cdelta%20S_%7B%5Ctext%7BEE%7D%7D(R)%20%3D%20%5Clangle%20%5Cdelta%20H_R%20%5Crangle" alt="\delta S_{\text{EE}}(R) = \langle \delta H_R \rangle" />

where:

- <img src="https://i.upmath.me/svg/%5Cdelta%20S_%7B%5Ctext%7BEE%7D%7D(R)" alt="\delta S_{\text{EE}}(R)" /> is the variation of entanglement entropy on region R under a small perturbation of the state
- <img src="https://i.upmath.me/svg/H_R%20%3D%20-%5Clog%20%5Crho_R" alt="H_R = -\log \rho_R" /> is the modular Hamiltonian of the reduced density matrix `ρ_R = Tr_{R̄} ρ` (trace over the complement region)
- <img src="https://i.upmath.me/svg/%5Clangle%20%5Cdelta%20H_R%20%5Crangle" alt="\langle \delta H_R \rangle" /> is the expectation value of the variation of H_R in the reference state
- The canonical (Blanco-Casini-Hung-Myers 2013, arXiv:1305.3182; FLM 2013, arXiv:1307.2892) regime is AdS/CFT with ball-shaped regions in conformally-flat backgrounds, where `H_R` admits a closed expression as an integral of `T^{tt}` over R weighted by a known boost generator; UPT extending the linear-response identity to non-AdS / non-holographic settings is the speculative element.

**Bridge Equation 31: Causal Set - Continuum Limit**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the Benincasa–Dowker d = 4 discrete Ricci scalar.

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

**Bridge Equation 32: Quantum Reference Frame Transformation**

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.BornOverlap.modulus_sq`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/BornOverlap.lean) states |c + si|² = c² + s². The lemma is not the frame transformation and it is not a Haar integral, and catalog membership stays not-a-bridge.

- **Status**: Active research. Quantum Reference Frames (QRF) formalism -- where reference frames are themselves quantum systems that can be in superposition -- is a legitimate active research area (Giacomini, Castro-Ruiz and Brukner, *Nat. Commun.* 10, 494 (2019), arXiv:1712.07207; de la Hamette and Galley, arXiv:2004.14292). The transformation formula captures the essential structure: changing reference frame integrates over group elements weighted by a unitary representation, tensored with the frame's quantum state. The formalism is well-defined but currently lacks direct experimental verification.
- **Context**: How physics transforms between quantum reference frames
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%7C%5Cpsi%5Crangle_B%20%3D%20%5Cint%20dg%20%2C%20U(g)%20%7C%5Cpsi%5Crangle_A%20%5Cotimes%20%7Cg%5Crangle_%7B%5Ctext%7Bframe%7D%7D" alt="|\psi\rangle_B = \int dg , U(g) |\psi\rangle_A \otimes |g\rangle_{\text{frame}}" />

where:

- <img src="https://i.upmath.me/svg/g" alt="g" /> parametrizes the transformation group
- <img src="https://i.upmath.me/svg/U(g)" alt="U(g)" /> is the unitary representation
- <img src="https://i.upmath.me/svg/%7Cg%5Crangle_%7B%5Ctext%7Bframe%7D%7D" alt="|g\rangle_{\text{frame}}" /> is the quantum reference frame state

### Category J: Phase Transitions and Criticality

**Bridge Equation 33: Quantum-Classical Critical Point Mapping (Hertz-Millis canonical scaling, 3D Heisenberg)**

> **Proof status as of 2026-10-01.** Kind is `bridge`: [`PhysJS.QuantumCritical.thermal_scaling`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/QuantumCritical.lean) states the catalogued equation ξ(T) = ξ₀ (T/T₀)^{−1/z}, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. The lemma is not Hertz–Millis theory. Nested on this id, and not the reference, are [`PhysJS.QuantumCritical.scaling_shape`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/QuantumCritical.lean) and [`PhysJS.QuantumCritical.every_power_homogeneous`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/QuantumCritical.lean), which use [`PhysJS.Dimensional.monomial_form`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Dimensional.lean) and fix only the shape ξ = ξ₀ φ(T/T₀). Units fix that form only up to the dimensionless profile φ, so φ and the exponent are not chosen, and z = 1 in the catalog display is a specialization and is not derived from units.

- **Status**: **Speculative (canonical scaling form, framework-pin to 3D Heisenberg). Corrected on 2026-05-20:** the finite-T correlation-length exponent was changed from `−ν/z` (pinned −0.71) to `−1/z` (pinned −1 for z=1). At a quantum critical point `ξ ~ T^{−1/z}`: z alone sets the temperature dependence; ν governs the separate T=0 tuning-parameter axis. Literature anchor: `cond-mat/0503298` states `ξ ~ (T/Tc)^{−1/z}` explicitly. The mathematical formulation below reflects the corrected form. **Reformulated 2026-05-06.** The previous ansatz `ξ_quantum(T) = ξ_classical / √(1 + (E_0/k_B T)²)` was broken (gave the wrong T → 0 limit ξ → 0 instead of the required QCP divergence; missing dynamic exponent z). Replaced with the canonical **Hertz-Millis scaling form** (Hertz 1976 *Phys. Rev. B* 14:1165; Millis 1993 *Phys. Rev. B* 48:7183; Sondhi-Girvin-Carini-Shahar 1997 *Rev. Mod. Phys.* 69:315; Sachdev 2011 *Quantum Phase Transitions* 2nd ed., Ch. 11), pinned to **3D Heisenberg universality class (z = 1)** as the canonical reference case. The `ν` parameter remains in the AST node interface for API stability but the corrected scaling no longer depends on it. See `tests/bridges/be-33-reformulation.test.ts` for the reformulation pin.
- **Context**: Relates d-dimensional quantum to (d+z)-dimensional classical transitions via Hertz-Millis canonical scaling

- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cxi_%7B%5Ctext%7Bquantum%7D%7D(T)%20%5Csim%20%5Cxi_0%20%5Cleft(%5Cfrac%7BT%7D%7BT_0%7D%5Cright)%5E%7B-1%2Fz%7D%2C%20%5Cquad%20(z%3D1)" alt="\xi_{\text{quantum}}(T) \sim \xi_0 \left(\frac{T}{T_0}\right)^{-1/z}, \quad (z=1)" />

where:

- <img src="https://i.upmath.me/svg/z" alt="z" /> is the dynamic critical exponent (`z = 1` for 3D Heisenberg, follows from Lorentz invariance of the underlying field theory)
- <img src="https://i.upmath.me/svg/%5Cnu" alt="\nu" /> is the correlation-length exponent (`ν ≈ 0.71` for 3D Heisenberg, from ε-expansion / Monte Carlo / conformal-bootstrap consensus)
- <img src="https://i.upmath.me/svg/T_0" alt="T_0" /> is a non-universal scale set by the underlying microscopic theory (sets where the canonical scaling regime begins)
- <img src="https://i.upmath.me/svg/%5Cxi_0" alt="\xi_0" /> is a non-universal length scale (sets the proportionality factor)

**Bridge Equation 34: Kibble-Zurek Mechanism in Curved Spacetime**

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.KibbleZurek.exponent`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/KibbleZurek.lean) is the freeze-out power only. The lemma does not include the Boltzmann factor and does not repair the missing 1/a^d.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-34-kibble-zurek.ts`](../../src/bridges/equations/be-34-kibble-zurek.ts)

- **Status**: Established extension. The Kibble-Zurek defect density n ~ (tau_Q/tau_0)^(-d nu / (1 + z nu)) is established (Kibble 1976; Zurek 1985). The added exp(-m_defect c^2 / (k_B T_reh)) suppression for curved spacetime / reheating is a phenomenological extension not derived from the cited mechanism. **Temperature-scale issue:** the relevant temperature for defect-formation Boltzmann suppression is the symmetry-breaking / critical temperature T_c at the phase transition, not the (typically higher) reheating temperature T_reh. Using T_reh would weaken the suppression relative to the correct T_c scale. The displayed formula includes the explicit `1/a^d` prefactor; with `1/a^d` in front, the LHS dimensions `[L]^(-d)` are recovered.
- **Context**: Defect formation during cosmological phase transitions
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/n_%7B%5Ctext%7Bdefect%7D%7D%20%3D%20%5Cfrac%7B1%7D%7Ba%5Ed%7D%5Cleft(%5Cfrac%7B%5Ctau_Q%7D%7B%5Ctau_0%7D%5Cright)%5E%7B-%5Cfrac%7Bd%5Cnu%7D%7B1%2Bz%5Cnu%7D%7D%20%5Ccdot%20%5Cexp%5Cleft(-%5Cfrac%7Bm_%7B%5Ctext%7Bdefect%7D%7D%20c%5E2%7D%7Bk_B%20T_%7B%5Ctext%7Breh%7D%7D%7D%5Cright)" alt="n_{\text{defect}} = \frac{1}{a^d}\left(\frac{\tau_Q}{\tau_0}\right)^{-\frac{d\nu}{1+z\nu}} \cdot \exp\left(-\frac{m_{\text{defect}} c^2}{k_B T_{\text{reh}}}\right)" />

where:

- <img src="https://i.upmath.me/svg/%5Ctau_Q" alt="\tau_Q" /> is the quench time
- <img src="https://i.upmath.me/svg/%5Ctau_0" alt="\tau_0" /> is the microscopic time scale
- <img src="https://i.upmath.me/svg/T_%7B%5Ctext%7Breh%7D%7D" alt="T_{\text{reh}}" /> is the reheating temperature
- The exponential factor accounts for cosmic expansion effects

**Bridge Equation 35: Conformal Bootstrap - Physical Operator Equation**

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Crossing.antisymmetry`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Crossing.lean) states that g(u, v) − g(v, u) is the negation of the swap. The lemma is not the infinite sum over (Δ, ℓ), and catalog membership stays not-a-bridge.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-35-conformal-bootstrap.ts`](../../src/bridges/equations/be-35-conformal-bootstrap.ts)

- **Status**: Established. The conformal bootstrap crossing-symmetry equation is well established in CFT and has produced rigorous bounds on critical exponents for the 3D Ising model and other theories (Rattazzi-Rychkov-Tonni-Vichi 2008, arXiv:0807.0004; Poland-Rychkov-Vichi 2018 review arXiv:1805.04405).
- **Context**: Constrains possible conformal field theories
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Clangle%20O_1(x_1)%20O_2(x_2)%20O_3(x_3)%20O_4(x_4)%20%5Crangle%20%3D%20%5Csum_%7B%5CDelta%2C%5Cell%7D%20C_%7B12%7D%5EO%20C_%7B34%7D%5EO%20g_%7B%5CDelta%2C%5Cell%7D(u%2Cv)" alt="\langle O_1(x_1) O_2(x_2) O_3(x_3) O_4(x_4) \rangle = \sum_{\Delta,\ell} C_{12}^O C_{34}^O g_{\Delta,\ell}(u,v)" />

For four identical scalars φ of dimension Δ_φ, the reduced four-point function is the unit operator plus the conformal blocks of the exchanged operators (Rattazzi-Rychkov-Tonni-Vichi 2008, eq. 4.4):
<img src="https://i.upmath.me/svg/g(u%2Cv)%20%3D%201%20%2B%20%5Csum_%7BO%20%5Cin%20%5Cphi%5Ctimes%5Cphi%7D%20%5Clambda_O%5E2%5C%2C%20g_O(u%2Cv)" alt="g(u,v) = 1 + \sum_{O \in \phi\times\phi} \lambda_O^2\, g_O(u,v)" />

Crossing symmetry under x₁ ↔ x₃ requires the relation below (their eq. 4.3, which writes Δ_φ as d). BE-35 encodes this relation:
<img src="https://i.upmath.me/svg/v%5E%7B%5CDelta_%5Cphi%7D%5C%2C%20g(u%2Cv)%20%3D%20u%5E%7B%5CDelta_%5Cphi%7D%5C%2C%20g(v%2Cu)" alt="v^{\Delta_\phi}\, g(u,v) = u^{\Delta_\phi}\, g(v,u)" />

Written as a sum rule over the exchanged operators (their eq. 4.5):
<img src="https://i.upmath.me/svg/1%20%3D%20%5Csum_%7B%5CDelta%2C%5Cell%7D%20p_%7B%5CDelta%2C%5Cell%7D%5C%2C%20F_%7B%5CDelta_%5Cphi%2C%5CDelta%2C%5Cell%7D(u%2Cv)%2C%20%5Cquad%20p_%7B%5CDelta%2C%5Cell%7D%20%3D%20%5Clambda_O%5E2%20%3E%200" alt="1 = \sum_{\Delta,\ell} p_{\Delta,\ell}\, F_{\Delta_\phi,\Delta,\ell}(u,v), \quad p_{\Delta,\ell} = \lambda_O^2 > 0" />

<img src="https://i.upmath.me/svg/F_%7B%5CDelta_%5Cphi%2C%5CDelta%2C%5Cell%7D(u%2Cv)%20%3D%20%5Cfrac%7Bv%5E%7B%5CDelta_%5Cphi%7D%20g_%7B%5CDelta%2C%5Cell%7D(u%2Cv)%20-%20u%5E%7B%5CDelta_%5Cphi%7D%20g_%7B%5CDelta%2C%5Cell%7D(v%2Cu)%7D%7Bu%5E%7B%5CDelta_%5Cphi%7D%20-%20v%5E%7B%5CDelta_%5Cphi%7D%7D" alt="F_{\Delta_\phi,\Delta,\ell}(u,v) = \frac{v^{\Delta_\phi} g_{\Delta,\ell}(u,v) - u^{\Delta_\phi} g_{\Delta,\ell}(v,u)}{u^{\Delta_\phi} - v^{\Delta_\phi}}" />

where u and v are cross-ratios and g_{Δ,ℓ} is the conformal block of an exchanged operator of dimension Δ and spin ℓ. F is a crossing combination of ONE block, not a conformal block.

> **Corrected on 2026-09-24:** The encoded relation is the crossing equation for four identical scalars of dimension Δφ, `v^Δφ g(u, v) = u^Δφ g(v, u)` (Rattazzi-Rychkov-Tonni-Vichi 2008, eq. 4.3, which writes Δφ as `d`), where `g(u, v) = 1 + Σ_{O∈φ×φ} λ_O² g_O(u, v)` is the full reduced four-point function: the unit operator plus the conformal blocks (their eq. 4.4). The earlier encoding `C² [g_block(u, v) − g_block(v, u)]` had no prefactors and was written for one block. Neither is crossing symmetric, and its check at `u = v = 1/4` holds for any function. The sum rule previously shown here, `Σ (C12 C34 − C13 C24) F = 0` with F called "conformal blocks", was not Rattazzi et al.'s form. It is rewritten above to their eq. 4.5, where F is a crossing combination of one block, not a conformal block.

### Category K: Modified Theories and Extensions

**Bridge Equation 36: MOND / TeVeS — GW170817 graviton-speed bound**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the GW170817 graviton-speed bound |c_GW − c|/c ≤ 10^{−15}.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-36-gw-speed-bound.ts`](../../src/bridges/equations/be-36-gw-speed-bound.ts)

- **Status**: Speculative. **Reformulated 2026-05-06** from the bespoke hybrid linear blend `F = F_N μ(a/a_0) + F_DM (1 − μ(a/a_0))` (not in any published MOND literature) to the canonical Bekenstein 2004 TeVeS (Tensor-Vector-Scalar gravity) framing, and then **AST-encoded 2026-05-07** to the operationally-checkable **GW170817 graviton-speed bound** `|c_GW − c|/c ≤ 10⁻¹⁵`. The TeVeS action `S = S_g + S_φ + S_A + S_matter` (three dynamical fields — metric, scalar, timelike vector) is operator-valued and admits no clean scalar AST encoding without committing to a specific bulk geometry; the dimensionless GW170817 ratio is the AST-encodable scalar that the bridge now carries. TeVeS is preserved as the *bridge framing* (see "Framing context" below). The relationship to BE-38 is preserved: BE-38 covers the non-relativistic Milgrom `μ(x) = x/√(1+x²)` form; BE-36 covers the relativistic-completion framing — different physical content, complementary not duplicative.
- **Context**: GW170817 graviton-speed bound — the 2017 binary-neutron-star merger detection (Abbott et al. 2017 *ApJ Lett.* 848:L13; ~1.7 s gravitational-wave / gamma-ray arrival difference over ~40 Mpc) constrains the graviton propagation speed to `|c_GW − c|/c ≲ 10⁻¹⁵`. This strongly constrains TeVeS-class theories, which generically predict `c_GW ≠ c` from the timelike-vector field's contribution to the dispersion relation.
- **Mathematical Formulation** (GW170817 graviton-speed bound):

<img src="https://i.upmath.me/svg/%5Cfrac%7B%7Cc_%7B%5Ctext%7BGW%7D%7D%20-%20c%7C%7D%7Bc%7D%20%5Cleq%2010%5E%7B-15%7D" alt="\frac{|c_{\text{GW}} - c|}{c} \leq 10^{-15}" />

where:

- `c_GW` is the gravitational-wave propagation speed and `c` the speed of light
- The encoded scalar is the signed dimensionless ratio `(c_GW − c)/c`; the absolute-value bound is exposed via the `satisfiesGW170817Bound` numerical helper. `dimensional_signature: '[1]'`.

> **Framing context — Bekenstein 2004 TeVeS (the relativistic MOND completion).** BE-36's bridge framing is the canonical relativistic completion of MOND: the TeVeS action `S = S_g + S_φ + S_A + S_matter` (Bekenstein 2004 *Phys. Rev. D* 70:083509, arXiv:astro-ph/0403694), where `S_g` is the Einstein-Hilbert action for the metric `g_μν`, `S_φ` is the scalar-field action with the MOND interpolation function `μ̃(y)` (`y = ℓ²(g^μν − A^μ A^ν) φ_,μ φ_,ν`), `S_A` is the timelike-vector-field action with a Lagrange multiplier enforcing `A^μ A_μ = -1`, and `S_matter` couples through the physical metric `ĝ_μν = e^{-2φ} g_μν − 2 sinh(2φ) A_μ A_ν`. The non-relativistic weak-field limit recovers the canonical MOND interpolation `F_eff = F_N · μ̃⁻¹(F_N/(F_N + a_0))`, which reduces to standard MOND (BE-38: Milgrom `μ(x) = x/√(1+x²)`) for `a ≪ a_0 ≈ 1.2×10⁻¹⁰ m/s²`. Original TeVeS variants are strongly constrained or ruled out by the GW170817 bound encoded above (Boran et al. 2018 *Phys. Rev. D* 97:041501, arXiv:1710.06168); only carefully-tuned subclasses or successor RMT theories (Skordis-Złośnik 2021 *Phys. Rev. Lett.* 127:161302, arXiv:2007.00082) survive — which is precisely why the GW170817 ratio, not the TeVeS action, is the operative encoded bridge.

**Bridge Equation 37: Modified light-propagation — Shapiro gravitational time delay**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.Shapiro.radial_integral`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Shapiro.lean) is the radial integral (2GM/c³) ln(R_far/R_near). The lemma is not the impact-parameter formula and it is not the Cassini measurement.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-37-shapiro-delay.ts`](../../src/bridges/equations/be-37-shapiro-delay.ts)

- **Status**: **Speculative** (Shapiro delay canonical and experimentally confirmed; bridge framing speculative). **Reformulated 2026-05-11.** The previous BE-37 was the variable-speed-of-light (VSL) ansatz `c(t) = c_0[1 + ε(t/t_P)^n exp(-t/t_c)]`, dispositioned **R3-invalid** in the R3 audit (2026-05-05) because it fails the Ellis-Uzan 2005 operational-meaningfulness critique (only dimensionless ratios of constants are measurable; a bare `c(t)` is a relabeling of the unit system over time, not physics) and is not derived from any of the three non-equivalent canonical VSL formulations (Albrecht-Magueijo 1999, Moffat 1993, Barrow 1999). The reformulation move is **not** to pick one of those three (each fails Ellis-Uzan independently) but to replace VSL entirely with the canonical operationally-meaningful **Shapiro gravitational time delay** — the standard general-relativistic "effective-c" effect that *does* survive Ellis-Uzan. Status is `speculative` (not `established`) because Shapiro delay itself is canonical and Cassini-confirmed, but the *bridge framing* — treating Shapiro delay as the UPT "modified-light-propagation" bridge — is the speculative element.
- **Context**: Shapiro gravitational time delay — coordinate-time delay of light passing near a massive body. The canonical operationally-meaningful "effective-c" effect that survives the Ellis-Uzan 2005 critique of vacuum `c(t,x)`-variation. (Light always travels at `c` locally; the delay arises from integrated path-length / coordinate-time effects in curved spacetime — it is NOT a "varying c" in any fundamental sense.)
- **Mathematical Formulation** (canonical Shapiro 1964 gravitational time delay):

<img src="https://i.upmath.me/svg/%5CDelta%20t%20%3D%20%5Cfrac%7B2GM%7D%7Bc%5E3%7D%20%5Cln%5Cleft(%5Cfrac%7BR_%7B%5Ctext%7Bfar%7D%7D%7D%7BR_%7B%5Ctext%7Bnear%7D%7D%7D%5Cright)" alt="\Delta t = \frac{2GM}{c^3} \ln\left(\frac{R_{\text{far}}}{R_{\text{near}}}\right)" />

where:

- `M` is the mass of the deflecting body
- `R_far`, `R_near` are the radial distances bounding the light path past the body (`R_far ≥ R_near`)
- The prefactor `2GM/c³` has dimension `[time]` (the light-travel-time scale of the Schwarzschild radius); the log argument `R_far/R_near` is dimensionless. The encoded form uses the GR-canonical PPN parameter `γ = 1` (coefficient `2GM/c³`); a more general PPN encoding would use `(1+γ)GM/c³`.

References: Shapiro 1964 *Phys. Rev. Lett.* 13:789 (original prediction); Bertotti-Iess-Tortora 2003 *Nature* 425:374 (Cassini solar-conjunction measurement of γ to ~10⁻⁵); Will 1981/2014 *Theory and Experiment in Gravitational Physics* (canonical PPN-framework textbook).

> **Historical record — the R3-invalid VSL ansatz, superseded 2026-05-11:** the previous BE-37 was the variable-speed-of-light ansatz `c(t) = c_0[1 + ε(t/t_P)^n exp(-t/t_c)]` with the associated modified Friedmann equation `H² = (8πG/3)ρ + (ċ/c)H + (1/2)(ċ/c)²`. It was dispositioned R3-invalid (2026-05-05) — see [`docs/planning/BE-37-VSL-Disposition-Brief.md`](../planning/BE-37-VSL-Disposition-Brief.md) for the full disposition analysis — and is preserved in commit history. The reformulation replaces it with the Shapiro-delay form above; the Albrecht-Magueijo / Moffat / Barrow VSL proposals are retained in the catalog's `references[]` as historical context only.

**Bridge Equation 38: Milgrom MOND interpolation ν(z)**

> **Proof status as of 2026-10-01.** Kind is `limit`. [`PhysJS.Mond.tendsto_nu_limits`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Mond.lean) states that ν → 1 as z → ∞ and that ν√z → 1 as z → 0⁺. Nested [`PhysJS.Mond.mu_inversion`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Mond.lean) is not the reference, and the lemma does not state ν → √(2/z) and does not include the SPARC confrontation. The catalog name is Milgrom MOND interpolation ν(z).

- **Status**: Speculative. Based on Verlinde (arXiv:1001.0785). Contested; not accepted as mainstream physics. **Reformulated 2026-05-05:** replaced the originally-stated `F = F_N[1 + α√(a₀/a) tanh(√(a/a₀))]` interpolation — which fails the deep-MOND limit (the `a → 0` limit yields `F → F_N(1+α) ~` Newtonian rather than the required `F → √(m F_N a₀)`) — with the canonical Milgrom 1983 MOND interpolation `μ(x) = x/√(1+x²)`, where `x = a/a₀`. This recovers Newtonian scaling for `a >> a₀` and deep-MOND scaling `F → √(m F_N a₀)` for `a << a₀` by construction. The Verlinde 2017 mass-correction variant (*SciPost Phys.* 2:016; arXiv:1611.02269) and TeVeS relativistic completion (Bekenstein 2004 *Phys. Rev. D* 70:083509) are documented in `references[]` for future work but are non-equivalent reformulation paths. The remaining `phenomenological-ansatz` known_issue is for the *bridge-equation framing* (using MOND as the Newtonian-dark-sector link), not for the interpolation function itself which is canonical.
- **Context**: Verlinde's emergent gravity with dark matter effects

- **Mathematical Formulation** (canonical Milgrom 1983 MOND interpolation):

<img src="https://i.upmath.me/svg/F%20%3D%20F_N%20%5Ccdot%20%5Cnu(z)%2C%20%5Cquad%20z%20%3D%20%5Cfrac%7BF_N%7D%7Bm%20a_0%7D%2C%20%5Cquad%20%5Cnu(z)%20%3D%20%5Csqrt%7B%5Cfrac%7B1%20%2B%20%5Csqrt%7B1%20%2B%204%2Fz%5E2%7D%7D%7B2%7D%7D" alt="F = F_N \cdot \nu(z), \quad z = \frac{F_N}{m a_0}, \quad \nu(z) = \sqrt{\frac{1 + \sqrt{1 + 4/z^2}}{2}}" />

> **Tier-5 AST encoding**: BE-38 is encoded in the explicit ν-form `F = F_N · ν(z)` with `z = F_N/(m a_0)` and `ν(z) = √[(1+√(1+4/z²))/2]`, equivalent to the implicit form `F = F_N · μ⁻¹(a/a_0)` with `μ(x) = x/√(1+x²)`. The two forms are mathematically equivalent (Famaey-McGaugh 2012 *Living Rev. Relativity* 15:10); the explicit ν-form is directly computable in closed form and avoids the implicit `μ⁻¹` lookup. Limits: `z → ∞` (Newtonian) gives `ν → 1, F → F_N`; `z → 0` (deep-MOND) gives `ν ~ 1/√z, F → √(m · F_N · a_0)`. At `z = 1e-6`, `ν` is about 1000; `√(2/z)` is about 1414 and is not this limit. AST module: `src/bridges/equations/be-38-mond.ts`. Encoding test bracket-checks: Newtonian limit, deep-MOND limit, golden-ratio identity at `z = 1` (`F = F_N · √φ ≈ 1.272 F_N`), and direct cross-derivation against the implicit μ-relation `μ(a/a_0)·a = a_N` to machine precision.

where:

- <img src="https://i.upmath.me/svg/a_0%20%3D%201.2%20%5Ctimes%2010%5E%7B-10%7D" alt="a_0 = 1.2 \times 10^{-10}" /> m/s² is the MOND acceleration scale (Milgrom 1983)
- <img src="https://i.upmath.me/svg/%5Cmu(x)%20%3D%20x%2F%5Csqrt%7B1%2Bx%5E2%7D" alt="\mu(x) = x/\sqrt{1+x^2}" /> is the canonical "standard" MOND interpolation function (Milgrom 1983 *Astrophys. J.* 270:365). For `x >> 1` (`a >> a₀`) `μ → 1` and `F → F_N` (Newtonian); for `x << 1` (`a << a₀`) `μ ≈ x` and `F → √(m F_N a₀)` (deep-MOND).
- See Famaey-McGaugh 2012 *Living Rev. Relativity* 15:10 (arXiv:1112.3960) for a review of MOND interpolation functions and empirical fit qualities.

The original form (preserved here as historical record):

<img src="https://i.upmath.me/svg/%5Cmathbf%7BF%7D%20%3D%20%5Cmathbf%7BF%7D_N%5Cleft%5B1%20%2B%20%5Calpha%5Csqrt%7B%5Cfrac%7Ba_0%7D%7Ba%7D%7D%20%5Ctanh%5Cleft(%5Csqrt%7B%5Cfrac%7Ba%7D%7Ba_0%7D%7D%5Cright)%5Cright%5D" alt="\mathbf{F} = \mathbf{F}_N\left[1 + \alpha\sqrt{\frac{a_0}{a}} \tanh\left(\sqrt{\frac{a}{a_0}}\right)\right]" />

failed the deep-MOND limit (in the `a → 0` limit `√(a₀/a) → ∞` and `tanh(√(a/a₀)) ≈ √(a/a₀)`, so the bracket → `1 + α`, giving `F → F_N(1+α)` ~ Newtonian rather than the required `F → √(m F_N a₀)`).

### Category L: Quantum Field Theory Extensions

**Bridge Equation 39: Asymptotic Safety in Quantum Gravity**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the asymptotic-safety beta system and its non-Gaussian fixed point.

- **Status**: Speculative (active research). Asymptotic safety (Weinberg 1979; Reuter 1998 *Phys. Rev. D* 57:971, arXiv:hep-th/9605030) is an active research program proposing a UV-finite gravity. The functional renormalization group flow equation as written is at the schematic level; specific truncation choices (Einstein-Hilbert, f(R), etc.) are required for computation. Not yet experimentally confirmed. **Sign-convention note:** the displayed `+A g²` term in `β_g` follows the convention where `A > 0` is required for the non-Gaussian UV fixed point at `g_* > 0` to attract the flow from below — i.e., for the canonical Reuter (1998) Einstein-Hilbert truncation, scheme conventions yield `A > 0`. The "−Cg²λ" minus is conventional given the sign of the Λ-coupling cross-term in the Wetterich equation (Reuter-Weyer 2009 *Gen. Rel. Grav.* 41:983 fix the explicit values). Different sign conventions in the literature (including Codello-Percacci-Rahmede 2009) absorb factors of 2π or `1/(16π)` differently; the schematic form here is convention-light. For any operational use, fix the convention by reference to a specific truncation paper.
- **Context**: UV-complete theory via non-Gaussian fixed point
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cbegin%7Balign%7D%0A%5Cbeta_g%20%26%3D%202g%20%2B%20Ag%5E2%20%2B%20Bg%5E3%20-%20Cg%5E2%5Clambda%20%2B%20%5Cmathcal%7BO%7D(g%5E4)%20%5C%5C%0A%5Cbeta_%5Clambda%20%26%3D%20-2%5Clambda%20%2B%20D%5Clambda%5E2%20-%20Eg%5Clambda%20-%20Fg%5E2%20%2B%20%5Cmathcal%7BO%7D(%5Clambda%5E3%2C%20g%5E3)%0A%5Cend%7Balign%7D" alt="\begin{align}
\beta_g &= 2g + Ag^2 + Bg^3 - Cg^2\lambda + \mathcal{O}(g^4) \\
\beta_\lambda &= -2\lambda + D\lambda^2 - Eg\lambda - Fg^2 + \mathcal{O}(\lambda^3, g^3)
\end{align}" />

> **Note:** the `-Fg²` term in `β_λ` is required: in the canonical Reuter (1998) Einstein-Hilbert truncation the `g²` coupling in the cosmological-constant flow fixes the non-Gaussian fixed point's `λ_*` value (without it, `λ_*` cannot be determined from `g_*` alone). `F` is a separate scheme-dependent coefficient — the symbol differs from `B` in `β_g` to avoid confusion. See Reuter-Weyer 2009 *Gen. Rel. Grav.* 41:983 for the canonical EH-truncation values.

where:

- <img src="https://i.upmath.me/svg/g%20%3D%20G(k)k%5E2" alt="g = G(k)k^2" /> is the dimensionless Newton coupling
- <img src="https://i.upmath.me/svg/%5Clambda%20%3D%20%5CLambda(k)%2Fk%5E2" alt="\lambda = \Lambda(k)/k^2" /> is the dimensionless cosmological constant
- <img src="https://i.upmath.me/svg/A%2C%20B%2C%20C%2C%20D%2C%20E" alt="A, B, C, D, E" /> are universal coefficients

**Bridge Equation 40: Composite Higgs Potential**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.CompositeHiggs.scale_free`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/CompositeHiggs.lean) states that V(h)/f⁴ depends on h only through θ = h/f. Catalog membership stays not-a-bridge, and the lemma does not decide that membership. The lemma is not SILH matching.

- **Status**: Established form (after correction). Standard composite Higgs potentials (Kaplan-Georgi 1984 *Phys. Lett. B* 136:183; Giudice-Grojean-Pomarol-Rattazzi 2007 "The Strongly-Interacting Light Higgs" *JHEP* 0706:045, arXiv:hep-ph/0703164) have the structure V(h) ∼ α f⁴ sin²(h/f) + β f⁴ sin⁴(h/f) with α and β dimensionless Wilson coefficients and all terms of dimension [E]⁴. **Corrected on 2026-05-05:** the previous draft had `-α f²` in the first term, making it carry [E]² while β f⁴[...] carries [E]⁴ — dimensionally inhomogeneous. Replaced f² with f⁴. The canonical author list for arXiv:hep-ph/0703164 is **Giudice-Grojean-Pomarol-Rattazzi 2007** (verified against arXiv abstract and JHEP record).
- **Context**: Higgs as pseudo-Goldstone boson
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/V(h)%20%3D%20-%5Calpha%20f%5E4%20%5Csin%5E2%5Cleft(%5Cfrac%7Bh%7D%7Bf%7D%5Cright)%20%2B%20%5Cbeta%20f%5E4%5Cleft%5B%5Csin%5E4%5Cleft(%5Cfrac%7Bh%7D%7Bf%7D%5Cright)%20-%20%5Csin%5E2%5Cleft(%5Cfrac%7Bh%7D%7Bf%7D%5Cright)%5Ccos%5E2%5Cleft(%5Cfrac%7Bh%7D%7Bf%7D%5Cright)%5Cright%5D" alt="V(h) = -\alpha f^4 \sin^2\left(\frac{h}{f}\right) + \beta f^4\left[\sin^4\left(\frac{h}{f}\right) - \sin^2\left(\frac{h}{f}\right)\cos^2\left(\frac{h}{f}\right)\right]" />

> **Corrected on 2026-05-05:** The previous form `-α f² sin²(h/f) + β f⁴[...]` was dimensionally inhomogeneous (first term [E]², second term [E]⁴). The standard Kaplan-Georgi / Giudice-Grojean-Pomarol-Rattazzi form is `-α f⁴ sin²(h/f) + β f⁴ sin⁴(h/f)` with both α, β dimensionless. The f² → f⁴ correction is the minimal fix. Citation: Giudice-Grojean-Pomarol-Rattazzi 2007 "The Strongly-Interacting Light Higgs" *JHEP* 0706:045 (arXiv:hep-ph/0703164), §3.

where:

- <img src="https://i.upmath.me/svg/f%20%5Csim%201" alt="f \sim 1" /> TeV is the decay constant
- <img src="https://i.upmath.me/svg/%5Calpha%2C%20%5Cbeta" alt="\alpha, \beta" /> are dimensionless couplings
- <img src="https://i.upmath.me/svg/h" alt="h" /> is the Higgs field

**Bridge Equation 41: Swampland Distance Conjecture Equation**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the swampland distance-conjecture mass tower.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-41-swampland.ts`](../../src/bridges/equations/be-41-swampland.ts)

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

<img src="https://i.upmath.me/svg/%7C%5Cpsi%5Crangle_%7B%5Ctext%7Btotal%7D%7D%20%3D%20%5Calpha%7C%5Ctext%7Bsmooth%7D%5Crangle_%7B%5Ctext%7Bhorizon%7D%7D%20%2B%20%5Cbeta%7C%5Ctext%7Bfirewall%7D%5Crangle_%7B%5Ctext%7Bhorizon%7D%7D" alt="|\psi\rangle_{\text{total}} = \alpha|\text{smooth}\rangle_{\text{horizon}} + \beta|\text{firewall}\rangle_{\text{horizon}}" />

with observer-dependent state decomposition:
<img src="https://i.upmath.me/svg/%7C%5Calpha%7C%5E2%20%2B%20%7C%5Cbeta%7C%5E2%20%3D%201%2C%20%5Cquad%20%7C%5Calpha%7C%5E2%20%3D%20f(%5Ctext%7Bobserver%20location%7D%2C%20%5Ctext%7Bmeasurement%20protocol%7D)" alt="|\alpha|^2 + |\beta|^2 = 1, \quad |\alpha|^2 = f(\text{observer location}, \text{measurement protocol})" />

**Bridge Equation 43: ER=EPR Wormhole-Entropy Bound**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.PlanckArea.area_law`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/PlanckArea.lean) states k_B A/(4 ℓ_P²) = k_B c³ A/(4 G ℏ) for ℓ_P² = ℏ G/c³. The lemma is not ER=EPR.

- **Status**: **Speculative (canonical Bekenstein-Hawking bound, ER=EPR framing remains conjectural). Reformulated 2026-05-06.** The previous form `dℓ_wormhole/dt = -γ S_entanglement + δ ∫ T_μν u^μ u^ν dV` was structurally malformed (sign-backwards from the standard ER=EPR heuristic; entropy + stress-energy-integral cannot combine into length/time without unphysical coefficient roles for γ and δ). Replaced with the canonical **ER=EPR wormhole-entropy-bound form**: `S_entanglement ~ A_wormhole / (4 ℓ_P²)` — the Bekenstein-Hawking entropy bound (Bekenstein 1973 *Phys. Rev. D* 7:2333; Hawking 1975 *Commun. Math. Phys.* 43:199) applied to the minimal cross-section of an Einstein-Rosen bridge. Maldacena-Susskind 2013 (arXiv:1306.0533) states the canonical ER=EPR equivalence: "two distant black holes are connected through the interior via a wormhole, or Einstein-Rosen bridge...interpreted as maximally entangled states of two black holes that form a complex EPR pair." Stanford-Susskind 2014 *Phys. Rev. D* 90:126007 (arXiv:1406.2678, "Complexity and Shock Wave Geometries") develops complexity-volume duality on top; the companion Susskind-Zhao 2014 paper (arXiv:1408.2823, "Switchbacks and the Bridge to Nowhere") extends to switchback geometries. Status remains `speculative` because the ER=EPR conjecture itself remains conjectural outside the strict eternal-black-hole / thermofield-double AdS/CFT regime; the bound formula is canonical Bekenstein-Hawking, the framing is the speculative element. See `tests/bridges/be-43-reformulation.test.ts` for the reformulation pin.
- **Context**: Entanglement-wormhole equivalence: entanglement entropy bounded by wormhole cross-section area (ER=EPR canonical form)
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/S_%7B%5Ctext%7Bentanglement%7D%7D%20%5Csim%20%5Cfrac%7BA_%7B%5Ctext%7Bwormhole%7D%7D%7D%7B4%20%5Cell_P%5E2%7D" alt="S_{\text{entanglement}} \sim \frac{A_{\text{wormhole}}}{4 \ell_P^2}" />

where:

- <img src="https://i.upmath.me/svg/S_%7B%5Ctext%7Bentanglement%7D%7D%20%3D%20-%5Ctext%7BTr%7D(%5Crho_A%20%5Clog%20%5Crho_A)" alt="S_{\text{entanglement}} = -\text{Tr}(\rho_A \log \rho_A)" /> is the von Neumann entanglement entropy of the reduced density matrix
- <img src="https://i.upmath.me/svg/A_%7B%5Ctext%7Bwormhole%7D%7D" alt="A_{\text{wormhole}}" /> is the minimal cross-section area of the Einstein-Rosen bridge connecting the two entangled regions
- <img src="https://i.upmath.me/svg/%5Cell_P%20%3D%20%5Csqrt%7B%5Chbar%20G%2Fc%5E3%7D" alt="\ell_P = \sqrt{\hbar G/c^3}" /> is the Planck length
- The canonical Bekenstein-Hawking prefactor `1/(4 ℓ_P²)` is dimensionless / Planck-length squared, recovering `[area / area] = [dimensionless]` for `S` as expected

**Bridge Equation 44: Soft Hair on Black Holes**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the BMS soft charge at null infinity.

- **Status**: Speculative. Soft-hair-on-black-holes proposals (Hawking-Perry-Strominger 2016, arXiv:1601.00921) suggest that BMS supertranslation charges can store information that would otherwise be lost. Influential but unresolved within the black-hole information paradox literature; no experimental test is currently possible.
- **Context**: Infinite conservation laws on the horizon
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/Q_%7B%5Ctext%7Bsoft%7D%7D%5E%7B%5Cpm%7D%20%3D%20%5Cint_%7B%5Cmathcal%7BI%7D%5E%7B%5Cpm%7D%7D%20%5Cfrac%7B%5Cpartial%7D%7B%5Cpartial%20u%7D%20C_%7Bz%5Cbar%7Bz%7D%7D%20Y%5Ez%20dz%20%5Cwedge%20d%5Cbar%7Bz%7D" alt="Q_{\text{soft}}^{\pm} = \int_{\mathcal{I}^{\pm}} \frac{\partial}{\partial u} C_{z\bar{z}} Y^z dz \wedge d\bar{z}" />

where:

- <img src="https://i.upmath.me/svg/%5Cmathcal%7BI%7D%5E%7B%5Cpm%7D" alt="\mathcal{I}^{\pm}" /> are null infinity surfaces
- <img src="https://i.upmath.me/svg/C_%7Bz%5Cbar%7Bz%7D%7D" alt="C_{z\bar{z}}" /> is the **asymptotic shear** . The time-derivative `\partial_u C_{z\bar{z}}` that appears in the integrand IS the **Bondi news tensor** `N_{z\bar{z}}`; so the integrand is the news, while `C_{z\bar{z}}` alone denotes the shear
- <img src="https://i.upmath.me/svg/Y%5Ez" alt="Y^z" /> is a vector field on the sphere
- These charges parameterize the “soft hair” degrees of freedom

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

**Bridge Equation 46: Multiverse Measure Problem**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is a determined weighting factor for the multiverse measure.

- **Status**: Highly speculative. The multiverse measure problem is an unsolved fundamental issue in cosmology. Specific measure proposals are untestable without further theoretical development.
- **Context**: Probability distribution over universes
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/P%5BO%5D%20%3D%20%5Cint%20d%5Cmu%5Bg%2C%5Cphi%5D%20%2C%20W%5Bg%2C%5Cphi%5D%20%2C%20%5Cdelta(O%20-%20O%5Bg%2C%5Cphi%5D)" alt="P[O] = \int d\mu[g,\phi] , W[g,\phi] , \delta(O - O[g,\phi])" />

where:

- <img src="https://i.upmath.me/svg/%5Cmu%5Bg%2C%5Cphi%5D" alt="\mu[g,\phi]" /> is the field-theoretic measure
- <img src="https://i.upmath.me/svg/W%5Bg%2C%5Cphi%5D" alt="W[g,\phi]" /> is the weighting factor (e.g., scale factor cutoff, proper time cutoff)
- <img src="https://i.upmath.me/svg/O" alt="O" /> represents observable quantities
- The challenge is determining <img src="https://i.upmath.me/svg/W" alt="W" /> without reference class problems

**Bridge Equation 47: Big Bang Nucleosynthesis - Dark Sector Coupling**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the dark-sector transfer term in the light-element abundance equation.

> **AST encoding (Tier 5):** [`src/bridges/equations/be-47-bbn-dark-sector.ts`](../../src/bridges/equations/be-47-bbn-dark-sector.ts)

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

### Category O: Quantum Foundations

**Bridge Equation 48: Objective Collapse Equation (GRW extension)**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the GRW mass-amplified localization rate λ_GRW(m) = λ_0 (m/m_0).

- **Status**: Established (within GRW class). Ghirardi-Rimini-Weber-Pearle spontaneous collapse models (Ghirardi-Rimini-Weber 1986, Phys. Rev. D 34:470; CSL: Pearle 1989, Ghirardi-Pearle-Rimini 1990) propose modifications to the Schroedinger equation. **Note on rate:** the canonical GRW rate is `lambda ~ 1e-16 s^-1`; the value `1e-17 s^-1` previously written here corresponds to a specific CSL-variant bound. Current experimental bounds on the CSL collapse rate span roughly 1e-17 to 1e-8 s^-1 depending on coupling assumptions (see Bassi-Ghirardi 2003 review, Phys. Rep. 379:257, arXiv:quant-ph/0302164; Bassi et al. 2013 Rev. Mod. Phys. 85:471). The `sigma ~ 1e-7 m` localization length matches standard GRW.
- **Context**: Spontaneous wavefunction collapse
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7Bd%5Crho%7D%7Bdt%7D%20%3D%20-%5Cfrac%7Bi%7D%7B%5Chbar%7D%5BH%2C%5Crho%5D%20%2B%20%5Clambda%20%5Cint%20d%5E3x%20%5Cleft%5BL_x%20%5Crho%20L_x%5E%5Cdagger%20-%20%5Cfrac%7B1%7D%7B2%7D%5C%7BL_x%5E%5Cdagger%20L_x%2C%20%5Crho%5C%7D%5Cright%5D" alt="\frac{d\rho}{dt} = -\frac{i}{\hbar}[H,\rho] + \lambda \int d^3x \left[L_x \rho L_x^\dagger - \frac{1}{2}\{L_x^\dagger L_x, \rho\}\right]" />

where the localization operators are (3D Gaussian-resolved position projectors with the canonical GRW normalization):
<img src="https://i.upmath.me/svg/L_x%20%3D%20(%5Cpi%5Csigma%5E2)%5E%7B-3%2F4%7D%5Cexp%5Cleft%5B-%5Cfrac%7B(%5Chat%7B%5Cmathbf%7Br%7D%7D-%5Cmathbf%7Bx%7D)%5E2%7D%7B2%5Csigma%5E2%7D%5Cright%5D" alt="L_x = (\pi\sigma^2)^{-3/4}\exp\left[-\frac{(\hat{\mathbf{r}}-\mathbf{x})^2}{2\sigma^2}\right]" />

with collapse rate <img src="https://i.upmath.me/svg/%5Clambda%20%5Csim%2010%5E%7B-16%7D" alt="\lambda \sim 10^{-16}" /> s<img src="https://i.upmath.me/svg/%5E%7B-1%7D" alt="^{-1}" /> (canonical GRW value) and localization length <img src="https://i.upmath.me/svg/%5Csigma%20%5Csim%2010%5E%7B-7%7D" alt="\sigma \sim 10^{-7}" /> m.

> **Corrected on 2026-05-04 (R0 audit):** Added the missing `(πσ²)^{-3/4}` prefactor to `L_x`. The 3D Gaussian-resolved position projector requires this normalization to ensure `∫ d³x L_x† L_x = 1` (i.e. the localization-amplitude squared integrates to a dimensionless probability), which is the trace-preservation / probability-conservation condition for the GRW master equation; without it the d³x integral injects an unabsorbed `[L^3]` factor and the equation does not close dimensionally — `dρ/dt` would not have units of `[T^-1]` as required. Citation: Ghirardi-Rimini-Weber 1986, Phys. Rev. D 34:470 (original); Bassi-Ghirardi 2003, Phys. Rep. 379:257 (review, arXiv:quant-ph/0302164). The 1D analogue carries `(πσ²)^{-1/4}`; the cube-root power tracks the dimensionality of the position eigenspace. Status remains **Established** — this is a typesetting / transcription correction to a canonical formula, not a reformulation. Also rate updated `lambda ~ 1e-17 → 1e-16 s^-1` to match canonical GRW (the 1e-17 figure refers to a specific CSL bound and was unsourced here).

> **Corrected on 2026-09-24:** The encoded scalar is the mass-amplified rate `λ_GRW(m) = λ_0 · (m/m_0)`. It is the GRW (QMSL) centre-of-mass amplification `λ_macro = N λ_micro` (Bassi & Ghirardi 2003, §6.4), with `N = m/m_0` this repository's identification. In CSL the macroscopic rate is `γ D_0 n_out` instead (§8.3). The index entry's name and context credited the linear law to CSL, and now credit it to GRW.

**Bridge Equation 49: Quantum Darwinism Redundancy**

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the quantum-Darwinism redundancy relation for environmental fragments.

- **Status**: Speculative extension. Quantum Darwinism (Zurek 2009, Nat. Phys. 5:181) is established as an interpretational framework. The specific algebraic decay form `I(S:F_k) = I(S:E) − O(k^{-α})` is a phenomenological ansatz not derived from the Zurek formalism; the exponent α is a free parameter.
- **Context**: Classical reality from quantum substrate
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/I(S%3AF_k)%20%3D%20I(S%3AE)%20-%20%5Cmathcal%7BO%7D(k%5E%7B-%5Calpha%7D)" alt="I(S:F_k) = I(S:E) - \mathcal{O}(k^{-\alpha})" />

where:

- <img src="https://i.upmath.me/svg/I(S%3AF_k)" alt="I(S:F_k)" /> is mutual information between system <img src="https://i.upmath.me/svg/S" alt="S" /> and <img src="https://i.upmath.me/svg/k" alt="k" />-element fragment <img src="https://i.upmath.me/svg/F_k" alt="F_k" /> of environment <img src="https://i.upmath.me/svg/E" alt="E" />
- <img src="https://i.upmath.me/svg/%5Calpha%20%3E%200" alt="\alpha > 0" /> characterizes the decay of correlations
- For classical objectivity: <img src="https://i.upmath.me/svg/I(S%3AF_k)%20%5Capprox%20I(S%3AE)" alt="I(S:F_k) \approx I(S:E)" /> for sufficiently large <img src="https://i.upmath.me/svg/k" alt="k" />

**Bridge Equation 50: Retrocausal QFT (Wheeler-Feynman half-retarded-plus-half-advanced)**

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference. The row is unadjudicated, so `deriveEvidenceForVerdict` stays `proposed` and does not light `formally-proved`. [`PhysJS.TimeSymmetric.wheeler_feynman`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/TimeSymmetric.lean) states A = (A_ret + A_adv)/2. The id remains contested, and the lemma does not decide the contest. The lemma is not radiation reaction.

- **Status**: **Highly speculative (canonical Wheeler-Feynman form, untested absorber boundary condition in QFT). Reformulated 2026-05-06.** The previous form `S = ∫d⁴x [L_forward(φ_+) + L_backward(φ_-) + λφ_+ φ_- δ⁴(x − x_m)]` was variationally ill-posed at the δ⁴ single-point interaction (δ-function source terms in equations of motion are not finite-action solutions; boundary conditions for the backward-evolving sector were unspecified). Replaced with the canonical **Wheeler-Feynman 1945 absorber-theory form**: the gauge field expressed as the half-retarded-plus-half-advanced symmetric sum `A_μ(x) = (1/2)[A_μ^ret(x) + A_μ^adv(x)]`; the action is then standard Maxwell + matter + interaction with this gauge-field expression. The retrocausal claim is that the **absorber boundary condition** — every emitted radiation is absorbed somewhere in the universe — makes the half-retarded-plus-half-advanced symmetric form physically equivalent to standard retarded-only Maxwell, per Wheeler & Feynman's original argument. Status remains `highly-speculative` because the absorber boundary condition is empirically untested in QFT (works in classical electrodynamics under cosmological total absorption, but its quantum-field-theoretic extension is conjectural). Cramer 1986 *Rev. Mod. Phys.* 58:647 transactional interpretation is the canonical modern lineage; it remains a minority interpretation. The W-F form itself is rigorously defined, hence the reformulation lifts BE-50 from R3-invalid to highly-speculative. See `tests/bridges/be-50-reformulation.test.ts` for the reformulation pin.
- **Context**: Time-symmetric formulation: half-retarded-plus-half-advanced gauge field with absorber boundary condition (Wheeler-Feynman 1945)
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/A_%5Cmu(x)%20%3D%20%5Cfrac%7B1%7D%7B2%7D%20%5Cleft%5B%20A_%5Cmu%5E%7B%5Ctext%7Bret%7D%7D(x)%20%2B%20A_%5Cmu%5E%7B%5Ctext%7Badv%7D%7D(x)%20%5Cright%5D" alt="A_\mu(x) = \frac{1}{2} \left[ A_\mu^{\text{ret}}(x) + A_\mu^{\text{adv}}(x) \right]" />

where:

- <img src="https://i.upmath.me/svg/A_%5Cmu%5E%7B%5Ctext%7Bret%7D%7D" alt="A_\mu^{\text{ret}}" /> is the retarded solution to the Maxwell equations (sources in the past light-cone)
- <img src="https://i.upmath.me/svg/A_%5Cmu%5E%7B%5Ctext%7Badv%7D%7D" alt="A_\mu^{\text{adv}}" /> is the advanced solution to the Maxwell equations (sources in the future light-cone)
- The full action is then standard Maxwell + matter + interaction with this gauge-field expression: `S_total = ∫(L_matter + L_interaction) d⁴x`, with `L_interaction = j^μ A_μ` using the half-retarded-plus-half-advanced `A_μ` above
- The absorber boundary condition (every emitted radiation is absorbed somewhere) makes this physically equivalent to standard retarded-only Maxwell in classical electrodynamics; the QFT extension that UPT proposes (per Cramer 1986 transactional interpretation lineage) is the highly-speculative element

## V-B. Post-Original-Spec Catalog Extensions (BE-51–54)

> **Provenance.** BE-51/52 were added in v0.4.0 as GR-foundation bridges (closed-form evaluators with geodesic cross-validation); BE-53/54 were added in the v0.7 BE-X re-encoding sprint (structural AST encodings via `BetaFunctionNode` and `FriedmannEquationNode`). This section was added 2026-06-10 to bring the formal spec catalog into one-to-one correspondence with the shipped codebase catalog (`src/bridges/index.ts`). Entries follow the §V house format; the codebase entry remains authoritative for `notes` / `known_issues` drift.

**Bridge Equation 51: Gravitational Lensing — Eddington 1919 weak-field deflection** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Deflection.line_integral`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Deflection.lean) states that the given integrand integrates to 4GM/(b c²) at γ = 1. The lemma is not a geodesic.

> **Evaluator:** [`src/bridges/gravitational-lensing.ts`](../../src/bridges/gravitational-lensing.ts) (`evaluateGravitationalLensing`)

- **Status**: Established. Deflection of light by a point mass under the weak-field (post-Newtonian) approximation. Eddington's 1919 eclipse expedition confirmed GR's prediction of ~1.75 arcsec for a grazing solar ray — double the Newtonian value — to within the measurement precision of the time (Dyson, Eddington & Davidson 1920 *Phil. Trans. R. Soc.* A 220:291; Einstein 1915 *Preuss. Akad. Wiss.* 844; Carroll 2004 *Spacetime and Geometry* §8.5; Will 2014 *Living Rev. Relativity* 17:4, arXiv:1403.7377).
- **Context**: Bridges Newtonian gravity ↔ general relativity; first observational confirmation of spacetime curvature by mass
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Calpha%20%3D%20%5Cfrac%7B4%20G%20M%7D%7Bb%20c%5E2%7D" alt="\alpha = \frac{4 G M}{b c^2}" />

where:

- <img src="https://i.upmath.me/svg/%5Calpha" alt="\alpha" /> is the deflection angle (radians)
- <img src="https://i.upmath.me/svg/M" alt="M" /> is the deflecting point mass, <img src="https://i.upmath.me/svg/b" alt="b" /> the impact parameter
- Domain: `b > 0`; weak-field regime `b ≫ r_s = 2GM/c²`

**Dimensions**: `[α] = [1]` (dimensionless — `GM/(bc²)` cancels exactly). Solar grazing validation: α ≈ 8.49×10⁻⁶ rad ≈ 1.75 arcsec; geodesic cross-validation (null RK4, 200k steps) passes to ±1e-4 relative error.

**Rationale**: The factor-of-2 excess over the Newtonian half-deflection is the cleanest closed-form discriminator between curved-spacetime and flat-space-plus-force descriptions of gravity.

**Bridge Equation 52: Mercury Perihelion Precession — Einstein 1915 closed-form** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. The missing piece is the Einstein 1915 perihelion advance Δφ = 6πGM/(a(1 − e²)c²).

> **Evaluator:** [`src/bridges/perihelion-precession.ts`](../../src/bridges/perihelion-precession.ts) (`evaluatePerihelionPrecession`)

- **Status**: Established. GR prediction of anomalous perihelion advance per orbit. Einstein's 1915 calculation reproduced Mercury's observed ~43 arcsec/century excess precession (beyond Newtonian + planetary perturbations) — the first successful quantitative GR test, predating the 1919 eclipse expedition (Einstein 1915 *Preuss. Akad. Wiss.* 831; Le Verrier 1859; Carroll 2004 *Spacetime and Geometry* §7.4; Will 2014 *Living Rev. Relativity* 17:4, arXiv:1403.7377).
- **Context**: Bridges Newtonian gravity ↔ general relativity; bound-orbit (timelike geodesic) counterpart to BE-51's null-geodesic test
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5CDelta%5Cvarphi%20%3D%20%5Cfrac%7B6%5Cpi%20G%20M%7D%7Ba(1-e%5E2)c%5E2%7D" alt="\Delta\varphi = \frac{6\pi G M}{a(1-e^2)c^2}" />

where:

- <img src="https://i.upmath.me/svg/%5CDelta%5Cvarphi" alt="\Delta\varphi" /> is the perihelion advance per orbit (radians)
- <img src="https://i.upmath.me/svg/a" alt="a" /> is the semi-major axis, <img src="https://i.upmath.me/svg/e" alt="e" /> the eccentricity
- Domain: `0 ≤ e < 1`, `a > 0` (bound elliptical orbits only)

**Dimensions**: `[Δφ] = [1]` (dimensionless — `GM/(ac²)` cancels exactly). Mercury validation: ~43.0 arcsec/century within 0.5 arcsec; v0.5.0 GL4 geodesic cross-validation to relErr 1.77×10⁻⁷.

**Rationale**: Anchors the catalog's GR sector with a precision-validated timelike-geodesic observable; serves as the calibration bridge for the geodesic-integrator pipeline (Part-IX C-series).

**Bridge Equation 53: Yang-Mills One-Loop β-Function (Asymptotic Freedom)** *(Category L: Quantum Field Theory Extensions)*

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.YangMills.b0_pos_iff_nf_le`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/YangMills.lean) states that b₀ > 0 if and only if N_f ≤ 16 for SU(3). Nested [`PhysJS.YangMills.alphaRun_hasDerivAt`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/YangMills.lean) is the one-loop solution and is not the reference. The lemma is not a running procedure past one loop.

> **AST encoding:** [`src/bridges/equations/be-53-yang-mills-beta.ts`](../../src/bridges/equations/be-53-yang-mills-beta.ts) (`BetaFunctionNode`, single-coupling form)

- **Status**: Established. One-loop renormalization-group running of the non-Abelian gauge coupling in Yang-Mills theory; Nobel Prize in Physics 2004 (Gross & Wilczek 1973 *Phys. Rev. Lett.* 30:1343; Politzer 1973 *Phys. Rev. Lett.* 30:1346; Peskin & Schroeder 1995 §16).
- **Context**: Bridges quantum ↔ classical regimes via RG flow; structural dual of BE-39's asymptotic-safety NGFP — BE-53's UV fixed point sits at `g* = 0` (asymptotic freedom) rather than at a non-Gaussian point, demonstrating that the `BetaFunctionNode` primitive is flow-direction-agnostic
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cbeta(g)%20%3D%20-%5Cfrac%7Bb_0%20g%5E3%7D%7B16%5Cpi%5E2%7D%20%2B%20O(g%5E5)%2C%20%5Cquad%20b_0%20%3D%20%5Cfrac%7B11%7D%7B3%7DC_2(G)%20-%20%5Cfrac%7B4%7D%7B3%7DT(R)N_f" alt="\beta(g) = -\frac{b_0 g^3}{16\pi^2} + O(g^5), \quad b_0 = \frac{11}{3}C_2(G) - \frac{4}{3}T(R)N_f" />

where:

- <img src="https://i.upmath.me/svg/C_2(G)" alt="C_2(G)" /> is the adjoint Casimir (`N_c` for SU(N_c)); <img src="https://i.upmath.me/svg/T(R)%20%3D%201%2F2" alt="T(R) = 1/2" /> for fundamental Dirac flavors, giving `b₀ = (11/3)N_c − (2/3)N_f`
- `b₀ > 0` ⇒ asymptotic freedom (coupling → 0 in the UV)
- Pinned values: QCD (SU(3), N_f = 6) `b₀ = 7`; pure SU(3) `b₀ = 11`; asymptotic-freedom boundary `N_f = (11/2)N_c ≈ 16.5` for SU(3)

**Dimensions**: `[β] = [1]` (dimensionless — `β(g) = k ∂_k g` is the derivative of a dimensionless coupling with respect to `log k`; same signature as BE-39).

**Rationale**: Completes the RG-flow sector begun by BE-39 with an `established`-status anchor, pinning the catalog's β-function machinery to a Nobel-validated result.

**Bridge Equation 54: Randall-Sundrum Brane Cosmology (Modified Friedmann)** *(Category E: Cosmological-Quantum Bridges)*

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.RandallSundrum.brane_friedmann`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/RandallSundrum.lean) states H² = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3 for σ ≠ 0. The equality is not derived from the five-dimensional Einstein equation. Nested [`PhysJS.RandallSundrum.flat_friedmann`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/RandallSundrum.lean) is not the reference.

> **AST encoding:** [`src/bridges/equations/be-54-randall-sundrum-brane.ts`](../../src/bridges/equations/be-54-randall-sundrum-brane.ts) (`FriedmannEquationNode`, `variant: 'brane'`)

- **Status**: Speculative. Real, self-consistent extra-dimensional framework (RS II single-brane model), but experimentally unconstrained (Randall-Sundrum 1999 *Phys. Rev. Lett.* 83:4690, arXiv:hep-ph/9905221; Binétruy-Deffayet-Ellwanger-Langlois 2000 *Phys. Lett.* B 477:285, arXiv:hep-th/9910219; Maartens-Koyama 2010 *Living Rev. Relativity* 13:5, arXiv:1004.3962).
- **Context**: Bridges quantum ↔ cosmological regimes: the brane tension `σ` is set by the 5D Planck/AdS scale, so the high-density correction is a quantum-gravity effect on classical cosmology — the same Category-E framing as BE-19 (LQC) and BE-20 (vacuum energy)
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/H%5E2%20%3D%20%5Cfrac%7B8%5Cpi%20G%7D%7B3%7D%20%5Crho%20%5Cleft(1%20%2B%20%5Cfrac%7B%5Crho%7D%7B2%5Csigma%7D%5Cright)%20%2B%20%5Cfrac%7B%5CLambda%7D%7B3%7D" alt="H^2 = \frac{8\pi G}{3} \rho \left(1 + \frac{\rho}{2\sigma}\right) + \frac{\Lambda}{3}" />

where:

- <img src="https://i.upmath.me/svg/%5Csigma" alt="\sigma" /> is the brane tension; the correction factor `(1 + ρ/(2σ))` is dimensionless (`ρ/σ` cancels `[M L⁻³]`)
- At `ρ ≪ σ` the equation reduces to classical Friedmann; correction = 3/2 at `ρ = σ`, = 2 at `ρ = 2σ`
- `H² ≥ 0` always (unlike LQC's bounce form, which can vanish)

**Dimensions**: `[H²] = [T]⁻²` (same signature as BE-19's Friedmann variants).

**Rationale**: Exercises the `FriedmannEquationNode` `'brane'` variant slot, giving the catalog a second early-universe high-density correction structurally distinct from LQC (BE-19) and vacuum energy (BE-20).

## V-C. Catalog extensions (BE-55–76)

> **Provenance.** These eleven rows were added to `BRIDGE_EQUATIONS` on 2026-07-05 as closed-form evaluators, the same pattern as BE-51/52: a catalog entry plus an evaluator, and no AST round-trip. BE-55–58 are the first four. BE-59–62 are the condensed-matter cluster. BE-63–65 are the astrophysics cluster. Each row keeps `source_part: 'III'`. This section is the Bridge Equation heading. The catalog entry remains authoritative for `notes`. A bare `e` in the formulas below is the elementary charge. Euler's number is written `\exp`. §VI.6.1 assigns each of these ids the tensor index of its catalog category. The map is [`src/bridges/tensor-index.ts`](../../src/bridges/tensor-index.ts). PhysJS at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`, `NOTES.md`, and `docs/planning/Bridge-Gap-Inference.md` still do not state an index; the assignment is this specification applying the category cluster already used for ids 11–50.

**Bridge Equation 55: Integer Quantum Hall effect / TKNN (topological Hall conductance)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.QuantumHall.reciprocal`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/QuantumHall.lean) states that for a nonzero integer `C` and `e ≠ 0`, `σ_xy = C e²/h`, `R_H = h/(C e²)`, and `R_K = h/e²`, so `σ_xy R_H = 1` and `R_H = R_K/C`. The shifted index `C+1` is a different conductance. Replacing `e²` by `e` fails the product when `e ≠ 1`. The lemma is not TKNN.

> **Evaluator:** [`src/bridges/be55-quantum-hall.ts`](../../src/bridges/be55-quantum-hall.ts) (`evaluateQuantumHall`)

- **Status**: Established. The Hall conductance of a two-dimensional electron gas in a strong magnetic field is quantized in integer multiples of `e²/h`. `C` is the TKNN/Chern integer of the filled bands (Thouless, Kohmoto, Nightingale & den Nijs 1982). von Klitzing, Dorda & Pepper 1980 (Nobel Prize 1985). The catalog records the quantization as the derivation's result.
- **Context**: Bridges a topological invariant to an electrical-transport observable, and populates the catalog's Topology axis. The bridges tuple is `quantum` → `classical`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Csigma_%7Bxy%7D%20%3D%20C%20%5Cfrac%7Be%5E2%7D%7Bh%7D%2C%20%5Cquad%20R_H%20%3D%20%5Cfrac%7BR_K%7D%7BC%7D%2C%20%5Cquad%20R_K%20%3D%20%5Cfrac%7Bh%7D%7Be%5E2%7D" alt="\sigma_{xy} = C \frac{e^2}{h}, \quad R_H = \frac{R_K}{C}, \quad R_K = \frac{h}{e^2}" />

where:

- `σ_xy` is the Hall conductance, in siemens
- `C` is a nonzero integer, the plateau index
- `e` is the elementary charge, in coulombs, and `h` is Planck's constant, in joule-seconds
- `R_H` is the Hall resistance, in ohms, and `R_K = h/e²` is the von Klitzing constant. The catalog context states `R_K ≈ 25812.807 Ω`

**Dimensions**: The catalog signature is `[L^-2 M^-1 T^3 I^2]`. Charge has dimension `[I T]` and `h` has dimension `[M L^2 T^-1]`, so `e²/h` has dimension `[I^2 T^3 M^-1 L^-2]`. `C` is dimensionless. `R_H` is the reciprocal of `σ_xy`. The catalog comment records that `σ_xy = C e²/h` has the same form in Gaussian units, and that the ohm and siemens values on this row are the SI reading.

**Domain**: The evaluator accepts a nonzero integer `C` and rejects every other `C`. Post-2019, `R_K = h/e²` is exact in the SI, so a comparison of `R_H` with `h/(C e²)` does not test the formula. The catalog confrontation is material-independence: Janssen et al. 2012 report graphene and GaAs agreeing to a relative `8.6×10⁻¹¹`.

**References**:

- von Klitzing, Dorda & Pepper 1980 *Phys. Rev. Lett.* 45:494.
- Thouless, Kohmoto, Nightingale & den Nijs 1982 *Phys. Rev. Lett.* 49:405.
- Janssen et al. 2012 *Metrologia* 49:294, arXiv:1105.4055.

**Rationale**: The integer in the conductance is a Chern number of the filled bands, and the same constant is measured in different materials.

**Bridge Equation 56: Casimir effect (quantum-vacuum force between plates)** *(Category A: Quantum-Classical Bridges)*

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. PhysJS main at that commit has no Casimir file. The missing piece is the mode sum that produces `π²/240`. Units give `F/A = C ℏ c / d⁴` and do not fix `C = −π²/240`. That unfixed constant is not a Lean derivation-step at this pin.

> **Evaluator:** [`src/bridges/be56-casimir.ts`](../../src/bridges/be56-casimir.ts) (`evaluateCasimir`)

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

> **Evaluator:** [`src/bridges/be57-unruh.ts`](../../src/bridges/be57-unruh.ts) (`evaluateUnruh`)

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

> **Evaluator:** [`src/bridges/be58-johnson-nyquist.ts`](../../src/bridges/be58-johnson-nyquist.ts) (`evaluateJohnsonNyquist`)

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

**Bridge Equation 59: AC Josephson effect (quantum voltage standard)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.Josephson.frequency_eq`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Josephson.lean) states `f = (2e/h) V`, `K_J = 2e/h`, and `f = K_J V`. Clearing `h` recovers `2e`. The factor 2 is the Cooper-pair charge, taken as a premise. Replacing `2e` by `e` fails. The lemma is not the tunneling Hamiltonian.

> **Evaluator:** [`src/bridges/be59-ac-josephson.ts`](../../src/bridges/be59-ac-josephson.ts) (`evaluateACJosephson`)

- **Status**: Established. A Josephson junction biased at a DC voltage `V` emits radiation at `f = K_J V`. Josephson 1962 (Nobel Prize 1973). The catalog comment records that the 1962 letter was not read (paywalled) and that the 1973 Nobel Lecture states the phase relation and a frequency `2eV/h`. Shapiro 1963 measured the constant-voltage steps. With BE-55 and BE-58 this entry is the catalog's quantum metrology triangle. The confrontation is universality of the Josephson volt, and is not a test of the post-2019 value of `K_J`. The catalog notes state that scale as about `1×10⁻¹⁰`. The confrontation file records a conservative bound of `1×10⁻⁹` and says the best comparisons reach about `1×10⁻¹⁰` to `1×10⁻¹¹`.
- **Context**: Bridges a macroscopic phase of a Cooper-pair condensate to a frequency. The bridges tuple is `quantum` → `classical`. The catalog dependencies are BE-55 and BE-58.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/f%20%3D%20%5Cfrac%7B2e%7D%7Bh%7D%20V%2C%20%5Cquad%20K_J%20%3D%20%5Cfrac%7B2e%7D%7Bh%7D" alt="f = \frac{2e}{h} V, \quad K_J = \frac{2e}{h}" />

where:

- `f` is the emitted frequency, in hertz
- `V` is the DC bias, in volts
- `e` is the elementary charge and `h` is Planck's constant
- `K_J = 2e/h` is the Josephson constant, in hertz per volt. The catalog context states `483597.8484 GHz/V` to 10 significant figures. The catalog comment states that this is the exact quotient `2e/h` rounded, and that the SI Brochure states the abrogated conventional value `K_{J-90}` and does not state `K_J = 2e/h`

**Dimensions**: The catalog signature is `[frequency]`. The product of charge and voltage is energy, and energy divided by `h` (action) is a frequency. The factor 2 is dimensionless.

**Domain**: The evaluator requires a finite `V`. The sign of `V` is not restricted. The tunneling Hamiltonian is outside the lemma.

**References**:

- Josephson 1962 *Phys. Lett.* 1:251. The catalog records this paper as unread.
- Shapiro 1963 *Phys. Rev. Lett.* 11:80.
- Kautz 1996 *Rep. Prog. Phys.* 59:935.

**Rationale**: The pair charge `2e` converts a DC voltage into a frequency, which is the quantum standard of the volt.

**Bridge Equation 60: Fractional Quantum Hall effect (Laughlin ν=1/3)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.Laughlin.filling_fraction`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Laughlin.lean) states that for nonzero integers `p` and `q`, with `ν = p/q`, `σ_xy = ν e²/h` and `R_xy = R_K/ν = (q/p) h/e²`. The charge and `h` are not assumed nonzero. Oddness of `q` is the Laughlin selection rule and is not this identity. The lemma is not the Laughlin wavefunction, and it is not the quasiparticle charge `e/3`.

> **Evaluator:** [`src/bridges/be60-fractional-qh.ts`](../../src/bridges/be60-fractional-qh.ts) (`evaluateFractionalQH`)

- **Status**: Established. At filling `ν = p/q` the Hall conductance is `ν e²/h`. Tsui, Störmer & Gossard 1982 (Nobel Prize 1998) measured the fractional plateaux. Laughlin 1983 described the incompressible fluid. de-Picciotto et al. 1997 measured the quasiparticle charge `e/3` by shot noise. The catalog says the empirical content of the confrontation is the fraction, `R_xy = 3 R_K` at `ν = 1/3`, and not the post-2019 value of `R_K`.
- **Context**: Bridges a fractional filling of a correlated electron liquid to a Hall conductance. The integer effect is BE-55. The bridges tuple is `quantum` → `classical`. The catalog dependency is BE-55. At `ν = 1` the formula is the integer plateau `C = 1`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Csigma_%7Bxy%7D%20%3D%20%5Cnu%20%5Cfrac%7Be%5E2%7D%7Bh%7D%2C%20%5Cquad%20R_%7Bxy%7D%20%3D%20%5Cfrac%7BR_K%7D%7B%5Cnu%7D%20%3D%20%5Cfrac%7Bq%7D%7Bp%7D%5Cfrac%7Bh%7D%7Be%5E2%7D" alt="\sigma_{xy} = \nu \frac{e^2}{h}, \quad R_{xy} = \frac{R_K}{\nu} = \frac{q}{p}\frac{h}{e^2}" />

where:

- `ν = p/q` is the filling fraction. The catalog context states `q` odd for the Laughlin sequence. The Lean identity does not use that oddness
- `σ_xy` is the Hall conductance, in siemens, and `R_xy` is the Hall resistance, in ohms
- `e` is the elementary charge, `h` is Planck's constant, and `R_K = h/e²` is the von Klitzing constant of BE-55

**Dimensions**: The catalog signature is `[L^-2 M^-1 T^3 I^2]`, the same conductance signature as BE-55. `ν` is dimensionless, so `ν e²/h` has the dimension of `e²/h`.

**Domain**: The evaluator requires a finite `ν > 0`. It does not require `ν` to be a ratio of integers, and it does not require `q` odd. The wavefunction and the charge `e/3` are outside the lemma. The catalog, PhysJS, `NOTES.md`, and the gap list do not state a measured resistance in ohms for the `ν = 1/3` plateau beyond `R_xy = 3 R_K`.

**References**:

- Tsui, Störmer & Gossard 1982 *Phys. Rev. Lett.* 48:1559.
- Laughlin 1983 *Phys. Rev. Lett.* 50:1395.
- de-Picciotto et al. 1997 *Nature* 389:162.

**Rationale**: A rational filling fixes the Hall conductance in units of `e²/h`. The fraction `1/3` is the principal Laughlin state named in the catalog.

**Bridge Equation 61: Wiedemann-Franz law (Lorenz number)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-01.** Kind is `derivation-step`. [`PhysJS.Sommerfeld.integral_eq`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Sommerfeld.lean) states that `∫_ℝ x² exp(x) / (1 + exp(x))² dx = π²/3`. The integrand is even, so the integral over the positive half-line is half of `π²/3`. Claiming the half-line equals `π²/3` fails. The lemma is not the transport law that identifies the Lorenz number with that integral. Units give `L = C (k_B/e)²` and do not give `C = π²/3`.

> **Evaluator:** [`src/bridges/be61-wiedemann-franz.ts`](../../src/bridges/be61-wiedemann-franz.ts) (`evaluateWiedemannFranz`)

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

**Bridge Equation 62: BCS gap ratio (weak-coupling superconductivity)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-01.** There is no PhysJS formalRef for this catalog id at pin `2e09357f9674bc60b60b378155a1623c27dc7b04`. PhysJS main at that commit has no BCS file. The missing piece is the weak-coupling gap equation whose root is `2π exp(−γ)`. The decimal `3.528` is that root. The ratio is dimensionless, and units do not choose it. That number is not a Lean derivation-step at this pin.

> **Evaluator:** [`src/bridges/be62-bcs-gap.ts`](../../src/bridges/be62-bcs-gap.ts) (`evaluateBCSGap`)

- **Status**: Established, as a weak-coupling consistency statement. BCS theory predicts `2Δ(0)/(k_B T_c) = 2π exp(−γ)`, with `γ` the Euler–Mascheroni constant, and `Δ(0) = 1.764 k_B T_c`. Bardeen, Cooper & Schrieffer 1957 (Nobel Prize 1972). The catalog `formula_latex` writes the Euler factor as `e^{γ}` in the denominator. In this specification that factor is `\exp(−γ)`, and `e` remains the elementary charge. The module computes `(2π) / exp(γ)`. The confrontation compares the weak-coupling class (tin near `3.5`, aluminium near `3.4`, agreement bound `0.05`) with the ideal ratio. Carbotte 1990 records lead near `4.3` in strong coupling. The catalog notes say the statistics tag was removed. `NOTES.md` records a printed difference of `−0.787%` for the consistency record.
- **Context**: Bridges the zero-temperature gap to the critical temperature. The bridges tuple is `quantum` → `classical`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7B2%5CDelta%280%29%7D%7Bk_B%20T_c%7D%20%3D%202%5Cpi%5Cexp%28-%5Cgamma%29%20%5Capprox%203.528" alt="\frac{2\Delta(0)}{k_B T_c} = 2\pi\exp(-\gamma) \approx 3.528" />

where:

- `Δ(0)` is the superconducting gap at zero temperature, in joules
- `T_c` is the critical temperature, in kelvin
- `k_B` is Boltzmann's constant
- `γ` is the Euler–Mascheroni constant. The module stores `0.5772156649015329`
- `3.528` is the catalog's rounding of `2π exp(−γ)`. The gap list records the unrounded value as about `3.52775`

**Dimensions**: The displayed ratio is dimensionless. The catalog signature is `[energy]`, the dimension of `Δ(0)`. The evaluator returns `Δ(0) = (ratio/2) k_B T_c`, which is an energy. A seven-base expansion of that energy beyond the catalog word `[energy]` is the energy dimension of `k_B T_c`.

**Domain**: The evaluator requires finite `T_c ≥ 0`. The ratio is the weak-coupling limit. The catalog states the measured range of conventional superconductors as about `3.5` to `5` in the notes, and the confrontation provenance states aluminium near `3.4` through lead near `4.3`. The gap-equation integral that produces `exp(−γ)` is not in PhysJS.

**References**:

- Bardeen, Cooper & Schrieffer 1957 *Phys. Rev.* 108:1175.
- Tinkham 1996 *Introduction to Superconductivity*, 2nd ed., §3.4.
- Carbotte 1990 *Rev. Mod. Phys.* 62:1027.

**Rationale**: Weak-coupling BCS theory fixes the gap and the critical temperature as one dimensionless ratio.

**Bridge Equation 63: Chandrasekhar mass (white-dwarf degeneracy limit)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-01.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.Chandrasekhar.prefactor`](https://github.com/danielsimonjr/PhysJS/blob/2e09357f9674bc60b60b378155a1623c27dc7b04/PhysJS/Chandrasekhar.lean) states that with `n = ρ/(μ_e m_u)`, `p_F = ℏ (3π² n)^{1/3}`, and `P = (1/4) n p_F c`, the pressure is `P = K_ρ ρ^{4/3}`, and for the `n = 3` Lane–Emden scale the central density cancels, leaving `M = (ω₃⁰ √(3π)/2) (ℏ c/G)^{3/2} (μ_e m_u)^{−2}`. `ω₃⁰` stays symbolic. The decimal `2.01824` is not in the theorem. `√π/2` in place of `√(3π)/2` fails when `ω₃⁰ ≠ 0`, and dropping `ω₃⁰` fails when `ω₃⁰ ≠ 1`. The lemma is not stellar rotation or magnetic support.

> **Evaluator:** [`src/bridges/be63-chandrasekhar-mass.ts`](../../src/bridges/be63-chandrasekhar-mass.ts) (`evaluateChandrasekharMass`)

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

> **Evaluator:** [`src/bridges/be64-eddington-luminosity.ts`](../../src/bridges/be64-eddington-luminosity.ts) (`evaluateEddingtonLuminosity`)

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

> **Evaluator:** [`src/bridges/be65-jeans-mass.ts`](../../src/bridges/be65-jeans-mass.ts) (`evaluateJeansMass`)

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

**Bridge Equation 66: Radiation pressure (opaque surface)** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-03.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.RadiationPressure.pressure_eq`](https://github.com/danielsimonjr/PhysJS/blob/d917fa328039d19c3659f74ea73569effb3ed4fb/PhysJS/RadiationPressure.lean) states `P_n = (I/c)(1+R) cos²θ`. `R = 0`, `θ = 0` is `I/c` and `R = 1`, `θ = 0` is `2I/c`. A single cosine is not that pressure when `cos θ` is neither 0 nor 1. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. Buckingham on `{P, I, c}` still leaves `C = f(1,1)` unfixed; the theorem is the opaque split, not that monomial. The lemma is not the Maxwell stress tensor and not the Eddington luminosity. [`PhysJS.Eddington.wrong_dictionary_factor_two`](https://github.com/danielsimonjr/PhysJS/blob/d917fa328039d19c3659f74ea73569effb3ed4fb/PhysJS/Eddington.lean) doubles a luminosity. That factor of 2 is not the mirror factor.

> **Evaluator:** [`src/bridges/be66-radiation-pressure.ts`](../../src/bridges/be66-radiation-pressure.ts) (`evaluateRadiationPressure`)

- **Status**: Established as a textbook beam-pressure law. The edge confidence stays `established`. The catalog equation is `P_n = (I/c)(1+R) cos²θ`. `R = 0` and `θ = 0` is `I/c`. `R = 1` and `θ = 0` is `2I/c`.
- **Context**: Bridges an optical intensity to a continuum pressure. The bridges tuple is `optics` → `continuum`. Category D selects the field-unification component. The tuple does not. BE-64's encoded force uses factor 1. This row is not the Eddington luminosity.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/P_n%20%3D%20%5Cfrac%7BI%7D%7Bc%7D%281%2BR%29%5Ccos%5E2%5Ctheta" alt="P_n = \frac{I}{c}(1+R)\cos^2\theta" />

where:

- `P_n` is the time-averaged normal pressure, in pascals
- `I` is the intensity, in watts per square metre
- `c` is the speed of light
- `R` is the intensity reflectance, with transmission taken to be zero
- `θ` is the angle between the propagation direction and the outward normal
- the display is this catalog's assembly of the normal-incidence factor `(1+R)` with the oblique factor `cos²θ`. It is not a quotation of one source

**Dimensions**: The catalog signature is `[L^-1 M T^-2]`. Intensity has dimension `[M T^-3]`. Dividing by `c` leaves pressure. `R` and `cos θ` are dimensionless. Buckingham on `{P, I, c}` has the unique monomial `P ∝ I c^{-1}` and does not fix the constant.

**Domain**: The evaluator requires `I ≥ 0`, `R` on `[0, 1]`, and a finite `θ`. The regime is a time average of a plane wave on an opaque surface. Diffuse reflection, thermal emission, and a transmitting film are outside the statement.

**References**:

- OpenStax University Physics Volume 2, section "16.5: Momentum and Radiation Pressure" (LibreTexts). Absorber `I/c`, perfect reflector at normal incidence `2I/c`. The dogfood cites §16.4. The section numbers are not reconciled.
- Simo and McInnes, AAS 16-483 (2016). Their `P` is already a pressure.

**Rationale**: The momentum flux of a beam is `I/c`. A perfect absorber takes that flux. A perfect reflector at normal incidence reverses it. An opaque surface at angle `θ` takes the product of those factors.

**Bridge Equation 67: Alfvén speed (ideal MHD)** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-03.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.AlfvenSpeed.speed_eq`](https://github.com/danielsimonjr/PhysJS/blob/d917fa328039d19c3659f74ea73569effb3ed4fb/PhysJS/AlfvenSpeed.lean) states that one transverse monochromatic polarization along a uniform field has phase speed `|ω/k| = B/√(μ0 ρ)` for `B > 0`, `μ0 > 0`, `ρ > 0`, and `k ≠ 0`. `ρ` is the total mass density. Proton-only `n m_p` is a different density when electrons contribute. Inserting tesla and the SI density into `B/√(4πρ)` is not the SI speed. A factor `C ≠ 1` is not the catalog speed. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The lemma is not a kinetic dispersion relation.

> **Evaluator:** [`src/bridges/be67-alfven-speed.ts`](../../src/bridges/be67-alfven-speed.ts) (`evaluateAlfvenSpeed`, `alfvenProtonOnlyDensity`)

- **Status**: Established as the ideal-MHD phase speed. The edge confidence stays `established`. The default density is the total mass density.
- **Context**: Bridges a fluid mass density to a plasma wave speed. The bridges tuple is `fluid` → `plasma`. Category D selects the field-unification component. `CE-plasma-frequency` is not this speed.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/v_A%20%3D%20%5Cfrac%7BB%7D%7B%5Csqrt%7B%5Cmu_0%20%5Crho%7D%7D" alt="v_A = \frac{B}{\sqrt{\mu_0 \rho}}" />

where:

- `v_A` is the speed, in metres per second, along `B`
- `B` is the magnetic flux density, in tesla
- `μ0` is the vacuum permeability
- `ρ` is the total mass density, in kilograms per cubic metre. `alfvenProtonOnlyDensity` returns `n m_p` for the named special case

**Dimensions**: The catalog signature is `[velocity]`. `B` has dimension `[M T^-2 I^-1]`, `μ0` has dimension `[M L T^-2 I^-2]`, and `ρ` has dimension `[M L^-3]`. `B / √(μ0 ρ)` is a velocity. The pure number `C` is unfixed by that cancellation.

**Domain**: The evaluator requires `B ≥ 0` and `ρ > 0`. `ρ` is a mass density. A number density in that slot is refused by the proton-only control: it is not `n m_p`. The regime is an incompressible ideal-MHD wave with wavevector parallel to a uniform `B`.

**References**:

- Alfvén 1942 *Nature* 150:405. The abstract does not display the speed formula.
- PlasmaPy's `Alfven_speed` documents `ρ = n_i m_i + n_e m_e`.

**Rationale**: The magnetic tension and the inertia set a speed `B / √(μ0 ρ)` once the SI coefficient is taken to be 1 and `ρ` is the total mass density.

**Bridge Equation 68: Tolman–Ehrenfest effect (static thermal equilibrium)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-03.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.TolmanEhrenfest.hydrostatic_constant`](https://github.com/danielsimonjr/PhysJS/blob/d917fa328039d19c3659f74ea73569effb3ed4fb/PhysJS/TolmanEhrenfest.lean) states that on a static interval with `g_00 < 0`, hydrostatic balance and the equilibrium Gibbs relation give `T √(−g_00)` equal at the endpoints. The 1930 writing `T √g_44` agrees when `g_44 = −g_00`. `Real.sqrt g_00 = 0` when `g_00 < 0`, so the product without the minus is 0. `d ln T = 0` is not `g dr/c²`. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The lemma is not a horizon temperature and not `PhysJS.HawkingUnruh.dictionary`. `T ‖ξ‖ = const` is out of scope. The hydrostatic equation is not derived from `∇_μ T^{μν} = 0`, and the Gibbs relation is not derived from an equation of state.

> **Evaluator:** [`src/bridges/be68-tolman-ehrenfest.ts`](../../src/bridges/be68-tolman-ehrenfest.ts) (`evaluateTolmanEhrenfest`, `tolmanTemperatureAt`)

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

**Bridge Equation 69: Fast magnetosonic speed (perpendicular, ideal MHD)** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-03.** Kind is `bridge`: the theorem states the catalogued equation, and the covers line still begins with derivation-step. The catalog path passes this reference, so catalog evidence and edge evidence include `formally-proved`. [`PhysJS.FastMagnetosonic.speed_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/FastMagnetosonic.lean) states that a monochromatic compressional polarization perpendicular to a uniform field has phase speed `|ω/k| = √(c_s² + B²/(μ0 ρ))` for `μ0 > 0`, `ρ > 0`, and `k ≠ 0`. `c_s = 0` recovers `B/√(μ0 ρ)`, the Alfvén value of a different polarization. That recovery is not BE-67. `√(c_s² + v_A²)` is not `c_s`, not `v_A`, and not `c_s + v_A` when the other speed is nonzero. The nested theorem `PhysJS.FastMagnetosonic.perpendicular_of_dispersion` is the quartic at `k_∥ = 0` and is not the formalRef. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The linearized equations are hypotheses. The lemma is not a kinetic dispersion relation and not the oblique fast mode.

> **Evaluator:** [`src/bridges/be69-fast-magnetosonic.ts`](../../src/bridges/be69-fast-magnetosonic.ts) (`evaluateFastMagnetosonic`)

- **Status**: Established as the perpendicular fast phase speed. The edge confidence stays `established`. The target is `fast-magnetosonic-speed`, not `alfven-speed`.
- **Context**: Bridges a fluid sound speed to a plasma wave speed. The bridges tuple is `fluid` → `plasma`, the same tuple as BE-67. The tuple does not identify the two speeds.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cleft%7C%5Cfrac%7B%5Comega%7D%7Bk%7D%5Cright%7C%20%3D%20%5Csqrt%7Bc_s%5E2%20%2B%20%5Cfrac%7BB%5E2%7D%7B%5Cmu_0%20%5Crho%7D%7D" alt="|\frac{\omega}{k}| = \sqrt{c_s^2 + \frac{B^2}{\mu_0 \rho}}" />

where:

- `|ω/k|` is the phase speed, in metres per second
- `c_s` is the sound speed. `c_s² = γ p / ρ` is a reading of the closure, not an energy equation
- `B` is the magnetic flux density and `ρ` is the total mass density
- `μ0` is `1/(ε0 c²)`, the same product the Alfvén evaluator uses

**Dimensions**: The catalog signature is `[velocity]`. `c_s²` and `B²/(μ0 ρ)` are both squared velocities. The square root is a velocity.

**Domain**: The evaluator requires `c_s ≥ 0`, a finite `B`, and `ρ > 0`. The regime is the perpendicular compressional polarization. The oblique fast mode is out of scope.

**References**:

- The premises are the linearized ideal-MHD equations named in the theorem. They are hypotheses.

**Rationale**: Magnetic pressure and gas pressure add under the square root for this polarization. The Alfvén speed is the `c_s = 0` number of a different polarization.

**Bridge Equation 70: Einstein relation (drift–diffusion)** *(Category H: Non-Equilibrium Statistical Mechanics)*

> **Proof status as of 2026-10-03.** Kind is `bridge`. [`PhysJS.EinsteinRelation.diffusion_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/EinsteinRelation.lean) states that a nonzero field at which the drift flux `μ n E` cancels the diffusion flux `D dn/dx`, on the Boltzmann profile `n = n_ref exp(−q V/(k_B T))`, gives `D = μ k_B T / q`. Dropping `q` fails when `q ≠ 1`. The force-mobility writing needs `μ_force = μ/q`. Stokes–Einstein and the Fermi-liquid form are different equations. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be70-einstein-relation.ts`](../../src/bridges/be70-einstein-relation.ts) (`evaluateEinsteinRelation`)

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

**Bridge Equation 71: Clapeyron slope (coexistence)** *(Category J: Phase Transitions and Criticality)*

> **Proof status as of 2026-10-03.** Kind is `bridge`. [`PhysJS.Clapeyron.slope_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/Clapeyron.lean) states that where the specific Gibbs energies agree and each phase obeys `dg = −s dT + v dP`, `dP/dT = (s2−s1)/(v2−v1)`. With `L = T (s2−s1)`, `T ≠ 0`, and `Δv ≠ 0`, `dP/dT = L/(T Δv)`. The entropy slope is that companion reading. It is not a second formalRef. Dropping `T` fails when `T ≠ 1`. Replacing `Δv` by one phase volume fails when the other volume is nonzero. The ideal-gas integrated vapor-pressure law is not this slope. The Gibbs differential is a hypothesis, not a Legendre transform. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be71-clapeyron.ts`](../../src/bridges/be71-clapeyron.ts) (`evaluateClapeyron`)

- **Status**: Established. The edge confidence stays `established`. `L` is specific latent heat, joules per kilogram.
- **Context**: Bridges thermodynamics to a continuum coexistence curve. The bridges tuple is `thermodynamics` → `continuum`. Category J selects the quantum-classical component. The tuple does not.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7B%5Cmathrm%7Bd%7DP%7D%7B%5Cmathrm%7Bd%7DT%7D%20%3D%20%5Cfrac%7BL%7D%7BT%20%5CDelta%20v%7D" alt="\frac{\mathrm{d}P}{\mathrm{d}T} = \frac{L}{T \Delta v}" />

where:

- `dP/dT` is the coexistence slope, in pascals per kelvin
- `L = T (s2 − s1)` is the specific latent heat
- `Δv = v2 − v1` is the specific-volume change
- `T` is the absolute temperature on the coexistence curve

**Dimensions**: The catalog signature is `[L^-1 M T^-2 Theta^-1]`, pressure per temperature. Specific `L` is `[L^2 T^-2]` and specific `Δv` is `[L^3 M^-1]`.

**Domain**: The evaluator requires finite `L`, nonzero `T`, and nonzero `Δv`. The regime is coexistence of two phases that share a specific Gibbs energy.

**References**:

- The Gibbs differential is a hypothesis of the theorem.

**Rationale**: The entropy jump and the volume jump fix the slope. Latent heat is that entropy jump times `T`.

**Bridge Equation 72: Gravitational redshift (static observers)** *(Category I: Emergent Spacetime)*

> **Proof status as of 2026-10-03.** Kind is `bridge`. This is not BE-68. [`PhysJS.GravitationalRedshift.frequency_ratio`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/GravitationalRedshift.lean) states that two static observers of one coordinate period, with `ν √(−g_00) = 1/Δt` and `g_00 < 0`, have `ν1/ν2 = √(−g2)/√(−g1) = √(g2/g1)`. If the Tolman products also agree, then `T1/T2 = ν1/ν2`. Neither factor is derived from the other. Equal temperatures on `g_00 = −1` and `g_00 = −4` are not a Tolman equilibrium, while the frequency ratio is 2. The nested theorem `PhysJS.GravitationalRedshift.tolman_same_ratio` is not the formalRef. The lemma is not `PhysJS.TolmanEhrenfest.hydrostatic_constant`, not a horizon temperature, and not `PhysJS.HawkingUnruh.dictionary`. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be72-gravitational-redshift.ts`](../../src/bridges/be72-gravitational-redshift.ts) (`evaluateGravitationalRedshift`)

- **Status**: Established. The edge confidence stays `established`. The quantities are `redshift-metric-g00-1`, `redshift-metric-g00-2`, and `gravitational-frequency-ratio`. They are not `metric-g00`, `proper-temperature`, or `tolman-invariant`.
- **Context**: Bridges a gravitational metric component to a radiation frequency. The bridges tuple is `gravitation` → `radiation`. Category I is the same component as BE-68. That shared component is not a composition.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cfrac%7B%5Cnu_1%7D%7B%5Cnu_2%7D%20%3D%20%5Csqrt%7B%5Cfrac%7Bg_2%7D%7Bg_1%7D%7D" alt="\frac{\nu_1}{\nu_2} = \sqrt{\frac{g_2}{g_1}}" />

where:

- `ν1/ν2` is the frequency ratio of the two static observers
- `g1` and `g2` are the static `g_00` components, both negative
- the equality `√(g2/g1) = √(−g2)/√(−g1)` is the sign hypothesis

**Dimensions**: The catalog signature is `[1]`. Both metric components are dimensionless in this coordinate writing, and so is their ratio.

**Domain**: The evaluator requires both components finite and negative. A chain that treats this ratio as the Tolman invariant is refused: `composeEdges` of this edge with BE-68 has no shared quantity.

**References**:

- `ν √(−g_00) = 1/Δt` is the hypothesis of the theorem.

**Rationale**: One coordinate period fixes the frequency ratio of two static observers. Thermal equilibrium is a further hypothesis, and it is BE-68.

**Bridge Equation 73: Kelvin relation (Peltier–Seebeck)** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-03.** Kind is `bridge`. [`PhysJS.KelvinRelation.peltier_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/KelvinRelation.lean) states that for the linear fluxes `J_e` and `J_q`, the open-circuit Seebeck coefficient `S = E/∇T` and the isothermal Peltier coefficient `Π = J_q/J_e` satisfy `Π = S T` when `L12 = L21`. That equality is `ThermoelectricOnsager.onsager`, a structure field naming microscopic reversibility, not an axiom. Without it the two coefficients disagree. The first Thomson relation `μ = T dS/dT` is not this equation, and neither is a measured thermopower. The linear fluxes are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be73-kelvin-peltier.ts`](../../src/bridges/be73-kelvin-peltier.ts) (`evaluateKelvinPeltier`)

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

**Bridge Equation 74: Magnetic pressure (solenoid)** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.MagneticPressure.pressure_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/MagneticPressure.lean) states that a linear inductor with `dU/dI = L I` and `U(0) = 0` stores `U = (L/2) I²`. A long solenoid with `B = μ0 n I` and flux linkage `Λ = (n ℓ) B A` has `L = μ0 n² V`. At fixed current the battery supplies `I ΔΛ`. The stored energy rises by half of that, and the difference is the mechanical work `p ΔV`, so `p = B²/(2 μ0)`. Homogeneity in `B` and `μ0` gives `p = C B²/μ0` with `C` unfixed. `C = 1` is the battery work per volume, not this pressure. Not a kinetic pressure, and not a Lagrangian derivation of the Maxwell stress tensor. Ampere's law, the flux linkage, and the quasistatic work balance are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be74-magnetic-pressure.ts`](../../src/bridges/be74-magnetic-pressure.ts) (`evaluateMagneticPressure`)

- **Status**: Established. The edge confidence stays `established`. The factor 2 is in the evaluator. Units fix `p ∝ B²/μ0` and do not fix the 2.
- **Context**: Bridges an electromagnetic field to a continuum pressure. The bridges tuple is `electromagnetic` → `continuum`. Category D is the same component as BE-66, BE-67, and BE-69.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/p_B%20%3D%20%5Cfrac%7BB%5E2%7D%7B2%5Cmu_0%7D" alt="p_B = \frac{B^2}{2\mu_0}" />

where:

- `p_B` is the magnetic pressure
- `B` is the magnetic flux density
- `μ0` is the vacuum permeability, written in the catalog edge as `1/(ε0 c²)`
- the 2 is the stored-energy half of the inductor integral

**Dimensions**: The catalog signature is `[L^-1 M T^-2]`, the dimension of pressure.

**Domain**: The evaluator requires finite `B`, including 0 and a negative field, because the pressure depends on `B²`.

**References**:

- Ampere's law, the flux linkage of a long solenoid, and the quasistatic work balance are the hypotheses of `PhysJS.MagneticPressure.pressure_eq`.

**Rationale**: The battery supplies twice the rise in stored energy. The difference is this pressure. A reconstruction that drops the 2 is the battery work per volume.

**Bridge Equation 75: London penetration depth** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.LondonPenetration.depth_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/LondonPenetration.lean) states that on `B(x) = B0 exp(−x/λ)` with `λ > 0`, Ampere's law `j = −(1/μ0) dB/dx` and the London equation `dj/dx = −(n e²/m) B` give `λ = √(m/(μ0 n e²))`. `e` is the elementary charge. The dimension matrix of `{m, μ0, n, e}` admits both that monomial and `μ0 e²/m`, so units do not choose. Those lengths disagree when `n (μ0 e²/m)³ ≠ 1`. The growing exponential is not the screened field. Replacing `e` by `2e` at the same `n` and `m` fails, and dropping the square on `e` fails when `e ≠ 1`. A factor `C ≠ 1` is not this depth. Not the classical skin depth. The London equation and Ampere's law are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be75-london-penetration.ts`](../../src/bridges/be75-london-penetration.ts) (`evaluateLondonPenetration`)

- **Status**: Established. The edge confidence stays `established`. `e` is `E_SI`, not an input and not Euler's number.
- **Context**: Bridges a carrier to a screened length. The bridges tuple is `quantum` → `classical`. Category F is the same component as BE-73. The sources are the existing quantities `effective-mass` and `carrier-density`.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Clambda_L%20%3D%20%5Csqrt%7B%5Cfrac%7Bm%7D%7B%5Cmu_0%20n%20e%5E2%7D%7D" alt="\lambda_L = \sqrt{\frac{m}{\mu_0 n e^2}}" />

where:

- `λ_L` is the London penetration depth
- `m` is the carrier effective mass
- `n` is the carrier number density
- `e` is the elementary charge
- `μ0` is the vacuum permeability

**Dimensions**: The catalog signature is `[length]`.

**Domain**: The evaluator requires `m > 0` and `n > 0`. `{m, μ0, n, e}` does not determine a unique monomial of dimension length.

**References**:

- The London equation and Ampere's law are the hypotheses of `PhysJS.LondonPenetration.depth_eq`.

**Rationale**: The screened root is the depth the theorem states. The other length `μ0 e²/m` is a different monomial, and units do not choose between them.

**Bridge Equation 76: Plasma beta** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.PlasmaBeta.beta_eq`](https://github.com/danielsimonjr/PhysJS/blob/ee753df77bd5b29b7207443181606b6004bfcf6a/lean/PlasmaBeta.lean) states `β = p_gas / p_B` where `p_B` is `PhysJS.MagneticPressure.pressure_eq`, so `β = p_gas / (B²/(2 μ0)) = 2 μ0 p_gas / B²`. The ideal-gas closure `p_gas = n k_B T` gives `β = 2 μ0 n k_B T / B²`. `B ≠ 0`. Using `B²/μ0` in place of the magnetic pressure is a different ratio. The constant 1 is dimensionless and is not this beta when the ratio is not 1. A factor `C ≠ 1` is not this beta. Dropping `p = n k_B T` fails. Not a unique monomial, and not a plasma-β inequality. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`. The file imports `lean.MagneticPressure`.

> **Evaluator:** [`src/bridges/be76-plasma-beta.ts`](../../src/bridges/be76-plasma-beta.ts) (`evaluatePlasmaBeta`)

- **Status**: Established. The edge confidence stays `established`. The composition edge is the ratio `β = n k_B T / p_B`. Substituting Bridge Equation 74 recovers the factor 2.
- **Context**: Bridges a fluid pressure to a magnetic pressure. The bridges tuple is `fluid` → `plasma`. Category D is the same component as BE-74. `composeEdges` of BE-74 into this edge meets on `magnetic-pressure`. The reverse order has no junction. `upt regime plasma` stays the vacuous registration: this equation is not a plasma-β inequality.
- **Mathematical Formulation**:

<img src="https://i.upmath.me/svg/%5Cbeta%20%3D%20%5Cfrac%7Bn%20k_B%20T%7D%7Bp_B%7D" alt="\beta = \frac{n k_B T}{p_B}" />

where:

- `β` is the plasma beta
- `n` is the carrier number density
- `T` is the temperature
- `p_B` is the magnetic pressure of Bridge Equation 74, `B²/(2 μ0)`, not `B²/μ0`
- `k_B` is Boltzmann's constant

**Dimensions**: The catalog signature is `[1]`.

**Domain**: The evaluator requires finite `n`, finite `T`, and finite `p_B ≠ 0`. The governing set `{n, T, p_B, k_B}` is not a unique monomial.

**References**:

- `PhysJS.PlasmaBeta.beta_eq` calls `PhysJS.MagneticPressure.pressure_eq`. The ideal-gas closure `p = n k_B T` is a hypothesis.

**Rationale**: The 2 lives in the magnetic pressure. A map of the expanded formula `2 μ0 n k_B T / B²` does not name this edge, because that source set is not `{n, T, p_B}`.



**Bridge Equation 77: Hagen–Poiseuille flux** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.HagenPoiseuille.flow_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/HagenPoiseuille.lean) states that steady axisymmetric Newtonian flow with `d/dr (r du/dr) = (G/μ) r`, centerline slope 0, and no-slip `u(R) = 0` integrates to `u = (G/(4μ))(r²−R²)`. With `G = −ΔP/L` the flux `Q = ∫ u 2π r dr` is `π R⁴ ΔP/(8 μ L)`. Darcy's definition of that profile gives `f_D Re = 64`. The same wall shear with the Fanning normalization is 16. A factor other than 8 is not this flux. Not a square duct. The axial balance, no-slip, and the Darcy definitions are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be77-hagen-poiseuille.ts`](../../src/bridges/be77-hagen-poiseuille.ts) (`evaluateHagenPoiseuille`)

- **Status**: Established. The edge confidence stays `established`. The evaluator returns the flux. The Darcy product is part of the theorem and is not a second catalog equation.
- **Context**: Bridges a fluid pressure drop to a continuum flux. The bridges tuple is `fluid` → `continuum`. Category D is the same component as BE-74 and BE-76.
- **Mathematical Formulation**: `Q = π R⁴ ΔP / (8 μ L)`.
- **Dimensions**: The catalog signature is `[L^3 T^-1]`.
- **Domain**: `R > 0`, `ΔP` finite, `μ ≠ 0`, `L ≠ 0`. A square duct is a different eigenvalue.
- **References**: The axial balance, the centerline condition, and no-slip are the hypotheses of `PhysJS.HagenPoiseuille.flow_eq`.
- **Rationale**: The 8 is the integral of the no-slip parabola. The Fanning factor 16 is the same shear under a different normalization.

**Bridge Equation 78: Euler buckling load (pinned–pinned)** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.EulerBuckling.critical_load`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/EulerBuckling.lean) states that the Euler–Bernoulli balance `y'' = −ω² y` with `ω² = P/(E I)` and pinned ends `y(0) = y(L) = 0` has the eigenfunction `sin(π x/L)` at `P = π² E I/L²`, and every nontrivial solution has `ω L = n π` for a nonzero integer `n`, so the load is at least that value. The clamped-free column is `π² E I/(4 L²)`. That factor is not the pinned load. Not read off from units. The beam equation is a hypothesis. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be78-euler-buckling.ts`](../../src/bridges/be78-euler-buckling.ts) (`evaluateEulerBuckling`)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: Bridges a continuum beam to a mechanical load. The bridges tuple is `continuum` → `mechanical`.
- **Mathematical Formulation**: `P_cr = π² E I / L²`.
- **Dimensions**: The catalog signature is `[force]`.
- **Domain**: `E > 0`, `I > 0`, `L > 0`, pinned ends.
- **References**: The Euler–Bernoulli balance and the pinned ends are the hypotheses of `PhysJS.EulerBuckling.critical_load`.
- **Rationale**: The catalog equation is the lowest pinned load. The cantilever load is a different boundary condition.

**Bridge Equation 79: Parallel-plate pull-in voltage** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.PullIn.pull_in_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/PullIn.lean) states that `C = ε0 A/g` has `dC/dg = −ε0 A/g²`. Equilibrium of a linear spring against the coenergy force is `k(g0−g) = ε0 A V²/(2 g²)`, so `V²` is proportional to `(g0−g) g²`. The derivative `2 g0 g − 3 g²` vanishes only at `g = 0` and `g = 2 g0/3`, and the second derivative at the fold is `−2 g0`. Substituting the gap gives `V_pi² = 8 k g0³/(27 ε0 A)`. `g = g0/2` is not the fold. Not a fringing field. The parallel-plate law and the quasi-static balance are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be79-pull-in.ts`](../../src/bridges/be79-pull-in.ts) (`evaluatePullIn`)

- **Status**: Established. The edge confidence stays `established`. `ε0` is `EPS0_SI`.
- **Context**: Bridges an electromagnetic gap force to a continuum spring. The bridges tuple is `electromagnetic` → `continuum`.
- **Mathematical Formulation**: `V_pi = sqrt(8 k g0³ / (27 ε0 A))`.
- **Dimensions**: The catalog signature is `[L^2 M T^-3 I^-1]`.
- **Domain**: `k > 0`, `g0 > 0`, `A > 0`. The fold is `g = 2 g0/3`.
- **References**: The parallel-plate capacitance and the linear spring are the hypotheses of `PhysJS.PullIn.pull_in_eq`.
- **Rationale**: The voltage at `g = g0/2` is the equilibrium at a different gap, not the fold.

**Bridge Equation 80: Mott–Gurney current** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.MottGurney.current_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/MottGurney.lean) states that drift `J = q n μ E` and Poisson `dE/dx = q n/ε` give `E dE/dx = J/(ε μ)`. With `E(0) = 0` the integral is `E²/2 = J x/(ε μ)`. The nonnegative root integrated from 0 to `d` is `J = (9/8) ε μ V²/d³`. A factor other than `9/8` is not this current. Not Child–Langmuir. Drift, Poisson, and the injecting contact are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be80-mott-gurney.ts`](../../src/bridges/be80-mott-gurney.ts) (`evaluateMottGurney`)

- **Status**: Established. The edge confidence stays `established`. `ε` is an input, not necessarily `ε0`.
- **Context**: Bridges an electromagnetic field to a condensed-matter current. The bridges tuple is `electromagnetic` → `condensed`.
- **Mathematical Formulation**: `J = (9/8) ε μ V² / d³`.
- **Dimensions**: The catalog signature is `[L^-2 I]`.
- **Domain**: `ε > 0`, `μ > 0`, `V` finite, `d > 0`, injecting contact `E(0) = 0`.
- **References**: Drift, Poisson, and the injecting contact are the hypotheses of `PhysJS.MottGurney.current_eq`.
- **Rationale**: The `9/8` is the integral of the injecting-contact field. Child–Langmuir is a collisionless vacuum current.

**Bridge Equation 81: Child–Langmuir current** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.ChildLangmuir.current_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/ChildLangmuir.lean) states that collisionless energy `(1/2) m v² = e φ`, `J = ρ v`, and Poisson `φ'' = ρ/ε0` give a current independent of `x` only for `φ ∝ x^{4/3}`. The profile `φ = V (x/d)^{4/3}` has `φ(0) = 0`, `φ(d) = V`, and cathode field 0, and for `x > 0` its current is `J = (4 ε0/9) sqrt(2 e/m) V^{3/2}/d²`. `e` is the elementary charge. The Mott–Gurney exponent does not cancel. Poisson is not claimed at `x = 0`. Not a drift-only solid. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be81-child-langmuir.ts`](../../src/bridges/be81-child-langmuir.ts) (`evaluateChildLangmuir`)

- **Status**: Established. The edge confidence stays `established`. `e` is `E_SI`, not an input and not Euler's number. `ε0` is `EPS0_SI`.
- **Context**: Bridges an electromagnetic vacuum gap to a current. The bridges tuple is `electromagnetic` → `vacuum`.
- **Mathematical Formulation**: `J = (4 ε0/9) sqrt(2 e/m) V^{3/2}/d²`.
- **Dimensions**: The catalog signature is `[L^-2 I]`.
- **Domain**: `m > 0`, `V > 0`, `d > 0`. Poisson is not claimed at the cathode.
- **References**: Collisionless energy, `J = ρ v`, and Poisson away from the cathode are the hypotheses of `PhysJS.ChildLangmuir.current_eq`.
- **Rationale**: The vacuum exponent is `4/3`. The Mott–Gurney solid is a different balance.

**Bridge Equation 82: Shockley diode equation** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.ShockleyDiode.shockley_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/ShockleyDiode.lean) states that quasi-equilibrium multiplies the equilibrium flux by `exp(e V/(η k_B T))`. Ideality 1 sets `η = 1`. Detailed balance sets the reverse flux equal to the forward flux at `V = 0`, and low injection keeps that reverse flux under bias. The net current is `I = I_s (exp(e V/(k_B T)) − 1)`. Zero bias carries zero current. Ideality 2 is not this current when `e V ≠ 0`. `e` is the elementary charge. Not a diffusion-length ODE. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be82-shockley-diode.ts`](../../src/bridges/be82-shockley-diode.ts) (`evaluateShockleyDiode`)

- **Status**: Established. The edge confidence stays `established`. Euler's number is written `exp`.
- **Context**: Bridges an electromagnetic bias to a condensed-matter current. The bridges tuple is `electromagnetic` → `condensed`.
- **Mathematical Formulation**: `I = I_s (exp(e V/(k_B T)) − 1)`.
- **Dimensions**: The catalog signature is `[I]`.
- **Domain**: `I_s` and `V` finite, `T ≠ 0`. Ideality is 1.
- **References**: Quasi-equilibrium, detailed balance at zero bias, and low injection are the hypotheses of `PhysJS.ShockleyDiode.shockley_eq`.
- **Rationale**: The minus one is the reverse flux. Ideality 2 is a different current when `e V ≠ 0`.

**Bridge Equation 83: Thomson coefficient** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.Thomson.thomson_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/Thomson.lean) states that the Kelvin relation `Π(t) = S(t) t`, which is `PhysJS.KelvinRelation.peltier_eq` read along temperature, and the Thomson split `μ = dΠ/dT − S`, give `μ = T dS/dT` by the product rule. `dΠ/dT` is not `μ` when `S T ≠ 0`. Not a second copy of `Π = S T`. The functional Kelvin relation and the Thomson split are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`. The file reads the Kelvin relation along temperature. The catalog dependency is Bridge Equation 73. The quantities do not meet, so the edges do not compose.

> **Evaluator:** [`src/bridges/be83-thomson.ts`](../../src/bridges/be83-thomson.ts) (`evaluateThomsonCoefficient`)

- **Status**: Established. The edge confidence stays `established`. `dS/dT` is an input, not a sampled difference of `S`.
- **Context**: Bridges a thermal slope to an electrical coefficient. The bridges tuple is `thermal` → `electrical`. Category F is the same component as BE-73. This is the first Thomson relation. Search for the Thomson coefficient names this row. It does not name BE-73.
- **Mathematical Formulation**: `μ_T = T dS/dT`.
- **Dimensions**: The catalog signature is `[L^2 M T^-3 I^-1 Theta^-1]`.
- **Domain**: `T` and `dS/dT` finite.
- **References**: `PhysJS.Thomson.thomson_eq` reads `PhysJS.KelvinRelation.peltier_eq` along temperature. The Thomson split is a hypothesis.
- **Rationale**: The product rule removes the convected `S`. `dΠ/dT` still contains it.

**Bridge Equation 84: Four-point sheet resistance** *(Category F: Condensed Matter - High Energy Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.FourPoint.sheet_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/FourPoint.lean) states that on an infinite sheet the radial field of a point current is `(I R_s)/(2 π r)`, and the potential drop is the integral of `1/r`. Probes at `0`, `s`, `2s`, and `3s`, with current in at `0` and out at `3s`, each contribute `(I R_s/(2 π)) ln 2` on the inner pair. Superposition gives `R_s = (π/ln 2)(V/I)`. A sink at `4s` gives `2π/ln 3` instead. Not `PhysJS.Crossing.antisymmetry`. The Laplace field and linear superposition are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be84-four-point.ts`](../../src/bridges/be84-four-point.ts) (`evaluateFourPointSheet`)

- **Status**: Established. The edge confidence stays `established`. The spacing `s` cancels.
- **Context**: Bridges an electromagnetic probe pair to a condensed-matter sheet. The bridges tuple is `electromagnetic` → `condensed`. Not the conformal crossing BE-35.
- **Mathematical Formulation**: `R_s = (π / ln 2) (V/I)`.
- **Dimensions**: The catalog signature is `[L^2 M T^-3 I^-2]`.
- **Domain**: `V` finite, `I ≠ 0`. The radial `1/r` potential is a premise, not a derived field.
- **References**: The radial field `(I R_s)/(2 π r)` and linear superposition are the hypotheses of `PhysJS.FourPoint.sheet_eq`.
- **Rationale**: Each inner drop is `ln 2`. A different sink spacing is a different factor.

**Bridge Equation 85: Shot noise (one-sided)** *(Category H: Non-Equilibrium Statistical Mechanics)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.ShotNoise.shot_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/ShotNoise.lean) states that in a window of length `T` the count `N` has mean `(I/e) T`, and the Poisson premise is `Var(N) = mean(N)`. Charge `e` scales the variance by `e²` and the windowed current divides by `T`, so `Var(I) = e I/T`. The one-sided bandwidth of that window is `Δf = 1/(2 T)`, and `S_I = 2 e I`. The two-sided bandwidth `Δf = 1/T` gives `e I`. `e` is the elementary charge. Not a Fourier theorem and not Johnson–Nyquist. The Poisson variance and the one-sided convention are hypotheses. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be85-shot-noise.ts`](../../src/bridges/be85-shot-noise.ts) (`evaluateShotNoise`)

- **Status**: Established. The edge confidence stays `established`. The formula is linear in `I`.
- **Context**: Bridges a quantum count to a classical current spectrum. The bridges tuple is `quantum` → `classical`. Category H is the same component as BE-58. This is not the Johnson–Nyquist factor 4.
- **Mathematical Formulation**: `S_I = 2 e I`.
- **Dimensions**: The catalog signature is `[T I^2]`.
- **Domain**: `I` finite. The one-sided window is a hypothesis, not an input.
- **References**: The Poisson variance and `Δf = 1/(2 T)` are the hypotheses of `PhysJS.ShotNoise.shot_eq`.
- **Rationale**: The two-sided convention is `e I`. This catalog equation is the one-sided spectrum.

**Bridge Equation 86: Reynolds analogy (Prandtl number 1)** *(Category D: Field Unification Bridges)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.ReynoldsAnalogy.reynolds_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/ReynoldsAnalogy.lean) states that wall fluxes `τ = μ du/dy` and `q = k dT/dy`, with `C_f = τ/(ρ U²/2)`, `h = q/ΔT`, `St = h/(ρ U c_p)`, and `Pr = μ c_p/k`, satisfy `St Pr = C_f/2` when the normalized wall gradients agree. That common slope is the equal-diffusivity hypothesis. At `Pr = 1`, `St = C_f/2`. `Pr ≠ 1` with nonzero skin friction is not this equality. Not a Nusselt correlation. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be86-reynolds-analogy.ts`](../../src/bridges/be86-reynolds-analogy.ts) (`evaluateReynoldsAnalogy`)

- **Status**: Established. The edge confidence stays `established`. `Pr` and the wall slopes are not inputs.
- **Context**: Bridges a fluid skin friction to a thermal Stanton number. The bridges tuple is `fluid` → `thermal`.
- **Mathematical Formulation**: `St = C_f / 2`.
- **Dimensions**: The catalog signature is `[1]`.
- **Domain**: `C_f` finite. The matched-slope hypothesis and `Pr = 1` are premises. The evaluator does not accept a Prandtl number other than that premise.
- **References**: Matched normalized wall gradients and `Pr = 1` are the hypotheses of `PhysJS.ReynoldsAnalogy.reynolds_eq`.
- **Rationale**: The `1/2` is the skin-friction normalization. A Nusselt correlation is a different statement.

**Bridge Equation 87: Capacitor voltage variance** *(Category H: Non-Equilibrium Statistical Mechanics)*

> **Proof status as of 2026-10-04.** Kind is `bridge`. [`PhysJS.CapacitorNoise.noise_eq`](https://github.com/danielsimonjr/PhysJS/blob/92f87257a1e3086a48cdc19fe4361cc1c5909d49/lean/CapacitorNoise.lean) states that `dU/dV = C V` and `U(0) = 0` integrate to `U = (C/2) V²`. The normalized Boltzmann weight of that energy is the Gaussian of mean 0 and variance `k_B T/C`, because the partition function is the Gaussian integral. The mean square on that law is `⟨v²⟩ = k_B T/C`, and `(C/2)` of it is `(1/2) k_B T`. `(3/2) k_B T/C` is not this variance. Dropping the energy half replaces it by `k_B T/(2 C)`. Not three kinetic degrees of freedom. The proof is complete. The axioms are propext, Classical.choice, and Quot.sound. The covers line still begins with derivation-step. Catalog evidence and edge evidence include `formally-proved`.

> **Evaluator:** [`src/bridges/be87-capacitor-noise.ts`](../../src/bridges/be87-capacitor-noise.ts) (`evaluateCapacitorNoise`)

- **Status**: Established. The edge confidence stays `established`.
- **Context**: Bridges a thermal energy to an electrical variance. The bridges tuple is `thermal` → `electrical`. Category H is the same component as BE-70.
- **Mathematical Formulation**: `⟨v²⟩ = k_B T / C`.
- **Dimensions**: The catalog signature is `[L^4 M^2 T^-6 I^-2]`.
- **Domain**: `T` finite, `C > 0`. The energy is one quadratic term.
- **References**: `U = (C/2) V²` and the Boltzmann weight of that term are the hypotheses of `PhysJS.CapacitorNoise.noise_eq`.
- **Rationale**: The two halves cancel. Three kinetic degrees of freedom are a different variance.


## VI. Integration with Universal Physics Tensor

These additional equations fill crucial gaps in the tensor structure according to the following mapping:

### 6.1 Tensor Index Assignment

Each bridge equation type maps to specific tensor components. The component is the catalog **category cluster**: the letter on `BRIDGE_EQUATIONS`, via [`src/bridges/tensor-index.ts`](../../src/bridges/tensor-index.ts). The `bridges` tuple does not select it. That tuple is advisory. Three rows already in the original lists disagree with their tuple and stay with the cluster: BE-34 (`quantum` → `cosmological`, category J, quantum-classical component), BE-39 (`quantum` → `classical`, category L, field-unification component), and BE-48 (`quantum` → `classical`, category O, emergence component). The formula's tensor rank and its `dimensional_signature` do not open a further component. BE-13 is the scalar trace of a rank-2 equation and stays with category B. BE-17's encoded form is a scalar contraction of a rank-3 torsion tensor and stays with category D. BE-11 and BE-48 both carry `[frequency]` and do not share a component. The six patterns below are the patterns those clusters already use for ids 11–50. The original parentheticals stopped at id 50. Ids 51–87 take the pattern of their category. No new pattern is introduced.

1. **Quantum-Classical Bridges (11-12, 33-35, 56, 71)**:
   <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Ctext%7Bquantum%7D%2C%5Ctext%7Bclassical%7D%2C%5Cgamma%2C%5Cdelta%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\text{quantum},\text{classical},\gamma,\delta,\epsilon,\zeta}" />
   Categories A and J. The scale pair is named `quantum`, `classical`. The other four indices stay free.
2. **Information-Geometry Bridges (13-14, 30-32, 42-44, 51-52, 57, 63-65, 68, 72)**:
   <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%2C%5Cbeta%2C%5Ctext%7BPoincar%C3%A9%7D%2C%5Ctext%7Binfo%7D%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\alpha,\beta,\text{Poincaré},\text{info},\epsilon,\zeta}" />
   Categories B, I, and M. The symmetry slot is Poincaré and the information slot is occupied. Scale and force stay free.
3. **Emergence Patterns (15-16, 27-29, 48-50, 58, 70, 85, 87)**:
   Higher-rank correlations <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%5Cbeta%5Cgamma%5Cdelta%5Cepsilon%5Czeta%E2%80%A6%7D" alt="\boldsymbol{\Pi}^{\alpha\beta\gamma\delta\epsilon\zeta…}" />
   Categories C, H, and O. The ellipsis is the mark of this cluster (Part I §1.2, the emergent component). A scalar formula in the cluster keeps the ellipsis: BE-27's encoded form is a scalar and is already in this list.
4. **Field Unification (17-18, 36-41, 53, 66-67, 69, 74, 76-79, 81, 86)**:
   <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Calpha%2C%5Ctext%7Bforce%7D_i%2C%5Ctext%7Bsymmetry%7D%2C%5Cdelta%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\alpha,\text{force}_i,\text{symmetry},\delta,\epsilon,\zeta}" />
   Categories D, K, and L. The force slot and the symmetry slot are the occupied indices.
5. **Scale Transitions (19-26, 54, 55, 59-62, 73, 75, 80, 82-84)**:
   Off-diagonal elements <img src="https://i.upmath.me/svg/%5Cboldsymbol%7B%5CPi%7D%5E%7B%5Ctext%7Bscale%7D_i%2C%5Ctext%7Bscale%7D_j%2C%5Cgamma%2C%5Cdelta%2C%5Cepsilon%2C%5Czeta%7D" alt="\boldsymbol{\Pi}^{\text{scale}_i,\text{scale}_j,\gamma,\delta,\epsilon,\zeta}" />
   Categories E, F, and G. The scale pair stays symbolic. The cluster's domains are not one pair: quantum–cosmological, quantum–condensed-matter, condensed-matter–holography, quantum–biological.
6. **Cosmological Puzzles (45-47)**:
   Bridge Equations 45 (Trans-Planckian Censorship), 46 (Multiverse Measure), and 47 (BBN Dark Sector) connect cosmological phenomena and do not cleanly fit groups 1-5. Category N. The component is unassigned. No index is displayed.

**Ids added to the lists.** Each row names the category-cluster rule and the catalog fields that were checked against it. `e` in a conductance formula is the elementary charge.

| ID | Category | Index | Why this pattern |
|---|---|---|---|
| 51 | I | information-geometry, Poincaré and info | Category I, with BE-30–32. Gravitational lensing. Signature `[1]`, a dimensionless angle. The bridges tuple is Newtonian gravity → general relativity. The tuple does not select the component. |
| 52 | I | information-geometry, Poincaré and info | Category I. Perihelion advance. Signature `[1]`. Same cluster as BE-51. |
| 53 | L | field-unification, force and symmetry | Category L, with BE-39–41. Yang-Mills β-function. Signature `[1]`, the same dimensionless slot as BE-39. The bridges tuple is `quantum` → `classical`, which is the BE-39 precedent for staying out of the quantum-classical component. |
| 54 | E | scale-transition, `scale_i`, `scale_j` | Category E, with BE-19–20. Randall-Sundrum correction. Signature `[T^-2]`, the same signature family as BE-19. The bridges tuple is `quantum` → `cosmological`. |
| 55 | F | scale-transition, `scale_i`, `scale_j` | Category F, with BE-21–23. Integer quantum Hall. The catalog signature is the conductance `[L^-2 M^-1 T^3 I^2]` of the single component `σ_xy`, a scalar. A scalar signature does not select a component. The bridges tuple is `quantum` → `classical`; category F keeps the symbolic scale pair, as BE-39's tuple does not move category L. |
| 56 | A | quantum-classical, `quantum`, `classical` | Category A, with BE-11 and BE-12. Casimir pressure. Signature `[L^-1 M T^-2]`. The bridges tuple `quantum` → `classical` agrees with the cluster. A pressure scalar does not add an index. |
| 57 | I | information-geometry, Poincaré and info | Category I. Unruh temperature. Signature `[temperature]`. The dependency on BE-42 is the same component (category M) and is not a second rule. |
| 58 | H | emergence, higher-rank ellipsis | Category H, with BE-27–29. Johnson-Nyquist spectral density. Signature `[L^4 M^2 T^-5 I^-2]`. The catalog names BE-58 as the theorem BE-27 refers to, and BE-27 is already in this component. The formula is a scalar. The ellipsis stays, as it does for BE-27's scalar encoded form. |
| 59 | F | scale-transition, `scale_i`, `scale_j` | Category F. Josephson frequency. Signature `[frequency]`. BE-11 carries the same signature in the quantum-classical component, so the signature does not decide. The bridges tuple is `quantum` → `classical`. |
| 60 | F | scale-transition, `scale_i`, `scale_j` | Category F. Fractional quantum Hall. The same conductance signature as BE-55. The dependency on BE-55 keeps it in category F's component. |
| 61 | F | scale-transition, `scale_i`, `scale_j` | Category F. Wiedemann-Franz Lorenz number. Signature `[L^4 M^2 T^-6 I^-2 Theta^-2]`. The temperature base in that signature does not pin the dimension index; group 5 leaves it free, as it does for BE-23's resistivity. |
| 62 | F | scale-transition, `scale_i`, `scale_j` | Category F. BCS gap. The catalog signature is `[energy]`, the dimension of the gap. The displayed ratio is dimensionless. Neither signature selects a component: BE-16 and BE-18 both carry `[energy]` and sit in different clusters. |
| 63 | I | information-geometry, Poincaré and info | Category I. Chandrasekhar mass. Signature `[mass]`. The bridges tuple is `quantum` → `classical`. BE-31 is already in this component with a different tuple (`quantum` → `cosmological`), so the tuple does not move BE-63 either. |
| 64 | I | information-geometry, Poincaré and info | Category I. Eddington luminosity. Signature `[power]`. Same cluster as BE-63. |
| 65 | I | information-geometry, Poincaré and info | Category I. Jeans mass. Signature `[mass]`, the same signature word as BE-63. The formula balances thermal energy against Newtonian gravity. That content stays in category I's pattern. |
| 66 | D | field-unification, force and symmetry | Category D, with BE-17 and BE-18. Radiation pressure. Signature `[L^-1 M T^-2]`, the pressure signature BE-56 already carries in a different cluster, so the signature does not decide. The bridges tuple is `optics` → `continuum`. The tuple does not select the component. |
| 67 | D | field-unification, force and symmetry | Category D. Alfvén speed. Signature `[velocity]`. The bridges tuple is `fluid` → `plasma`. A velocity signature does not select a component: BE-36's speed ratio is dimensionless and stays in this cluster for a different reason, and the tuple does not move BE-67. |
| 68 | I | information-geometry, Poincaré and info | Category I, with BE-57 and BE-63–65. Tolman–Ehrenfest. Signature `[temperature]`, the same signature word as BE-57. The bridges tuple is `gravitation` → `thermodynamics`. The shared component with BE-42 is not a chain. |
| 69 | D | field-unification, force and symmetry | Category D, with BE-66 and BE-67. Perpendicular fast magnetosonic speed. Signature `[velocity]`, the same signature word as BE-67. The bridges tuple is `fluid` → `plasma`. Sharing that tuple with BE-67 does not identify the two speeds. `c_s = 0` recovers the Alfvén number of a different polarization. |
| 70 | H | emergence, higher-rank ellipsis | Category H, with BE-27–29 and BE-58. Einstein relation. Signature `[L^2 T^-1]`. The bridges tuple is `kinetic` → `electromagnetic`. The formula is a scalar. The ellipsis stays, as it does for BE-27. |
| 71 | J | quantum-classical, `quantum`, `classical` | Category J, with BE-33–35. Clapeyron slope. Signature `[L^-1 M T^-2 Theta^-1]`. The bridges tuple is `thermodynamics` → `continuum`. The letter selects the component, as it does for BE-34, whose tuple is not `quantum` → `classical`. |
| 72 | I | information-geometry, Poincaré and info | Category I, with BE-68. Gravitational frequency ratio. Signature `[1]`. The bridges tuple is `gravitation` → `radiation`. The shared component with BE-68 is not a composition: the frequency ratio is not the Tolman invariant. |
| 73 | F | scale-transition, `scale_i`, `scale_j` | Category F, with BE-59–62. Kelvin relation. Signature `[L^2 M T^-3 I^-1]`, the voltage signature. BE-59's frequency and this voltage sit in the same cluster because the category letter says so. The bridges tuple is `thermal` → `electrical`. |
| 77 | D | field-unification, force and symmetry | Category D, with BE-74 and BE-76. Hagen–Poiseuille flux. Signature `[L^3 T^-1]`. The bridges tuple is `fluid` → `continuum`. |
| 78 | D | field-unification, force and symmetry | Category D. Pinned Euler load. Signature `[force]`. The bridges tuple is `continuum` → `mechanical`. |
| 79 | D | field-unification, force and symmetry | Category D. Parallel-plate pull-in voltage. Signature `[L^2 M T^-3 I^-1]`. The bridges tuple is `electromagnetic` → `continuum`. |
| 80 | F | scale-transition, `scale_i`, `scale_j` | Category F, with BE-73 and BE-75. Mott–Gurney current. Signature `[L^-2 I]`. The bridges tuple is `electromagnetic` → `condensed`. |
| 81 | D | field-unification, force and symmetry | Category D. Child–Langmuir current. Signature `[L^-2 I]`, the same signature word as BE-80, so the signature does not decide. The bridges tuple is `electromagnetic` → `vacuum`. |
| 82 | F | scale-transition, `scale_i`, `scale_j` | Category F. Shockley diode. Signature `[I]`. The bridges tuple is `electromagnetic` → `condensed`. |
| 83 | F | scale-transition, `scale_i`, `scale_j` | Category F, with BE-73. Thomson coefficient. Signature `[L^2 M T^-3 I^-1 Theta^-1]`. The bridges tuple is `thermal` → `electrical`. The dependency on BE-73 is not a composition: the quantities do not meet. |
| 84 | F | scale-transition, `scale_i`, `scale_j` | Category F. Four-point sheet resistance. Signature `[L^2 M T^-3 I^-2]`. The bridges tuple is `electromagnetic` → `condensed`. Not BE-35. |
| 85 | H | emergence, higher-rank ellipsis | Category H, with BE-58. One-sided shot noise. Signature `[T I^2]`. The bridges tuple is `quantum` → `classical`. The formula is a scalar. The ellipsis stays. |
| 86 | D | field-unification, force and symmetry | Category D. Reynolds analogy at Prandtl number 1. Signature `[1]`. The bridges tuple is `fluid` → `thermal`. |
| 87 | H | emergence, higher-rank ellipsis | Category H, with BE-70. Capacitor voltage variance. Signature `[L^4 M^2 T^-6 I^-2]`. The bridges tuple is `thermal` → `electrical`. The formula is a scalar. The ellipsis stays. |

**Topology slot left free.** BE-55 and BE-60 name a Chern number, and the BE-55 catalog text says the row populates the Topology axis. In the rank-6 order of Part I §1.1 that axis is the last index, ζ. Group 5 leaves ζ free, as it does for BE-22, whose area law carries a topological constant and is already in category F's list. A per-equation index that pins ζ to a Chern label is not a pattern the lists for ids 11–50 use. It is not introduced here.

### 6.2 Consistency Matrix

> **Known-issue note (see also Part-V §19.2):** The consistency requirements below — `det(C) != 0` AND all eigenvalues `lambda_k >= 0` — are **not simultaneously satisfiable in general** given the allowed {-1, 0, +1} entry values. For a real symmetric matrix with off-diagonal entries in {-1, 0, +1}, requiring positive-semi-definiteness (all eigenvalues >= 0) combined with non-singularity (det != 0) is equivalent to strict positive-definiteness, which generally rules out configurations with -1 off-diagonal entries. Treat this definition as **aspirational / target-for-future-reformulation**, not as an operational criterion. See Part-V §19.2 for the **canonical replacement (balance-theoretic, Harary 1953)**; the Gram-form alternative was retired because the embedding was unspecified, leaving the check parametric. Use the balance-theoretic check exclusively.

The bridge equations form a consistency matrix <img src="https://i.upmath.me/svg/%5Cmathbf%7BC%7D" alt="\mathbf{C}" /> where:

<img src="https://i.upmath.me/svg/C_%7Bij%7D%20%3D%20%5Cbegin%7Bcases%7D%0A1%20%26%20%5Ctext%7Bif%20bridge%20equations%20%7D%20i%20%5Ctext%7B%20and%20%7D%20j%20%5Ctext%7B%20are%20mutually%20consistent%7D%20%5C%0A0%20%26%20%5Ctext%7Bif%20they%20are%20independent%7D%20%5C%0A-1%20%26%20%5Ctext%7Bif%20they%20are%20contradictory%7D%0A%5Cend%7Bcases%7D" alt="C_{ij} = \begin{cases}
1 & \text{if bridge equations } i \text{ and } j \text{ are mutually consistent} \
0 & \text{if they are independent} \
-1 & \text{if they are contradictory}
\end{cases}" />

#### 6.2.1 Entry-construction recipe — illustrative

> **Why this is needed:** the balance-theoretic check that replaced `det(C) != 0 ∧ λ_k ≥ 0` is well-defined as a structural test (Harary 1953), but it is **operationally empty** without a recipe for assigning the actual `C_ij ∈ {-1, 0, +1}` to the 1953 off-diagonal pairs (63·62/2; 1653 under the 58-entry write-up; 1485 under the 55-entry write-up; 780 under the original 40-bridge catalog). "Mutually reinforcing / independent / contradictory" is not an operational predicate — it requires per-pair physics judgment. The candidate recipe below applies to two worked example pairs and is **illustrative, not authoritative**: full population of the 1953-entry matrix requires the per-pair physics judgment of a domain expert, which is precisely the deep open question the framework is supposed to address.

**Candidate recipe (illustrative).** Given two bridge equations `BE_i` and `BE_j`, assign:

- `C_{ij} = +1` if **both** of the following hold:
  - they share at least one fundamental constant (e.g., both use `ℏ`, or both use `G`, or both use `c`), **AND**
  - their dimensional signatures of LHS and RHS are mutually compatible after a domain-acceptable change of variable (e.g., both produce an entropy density, or both produce a stress-energy density).
- `C_{ij} = 0` if **none** of the following holds: they share no fundamental constants, AND they reference no overlapping symbol families, AND their domains are disjoint (e.g., one is a quantum-mechanical decoherence rate, the other is a cosmological-scale entropy bound). The pair is operationally independent.
- `C_{ij} = -1` if there is at least one **shared physical quantity** (a constant, a state, or a derived observable) that the two BEs assign **mutually inconsistent values or behaviors** (e.g., one BE predicts `dℓ/dt > 0` and the other predicts `dℓ/dt < 0` for the same length `ℓ` under the same conditions).

**Worked example 1 — BE-11 (Caldeira-Leggett quantum-classical decoherence) vs BE-19 (LQC bounce):**

| Test | Result |
|---|---|
| Shared fundamental constants | `ℏ`, `c` (BE-11 uses `ℏ` for quantum dynamics; BE-19 uses `ℏ` indirectly through `ℓ_P = √(ℏG/c³)`). |
| Symbol-family overlap | Marginal: BE-11's decoherence rate `γ_k(λ)` and BE-19's `ρ_crit` operate at different scales (lab vs cosmological). |
| Dimensional compatibility | LHS dimensions are different categories (decoherence rate `[T]^{-1}` vs critical density `[E][L]^{-3}`); not directly compatible without a thermodynamic embedding. |
| Mutual inconsistency? | None known. The two BEs operate in disjoint physical regimes; the LQC bounce makes no prediction about laboratory decoherence rates, and Caldeira-Leggett makes no prediction about cosmological bounce density. |
| **`C_{BE-11, BE-19}` (illustrative)** | **`0`** (operationally independent). |

**Worked example 2 — BE-22 (entanglement-entropy area scaling) vs BE-14 (Ryu-Takayanagi):**

| Test | Result |
|---|---|
| Shared fundamental constants | None directly displayed (BE-22 uses dimensionless `α`, `γ`, BE-14 uses `G_N`, `ℓ_P` implicitly via the Bekenstein-Hawking 1/4 prefactor). The shared *physics* is the area-scaling principle. |
| Symbol-family overlap | **YES**: both use `S(R)` or `S_A` for an entanglement entropy of a spatial region/surface; both involve a length / area as the scaling variable. |
| Dimensional compatibility | **YES**: both LHS are dimensionless (entropy in nats / bits); both RHS scale linearly with a length-times-coefficient or area-times-coefficient. The BE-22 `S(R) = αL(R) − γ + O(L^{-1})` is the (1+1)D limit of the BE-14 RT formula `S_A = Area(γ_A) / (4G_N)` in `(d+1)`-dimensional bulks. |
| Mutual inconsistency? | None known; BE-22 is a special-case-of pattern of BE-14 in low dimension. |
| **`C_{BE-22, BE-14}` (illustrative)** | **`+1`** (mutually reinforcing — both express the same area-scaling principle in different dimensional regimes). |

**Caveat.** The two worked examples above demonstrate that the recipe can be applied operationally for at least some pairs, but they do not constitute a *proof* that the recipe is well-defined for all 1953 off-diagonal entries (63·62/2 unordered pairs; 1653 under the 58-entry write-up, IDs 11–68; 1485 under the 55-entry write-up, IDs 11–65; 946 under the 44-entry write-up, IDs 11–54; 780 under the original 40-bridge catalog). In practice, populating the full matrix requires:
- a per-pair physics judgment (domain expertise; not all pairs admit a clean verdict),
- a tie-breaking convention for borderline cases (e.g., whether marginal symbol-family overlap counts as `+1` or `0`),
- and a versioning convention for entries that change as bridge equations themselves are reformulated (e.g., BE-30 `R3 invalid` makes all `C_{30, *}` entries undefined; the matrix must be re-evaluated when canonical forms change).

For these reasons the spec's `tractability_class` field on each `BridgeEquation` is set to `'undefined'` for off-diagonal pairs at present; the full consistency-matrix population is **not** a goal of the current framework version. The balance-theoretic check (Part-V §19.2, Harary 1953) is therefore conditional on a future entry-construction recipe being adopted; until then, the check is **structurally well-defined but operationally inactive**.