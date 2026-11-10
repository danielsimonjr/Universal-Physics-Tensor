# Tier-5 AST-Encoding Triage Memo

**Original date:** 2026-05-04 (Wave 1)
**Last refresh:** 2026-05-11 — Wave Z closure (catalog at 40/40; 0 invalid; 0 null dimensional_signature; 0 undefined tractability_class)
**Author:** Tier-5 rollout agent (Opus 4.7, 1M context); refreshed by main loop

## ✅ CATALOG CLOSED — Wave Z final state (2026-05-11)

The Tier-5 encoding rollout reached **full coverage**. Every BE-N entry
in `src/bridges/index.ts` (N ∈ {11..50}, 40 bridges total) now has:

- a non-null `dimensional_signature`,
- an AST module in `src/bridges/equations/be-N-*.ts`,
- a numerical evaluator with input-validation guards,
- per-bridge encoding tests plus participation in the cross-cutting
  round-trip / orphan-invariant / dim-map size tests.

**Final invariants** (master `b358257`):

| Metric | Value |
|---|---|
| AST encodings | **40 / 40** |
| `dimensional_signature === null` count | 0 |
| `status === 'invalid'` count | 0 |
| `tractability_class === 'undefined'` count | 0 |
| Test suite | 1161 / 1161 passing |
| Status distribution | 6 established · 31 speculative · 3 highly-speculative · 0 invalid |

The Wave Z arc that closed the catalog comprised 8 atomic commits
(2026-05-07 through 2026-05-11):

| Wave | Commit | Bridges | Notes |
|---|---|---|---|
| Z-A | `9cb299f` | BE-32, 35, 46, 50 | OpenAI-proposed dimensionless reductions |
| Z-B | `8e1a38c` | BE-25 IIT | log₂-stub for inner intrinsic information |
| Z-C | `1581733` | BE-17, BE-44 | typed-contraction stub; integral primitive |
| Z-D | `00f4379` | BE-15 | Kawasaki-Gunton squared-form |
| Z-E | `29932bf` | **BE-16** reformulated | Landauer's principle (lifted from `invalid`) |
| Z-F | `05900f3` | **BE-37** reformulated | Shapiro delay (lifted from `invalid`) |
| Z-G | `4651504` | **BE-28** reformulated | Onsager σ (user-accepted relabeling) |
| review | `1e0efbf`, `65c548e`, `b358257` | — | Final paper review + Gemini Pro cross-validation + docstring corrections |

**Both OpenAI o3 and Gemini Pro independently cross-validated** the
three highest-stakes reformulations (BE-16, BE-37, BE-28) as
defensible. See CHANGELOG `## [Unreleased]` for the full record.

The historical Wave-1-through-Wave-P triage analysis below is preserved
as the **closed-state archive**. It documents the path that brought the
catalog from 2/40 (Wave 1 baseline) to 40/40 (Wave Z closure). The
encodability classifications in the triage table (`yes-ready`,
`no-tensor`, `no-functional`, `no-r2-gap`, etc.) reflect the
**pre-encoding** classification — most of those classifications have
since been resolved by the encoding strategies developed during
Waves T-W (typed-stubs for tensor contractions; squared-form for
fractional exponents; integral primitive for soft-hair-style boundary
integrals) and Wave Z reformulations (replacing broken / contested
forms with canonical literature replacements).

---

## Historical archive — pre-closure triage (preserved for traceability)

**Wave P-D baseline (2026-05-06):** post Wave P-D, 477 tests passing,
11 entries with `dimensional_signature` (BE-11, 14, 18, 19, 22, 26,
34, 41, 47, 48 — BE-25 removed under Wave P-D R-D2 IIT reformulation:
Φ has no SI signature); 9 bridges had AST encodings (BE-11, 14, 19,
22, 25 stale-but-preserved, 26, 34, 41, 47).

**Wave 1 baseline:** `6cadffb`, 240 tests, 6 entries with
`dimensional_signature`, 2 encodings (BE-11, 14).

## Wave P Reformulation Pivot — Final State (2026-05-06)

**12 bridges reformulated under the Wave P strategic pivot** (complete
bridges to canonical literature forms when one exists, rather than
preserving R3-invalid):

