# UPT Bridge Catalog — Physics-Correctness Audit v2

<!-- ste:historical-record -->

<!-- repo-map:no-verification -->

> **No `## Verification` block, deliberately.** This document is a physics-correctness audit dated 2026-05-24. Its claims are about the physics of catalog entries and are established by literature review, not by any parse of the source.
> The drift gate treats a missing Verification section as a failure, so the opt-out is
> stated here explicitly rather than left to be inferred from its absence.

**Generated:** 2026-05-24
**Catalog audited:** `universal-physics-tensor` v0.7-prep, the 44-bridge `BRIDGE_EQUATIONS` registry at HEAD `acae340` (branch `claude/changelog-todo-sync-9PdMg`)
**Reviewer:** Adam (architectural + theory-correctness re-derivation)
**Predecessor:** [`BRIDGE-PHYSICS-AUDIT.md`](archive/BRIDGE-PHYSICS-AUDIT.md) (2026-05-20, 42 bridges, Gemini 2.5 Pro + OpenAI o3, 84 reviews)

---

## Scope — what this v2 audits

The v1 audit was completed against the 42-bridge catalog. Between 2026-05-20 and 2026-05-24
the catalog materially changed. This v2 audits only the **deltas**, plus a fresh
catalog-level recount; it does NOT re-audit bridges unchanged since v1.

Post-v0.7 deltas in scope:

1. **2 new catalog entries** — BE-53 (Yang-Mills β-function) and BE-54 (Randall-Sundrum brane).
2. **17 `unknown↔unknown` renames** applied (BE-21/22/26/27/30/31/33/34/37/38/39/41/43/45/47/48/49).
3. **9 NOT-A-BRIDGE structural-marker assignments** kept as `[unknown, unknown]` (BE-28/29/32/35/40/42/44/46/50).
4. **5 v1 §5 status recalibrations**: BE-14 demoted established → speculative; BE-16/BE-29 kept speculative with audit footnote; BE-34 deferred; BE-40 kept established with notes clarification.
5. **`encoded_form` field** added to `BridgeEquationEntry` and applied to BE-13, BE-47, BE-48.
6. **BE-33 exponent** already corrected to `−1/z` (pinned `−1`) per `src/bridges/equations/be-33-hertz-millis.ts:7`; v1 recommendation was stale at write-time.

---

## Headline

**The two new entries (BE-53, BE-54) are sound encodings of canonical physics. The post-v0.7 catalog
editorial work is largely correct, with two specific NOT-A-BRIDGE classifications that I
disagree with (BE-29 Jarzynski, BE-42 Hawking T) and a sweeping `encoded_form` gap that
re-creates the v1 §1 transparency problem the field was added to solve.**

- **0 INVALID verdicts** against any equation in the deltas. Both BE-53 and BE-54 encode canonical
  literature correctly to the precision spot-checked.
- **1 reviewer disagreement with NOT-A-BRIDGE classifications**: BE-29 Jarzynski equality IS arguably a
  non-equilibrium ↔ equilibrium bridge, and BE-42 Hawking temperature IS the archetypal quantum ↔ gravity
  bridge (ℏ + G in one scalar). The audit-§3 finding "canonical physics mis-filed" was about the
  *category* (Information Paradox Resolutions), not about whether the equation bridges regimes.
- **1 sweeping `encoded_form` coverage gap**: v0.7 applied the field to the 3 bridges the v1 audit
  named (BE-13/47/48), but at least **13 other bridges** carry an analogous reduction documented
  prominently in `notes:` and should also carry `encoded_form` (BE-17/18/20/21/27/29/32/35/36/42/44/46/50).
  The transparency principle that motivated the field applies equally to them.
- **1 catalog-naming subtle disagreement**: BE-31 [quantum, cosmological] is defensible but
  [quantum, classical] would be a tighter fit (continuum limit is the classical-spacetime limit,
  not the cosmological-scale limit).
- **No status-distribution drift problem** — the recount is consistent with the editorial intent.

---

## v2-specific section: post-v0.7 changes scope

Post-v0.7 changes are categorized below by the scope they touch.

### Catalog-level structural changes

| Change | Scope | Verdict |
|---|---|---|
| Catalog length 42 → 44 (add BE-53, BE-54) | New entries | Verified at `tests/bridges/catalog-integrity.test.ts:95` (`expect(...length).toBe(44)`) |
| `encoded_form?: string` field added | Type schema | Verified at `src/bridges/index.ts:116-172` |
| `encoded_form` applied | 3 entries (BE-13/47/48) | Verified at `src/bridges/index.ts:288, 1629, 1669` — see §7 below for coverage gap |
| 17 unknown↔unknown renames | Catalog `bridges:` field | See §4 |
| 9 NOT-A-BRIDGE structural markers | Catalog `bridges:` field (left as [unknown,unknown]) | See §5 |
| 5 audit-§5 recalibrations | Status fields | See §3 |

### Test-suite changes verified at HEAD

- `tests/bridges/be-53-encoding.test.ts:131` — pins `expect(computeB0(3, 6)).toBeCloseTo(7, 12)` ✓
- `tests/bridges/be-54-encoding.test.ts:42` — pins `expectBridgeInIndex(54, 'speculative')` ✓
- `tests/bridges/catalog-integrity.test.ts:89-95` — pins catalog length 44 ✓

---

## 1. BE-53 (Yang-Mills β-function) — verified canonical

**Source:** `src/bridges/equations/be-53-yang-mills-beta.ts` (226 lines), catalog entry `src/bridges/index.ts:1840-1860`.

### Equation verification

**Display form (catalog `formula_latex`):**
`β(g) = -b₀g³/(16π²) + O(g⁵), b₀ = (11/3)C₂(G) − (4/3)T(R)N_f`

This is exactly Peskin-Schroeder §16.6 conventions. For SU(N_c) gauge group with N_f Dirac fermion
flavors in the fundamental representation:
- C₂(G) = N_c (quadratic Casimir of the adjoint of SU(N_c))
- T(R) = 1/2 (Dynkin index of the fundamental of SU(N))

Substituting: `b₀ = (11/3) N_c − (4/3) (1/2) N_f = (11/3) N_c − (2/3) N_f`. This matches the
module's `computeB0` implementation (`src/bridges/equations/be-53-yang-mills-beta.ts:223-225`).

**QCD pin (test `tests/bridges/be-53-encoding.test.ts:131`):** `b₀ = 7` for (N_c=3, N_f=6).
- `(11/3)·3 − (2/3)·6 = 11 − 4 = 7` ✓

**Pure SU(3) gluodynamics (N_f=0):** `b₀ = 11`. Test pins this at `tests/bridges/be-53-encoding.test.ts:136`. Matches Peskin-Schroeder Eq. 16.135.

**Asymptotic-freedom boundary:** `b₀ = 0` at `N_f = (11/2)N_c = 16.5` for SU(3). Test pins at `tests/bridges/be-53-encoding.test.ts:141`. Standard textbook result.

