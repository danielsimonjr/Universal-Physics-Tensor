/-
Copyright (c) 2026 Daniel Simon Jr.
Released under MIT license as described in the file LICENSE.
-/

import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
import Mathlib.LinearAlgebra.Matrix.Trace
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
`be-13`. Reduction. With the BE-20 identification. One reference, on `be-13`.

`be-13.vacuum`. Reduction. `vacuum_density`.

The field equation is `G_μν + Λ g_μν = κ T_μν`, with
`G_μν = R_μν − ½ R g_μν` and `κ = 8π G / c⁴`. The metric signature on
that canonical equation is `−,+,+,+`. Contracting with `g^{μν}` in four
dimensions, using `g^{μν} g_μν = 4`, gives `R = 4Λ − κ T`. That
contraction does not choose a signature.

Under `−,+,+,+`, dust `T_μν = ρ u_μ u_ν` with `u_μ u^μ = −c²` has
`T = −ρ c²`, so `R = 4Λ + κ ρ c²`. The same equation and signature, with
`T_μν = −ρ c² g_μν` identified as `Λ g = −κ T`, rearrange to
`ρ = c² Λ / (8π G)`. The opposite sign does not. This does not certify
Jacobson's thermodynamic derivation. BE-20 does not get its own reference.
The Friedmann corollary of that density is `friedmann_corollary`.
-/

namespace PhysJS.Einstein

open Matrix Real
open scoped Matrix

/-- A 4×4 real matrix. -/
abbrev M := Matrix (Fin 4) (Fin 4) ℝ

/-- `κ = 8π G / c⁴`. -/
noncomputable def kappa (G c : ℝ) : ℝ := 8 * π * G / c ^ 4

/-- Contract `A_μν` with `g^{μν}`, read as `trace(gInv * A)`. -/
noncomputable def contract (gInv A : M) : ℝ := trace (gInv * A)

lemma contract_add (gInv A B : M) :
    contract gInv (A + B) = contract gInv A + contract gInv B := by
  simp [contract, mul_add, trace_add]

lemma contract_sub (gInv A B : M) :
    contract gInv (A - B) = contract gInv A - contract gInv B := by
  simp [contract, mul_sub, trace_sub]

lemma contract_smul (gInv : M) (c : ℝ) (A : M) :
    contract gInv (c • A) = c * contract gInv A := by
  simp [contract, trace_smul]

/-- `g^{μν} u_μ u_ν`, with `u` the covariant components. -/
lemma contract_outer (gInv : M) (u : Fin 4 → ℝ) :
    contract gInv (vecMulVec u u) = u ⬝ᵥ (gInv *ᵥ u) := by
  simp only [contract, trace, diag_apply, mul_apply, vecMulVec_apply, mulVec_apply, dotProduct,
    row_apply]
  refine Finset.sum_congr rfl fun i _ => ?_
  rw [Finset.mul_sum]
  refine Finset.sum_congr rfl fun k _ => ?_
  ring

/-- Contracting the field equation in four dimensions.

`G = Ric − ½ R g` and `G + Λ g = κ T`, with `g^{μν} g_μν = 4` and
`R = g^{μν} R_μν`, give `R = 4Λ − κ T`.

Covers the reduction of `be-13`, not Jacobson's thermodynamic derivation. -/
theorem trace_eq (gInv g Ric Einstein T : M) (Λ κ R : ℝ)
    (hEinstein : Einstein = Ric - ((1 / 2) * R) • g)
    (hField : Einstein + Λ • g = κ • T)
    (h4 : contract gInv g = 4)
    (hR : contract gInv Ric = R) :
    R = 4 * Λ - κ * contract gInv T := by
  have hcontr := congrArg (contract gInv) hField
  rw [contract_add, contract_smul, contract_smul, hEinstein, contract_sub, contract_smul, h4,
    hR] at hcontr
  linarith

/-- Under `−,+,+,+`, dust `T_μν = ρ u_μ u_ν` with `u_μ u^μ = −c²` has trace `−ρ c²`. -/
theorem dust_scalar (gInv : M) (u : Fin 4 → ℝ) (ρ c : ℝ)
    (hu : u ⬝ᵥ (gInv *ᵥ u) = - c ^ 2) :
    contract gInv (ρ • vecMulVec u u) = - ρ * c ^ 2 := by
  rw [contract_smul, contract_outer, hu]
  ring