| Wave | BEs reformulated | Canonical form |
|------|-------------------|------------------|
| P-A | 30, 33, 43, 50 | FLM `δS_EE = ⟨δH_R⟩`; Hertz-Millis 3D Heisenberg `ξ ~ T^{-ν/z}`; FLM (BE-43); Israel-Darmois junction (BE-50) |
| P-B | 12, 13, 17 | Caldeira-Leggett dephasing length; Jacobson 1995 thermodynamic Einstein eqs; canonical Einstein-Cartan torsion-spin |
| P-C | 23, 24, 36 | SYK / Planckian-dissipation linear-in-T; Förster FRET; Bekenstein 2004 TeVeS |
| P-D | 15, 25 | Hohenberg-Halperin Model A gradient flow; IIT Φ_max integrated information |

Plus 2 earlier-loop reformulations (outside the Wave P sequence):

| Wave | BEs reformulated | Canonical form |
|------|-------------------|------------------|
| Wave 2 (BE-22) | 22 | Kitaev-Preskill / Levin-Wen `S(R) = αL − γ` |
| Wave I.B C4 | 38 | Milgrom MOND `μ(x) = x/√(1+x²)` (non-relativistic) |

**Total reformulations across all waves: 14** (4 P-A + 3 P-B + 3 P-C + 2 P-D + 2 earlier).

**Final invalid count after Wave P-D: 2** (BE-16 + BE-37). Both are
genuinely unreformulable:

- **BE-16** (Complexity-Entropy) is algebraically self-refuting:
  combining `I = Tr(ρ log ρ) = -S_vN` with the master relation forces
  `dS/dt = 0` for any `C(ρ) > -1/k_B`, violating the Second Law.
- **BE-37** (Variable Speed of Light cosmology) fails Ellis-Uzan
  operational-meaninglessness — varying `c` is not a falsifiable
  physical proposal, and Albrecht-Magueijo / Moffat / Barrow VSL
  frameworks are non-equivalent (no canonical form to commit to).

**Final catalog status distribution (40 bridges):**
`established` × 8, `speculative` × 27, `highly-speculative` × 3,
`invalid` × 2.

## Scope

This memo triages bridge equations BE-15 through BE-50 against the
current operator-blind AST (`src/dimensional/validator.ts`). Honest-
claude rule: if a bridge's *spec form* requires primitives the AST does
not have (operator algebra, tensor indices, path integrals, functional
derivatives, inequalities), it is marked unencodable rather than forced.
Bridges flagged for R2 reformulation in their `notes` are also excluded;
encoding their broken spec form would lock in the gap.

## Encodability key

- `yes-ready` — the spec formula is a scalar/algebraic relation (or a
  WKB-style 1D integral / classical scalar potential / Friedmann-style)
  the current AST can carry without lying. No R2 gap-spec block.
- `yes-after-symbol-stub` — same as `yes-ready` but the encoding requires
  introducing one new named-`Dimension` constant (e.g. luminosity
  density, etc.).
- `no-operator-algebra` — needs commutators, density matrices, Lindblad
  ops, bras/kets, or quantum mutual info as primitives.
- `no-tensor` — needs free tensor indices (R_μν, T^μν, F_μν, g^rr/√g^tt).
- `no-path-integral` — needs `∫ dμ[g,φ]` or other functional integration.
- `no-functional` — needs functional/variational derivatives (`δ∫(...)dt = 0`).
- `no-inequality` — formula is an inequality, not an equation.
- `no-r2-gap` — the entry's `notes` field contains a "What would
  unblock a real fix" R2 gap-spec block; encoding the broken form
  would lock in the gap and contradict the audit chain.
- `no-r3-invalid` — the entry has been dispositioned R3 invalid. Two
  unfixable known_issues mark it; not encodable, not reformulable.
  Preserved as historical record. (Currently: BE-37; see brief at
  `BE-37-VSL-Disposition-Brief.md`.)

## Triage table