**Verdict: VERIFIED.** The equation is canonical Peskin-Schroeder §16, the QCD value pin is correct,
the asymptotic-freedom boundary is correct.

### Status verification (`'established'`)

Defensible. Asymptotic freedom is the most empirically validated non-Abelian gauge-theory result
of the late 20th century (Nobel 2004; deep-inelastic-scattering Q²-evolution data is the
direct test). The catalog correctly distinguishes the *equation* (established) from any UPT
*framing*.

**Honest-claude flag on the equation-vs-framing distinction.** Per the v1 audit §3 / §5
discipline (BE-16 / BE-29 precedent), the catalog generally marks an entry 'speculative' when
the bridge *framing* is the speculative element even though the equation is canonical. BE-53
breaks that pattern: status 'established' is on the equation; the UPT framing is implicit. By
the BE-16 precedent, this could plausibly be 'speculative' on framing grounds. **However**,
BE-53's framing is much weaker — there is no auxiliary "use this as the UPT QFT ↔ classical
bridge" extra-commitment, just RG flow itself. I read this as a defensible departure rather
than an inconsistency; the test suite enshrines 'established' (`tests/bridges/be-53-encoding.test.ts:49`).

### `bridges: ['quantum', 'classical']` verification

Defensible — RG flow runs from UV (high-energy / quantum-fluctuation-dominated) to IR
(low-energy / classical-limit). The asymptotic-freedom *interpretation* is that the coupling
vanishes in the UV, but the bridge label captures the running-coupling spans-regimes nature.

This is structurally identical to BE-39 (asymptotic safety) — same bridge pair, same RG-flow
mechanism, different fixed-point physics (g* = 0 for BE-53 vs (g*, λ*) ≠ (0,0) for BE-39).
The structural duality is well-documented in the module docstring (`src/bridges/equations/be-53-yang-mills-beta.ts:33-39`).

### Bridge-legitimacy question

The v1 audit §3 framing question: *is this actually a bridge or just a single-regime QFT result?*

I argue **it is a bridge**, lightly. RG flow connects two effective theories at different
scales; that is the textbook content of asymptotic freedom (a UV-IR bridge). Not the same kind
of bridge as BE-30 (entanglement ↔ geometry, two fundamentally distinct regimes), but coherent
with `[quantum, classical]` as a scale-bridge. Not NOT-A-BRIDGE.

---

## 2. BE-54 (Randall-Sundrum brane cosmology) — verified canonical

**Source:** `src/bridges/equations/be-54-randall-sundrum-brane.ts` (286 lines), catalog entry `src/bridges/index.ts:1803-1839`.

### Equation verification

**Display form (catalog `formula_latex`):**
`H² = (8πG/3)ρ(1 + ρ/(2σ)) + Λ/3`

This is the BDEL 2000 (Binétruy-Deffayet-Ellwanger-Langlois, arXiv:hep-th/9910219) brane
cosmological equation with two structural omissions documented in the module:
1. Dark-radiation term `C/a⁴` (Weyl-tensor projection from 5D bulk) — `src/bridges/equations/be-54-randall-sundrum-brane.ts:27-29` flags this as structurally distinct and deferred.
2. The numerical evaluator drops Λ/3 for the minimum structural form (`src/bridges/equations/be-54-randall-sundrum-brane.ts:171-179`); the AST encodes the full Λ/3 form.

Both omissions are correctly flagged. The displayed form is the canonical BDEL 2000 result with the dark-radiation term omitted.

### Dimensions verification