/-- The same dust in the field equation gives `R = 4Λ + κ ρ c²`. -/
theorem dust_trace (gInv g Ric Einstein : M) (u : Fin 4 → ℝ) (Λ κ R ρ c : ℝ)
    (hEinstein : Einstein = Ric - ((1 / 2) * R) • g)
    (hField : Einstein + Λ • g = κ • (ρ • vecMulVec u u))
    (h4 : contract gInv g = 4)
    (hR : contract gInv Ric = R)
    (hu : u ⬝ᵥ (gInv *ᵥ u) = - c ^ 2) :
    R = 4 * Λ + κ * ρ * c ^ 2 := by
  have h := trace_eq gInv g Ric Einstein (ρ • vecMulVec u u) Λ κ R hEinstein hField h4 hR
  rw [dust_scalar gInv u ρ c hu] at h
  linarith

/-- `Λ g = −κ T` with `T = −ρ c² g` and `κ = 8π G / c⁴` is `ρ = c² Λ / (8π G)`.

Covers the BE-20 identification on the `be-13` entry. BE-20 has no reference of its own. -/
theorem vacuum_density (g T : M) (Λ κ G c ρ : ℝ)
    (hg : g ≠ 0) (hG : G ≠ 0) (hc : c ≠ 0)
    (hκ : κ = kappa G c)
    (hT : T = - (ρ * c ^ 2) • g)
    (hid : Λ • g = - κ • T) :
    ρ = c ^ 2 * Λ / (8 * π * G) := by
  have hκ0 : κ ≠ 0 := by
    rw [hκ, kappa]
    exact div_ne_zero (mul_ne_zero (mul_ne_zero (by norm_num : (8 : ℝ) ≠ 0) pi_ne_zero) hG)
      (pow_ne_zero 4 hc)
  have heq : Λ • g = (κ * ρ * c ^ 2) • g := by
    calc
      Λ • g = -κ • T := hid
      _ = -κ • ((-(ρ * c ^ 2)) • g) := by rw [hT]
      _ = (-κ * -(ρ * c ^ 2)) • g := by rw [smul_smul]
      _ = (κ * ρ * c ^ 2) • g := by
        congr 1
        ring
  have hlin : Λ = κ * ρ * c ^ 2 := by
    have hzero : (Λ - κ * ρ * c ^ 2) • g = 0 := by
      rw [sub_smul, heq, sub_self]
    exact sub_eq_zero.mp ((smul_eq_zero.mp hzero).resolve_right hg)
  have hdiv : ρ = Λ / (κ * c ^ 2) := by
    have hc2 : c ^ 2 ≠ 0 := pow_ne_zero 2 hc
    field_simp [hκ0, hc2] at hlin ⊢
    linarith
  rw [hdiv, hκ, kappa]
  field_simp [hG, hc]

/-- `T_μν = +ρ c² g_μν` gives the opposite sign. It is not `ρ = c² Λ / (8π G)` when `Λ > 0`. -/
theorem wrong_dictionary_plus (g : M) (Λ κ G c ρ : ℝ)
    (hg : g ≠ 0) (hΛ : 0 < Λ) (hG : 0 < G) (hc : c ≠ 0)
    (hκ : κ = kappa G c)
    (hid : Λ • g = - κ • ((ρ * c ^ 2) • g)) :
    ρ ≠ c ^ 2 * Λ / (8 * π * G) := by
  have hκ0 : κ ≠ 0 := by
    rw [hκ, kappa]
    exact div_ne_zero (mul_ne_zero (mul_ne_zero (by norm_num : (8 : ℝ) ≠ 0) pi_ne_zero) hG.ne')
      (pow_ne_zero 4 hc)
  have heq : Λ • g = -((κ * ρ * c ^ 2) • g) := by
    calc
      Λ • g = -κ • ((ρ * c ^ 2) • g) := hid
      _ = (-κ * (ρ * c ^ 2)) • g := by rw [smul_smul]
      _ = -((κ * ρ * c ^ 2) • g) := by
        rw [show -κ * (ρ * c ^ 2) = -(κ * ρ * c ^ 2) by ring, neg_smul]
  have hlin : Λ = - (κ * ρ * c ^ 2) := by
    have hzero : (Λ + κ * ρ * c ^ 2) • g = 0 := by
      rw [add_smul, heq, neg_add_cancel]
    have hsum : Λ + κ * ρ * c ^ 2 = 0 := (smul_eq_zero.mp hzero).resolve_right hg
    linarith
  intro hρ
  have hneg : ρ = - (c ^ 2 * Λ / (8 * π * G)) := by
    have hc2 : c ^ 2 ≠ 0 := pow_ne_zero 2 hc
    have hdiv : ρ = - Λ / (κ * c ^ 2) := by
      field_simp [hκ0, hc2] at hlin ⊢
      linarith
    rw [hdiv, hκ, kappa]
    field_simp [hG.ne', hc]
  rw [hneg] at hρ
  have hpos : 0 < c ^ 2 * Λ / (8 * π * G) := by positivity
  linarith

end PhysJS.Einstein