| BE | Status | Encodable | Why / What's blocking |
|----|--------|-----------|------------------------|
| 15 | speculative (Wave P-D R-D1) | `yes-after-symbol-stub` | **Reformulated 2026-05-06** to canonical Hohenberg-Halperin Model A gradient flow `∂φ/∂t = -Γ δH/δφ + ζ` with FDT noise correlator. AST encoding requires a functional-derivative primitive `δH/δφ`; could be encoded as a stochastic-PDE schematic but Φ-of-stochastic-PDEs is outside Tier-5 wave-1 scope. tractability_class: `numerical-tractable`. |
| 16 | **invalid (genuinely unreformulable)** | `no-r2-gap` | INVALID per disposition; algebraically self-refuting (combining `I = Tr(ρ log ρ) = -S_vN` with master relation forces `dS/dt = 0` for any `C(ρ) > -1/k_B`). One of two final invalid bridges. |
| 17 | speculative (Wave P-B R-B3) | `no-tensor` | **Reformulated 2026-05-06** to canonical Einstein-Cartan field equations with rank-3 torsion-spin coupling `T^λ_μν = (8πG/c⁴) S^λ_μν`. Tensor structure (rank-3 antisymmetric) is outside the AST's scalar scope. |
| 18 | speculative | `no-tensor` | Lagrangian density with covariant derivatives `D_μ Φ`, gauge field `G^a_μν G^{aμν}`, Dirac spinor; `dimensional_signature` already populated by hand but no tensor-aware AST. |
| 19 | speculative | `yes-ready` | Pure scalar Friedmann `H² = (8πG/3)ρ(1−ρ/ρ_c) + Λ/3`. |
| 20 | speculative | `no-operator-algebra` | The 3-momentum integral `∫d³k (ℏω_k/2)ζ(k/k_UV)` is a vacuum-fluctuation sum over modes; the AST treats integration as multiply, but the integration measure `d³k` is not an `ExprNode` and `ω_k` requires a dispersion relation symbol. Could be encoded but bracket-check leads into the cosmological-constant problem; not first-wave material. |
| 21 | established | `no-tensor` | `(g^rr/√g^tt)` — explicit metric components, retarded Green's function with limit and partial derivatives in radial coordinate. |
| 22 | speculative | **yes-ready (encoded 2026-05-05)** | **Reformulated** to canonical Kitaev-Preskill / Levin-Wen `S(R) = αL − γ` (the owner approved 2026-05-05 per Action 2 of the 1/2/3 directive). The broken `α log(ξ/a)` and `β(T/T_c)^ν log(A/ℓ_P²)` terms were dropped; new form has α [L⁻¹], L [L], γ [1] — round-trips to `[1]`. AST module at `src/bridges/equations/be-22-topological-entanglement.ts`. References: Kitaev-Preskill PRL 96:110404, Levin-Wen PRL 96:110405. |
| 23 | speculative (Wave P-C R-C1) | `yes-after-symbol-stub` | **Reformulated 2026-05-06** to SYK / Planckian-dissipation linear-in-T resistivity `ρ(T) = ρ_0 + (k_B T/ℏ)(1/n_e e²)α_SYK`. tractability_class: `numerical-tractable`. |
| 24 | speculative (Wave P-C R-C2) | `yes-ready` | **Reformulated 2026-05-06** to canonical Förster FRET `η = 1/(1+(R/R_0)⁶)`, `k_FRET = (1/τ_D)(R_0/R)⁶`. Bound-respecting, scalar-algebraic. tractability_class: `closed-form`. |
| 25 | speculative (Wave P-D R-D2) | **stale-AST + no-tractable-encoding** | **Reformulated 2026-05-06** to canonical IIT Φ_max integrated information form `Φ_max(S) = min_θ [ii(s,s̃) - ii_θ(s,s̃)]` with intrinsic info `ii(s,s̃) = p(s̃|s) log₂[p(s̃|s)/p(s̃)]`. Φ_max computation is exponential in system size (intractable beyond ~10 elements). Legacy Penrose-Hameroff AST module `src/bridges/equations/be-25-orch-or.ts` is preserved as stale-but-traceable but no longer participates in the dimensional_signature catalog (BE-25 removed). tractability_class: `formally-divergent`. |
| 26 | established | `yes-ready` | WKB tunneling rate `Γ = ν_0 exp(−(2/ℏ)∫√(2m(V−E))dx) · f(T,pH,EM)`. The integral sub-expression is encodable (1D over dx); `f(T,pH,EM)` is treated as an opaque dimensionless prefactor. |
| 27 | speculative | `no-operator-algebra` | The susceptibility `χ(ω)` involves a Fourier integral over `⟨δF(t)δx(0)⟩` — a correlation function that is operator-valued in the standard formulation. Could attempt as classical, but the formula's intent is operator-correlation; encoding would mislead. |
| 28 | speculative | `no-functional` | Variational principle `δ∫(...)dt = 0`; the AST has no functional-derivative primitive. |
| 29 | speculative | `no-tensor` | Already has `dimensional_signature: '[energy]'` from R1, but the integral `∫T^μν δg_μν √(−g) d⁴x` is over a tensor contraction; tensor-blind AST cannot validate the integrand's index structure. |
| 30 | speculative (Wave P-A R-A1) | `no-functional` | **Reformulated 2026-05-06** to canonical FLM first-law `δS_EE(R) = ⟨δH_R⟩` with modular Hamiltonian `H_R = -log ρ_R`. Operator-valued; not in scalar AST scope. |
| 31 | speculative | `no-r2-gap` | R2 reformulation; (ρ²ℓ_P⁴)^{1/4} vs Ricci [L^−2] mismatch + V^{2/4} typo, but full fix is structural rewrite to Benincasa-Dowker. |
| 32 | speculative | `no-path-integral` | `\|ψ⟩_B = ∫dg U(g)\|ψ⟩_A ⊗ \|g⟩_frame` — group-integration over a quantum frame; no operator/group primitive in the AST. |
| 33 | speculative (Wave P-A R-A2) | `yes-after-symbol-stub` | **Reformulated 2026-05-06** to canonical Hertz-Millis scaling `ξ ~ T^{-ν/z}` (3D Heisenberg, `z=1, ν≈0.71`). tractability_class: `numerical-tractable`. |
| 34 | established | `yes-ready` | `n_defect = (τ_Q/τ_0)^{−dν/(1+zν)} · exp(−m c²/(k_B T_reh))`. Pure scalar; non-trivial exponent involves dimensionless ratios + Boltzmann factor. |
| 35 | established | `no-tensor` | 4-point CFT correlator `⟨O₁O₂O₃O₄⟩ = Σ C₁₂ C₃₄ g_{Δ,ℓ}(u,v)` — operator-valued correlation function with conformal block structure; no scalar reduction. |
| 36 | speculative (Wave P-C R-C3) | `no-tensor` | **Reformulated 2026-05-06** to canonical Bekenstein 2004 TeVeS relativistic MOND with three-field action `S = S_g + S_φ + S_A + S_matter`. Tensor-valued; not in scalar AST scope. tractability_class: `numerical-tractable`. |
| 37 | **invalid (genuinely unreformulable)** | `no-r3-invalid` | **R3 disposition applied 2026-05-05.** Two unfixable known_issues: (1) Ellis-Uzan 2005 operational-meaninglessness (arXiv:gr-qc/0305099); (2) non-equivalence of Albrecht-Magueijo / Moffat / Barrow VSL frameworks. See `docs/planning/BE-37-VSL-Disposition-Brief.md`. **Final invalid bridge alongside BE-16.** |
| 38 | speculative (Wave I.B C4) | `yes-ready` | **Reformulated 2026-05-05** to canonical Milgrom MOND `μ(x) = x/√(1+x²)`. tractability_class: `numerical-tractable`. |
| 39 | speculative | `no-functional` | Functional renormalization-group flow at the schematic level only; truncation must be specified. |
| 40 | established | `yes-ready` | Composite Higgs potential `V(h) = −αf² sin²(h/f) + βf⁴[sin⁴(h/f) − sin²(h/f)cos²(h/f)]`. Treating `sin(h/f)`, `cos(h/f)` as dimensionless symbols (since h/f is dimensionless), the potential is a polynomial in those × powers of f. The status_text in `notes` flags "dimensionally inhomogeneous as written" — we MUST verify the encoding is dimensionally homogeneous; if not, this becomes `no-r2-gap`. **Verified during encoding scratch:** treating sin/cos as dimensionless yields `[energy²]`-vs-`[energy⁴]` mixing — inhomogeneous. **Re-classified `no-r2-gap`** post-investigation. |
| 41 | speculative | `yes-ready` | Swampland `m(φ) = m₀ exp(−α\|φ−φ₀\|/M_P)` — pure scalar exponential. |
| 42 | highly-speculative | `no-operator-algebra` | Quantum state superposition `\|ψ⟩ = α\|smooth⟩ + β\|firewall⟩`; no scalar reduction. |
| 43 | speculative (Wave P-A R-A3) | `no-functional` | **Reformulated 2026-05-06** to FLM first-law / wormhole stress-energy. Operator-functional; not in scalar AST scope. |
| 44 | speculative | `no-tensor` | Soft-hair charge with explicit complex-coordinate 2-form integration `dz ∧ dz̄`; no differential-form primitive. |
| 45 | speculative | `no-inequality` | TCC bound `N_e < log(M_P/H_inf) − γ log(r/0.01)` — inequality, not equation. |
| 46 | highly-speculative | `no-path-integral` | Multiverse measure `P[O] = ∫dμ[g,φ] W[g,φ] δ(...)` — functional integration with undefined measure. |
| 47 | speculative | `yes-ready` | Already has `dimensional_signature: '[L^-3 T^-1]'`. ODE balance `dY/dt + 3HY = ⟨σv⟩_SM n_p n_n − ⟨σv⟩_dark n_χ² ε_transfer`. Encode each term and check balance. |
| 48 | established | `no-operator-algebra` | Already has `dimensional_signature: '[frequency]'` (rate-form), but the GRW master equation has commutator `[H,ρ]`, anti-commutator `{L^†L,ρ}`, density matrix ρ, position operator r̂; cannot encode in AST. (Hand-computed `[frequency]` is honest at the rate level.) |
| 49 | speculative | `no-operator-algebra` | Quantum mutual information `I(S:F_k)`; not a primitive in the AST. |
| 50 | speculative (Wave P-A R-A4) | `no-tensor` | **Reformulated 2026-05-06** to canonical Israel-Darmois junction conditions for a thin-shell wormhole. Tensor structure (extrinsic curvature jump `[K_μν]`); not in scalar AST scope. |

