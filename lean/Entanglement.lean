/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import QuantumInfo.Entropy.VonNeumann
import QuantumInfo.ForMathlib.HermitianMat.CFC
import QuantumInfo.ForMathlib.HermitianMat.LogExp
import Mathlib.Analysis.Calculus.Deriv.Add
import Mathlib.Analysis.Calculus.Deriv.Mul
import Mathlib.Analysis.SpecialFunctions.BinaryEntropy
import Mathlib.Analysis.SpecialFunctions.Log.Deriv

/-!
`be-30`. Derivation step. The first variation of von Neumann entropy.

For a smooth curve of full-rank density matrices that stay diagonal in a
fixed basis, with trace `1`,

```
d/dt S(ρ(t)) = − ⟪ρ̇(t), log ρ(t)⟫
```

The bracket is the trace inner product, so the right-hand side is
`− Tr(ρ̇(t) log ρ(t))`. The modular Hamiltonian `K = − log ρ` is frozen
at the base point, and `δS = δ⟨K⟩` at that point. A finite jump from the
maximally mixed qubit to `diag(3/4, 1/4)` leaves `⟨K⟩` unchanged and
changes `S`. This is not the holographic first law that identifies `K`
with an area variation.
-/

namespace PhysJS.Entanglement

open scoped RealInnerProductSpace

variable {ι : Type*} [Fintype ι] [DecidableEq ι]

/-- Diagonal Hermitian matrix with real entries `p`. -/
noncomputable def diag (p : ι → ℝ) : HermitianMat ι ℂ :=
  HermitianMat.diagonal ℂ p

/-- Shannon entropy `− ∑ pᵢ log pᵢ`, in nats. -/
noncomputable def shannon (p : ι → ℝ) : ℝ :=
  - ∑ i, p i * Real.log (p i)