ρ pinned to `[M·L⁻³]` mass-density (matches BE-19's convention) at `src/bridges/equations/be-54-randall-sundrum-brane.ts:58-60`. σ uses the same dimension at `src/bridges/equations/be-54-randall-sundrum-brane.ts:111-115`. Correction factor `(1 + ρ/(2σ))` is dimensionless ✓. The cosmological constant Λ uses the c²-rescaled `[T⁻²]` convention (Ryden §6), consistent with BE-19. LHS `H²` infers to `[T⁻²]` ✓.

`validateBraneFriedmannDimensions` (`src/bridges/equations/be-54-randall-sundrum-brane.ts:211-220`) confirms LHS and RHS both infer `[T⁻²]`. Test `tests/bridges/be-54-encoding.test.ts:99` pins this.

**Verdict: VERIFIED.**

### `FriedmannEquationNode` variant: 'brane' encoding

The structural encoding `BE54_BRANE_FRIEDMANN_STRUCTURAL` (`src/bridges/equations/be-54-randall-sundrum-brane.ts:278-286`) uses `variant: 'brane'` per the BE-19 agent's `FriedmannEquationNode` design. This exercises the variant-discriminator design payoff documented in `src/dimensional/friedmann-equation.ts:32-41` — brane-tension correction lands as a pure additive use of the existing primitive without extending it. Good design hygiene.

### Status verification (`'speculative'`)

Defensible. Brane cosmology is canonical theoretical physics within the RS II framework, but no
experimental observation confirms extra dimensions; ρ ~ σ would require Planck-scale densities
(early-universe regime). 'Speculative' correctly captures this.

### `bridges: ['quantum', 'cosmological']` verification

Defensible but contestable. The argument given (catalog notes at `src/bridges/index.ts:1808-1822`): σ
is a Planck-scale (quantum-gravity) parameter; its effect on the Friedmann equation constitutes a
quantum-to-cosmological bridge.

**My read:** [quantum, cosmological] is defensible because the brane tension σ enters the
correction at the Planck-scale energy density. The alternative [classical, cosmological] would be
weaker — the BDEL equation IS a modification of classical cosmology, but the *modification* is
specifically the quantum-gravity-origin correction term (1 + ρ/(2σ)). The 'quantum' label
captures the origin of the modification, not the regime of the unmodified Friedmann equation.
Same logic that places BE-19 (LQC) in [quantum, cosmological].

**Verdict: ACCEPT** [quantum, cosmological].

---

## 3. Status recalibrations from v1 §5 — verification of editorial decisions

Per commit `9d2c20c` (2026-05-24), the 5 v1 §5 status recalibrations were applied conservatively:
1 status flip + 3 footnotes + 1 deferral.

### BE-14 (HQECC) — demoted established → speculative

**Verified at `src/bridges/index.ts:298`** (status now `'speculative'`).

**Adam verdict: CORRECT.** No test rationale to override. The 'established' was incidentally set;
HQECC as a research program is plausibly modeled in AdS/CFT toy systems but not corroborated as
a real microphysical description of bulk-boundary information transfer. Demotion is sound.

**MINOR DOC-INTEGRITY FLAG:** The `notes:` field at `src/bridges/index.ts:308` still reads
`status_text: Established (within AdS/CFT). The Ryu-Takayanagi formula ... is a well-established
result ...`. This was not updated to reflect the demotion. The notes field describes Ryu-Takayanagi
which is itself canonical (and is the Tier-5 encoding's actual target), but the status fields the
v0.7 sprint updated talk about HQECC. Two readings of one entry exist; this is a
status-vs-notes coherence gap, not a physics error.

### BE-16 (Landauer) — kept speculative with footnote

**Verified at `src/bridges/index.ts:377`** (status `'speculative'`); footnote appended at end of
`notes:` field (`src/bridges/index.ts:424`).

**Adam verdict: CORRECT.** The equation-vs-framing distinction is sound: Landauer's principle
is experimentally validated, but the catalog's claim is that Landauer's bound IS the UPT
microscale-↔-emergent bridge, which is one of several plausible candidates (Margolus-Levitin,
Bremermann, etc.). The 'speculative' on framing is defensible. Footnote correctly preserves the
audit reasoning inline.

### BE-29 (Jarzynski) — kept speculative with footnote

**Verified at `src/bridges/index.ts:955`** (status `'speculative'`); footnote at `src/bridges/index.ts:978`.

**Adam verdict: CORRECT** on status reasoning, but see §5 below for a separate disagreement about
the NOT-A-BRIDGE classification on the same entry.

### BE-34 (KZM curved spacetime) — deferred

**Verified at `src/bridges/index.ts:1130`** (status still `'established'`).

**Adam verdict: CORRECT to defer.** The Boltzmann-factor dispute (v1 §4) is still unresolved at
HEAD. Resolving status without resolving the formula would create a more confused entry. The
deferral itself is a finding: BE-34 has an *unresolved Adam-vs-Eve high-confidence disagreement*
about whether `exp(−mc²/k_B T_reh)` belongs in the formula at all. This blocks a clean status
recalibration.

### BE-40 (Composite Higgs) — kept established with clarification

**Verified at `src/bridges/index.ts:1371`** (status `'established'`); footnote at `src/bridges/index.ts:1389`.

**Adam verdict: COMPROMISE ACCEPTED.** SO(5)/SO(4) coset structure IS canonical group theory.
Composite Higgs scenarios themselves are BSM. The clarification footnote captures the nuance
correctly. No physics error in the recalibration.

---

## 4. 17 unknown↔unknown renames — spot-check

Per `docs/architecture/archive/v0.7-physics-judgment-proposals.md` §3, 17 entries were renamed from
`bridges: [unknown, unknown]` to explicit regime pairs. Verified at HEAD via the catalog
file at the IDs noted.

### HIGH-confidence renames (audit-doc rated HIGH) — all defensible

| BE | New `bridges` | Adam verdict |
|---|---|---|
| 21 | `[quantum, condensed-matter]` | ACCEPT — KSS (AdS/CFT quantum) bounds CM transport |
| 26 | `[quantum, biological]` | ACCEPT — tunneling rate, biological context |
| 30 | `[information, gravity]` | ACCEPT — FLM first-law of entanglement ↔ Einstein equations |
| 33 | `[quantum, classical]` | ACCEPT — quantum critical point ↔ classical scaling |
| 37 | `[classical, gravity]` | ACCEPT — Shapiro delay: classical EM + GR gravity |
| 38 | `[information, gravity]` | ACCEPT — Verlinde entropic gravity |
| 43 | `[quantum, gravity]` | ACCEPT — entanglement ↔ wormhole geometry (ER=EPR) |
| 45 | `[quantum, cosmological]` | ACCEPT — TCC: QG scale on cosmological inflation |
| 47 | `[cosmological, dark-sector]` | ACCEPT — self-explanatory |
| 48 | `[quantum, classical]` | ACCEPT — GRW/CSL: superposition → localization |
| 49 | `[quantum, classical]` | ACCEPT — Quantum Darwinism: q→c emergence |

All HIGH-confidence renames are physics-defensible. No errors flagged.

### MEDIUM-confidence renames — most defensible, one minor concern

| BE | New `bridges` | Adam verdict |
|---|---|---|
| 22 | `[quantum, holography]` | ACCEPT — TEE is a quantum-info signature; QG link is holographic |
| 27 | `[mesoscopic, classical]` | ACCEPT — active matter at mesoscopic scale; FDT-violation observed classically |
| 31 | `[quantum, cosmological]` | **MINOR FLAG** — defensible but [quantum, classical] would arguably be tighter (continuum limit is the classical-spacetime limit, not specifically cosmological-scale) |
| 34 | `[quantum, cosmological]` | ACCEPT — cosmological-KZM defensible |
| 39 | `[quantum, classical]` | ACCEPT — RG flow UV (QG) → IR (classical), parallel to BE-53 |
| 41 | `[quantum, cosmological]` | ACCEPT — Swampland-DC: QG constraint on cosmological inflation |

**BE-31 minor flag:** Causal sets are a discrete quantum-gravity proposal; the continuum limit
gives back smooth spacetime. The continuum limit gives back GR / smooth-pseudo-Riemannian
geometry, which is classical-physics regime, not specifically cosmological-physics regime.
The catalog naming `[quantum, cosmological]` reads as if the continuum limit "becomes
cosmology"; in fact it becomes classical-GR spacetime (which then admits cosmological
solutions, but not exclusively). **This is a labeling preference, not an error.** Either
[quantum, classical] or [quantum, cosmological] is defensible.

---

## 5. 9 NOT-A-BRIDGE classifications — two disagreements

Per `docs/architecture/archive/v0.7-physics-judgment-proposals.md` §3, 9 entries are kept with
`bridges: [unknown, unknown]` as a *structural marker* meaning "this is a single-regime law,
not actually a regime-spanning bridge." The proposed long-term fix (per v0.7 doc) is to move
them to a separate `LAW_EQUATIONS` registry in v0.8+.

### Audit-§3 framing distinction

The v1 audit §3 bridge-incoherence finding was that some entries are "real physics but not
genuine bridges." The v0.7 NOT-A-BRIDGE marker operationalizes this. **However**, two of the
applied classifications conflate "mis-filed in the wrong catalog category" with "not a bridge."

### Defensible NOT-A-BRIDGE classifications (7 of 9)

| BE | NOT-A-BRIDGE rationale | Adam verdict |
|---|---|---|
| 28 (MEPP/Onsager) | Single-regime nonequilibrium statmech; encoded form is Onsager σ = Σ Jᵢ Xᵢ (single regime) | ACCEPT |
| 32 (QRF) | Intra-quantum gauge-redundancy result; LOW conf in audit doc | ACCEPT (with same LOW conf) |
| 35 (Conformal bootstrap) | Pure-CFT internal-consistency; single regime | ACCEPT |
| 40 (Composite Higgs) | Single-regime BSM field theory; SO(5)/SO(4) is internal | ACCEPT |
| 44 (Soft hair) | BMS asymptotic-symmetries, single regime; info-paradox link speculative | ACCEPT (MEDIUM conf) |
| 46 (Multiverse measure) | Meta-physics framing; not a bridge equation | ACCEPT |
| 50 (Wheeler-Feynman) | Time-symmetric EM, single regime with TR structure; LOW conf in audit | ACCEPT (with same LOW conf) |

### DISAGREEMENTS (2 of 9)

#### BE-29 (Jarzynski equality) — flag as POSSIBLY a real bridge

**Catalog notes (`src/bridges/index.ts:978`):** "HIGH NOT-A-BRIDGE: single-regime statistical
mechanics result (Jarzynski equality)."

**Adam disagreement:** The Jarzynski equality `ΔF = -k_B T ln⟨exp(-W/(k_B T))⟩` is in fact a
*non-equilibrium ↔ equilibrium bridge*. The free-energy difference ΔF is an equilibrium
property; the work W is measured along an *arbitrarily out-of-equilibrium* protocol. The
non-trivial content of Jarzynski is precisely that an equilibrium quantity can be extracted
from non-equilibrium measurements. That IS a regime-spanning relation.

**Possible labels:** `[non-equilibrium, equilibrium]` or `[classical, classical]` lateral
("connects two ensembles in the same regime"). Calling it NOT-A-BRIDGE undersells the
non-trivial physics content. **However**, in the existing catalog `bridges` vocabulary
(`quantum/classical/cosmological/...`), there is no natural slot for `non-equilibrium`. So the
practical question is: does NOT-A-BRIDGE convey the right meaning? I argue: no, the Jarzynski
equality is not "mere single-regime statmech" — it is one of the more striking statmech
bridges in the literature (and is precisely a v0.8 `LAW_EQUATIONS` candidate only if "law"
encompasses fluctuation theorems).

**Recommended fix:** EITHER (a) rename to `[mesoscopic, mesoscopic]` lateral with a notes
clarification that it bridges non-equilibrium and equilibrium ensembles, OR (b) leave as
NOT-A-BRIDGE but add a notes flag acknowledging the regime-spanning content. Status quo is
defensible at LOW confidence; v0.7's HIGH NOT-A-BRIDGE confidence is too strong.

#### BE-42 (Hawking temperature) — flag as a real bridge, mis-classified

**Catalog notes (`src/bridges/index.ts:1457`):** "HIGH NOT-A-BRIDGE: audit-S3 confirmed
canonical physics mis-filed; single quantum-gravity regime."

**Adam disagreement, with detailed re-derivation:**

The Hawking temperature `T_H = ℏc³/(8πGMk_B)` is **the** archetypal example of a quantum ↔
gravity bridge in fundamental physics. The formula contains:
- ℏ (quantum constant) in the numerator
- G (gravitational constant) in the denominator
- M (gravitational mass) in the denominator
- c (relativity) and k_B (thermodynamics) as bridge constants

Without quantum mechanics, T_H = 0 (purely classical black holes have no temperature). Without
gravity, T_H is undefined (no event horizon). The formula *requires* both regimes to be
non-trivial. This is the textbook example of how Hawking-radiation discovery was a unification
breakthrough — Bekenstein's classical analogy (entropy ∝ area) became literal thermodynamics
only by inserting ℏ via quantum field theory in curved spacetime.

The audit-§3 finding "canonical physics mis-filed under Information Paradox Resolutions"
correctly identifies that the *catalog category* (Information Paradox Resolutions) is the wrong
home — but that is a category-assignment problem, not a "not a bridge" finding. T_H IS a
quantum-gravity bridge; the catalog category should be moved (e.g., to a "Quantum Gravity
Effects" category) and the `bridges:` field should be `[quantum, gravity]`.

**Recommended fix:** Change `bridges:` to `[quantum, gravity]`, remove NOT-A-BRIDGE
classification, and (separately, lower priority) consider re-categorizing the entry's
`category` field from M ("Information Paradox Resolutions") to a more accurate category. The
v0.7 NOT-A-BRIDGE marker is a category error here — Hawking T is canonical Hawking and
canonical bridge, not "single-regime."

**Confidence:** HIGH. This is one of the most-cited bridge formulas in modern physics.

---

## 6. Audit-doc staleness check — recommend v1 doc gets a v2 superseded-by header

The v1 audit's recommendations had three documented stale carry-forwards:
- "~9 unknown bridges" → actual 26 (per `v0.7-unknown-unknown-bridges-inventory.md`)
- BE-33 exponent fix recommendation → already-fixed at write-time (per `be-33-hertz-millis.ts:7`)
- The 5 status recalibrations → only partially applicable per the test-pinned rationale doc

These were caught and documented inline at v1 application time (notably v1 doc lines 144-148
on the recalibration revert). **However**, a v2-supplements-v1 header on the v1 doc would
prevent future audits from re-reading v1 as a standalone document. This v2 audit itself is
that supplement.

**Recommended minimal addition to v1 doc:** a banner line at the top:
```
> **Superseded for catalog-state claims by BRIDGE-PHYSICS-AUDIT-v2.md (2026-05-24).** v1
> remains the historical record of the 2026-05-20 84-review pass against the 42-bridge
> catalog. Status-distribution numbers, "~9 unknown bridges" counts, and the BE-33 exponent
> recommendation are stale; see v2 for current state.
```

I don't write that change here (out of audit scope), but it's the recommended doc-hygiene
fix.

---

## 7. `encoded_form` coverage gap — sweeping finding

The v1 audit §1 retraction recommended adding an `encoded_form` field to bridges whose AST
encodes a reduction of `formula_latex` (the v1 doc, "What to do with this", item 1). The v0.7
sprint added the field and applied it to **3 bridges** (BE-13, BE-47, BE-48 — the v1 audit's
explicit "encoding-reduction" category).

**Spot-check at HEAD: at least 13 other bridges carry analogous reductions documented
prominently in `notes:` but do NOT have `encoded_form` set.** Per `grep -nE "scalar
reduction|squared-norm reduction"` across `src/bridges/index.ts`:

| BE | Reduction documented in notes | `encoded_form` set? |
|---|---|---|
| BE-13 | Scalar trace of Einstein eq | ✓ |
| BE-17 | Squared-invariant scalar reduction S²_spin | ✗ — needs |
| BE-18 | Scalar mass relation from full Lagrangian | ✗ — needs |
| BE-20 | Scalar CC density from divergent integral | ✗ — needs |
| BE-21 | Scalar KSS value from operator Green's function | ✗ — needs |
| BE-27 | Scalar T_eff from operator FDT correlator | ✗ — needs |
| BE-29 | Pure Jarzynski from gravity-extended form | ✗ — needs |
| BE-32 | Born-rule probability from operator integral | ✗ — needs |
| BE-35 | R_cross scalar from 4-pt expansion | ✗ — needs |
| BE-36 | Dimensionless ratio from TeVeS action | ✗ — needs |
| BE-42 | Hawking T from firewall superposition | ✗ — needs |
| BE-44 | Squared-norm L² reduction from BMS charge | ✗ — needs |
| BE-46 | Weinberg-Vilenkin exp from path integral | ✗ — needs |
| BE-47 | Single-species rate from coupled rate system | ✓ |
| BE-48 | Localization rate from Lindblad master eq | ✓ |
| BE-50 | Time-symmetry residual ratio from gauge field | ✗ — needs |

**The transparency principle that motivated `encoded_form` applies equally to all 13 of these.**
The field is `optional`, so absence is not a type error — but the v1 audit's stated rationale
("makes the catalog honest about the formula/encoding distinction") is undermined by
selective application.

**Recommended fix (mechanical, low-risk):** Mass-populate `encoded_form` for the 13 entries
listed. Each entry's `notes:` field already contains the reduction description in prose; the
job is to extract a single-line summary into the structured field. This would be a clean v0.8
hygiene sprint.

---

## 8. Status distribution recount at 44-bridge HEAD

Per `grep -E "^\\s+status: '" src/bridges/index.ts | sort | uniq -c`:

| Status | v1 count (42) | v2 count (44) | Δ |
|---|---|---|---|
| established | 8 | 8 | 0 |
| speculative | 31 | 33 | +2 |
| highly-speculative | 3 | 3 | 0 |
| invalid | 0 | 0 | 0 |
| **Total** | **42** | **44** | **+2** |

**Established (8):** BE-11, BE-21, BE-34, BE-35, BE-40, BE-51, BE-52, BE-53. (BE-14 demoted out;
BE-53 added in. Net 0 change in count.)

**Speculative (33):** All bridges not listed elsewhere. BE-14 moved in (from established).
BE-54 added in. BE-48 was speculative in v1 (the Wave Y reformulation already
applied). Net +2.

**Highly-speculative (3):** BE-42, BE-46, BE-50. Unchanged.

**Distribution Δ:** −1 established (BE-14 demoted) + +1 established (BE-53 added) = net 0
established change. +2 speculative (BE-14 in + BE-54 in). The recount matches the editorial
intent.

**No drift problem flagged.** The status distribution is consistent with the documented
editorial decisions.

---

## 9. Reviewer disagreements with v0.7 editorial decisions

Summary of where this v2 audit disagrees with applied v0.7 work:

| BE | v0.7 decision | Adam disagrees | Severity |
|---|---|---|---|
| BE-29 | NOT-A-BRIDGE HIGH conf | "Mere single-regime statmech" undersells the non-eq ↔ eq bridge content | MEDIUM |
| BE-42 | NOT-A-BRIDGE HIGH conf | Archetypal quantum ↔ gravity bridge; category-mis-filing ≠ NOT-A-BRIDGE | HIGH |
| BE-14 | demoted to speculative | Defensible | n/a |
| BE-31 | [quantum, cosmological] MEDIUM | [quantum, classical] would be slightly tighter | LOW (preference) |
| `encoded_form` | Applied to 3 of ~16 candidates | Coverage gap re-creates v1 §1 problem | MEDIUM (systemic) |

No physics errors in the catalog deltas; the disagreements are over editorial classifications.

---

## 10. Honesty notes

- This v2 audit was single-reviewer (Adam-perspective re-derivation), NOT the dual Adam+Eve
  pass that produced v1. Where v2 differs from v1 it does so as a single-model second opinion,
  not a tie-breaker. Treat v2's NOT-A-BRIDGE disagreements (BE-29, BE-42) as "worth a second
  look", not "settled."
- All file:line claims in this doc were grep-verified against HEAD `acae340` at write-time.
  Specific verifications:
  - BE-33 exponent: `src/bridges/equations/be-33-hertz-millis.ts:7` reads `z = 1 (Lorentz-invariant QCP) → exponent -1/z = -1` ✓
  - Catalog length pin: `tests/bridges/catalog-integrity.test.ts:95` reads `expect(BRIDGE_EQUATIONS.length).toBe(44)` ✓
  - 9 unknown↔unknown remaining: `grep -n "unknown" src/bridges/index.ts | grep "bridges:"` returns 9 hits at lines 923/946/1054/1159/1370/1422/1507/1563/1709 = BE-28/29/32/35/40/42/44/46/50 ✓
  - Status counts: `grep -E "^\\s+status: '"` returns 8 established / 3 highly-speculative / 33 speculative ✓
  - `encoded_form` applied to 3: `grep -nE "encoded_form" src/bridges/index.ts` returns 4 hits (one is the type definition) at lines 163/288/1629/1669 = BE-13/47/48 ✓
- The recalibration commit `9d2c20c` was verified via `git show` for diff content; the 5
  changes (1 status flip + 3 footnotes + 1 deferral) match the recalibration-analysis doc.
- I did NOT run the test suite. Test pins were verified by reading the test files.
- I did NOT independently verify the Peskin-Schroeder §16 β-function formula from a copy of
  the textbook; the verification is from standard QFT knowledge cross-checked against the
  module's `computeB0` implementation and test pins.
- I did NOT independently verify the BDEL 2000 brane-Friedmann form from arXiv:hep-th/9910219;
  the verification is from standard brane-cosmology review knowledge.
- The `notes:` field on BE-14 is doc-incoherent post-demotion (says "status_text: Established
  (within AdS/CFT)" while `status` is now 'speculative'). Flagged as a doc-integrity finding,
  not a physics error.

---

## What to do with this

Reordered by severity:

1. **(Optional, HIGH-value)** Reconsider BE-42 (Hawking T) NOT-A-BRIDGE classification.
   Recommended action: change `bridges:` to `[quantum, gravity]`; drop NOT-A-BRIDGE marker.
   This is a clean physics call — Hawking T is the archetypal q-g bridge.
2. **(Optional, MEDIUM-value)** Reconsider BE-29 (Jarzynski) NOT-A-BRIDGE confidence. Either
   leave as NOT-A-BRIDGE with reduced confidence + notes flag, OR rename to lateral
   `[mesoscopic, mesoscopic]` or `[classical, classical]` with a notes clarification about
   non-equilibrium ↔ equilibrium bridging.
3. **(Recommended, MEDIUM-value hygiene)** Mass-populate `encoded_form` for the 13 listed
   entries (BE-17/18/20/21/27/29/32/35/36/42/44/46/50). The reduction descriptions are
   already in `notes:`; the job is mechanical extraction. Closes the v1 §1 transparency-gap
   finding fully rather than for a sub-sample.
4. **(Optional doc hygiene)** Fix the BE-14 notes-vs-status incoherence: the `notes:` field
   still describes 'established' framing while status is 'speculative'. Either rewrite the
   notes summary or add a footnote noting the demotion.
5. **(Optional doc hygiene)** Add a "superseded for catalog-state claims by v2" banner to
   the v1 audit doc.
6. **(Existing deferral, no Adam-side new finding)** BE-34's Boltzmann-factor dispute remains
   unresolved at HEAD; the v1 §4 "STILL UNRESOLVED" verdict stands. No additional Adam-side
   evidence either way.

> **Honest summary of this v2 audit's scope and accuracy:** v2 is single-reviewer (no Eve
> counter-pass) and addresses only the v0.7-and-later catalog deltas. Its findings on BE-53,
> BE-54, and the 5 status recalibrations are based on direct file-line verification at HEAD
> `acae340`. Its NOT-A-BRIDGE disagreements (BE-29, BE-42) are physics-content calls that
> warrant a second Eve-perspective opinion before being applied. The `encoded_form` coverage
> gap finding is mechanical and high-confidence — the grep evidence at §7 makes it directly
> verifiable.

---

## Eve red-team gap analysis

> **Reviewer:** Eve (empirical-claims red-team + completion-gap finder).
> **Scope:** orthogonal to Adam's per-bridge content review above. The goal here is to
> surface gaps INCOMPLETE in the v0.7 follow-up sprint — work that Adam's content pass
> would not catch by construction.
> **HEAD verified:** `acae340` on `claude/changelog-todo-sync-9PdMg`.
> Every finding below is grep-verified with file:line citation. Uncertainty flagged
> explicitly per the Eve-R1 discipline.

### E1. Test-suite gap: `EXPECTED_DIMENSION_BY_BRIDGE` map is stale at HEAD (HIGH priority)

**Finding.** BE-53 and BE-54 are NOT registered in
`src/dimensional/bridge-check.ts`'s `EXPECTED_DIMENSION_BY_BRIDGE` map. The map's
verification test (`tests/dimensional/bridge-check.test.ts:230`) pins
`expect(EXPECTED_DIMENSION_BY_BRIDGE.size).toBe(40)` and iterates ids 11..50
only. So the test passes (40 entries, all 11..50 present) while silently failing
to enforce the new BE-53/54 dimensional invariants.

The protocol explicitly documented in
`tests/bridges/orphan-dimensional-signature.test.ts:37-43` step 4 says: "Add the
per-bridge expected dim to `EXPECTED_DIMENSION_BY_BRIDGE` in
`src/dimensional/bridge-check.ts`." That step was skipped for the BE-53/54
landings (`acae340`, `c400185`).

**Concrete diff needed:**
- `src/dimensional/bridge-check.ts:144` (after the BE-50 entry): add
  `[53, DIMENSIONLESS]` and `[54, T_INV2]`.
- `tests/dimensional/bridge-check.test.ts:230`: bump `.toBe(40)` → `.toBe(42)`;
  extend the for-loop id list to include 53, 54.

**Why it matters.** `inferDimensionForBridge` silently falls through to "no
expected" for ids not in the map. A future encoding-regression on BE-53/54
that flipped their RHS dim would not be caught by the per-bridge expected-dim
guard. This is the same shape of regression the map was built to prevent
(per `tests/bridges/dimensional-signature-catalog.test.ts` pinning).

**Cross-reference inconsistency:** `ENCODED_RHS_IDS` in
`tests/bridges/orphan-dimensional-signature.test.ts:57` DOES include 53 and 54.
So one half of the encoded/orphan disjoint-union machinery was updated and the
other half wasn't — directly evidencing the missed step.

### E2. Stale test-count carry-forwards in 6 v0.7 docs (MEDIUM priority)

The actual test count at HEAD is **2056 passed / 5 skipped / 1 todo** (verified
via `npm test` 2026-05-24, duration 20s). The v0.7 documentation queue claims
much smaller numbers, all stale:

| Doc | Stale claim | File:line |
|---|---|---|
| `v0.7-release-notes-draft.md` | "1854 passed" (in 5 places) | `:96, :137, :144, :156, :174` |
| `v0.7-release-preflight-log.md` | "1854 passed" + table cells | `:59, :64, :135` |
| `v0.7-be-module-exports-audit.md` | "Suite unchanged (1854 passed)" | `:73` |
| `v0.7-be-x-reencoding-design-note.md` | "1888 → 1897 passed (+9)" | `:234` |
| `v0.7-physics-judgment-proposals.md` | "must preserve 1888 passed" gate | `:327` |
| `CHANGELOG.md` | "1675 → 1897 (+222)" / "1897 → 1992 (+95)" | `:11, :70` |

The HIGHEST documented number anywhere (CHANGELOG.md "1992") is **64 below**
HEAD. This pattern matches the v0.7 session's documented "stale carry-forward"
lesson — but the lesson got applied to PC-1.5 / AS-3 / BE-module / unknown-bridges
numbers and NOT to test counts within the v0.7 docs themselves. **Eighth+ stale
carry-forward of the session, by Eve's count.**

Especially concerning: `v0.7-release-preflight-log.md:135` ("pending tag" table)
locks `1854` as the release-gate number. If the release ships against this stale
gate, the table becomes a permanent historical inaccuracy.

**Recommended fix:** mechanical sed `1854 → 2056` (verify per-doc first) +
update CHANGELOG suite delta line. Low-risk if done before tagging.

### E3. CLAUDE.md status-distribution count is stale at 42-bridge totals (LOW priority)

`CLAUDE.md` (the project context file) line 81 says:

> Status distribution across the 42-bridge catalog: 8 established · 31 speculative
> · 3 highly-speculative · 0 invalid (re-tallied from `src/bridges/index.ts`
> `status:` fields).

Verified at HEAD (`grep -E "^\s+status: '" src/bridges/index.ts | sort | uniq -c`):
- 44 entries total (not 42)
- 8 established (unchanged: BE-14 demotion offset by BE-53 promotion)
- 33 speculative (+2: BE-14 demotion + BE-54 added)
- 3 highly-speculative (unchanged)

CLAUDE.md text needs updating to "**44**-bridge catalog: 8 established · **33**
speculative · 3 highly-speculative · 0 invalid". Adam's §8 covers the
distribution but does not flag the CLAUDE.md drift.

### E4. v0.7-be-x-reencoding-design-note.md is stale: all 4 implementations shipped (LOW priority)

The doc reads (line 11): "implementations land per-bridge in follow-up sessions"
and §"Recommended order of implementation" frames the 4 BE-X re-encodings as
forward-looking. **All 4 shipped before HEAD `acae340`**:

- BE-13 `TensorTraceNode` — commit `f57fad5` "feat(bridges): BE-13 TensorTraceNode structural re-encoding (v0.7)"
- BE-19 `FriedmannEquationNode` (variant='lqc') — commit `af27132`
- BE-39 `BetaFunctionNode` + `RGCouplingNode` — commit `5e7e812`
- BE-50 `GaugeFieldNode` + `TimeSymmetryPredicateNode` — commit `e8d3df0`

The design note has not been updated to reflect "delivered". A reader will
mistake it for outstanding scope. **Recommended fix:** add a banner at the top:
"**Status (2026-05-24): All four BE-X re-encodings shipped.** This doc is
historical; see commit log entries `f57fad5`, `af27132`, `5e7e812`, `e8d3df0`."

### E5. v0.7-physics-judgment-proposals.md §4 is stale (LOW priority)

`docs/architecture/v0.7-physics-judgment-proposals.md:309` says:

> Section 4 — BE-13/19/39/50 re-encoding (NOT proposed here)
> The v0.6.0 deferred entry says these "would need new primitives… No proposal
> here."

All four landed (same commits as E4 above). Same fix: prefix Section 4 with a
"**SHIPPED 2026-05-24**" header.

### E6. NOT-A-BRIDGE doc-internal off-by-one (LOW priority)

`docs/architecture/v0.7-physics-judgment-proposals.md:280` reads:

> **8 NOT-A-BRIDGE** (BE-28, 29, 32, 35, 40, 42, 44, 46, 50 — per audit §3
> bridge-incoherence finding)

The list contains **9** ids, but the count says 8. Same inconsistency repeats
at `:282`: "The 8 NOT-A-BRIDGE entries should EITHER…" — applied to 9 entries.
Implementation is correct (9 entries marked NOT-A-BRIDGE in catalog at HEAD,
verified by `grep -B5 "bridges: \[\`unknown\`" src/bridges/index.ts | grep "^  id:"`).
Pure doc-arithmetic typo, but reads as a missed entry.

### E7. Audit §5 "slightly strong" recalibration is silently dropped, not addressed (MEDIUM priority)

The v1 audit §5 lists: "BE-28, 33, 44, 45, 47 carry verdicts suggesting their
labels are slightly strong" (`BRIDGE-PHYSICS-AUDIT.md:126`).

Adam's §3 covers BE-14/16/29/34/40 — the explicitly-named recalibrations. The
"also BE-28, 33, 44, 45, 47" group is handled by
`v0.7-bridge-status-recalibration-analysis.md:106-108`:

> ## BE-28, 33, 44, 45, 47 (audit §5 "slightly strong")
> All already at `'speculative'` (the audit's recommended direction); no
> recalibration needed. Audit's "slightly strong" language could justify a
> demotion to `'highly-speculative'` for one or two, but the test surface
> doesn't currently distinguish — no urgency.

**Verification at HEAD** (per `grep` of status fields):
- BE-28: speculative ✓ (one tier above the implied audit direction)
- BE-33: speculative ✓
- BE-44: speculative ✓
- BE-45: speculative ✓
- BE-47: speculative ✓

**Verdict on the gap:** the v0.7 analysis is defensible — all five are already
ONE tier below 'established'. But "no urgency" means none was promoted to
'highly-speculative' (the audit's implied next tier). If a v0.8 sprint takes
the audit recommendation seriously, candidates would be:

- BE-28 (Onsager-as-MEPP relabeling explicitly documented as a scope-limited
  surrogate — `src/bridges/index.ts` BE-28 notes contains the "IMPORTANT
  honest-claude scope" warning; arguably 'highly-speculative'-tier framing).
- BE-44 (audit-NOT-A-BRIDGE MEDIUM-confidence; squared-norm reduction does
  not encode BMS-charge content — analogous to BE-28's scope limitation).

The other three (BE-33, BE-45, BE-47) have canonical-equation content with
speculative bridge framing — the standard 'speculative' rationale applies.

**Recommendation:** flag as v0.8 candidate work, not v0.7 follow-up gap.
Document as "audit §5 'slightly strong' five — accepted as 'speculative' tier;
demotion to 'highly-speculative' deferred to v0.8 with per-bridge review".

### E8. Reverse NOT-A-BRIDGE check: 17 renamed entries — any candidates for
demotion-to-NOT-A-BRIDGE? (LOW priority)

The 26 unknown↔unknown entries split 17 named / 9 NOT-A-BRIDGE in the v0.7
sprint. Reverse-direction check: are any of the 17 named ones arguably
single-regime?

Eve spot-check of the 17 (current `bridges:` field per `grep` at HEAD):

| BE | Renamed `bridges` | Eve's reverse-check verdict |
|---|---|---|
| 21 | quantum/condensed-matter | Defensible (KSS bound spans AdS/CFT to η/s) |
| 22 | quantum/holography | **Marginal** — TEE is intra-quantum-information; "holography" is the conjectural bridge framing |
| 26 | quantum/biological | Defensible (DNA tunneling spans QM to biology) |
| 27 | mesoscopic/classical | Defensible |
| 30 | information/gravity | Defensible (FLM first law) |
| 31 | quantum/cosmological | **Marginal** — causal-set continuum limit is intra-quantum-gravity |
| 33 | quantum/classical | Defensible (Hertz-Millis QCP) |
| 34 | quantum/cosmological | Defensible (KZM in curved spacetime) |
| 37 | classical/gravity | Defensible (Shapiro delay) |
| 38 | information/gravity | Defensible (Verlinde) |
| 39 | quantum/classical | Defensible (asymptotic safety NGFP) |
| 41 | quantum/cosmological | Defensible (swampland) |
| 43 | quantum/gravity | Defensible (ER=EPR) |
| 45 | quantum/cosmological | Defensible (TCC) |
| 47 | cosmological/dark-sector | Defensible (BBN dark coupling) |
| 48 | quantum/classical | Defensible (GRW localization) |
| 49 | quantum/classical | Defensible (Darwinism) |

**Two marginal cases** (BE-22, BE-31) where a stricter audit might prefer
NOT-A-BRIDGE. Both have plausible framings in the named direction; neither
needs immediate action. Flag for v0.8 audit consideration.

### E9. v0.7-pc15-shapiro-floor.md and v0.7-be-module-exports-audit.md — stale "carry-forward count" lesson is referenced but not catalogued (LOW priority)

Both docs cite "Nth stale carry-forward this session" as a session-trail breadcrumb
(v0.7-pc15 mentions PC-1.5 4 OOM; v0.7-be-module 40%, etc.). At HEAD the count of
documented stale carry-forwards from this session is **9+** by Eve's count:

1. PC-1.5 Shapiro residual (4 OOM)
2. AS-3 schwarzschildPin (1 OOM)
3. BE-module unused-exports estimate (40% inflation)
4. Vitest reporter limitation (resolved)
5. Unknown-bridge count (9 → 26)
6. PG scope (~2× inflation)
7. BE-33 already-fixed
8. **E2 above: test counts in 6 docs (1854/1888/1897/1992 vs HEAD 2056)**
9. **E3 above: CLAUDE.md 42-bridge tally**
10. **E1 above: `EXPECTED_DIMENSION_BY_BRIDGE` map missing BE-53/54**

No single doc consolidates this list. The "verify carry-forward numbers"
discipline lesson lives in scattered footnotes (`v0.7-be-module-exports-audit.md:131-136`,
`v0.7-physics-judgment-proposals.md:36-37`). **Recommendation (LOW):** the v0.8
release should consolidate this into a single retrospective entry in
`docs/architecture/` (e.g., `v0.7-retrospective.md`) covering all 10. Otherwise
the next session re-derives the same lesson again from the scattered
breadcrumbs.

### E10. BE-53/BE-54 references — plausible but not externally verified (LOW priority)

BE-53 references (Gross/Wilczek 1973 PRL 30:1343; Politzer 1973 PRL 30:1346;
Peskin/Schroeder 1995 §16) are pre-arXiv-era Nobel-laureate classics; Eve has
high prior confidence these are genuine but **did not externally verify** at
audit time (no public-fetch tool available for non-arXiv pre-1991 references).

BE-54 references (Randall-Sundrum 1999 arXiv:hep-ph/9905221; BDEL 2000
arXiv:hep-th/9910219; Maartens-Koyama 2010 *Living Rev. Relativity* 13:5
arXiv:1004.3962) — Eve attempted `WebFetch` on all three arXiv IDs; **arxiv.org
returned HTTP 403 to the fetch tool**, so the IDs could not be externally
confirmed in this session. The IDs match arXiv's pre-2007 / post-2007
numbering conventions and the journal pairings are plausible for the cited
years. No fabrication-flag indicator (e.g., a paper author who never
co-authored with the named partner) was found; Eve marks as
**plausible-but-unverified**.

**Recommendation (LOW):** when external-fetch is next available, spot-verify
the three BE-54 arXiv IDs. Same prudence as the v1 audit's
"D'Ariano & Dowker, arXiv:2105.08390" honesty-flag.

### E11. LaTeX brace-balance check on BE-53/BE-54 — PASS

Eve programmatic brace-balance check on the new entries:
- BE-53 `formula_latex`: 6 open + 6 close, balanced ✓
- BE-54 `formula_latex`: 6 open + 6 close, balanced ✓

No malformed-command markers (`\\fra`, `\\le` standalone, etc.) found in either.

### E12. Dimensional-signature spot-check on BE-53/BE-54 — PASS

Per `src/bridges/equations/be-53-yang-mills-beta.ts` the RHS is encoded with
all symbols `dim: DIMENSIONLESS`. Catalog `dimensional_signature: '[1]'`
matches. ✓

Per `src/bridges/equations/be-54-randall-sundrum-brane.ts`: LHS is `H²` with
`dim: T_INV2` (`{ L:0, M:0, T:-2, … }`); RHS inferred via
`validateBraneFriedmannDimensions()`. Catalog `dimensional_signature: '[T^-2]'`
matches. ✓

### E13. v0.7-release-notes-draft "Pre-publish checklist" — stale test-count gate (HIGH priority)

`docs/architecture/v0.7-release-notes-draft.md:174` reads:

> - [ ] `npm test` — confirm 1854 / 0 failed / 5 skipped / 1 todo

If the release is tagged with this gate as-is and someone follows it
literally, they'll find 2056 / 0 failed / 5 skipped / 1 todo and either
(a) panic about the mismatch and block the tag, or (b) edit the gate
inline at tag time and miss other stale numbers. **Updating this single
line before tag is the highest-leverage fix** of all the E2 stale-count
findings.

---

## Eve summary — gaps grouped by 6-axis prompt

| Axis | Eve findings | Highest-priority |
|---|---|---|
| 1. Carry-forward staleness | E2, E3, E4, E5, E6, E9 | E2 (6 docs with stale test counts) |
| 2. NOT-A-BRIDGE consistency | E6 (count-off-by-one), E8 (2 marginal renames) | — (no defects; doc-typo only) |
| 3. Status recalibration completeness | E7 (BE-28/33/44/45/47 "slightly strong" not actioned) | E7 (deferred to v0.8) |
| 4. `encoded_form` completeness | (Adam's §7 covers fully) | — |
| 5. BE-53/54 empirical-claims | E10 (refs unverified), E11/E12 (LaTeX/dim OK) | E10 (arXiv refs not externally verified) |
| 6. Tests-vs-catalog drift | E1 (`EXPECTED_DIMENSION_BY_BRIDGE` missing BE-53/54), E13 (pre-publish gate stale) | **E1 (silent test-coverage gap)** |

### Three highest-priority gaps for immediate follow-up

1. **E1 — `EXPECTED_DIMENSION_BY_BRIDGE` map missing BE-53/54.** Silent
   test-coverage gap; protocol-step skipped at the BE-53/54 landing
   commits. Two-line code fix + one-line test-count bump.
2. **E13 — Pre-publish checklist gate `1854` is stale.** Will trigger
   either a false-positive block or an inline-edit-and-miss at tag time.
3. **E2 — 6 v0.7 docs cite stale test counts (1854/1888/1897/1992).**
   Highest documented number is 1992; HEAD is 2056. The
   `v0.7-release-preflight-log.md` table cell will become a permanent
   historical inaccuracy if the release ships against the stale gate.

### Three lowest-priority gaps to defer to v0.8

1. **E8 — Two marginal renames (BE-22 TEE, BE-31 causal-set continuum
   limit) where a stricter audit might prefer NOT-A-BRIDGE.** Both
   defensible as-is; per-bridge review during a v0.8 audit pass.
2. **E10 — BE-54 arXiv references not externally verified.** Plausible
   but uncorroborated; verify when external-fetch is available.
3. **E9 — Session-retrospective stale-carry-forward catalog not
   consolidated.** Scattered breadcrumbs across v0.7 docs; consolidate
   in a v0.7-retrospective doc during v0.8 prep.

> **Eve audit honesty notes.** Single-reviewer pass; no Adam counter-pass on
> these E-findings. All findings file:line cited. The `2056` test count was
> obtained via a full `npm test` run at audit time (HEAD `acae340`, vitest
> 4.1.7, 20s duration on this Linux box). The arXiv-reference status (E10) is
> explicitly flagged unverified rather than asserted-real. The Eve-R1 lesson
> applies recursively: even this gap-finding pass might itself contain stale
> claims by the next session — date-stamp + file:line every finding so the
> next pass can verify rather than re-derive.

---

## 2026-06-11 disposition update (v0.8.0 catalog adjudication)

*Appended at the close of the v0.8.0 implementation; the text above is unmodified.*

The deferred classification disagreements from this audit are now resolved by the
v0.8.0 graph-native membership adjudication (`src/bridges/membership.ts` +
`src/bridges/rejected.ts`):

- **Adam-HIGH — BE-42 (Hawking temperature)**: **REVERSED** to a bridge, tuple
  `['gravity','quantum']` (M, classical/gravitational → T_H, quantum/thermal —
  the endpoint quantities differ in regime attributes, so the criterion verdict
  is `'bridge'`). This is the outcome Adam argued for above, made mechanical.
- **Adam-MEDIUM — BE-29 (Jarzynski)**: NOT-A-BRIDGE **upheld** — BE-29 is
  listed in the `rejected.ts` negative catalog with its adjudication reason.
  BE-28/32/35/40 are likewise NOT-A-BRIDGE in `rejected.ts`.
- **BE-44 / BE-46 / BE-50**: remain contested/unadjudicated.

Full reasoning and per-id dispositions:
[`v0.8.0-catalog-adjudication.md`](v0.8.0-catalog-adjudication.md).