## Triage breakdown

> **Refreshed 2026-05-06 (Wave P-D pivot complete):** the `no-r2-gap`
> bucket has been emptied of all 12 reformulated bridges. All 12 Wave P
> reformulations land canonical-literature-form replacements, moving each
> bridge out of `no-r2-gap` into the appropriate AST-encodability bucket.
> The two remaining `invalid` bridges (BE-16 algebraically self-refuting;
> BE-37 Ellis-Uzan operational-meaninglessness) are genuinely
> unreformulable and labeled `no-r2-gap` / `no-r3-invalid`.

- **`yes-ready` (8, all encoded except BE-24 / BE-38 pending Tier-5 wave-2):**
  BE-19, BE-22 ✨ *(reformulated 2026-05-05)*, BE-24 ✨ *(reformulated 2026-05-06)*,
  BE-26, BE-34, BE-38 ✨ *(reformulated 2026-05-05)*, BE-41, BE-47.
  (Note: BE-25 was previously `yes-ready` under the dropped Penrose-Hameroff
  form; under Wave P-D R-D2 IIT reformulation, Φ_max is exponential in
  system size and no longer fits Tier-5 wave-1 scope.)
- **`yes-after-symbol-stub` (3):** BE-15 ✨ *(Wave P-D R-D1)*, BE-23 ✨
  *(Wave P-C R-C1)*, BE-33 ✨ *(Wave P-A R-A2)*.