/-- Classical distribution embedded as a diagonal density matrix. -/
noncomputable def stateOf (p : ι → ℝ) (h0 : ∀ i, 0 ≤ p i) (h1 : ∑ i, p i = 1) : MState ι :=
  MState.ofClassical (ProbDistribution.mk' p h0 h1)

/-- Modular Hamiltonian of a diagonal state, `K = − log ρ`. -/
noncomputable def modular (p : ι → ℝ) : HermitianMat ι ℂ :=
  - (diag p).log

lemma log_diag (p : ι → ℝ) : (diag p).log = diag (Real.log ∘ p) := by
  simp [diag, HermitianMat.log, HermitianMat.cfc_diagonal]

lemma inner_diag (f g : ι → ℝ) :
    ⟪diag f, diag g⟫ = ∑ i, f i * g i := by
  rw [HermitianMat.inner_eq_re_trace]
  simp only [diag, HermitianMat.diagonal_mat, Matrix.diagonal_mul_diagonal, Matrix.trace_diagonal,
    map_sum]
  refine Finset.sum_congr rfl fun i _ => ?_
  rw [← RCLike.ofReal_mul]
  exact RCLike.ofReal_re _

lemma expectation (q r : ι → ℝ) :
    ⟪diag q, modular r⟫ = - ∑ i, q i * Real.log (r i) := by
  rw [modular, HermitianMat.inner_neg_right, log_diag, inner_diag]
  simp

lemma shannon_eq (p : ι → ℝ) (h0 : ∀ i, 0 ≤ p i) (h1 : ∑ i, p i = 1) :
    shannon p = Sᵥₙ (stateOf p h0 h1) := by
  rw [Sᵥₙ_eq_neg_trace_log, stateOf, MState.coe_ofClassical]
  have hdiag : HermitianMat.diagonal ℂ (fun i => (ProbDistribution.mk' p h0 h1 i : ℝ)) = diag p := by
    congr
  rw [hdiag, shannon, HermitianMat.inner_comm, log_diag, inner_diag]
  simp

omit [DecidableEq ι] in
lemma hasDerivAt_component_sum (A : ι → ℝ → ℝ) (A' : ι → ℝ) (t : ℝ)
    (h : ∀ i, HasDerivAt (A i) (A' i) t) :
    HasDerivAt (fun s => ∑ i, A i s) (∑ i, A' i) t := by
  have hsum := HasDerivAt.sum fun i (_ : i ∈ Finset.univ) => h i
  have hfun : (∑ i, A i) = fun s => ∑ i, A i s := by
    ext s
    simp [Finset.sum_apply]
  rw [hfun] at hsum
  exact hsum

omit [DecidableEq ι] in
lemma trace_deriv_zero (p : ℝ → ι → ℝ) (p' : ι → ℝ) (t : ℝ)
    (htr : ∀ s, ∑ i, p s i = 1) (hd : ∀ i, HasDerivAt (fun s => p s i) (p' i) t) :
    ∑ i, p' i = 0 := by
  have hconst : HasDerivAt (fun s => ∑ i, p s i) (∑ i, p' i) t :=
    hasDerivAt_component_sum (fun i s => p s i) p' t hd
  have hone : HasDerivAt (fun _ : ℝ => (1 : ℝ)) 0 t := hasDerivAt_const t 1
  have hfun : (fun s => ∑ i, p s i) = fun _ => 1 := funext htr
  rw [hfun] at hconst
  exact hconst.deriv.symm.trans hone.deriv

omit [DecidableEq ι] in
lemma hasDerivAt_shannon (p : ℝ → ι → ℝ) (p' : ι → ℝ) (t : ℝ)
    (hpos : ∀ i, 0 < p t i) (htr : ∀ s, ∑ i, p s i = 1)
    (hd : ∀ i, HasDerivAt (fun s => p s i) (p' i) t) :
    HasDerivAt (fun s => shannon (p s)) (- ∑ i, p' i * Real.log (p t i)) t := by
  have hzero : ∑ i, p' i = 0 := trace_deriv_zero p p' t htr hd
  have hterm : ∀ i, HasDerivAt (fun s => p s i * Real.log (p s i))
      (p' i * Real.log (p t i) + p' i) t := by
    intro i
    have hlog : HasDerivAt (fun s => Real.log (p s i)) ((p t i)⁻¹ * p' i) t := by
      simpa [Function.comp_def] using (Real.hasDerivAt_log (hpos i).ne').comp t (hd i)
    have hmul := (hd i).mul hlog
    convert hmul using 1
    field_simp [(hpos i).ne']
  have hsum : HasDerivAt (fun s => ∑ i, p s i * Real.log (p s i))
      (∑ i, (p' i * Real.log (p t i) + p' i)) t :=
    hasDerivAt_component_sum (fun i s => p s i * Real.log (p s i))
      (fun i => p' i * Real.log (p t i) + p' i) t hterm
  have hextra : ∑ i, (p' i * Real.log (p t i) + p' i) =
      ∑ i, p' i * Real.log (p t i) := by
    rw [Finset.sum_add_distrib, hzero, add_zero]
  have hneg := hsum.const_mul (-1)
  rw [hextra] at hneg
  simpa [shannon, neg_one_mul] using hneg

lemma hasDerivAt_expectation (p : ℝ → ι → ℝ) (p' : ι → ℝ) (t : ℝ)
    (hd : ∀ i, HasDerivAt (fun s => p s i) (p' i) t) :
    HasDerivAt (fun s => ⟪diag (p s), modular (p t)⟫)
      ⟪diag p', modular (p t)⟫ t := by
  have hlin : HasDerivAt (fun s => - ∑ i, p s i * Real.log (p t i))
      (- ∑ i, p' i * Real.log (p t i)) t := by
    have hsum : HasDerivAt (fun s => ∑ i, p s i * Real.log (p t i))
        (∑ i, p' i * Real.log (p t i)) t :=
      hasDerivAt_component_sum (fun i s => p s i * Real.log (p t i))
        (fun i => p' i * Real.log (p t i)) t fun i => (hd i).mul_const (Real.log (p t i))
    simpa [neg_one_mul] using hsum.const_mul (-1)
  have hfun : (fun s => ⟪diag (p s), modular (p t)⟫) =
      fun s => - ∑ i, p s i * Real.log (p t i) := by
    funext s
    exact expectation (p s) (p t)
  rw [hfun, expectation]
  exact hlin

/-- The diagonal curve has `d/dt S(ρ) = − Tr(ρ̇ log ρ)`, and that derivative
equals `d/dt ⟨K⟩` for the frozen modular Hamiltonian `K = − log ρ(t)`.

Covers the derivation step of `be-30` for a curve that stays diagonal.
Not an area variation. -/
theorem first_variation (p : ℝ → ι → ℝ) (p' : ι → ℝ) (t : ℝ)
    (hpos : ∀ s i, 0 < p s i) (htr : ∀ s, ∑ i, p s i = 1)
    (hd : ∀ i, HasDerivAt (fun s => p s i) (p' i) t) :
    HasDerivAt (fun s => Sᵥₙ (stateOf (p s) (fun i => (hpos s i).le) (htr s)))
      (-⟪diag p', (diag (p t)).log⟫) t ∧
    HasDerivAt (fun s => ⟪(stateOf (p s) (fun i => (hpos s i).le) (htr s)).M, modular (p t)⟫)
      ⟪diag p', modular (p t)⟫ t ∧
    -⟪diag p', (diag (p t)).log⟫ = ⟪diag p', modular (p t)⟫ := by
  have hSfun : (fun s => Sᵥₙ (stateOf (p s) (fun i => (hpos s i).le) (htr s))) =
      fun s => shannon (p s) := by
    funext s
    exact (shannon_eq (p s) (fun i => (hpos s i).le) (htr s)).symm
  have hMfun : (fun s => ⟪(stateOf (p s) (fun i => (hpos s i).le) (htr s)).M, modular (p t)⟫) =
      fun s => ⟪diag (p s), modular (p t)⟫ := by
    funext s
    have hM : (stateOf (p s) (fun i => (hpos s i).le) (htr s)).M = diag (p s) := by
      rw [stateOf, MState.coe_ofClassical]
      congr
    rw [hM]
  refine ⟨?_, ?_, ?_⟩
  · rw [hSfun]
    convert hasDerivAt_shannon p p' t (fun i => hpos t i) htr hd using 1
    rw [log_diag, inner_diag]
    simp [Function.comp_apply]
  · rw [hMfun]
    exact hasDerivAt_expectation p p' t hd
  · rw [modular, HermitianMat.inner_neg_right, log_diag, inner_diag]

/-! ### Negative control

`diag(1/2, 1/2)` has modular Hamiltonian `(log 2) I`, so every state has the
same expectation. `diag(3/4, 1/4)` is a finite distance away and has a
smaller entropy.
-/

noncomputable def half (_i : Fin 2) : ℝ := 1 / 2

noncomputable def skew : Fin 2 → ℝ
  | 0 => 3 / 4
  | 1 => 1 / 4

lemma half_pos : ∀ i, 0 < half i := by
  intro _
  simp [half]

lemma skew_pos : ∀ i, 0 < skew i := by
  intro i
  fin_cases i <;> simp [skew]

lemma half_sum : ∑ i : Fin 2, half i = 1 := by
  simp [half]

lemma skew_sum : ∑ i : Fin 2, skew i = 1 := by
  simp [skew, Fin.sum_univ_two]
  norm_num

theorem finite_difference :
    Sᵥₙ (stateOf skew (fun i => (skew_pos i).le) skew_sum) -
        Sᵥₙ (stateOf half (fun i => (half_pos i).le) half_sum) ≠
      ⟪(stateOf skew (fun i => (skew_pos i).le) skew_sum).M, modular half⟫ -
        ⟪(stateOf half (fun i => (half_pos i).le) half_sum).M, modular half⟫ := by
  have hhalfLog : (diag half).log = (-Real.log 2) • (1 : HermitianMat (Fin 2) ℂ) := by
    have hfun : Real.log ∘ half = fun _ => -Real.log 2 := by
      funext i
      simp [half, Real.log_inv]
    rw [log_diag, hfun]
    have hmul := HermitianMat.diagonal_mul (𝕜 := ℂ) (fun _ : Fin 2 => (1 : ℝ)) (-Real.log 2)
    rw [show (fun x : Fin 2 => (-Real.log 2) * (1 : ℝ)) = fun _ => -Real.log 2 by
      ext; ring] at hmul
    rw [show (fun _ : Fin 2 => (1 : ℝ)) = 1 by rfl, HermitianMat.diagonal_one] at hmul
    simpa [diag] using hmul
  have hK : modular half = (Real.log 2) • (1 : HermitianMat (Fin 2) ℂ) := by
    rw [modular, hhalfLog, neg_smul, neg_neg]
  have hExp (q : Fin 2 → ℝ) (h0 : ∀ i, 0 ≤ q i) (h1 : ∑ i, q i = 1) :
      ⟪(stateOf q h0 h1).M, modular half⟫ = Real.log 2 := by
    rw [stateOf, MState.coe_ofClassical, hK, HermitianMat.inner_smul_right, HermitianMat.inner_one,
      HermitianMat.trace_diagonal]
    have : ∑ i, (ProbDistribution.mk' q h0 h1 i : ℝ) = ∑ i, q i := by
      congr
    rw [this, h1, mul_one]
  have hzero :
      ⟪(stateOf skew (fun i => (skew_pos i).le) skew_sum).M, modular half⟫ -
        ⟪(stateOf half (fun i => (half_pos i).le) half_sum).M, modular half⟫ = 0 := by
    rw [hExp skew (fun i => (skew_pos i).le) skew_sum,
      hExp half (fun i => (half_pos i).le) half_sum, sub_self]
  rw [hzero]
  have hSskew : Sᵥₙ (stateOf skew (fun i => (skew_pos i).le) skew_sum) = Real.binEntropy (3 / 4) := by
    rw [← shannon_eq]
    simp only [shannon, skew, Fin.sum_univ_two]
    have h14 : (1 : ℝ) - 3 / 4 = 1 / 4 := by norm_num
    rw [Real.binEntropy, h14, Real.log_inv ((3 : ℝ) / 4), Real.log_inv ((1 : ℝ) / 4)]
    ring
  have hShalf : Sᵥₙ (stateOf half (fun i => (half_pos i).le) half_sum) = Real.log 2 := by
    rw [← shannon_eq]
    simp [shannon, half, Real.log_inv]
  rw [hSskew, hShalf]
  intro h
  have hne : (3 : ℝ) / 4 ≠ 2⁻¹ := by norm_num
  exact hne (Real.binEntropy_eq_log_two.mp (sub_eq_zero.mp h))

end PhysJS.Entanglement