- **`no-r2-gap` (1):** BE-16 (genuinely unreformulable; algebraically
  self-refuting).
- **`no-r3-invalid` (1):** BE-37 (genuinely unreformulable; Ellis-Uzan
  operational-meaninglessness).
- **`no-operator-algebra` (5):** BE-20, BE-27, BE-42, BE-48, BE-49.
- **`no-tensor` (8):** BE-17 ✨ *(Wave P-B R-B3)*, BE-18, BE-21, BE-29,
  BE-35, BE-36 ✨ *(Wave P-C R-C3)*, BE-44, BE-50 ✨ *(Wave P-A R-A4)*.
- **`no-functional` (4):** BE-28, BE-30 ✨ *(Wave P-A R-A1)*, BE-39,
  BE-43 ✨ *(Wave P-A R-A3)*.
- **`no-path-integral` (2):** BE-32, BE-46.
- **`no-inequality` (1):** BE-45.
- **stale-AST + no-tractable-encoding (1):** BE-25 ✨ *(Wave P-D R-D2;
  legacy Penrose-Hameroff AST module preserved but no longer in catalog)*.
- **Other** (BE-31, BE-40 still no-r2-gap on independent grounds):
  BE-31 (Benincasa-Dowker structural rewrite required), BE-40 (Composite
  Higgs dimensionally inhomogeneous as written).

Total: 36 entries (BE-15 .. BE-50). Sum: 8 + 3 + 1 + 1 + 5 + 8 + 4 + 2 + 1 + 1 + 2 = 36 ✓.

Plus the originally-encoded BE-11 and BE-14 (out of this triage's BE-15+
scope), the catalog has **9 total AST encodings** as of master `5389095`.

(BE-40 was re-classified from `yes-ready` to `no-r2-gap` during Wave-1
scratch: the spec form mixes `[energy²]` and `[energy⁴]` terms unless one
postulates `sin²(h/f)` to be dimensionless *and* `α`, `β` to absorb
hidden powers of f². The `notes` field already calls this out as
"dimensionally inhomogeneous as written," so encoding the broken form
would lock in the gap. Honest-claude: skip — it stays `no-r2-gap` until
a domain expert commits to a homogeneous reformulation.)

## Wave-1 plan

The 6 `yes-ready` candidates that pass the (a) `yes-ready` × (b)
not-R2-gap × (c) bracket-checkable triple gate:

1. **BE-19** Quantum Bounce — Friedmann + bounce term; bracket-check: at
   `ρ = ρ_crit`, RHS reduces to `Λ/3`; at `Λ = 0, ρ << ρ_crit`, recovers
   standard Friedmann.
2. **BE-25** Orch-OR collapse time — `t_OR = ℏ/(Δm c² Δx/ℓ_P)`; bracket-
   check: 1 mg sphere displaced 10 nm gives ~ms. Status pin
   `highly-speculative` (does not promote).
3. **BE-26** DNA mutation tunneling — WKB rate; bracket-check: hydrogen-
   bond proton transfer ~10^-3 to 10^3 /s.
4. **BE-34** Kibble-Zurek with curvature — defect density per Planck
   volume; bracket-check: `τ_Q = τ_0` with full Boltzmann gives `n_defect
   = exp(−m c²/(k_B T_reh))`.
5. **BE-41** Swampland distance — `m(φ₀) = m₀` (identity at the
   reference point), `m → 0` as `α(φ−φ₀)/M_P → ∞`.
6. **BE-47** BBN dark-sector coupling — already has
   `dimensional_signature: '[L^-3 T^-1]'`; encode each term of the ODE and
   verify the balance.

These six are atomic, bracket-checkable, and not on the R2 gap list.
Each gets one TDD-strict commit.

## Skipped explicitly (Wave 1 disposition; some have moved since)

- **BE-22** (topological entanglement) — *Wave-1 status: skipped due to
  log-of-length-ratio dimensionless-handling.* **2026-05-05: reformulated
  to canonical Kitaev-Preskill / Levin-Wen `S(R) = αL − γ` (the owner
  approved); now encoded.** Moved to `yes-ready (encoded)` above.
- **BE-43** (wormhole dynamics) — `S_entanglement` is operator-derived.
- **BE-45** (TCC bound) — inequality.
- **BE-49** (Quantum Darwinism) — quantum mutual information not in AST.
- **BE-40** (Composite Higgs) — re-classified `no-r2-gap` after scratch.

## Future waves

After Wave 1, BE-39 might become encodable if a functional-derivative
primitive lands, BE-21 if the AST learns metric-component-blind tensor
contractions, and BE-20 if a dispersion-relation primitive lands.
The owner will decide.
