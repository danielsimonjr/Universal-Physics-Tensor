/**
 * The vendored PhysJS manifest is the pin for every `lean4-physjs` formalRef.
 *
 * A wrong commit, theorem, key, or coverage phrase fails here. So does a
 * manifest entry that does not resolve to a bridge, and a `lean4-physjs`
 * reference the manifest does not name. The mutations are the control: a
 * checker that ignored those fields would stay green.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import {
  PHYSJS_COMMIT,
  physjsFormalRef,
  physjsManifestProblems,
  type PhysjsManifestFile,
} from '../../src/atlas/physjs-ref.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'formal/physjs/manifest.json'), 'utf-8')) as PhysjsManifestFile;
const atlasBridges = ATLAS_FAMILIES.flatMap((family) => family.bridges);
const carriers = [
  ...atlasBridges,
  ...BRIDGE_EQUATIONS.map((entry) => ({ id: `be-${entry.id}`, formalRef: catalogFormalRef(entry.id) })),
];

/** The manifest at PhysJS `main` `03e8bb77c952f720bdd2730af2afc6a7f2d36243`, in file order. A swapped theorem or key fails this list. The sentence that names `92f87257a1e3086a48cdc19fe4361cc1c5909d49` is the record from before PhysJS #65. */
const EXPECTED: readonly (readonly [string, string, string])[] = [
  ['ab-kg-schrodinger', 'PhysJS.KgSchrodinger.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-klein-gordon-wave', 'PhysJS.KleinGordonWave.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-stiff-string', 'PhysJS.StiffString.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-telegraph-diffusion', 'PhysJS.TelegraphDiffusion.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-telegraph-wave', 'PhysJS.TelegraphWave.covers_bound_delta', 'bound.delta exactly, at the dispersion relation'],
  ['ab-pendulum-linear', 'PhysJS.Pendulum.linearizedEquationOfMotion_iff', 'the transformation, not bound.delta'],
  ['ab-kg-oscillator', 'PhysJS.KgOscillator.uniform_solves_equationOfMotion', "the restriction, in Physlib's own terms"],
  ['ab-spring-lc', 'PhysJS.SpringLc.time_rescale_equationOfMotion', 'the oscillator dictionary'],
  ['ab-damped-rlc', 'PhysJS.DampedRlc.time_rescale_equationOfMotion', 'the oscillator dictionary'],
  ['ab-wave-dalembert', 'PhysJS.WaveDalembert.solution_eq_profiles', "the missing direction of d'Alembert's formula"],
  ['be-64', 'PhysJS.Eddington.balance_iff', 'derivation-step: the r² cancellation in the Eddington force balance, not a hard cap'],
  ['be-53', 'PhysJS.YangMills.b0_pos_iff_nf_le', 'derivation-step: b₀ > 0 iff N_f ≤ 16 for SU(3), not a running procedure past one loop'],
  [
    'be-58',
    'PhysJS.JohnsonNyquist.tendsto_classical',
    'limit: the classical Johnson–Nyquist spectrum is the ω → 0⁺ limit of the quantum parent, not the fluctuation–dissipation theorem',
  ],
  [
    'be-38',
    'PhysJS.Mond.tendsto_nu_limits',
    'limit: ν → 1 as z → ∞, ν √z → 1 as z → 0⁺, and F_N ν(z) / √(m F_N a₀) → 1 as F_N → 0⁺; not ν → √(2/z), and not the SPARC confrontation',
  ],
  [
    'be-13',
    'PhysJS.Einstein.trace_eq',
    'reduction: contracting G_μν + Λ g_μν = κ T_μν in four dimensions gives R = 4Λ − κ T, not Jacobson\'s thermodynamic derivation',
  ],
  [
    'be-34',
    'PhysJS.KibbleZurek.exponent',
    'derivation-step: the freeze-out power ε̂ = (τ₀/τ_Q)^(1/(1+zν)) and the defect density without the Boltzmann factor; omitting the 1 in the exponent fails. Not the reheating factor, and not a repair of the missing 1/a^d prefactor',
  ],
  [
    'be-42',
    'PhysJS.HawkingUnruh.dictionary',
    'cross-check: T_H(2GM/c²) = T_H(M) and T_U(c⁴/(4GM)) = T_H(M), naming BE-57 and be-42-via-rs. T_U(c⁴/(2GM)) is not T_H(M). Not the Hawking effect',
  ],
  [
    'be-24',
    'PhysJS.Fret.dictionary',
    'cross-check: η = R₀⁶/(R₀⁶+R⁶) = 1/(1+(R/R₀)⁶) = k_FRET/(k_FRET+1/τ_D), and η decreases on (0, ∞). At R = 2 R₀ the exponent 4 is not the exponent 6. Not the dipole–dipole law',
  ],
  [
    'be-19',
    'PhysJS.QuantumBounce.dictionary',
    'cross-check: H²_LQC equals H²_RS at σ = −ρ_c/2, both tend to (8πG/3)ρ + Λ/3 at infinity, and H²_LQC = 0 at ρ = ρ_c and Λ = 0, naming BE-54. σ = +ρ_c/2 is not that polynomial. σ < 0 is not a physical Randall–Sundrum brane',
  ],
  [
    'be-16',
    'PhysJS.Landauer.erasure_eq',
    'derivation-step: for T > 0, the equal-level two-state ensemble has ⟨E⟩ − F = k_B T log 2. equal_levels remains the entropy k_B log 2. At T > 0, levels E and E+δ do not have that deficit. At T = 0 the Helmholtz closed form does not separate the levels. Not E ≥ T ΔS for an arbitrary protocol, and not the Bérut confrontation',
  ],
  [
    'be-29',
    'PhysJS.Jarzynski.jensen_work',
    'property: for a finite probability and β > 0, ∑ p_i W_i ≥ −(1/β) log(∑ p_i exp(−β W_i)). The reversed inequality fails on two unequal work values. Not Jarzynski\'s theorem, and not the Gaussian identity',
  ],
  [
    'be-11',
    'PhysJS.Lindblad.preserve',
    'property: one channel of the displayed GKSL generator has trace zero, and it is Hermitian when H and ρ are. L need not be Hermitian. Dropping the anticommutator makes the trace nonzero. Not Born–Markov coarse-graining',
  ],
  [
    'be-65',
    'PhysJS.Jeans.mass_eq',
    'derivation-step: the encoded Jeans mass (5 k T / (G μ m_u))^(3/2) (3 / (4 π ρ))^(1/2) follows from the virial convention with factor 5 and M = 4 π R³ ρ / 3. Replacing 5 by 3 fails. Not the virial theorem',
  ],
  [
    'be-51',
    'PhysJS.Deflection.line_integral',
    'derivation-step: (1+γ)/c² ∫_ℝ G M b / (b² + z²)^{3/2} dz = 2(1+γ) G M / (b c²), and at γ = 1 this is the encoded angle 4 G M / (b c²). γ = 0 is half. Not a geodesic',
  ],
  [
    'be-61',
    'PhysJS.Sommerfeld.integral_eq',
    'derivation-step: ∫_ℝ x² e^x / (1+e^x)² dx = π²/3, the factor in the encoded Lorenz number. The integrand is even, so the half-line is half of π²/3. Claiming the half-line equals π²/3 fails. Not the transport law',
  ],
  ['be-12', 'PhysJS.ThermalDeBroglie.wavelength_eq', 'derivation-step: √(2π ℏ²/(m k_B T)) = h/√(2π m k_B T) for h = 2πℏ and ℏ > 0. The non-negative square root needs ℏ > 0. The Wave Q form ℏ/√(m k_B T), with ℏ in the numerator and no √(2π), fails, as does ℏ/√(2 m k_B T). Not Caldeira–Leggett dephasing'],
  ['be-59', 'PhysJS.Josephson.frequency_eq', 'derivation-step: f = (2e/h) V, K_J = 2e/h, and f = K_J V. Clearing h recovers 2e. The factor 2 is the Cooper-pair charge, taken as a premise. Replacing 2e by e fails. Not the tunneling Hamiltonian'],
  ['be-55', 'PhysJS.QuantumHall.reciprocal', 'derivation-step: for a nonzero integer C and e ≠ 0, σ_xy = C e²/h, R_H = h/(C e²), and R_K = h/e², so σ_xy R_H = 1 and R_H = R_K/C. The shifted index C+1 is a different conductance. Replacing e² by e fails the product when e ≠ 1. Not TKNN'],
  ['be-60', 'PhysJS.Laughlin.filling_fraction', 'derivation-step: for integers p ≠ 0 and q ≠ 0, with ν = p/q, σ_xy = ν e²/h and R_xy = R_K/ν = (q/p) h/e². The charge and Planck\'s constant are not assumed nonzero. Oddness of q is the Laughlin selection rule and is not this identity. Not the Laughlin wavefunction, and not the anyon charge e/3'],
  ['be-21', 'PhysJS.Kss.saturating', 'derivation-step: η/s = ℏ/(4π k_B) is the equality 4π k_B (η/s) = ℏ for k_B ≠ 0. The Hawking factor 8π in place of 4π is 2ℏ, not ℏ, once ℏ ≠ 0. Not the inequality η/s ≥ ℏ/(4π k_B)'],
  ['be-14', 'PhysJS.PlanckArea.area_law', 'derivation-step: k_B c³ A/(4 G ℏ) = k_B A/(4 ℓ_P²) for ℓ_P² = ℏ G/c³. The area is an input. ℓ_P² = ℏ G/c² fails when c ≠ 1. The factor 2 in place of 4 fails. The same lemma is be-43. Not the minimal-surface theorem'],
  ['be-43', 'PhysJS.PlanckArea.area_law', 'derivation-step: the be-14 lemma on a wormhole area. k_B A/(4 ℓ_P²) equals k_B c³ A/(4 G ℏ) for ℓ_P² = ℏ G/c³. ℓ_P² = ℏ G/c² fails when c ≠ 1, and the factor 2 fails. Not ER=EPR'],
  ['be-37', 'PhysJS.Shapiro.radial_integral', 'derivation-step: for 0 < R_near < R_far and c ≠ 0, ∫_{R_near}^{R_far} (2 G M / c³) (dr / r) = (2 G M / c³) ln(R_far / R_near). The factor 1 in place of 2 is half, once G ≠ 0 and M ≠ 0. log₁₀ of the radius ratio is not ln. Not the impact-parameter formula, and not the Cassini measurement'],
  ['be-54', 'PhysJS.RandallSundrum.brane_friedmann', 'derivation-step: for σ ≠ 0, H²_RS = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3, which equals the Friedmann term plus (8πG/3) ρ²/(2σ). Not a derivation from the five-dimensional Einstein equation'],
  ['be-17', 'PhysJS.EinsteinCartan.inversion', 'derivation-step: if κ = 8πG/c⁴ ≠ 0 and every component satisfies T = κ S, then S·S = T·T / κ² = (c⁴/(8πG))² T·T. κ² in the numerator is the inversion backwards, and it fails when T·T ≠ 0 and κ⁴ ≠ 1. Not the Einstein–Cartan field equation, and not a Newtonian limit'],
  ['be-27', 'PhysJS.EffectiveTemperature.sum_eq', 'derivation-step: for T ≠ 0 and k_B ≠ 0, T (1 + Σ_active/(k_B T)) = T + Σ_active/k_B, and this equals T iff Σ_active = 0. The product T · Σ_active/(k_B T), with the 1 omitted, is not that sum. Not the frequency-dependent Cugliandolo–Kurchan T_eff(ω)'],
  ['be-22', 'PhysJS.ToricCode.toric', 'derivation-step: four anyons of quantum dimension 1 have D = √4 = 2 and γ = ln 2 in nats. The encoded decomposition is S = α L − γ, with the O(L⁻¹) term dropped. log₂ 2 = 1 is the bit convention, not ln 2. D = √2 is one anyon pair, not the toric code. Not the Kitaev–Preskill theorem, and not a quantum-gravity boundary'],
  ['be-15', 'PhysJS.Coarsening.exponent_iff', 'derivation-step: for Γ = L₀²/t₀ > 0, t > 0, t ≠ t₀, and z > 0, L(t) = L₀ (t/t₀)^{1/z} obeys L(t)² = Γ t iff z = 2. At t = t₀ the ratio holds for every z. Model B\'s z = 3 gives L³ ∝ t and fails L² = Γ t. Not the Model A Langevin equation. The Langevin kinetic coefficient is a different Γ'],
  ['be-33', 'PhysJS.QuantumCritical.thermal_scaling', 'derivation-step: ξ(T) = ξ₀ (T/T₀)^{−1/z}, and at z = 1 this is ξ(T) = ξ₀ (T/T₀)^{−1} = ξ₀ T₀/T for T > 0 and T₀ > 0. Not Hertz–Millis theory, and not a universality class'],
  ['be-50', 'PhysJS.TimeSymmetric.wheeler_feynman', 'derivation-step: A_μ(x) = (A_μ^ret(x) + A_μ^adv(x))/2, and twice that component is the sum. The id is contested. This lemma does not decide the contest. Not the absorber boundary condition as a theory of radiation reaction'],
  ['be-32', 'PhysJS.BornOverlap.modulus_sq', 'derivation-step: |c + s i|² = c² + s², which is normSq of one complex matrix element. A sum of squares above 1 is not a probability in [0, 1], the module\'s rejection of c² + s² > 1. c² − s² is not that square when s ≠ 0. Not the Giacomini–Castro-Ruiz–Brukner transformation, and not a Haar integral. The catalog records this id as not-a-bridge; this lemma does not decide that'],
  ['be-28', 'PhysJS.EntropyProduction.nonneg', 'derivation-step: σ = Σ_i J_i X_i is the definition of σ. If every product is ≥ 0 then σ ≥ 0. One flipped sign, with the other products zero and the flipped product strictly positive, is not σ, and that flipped sum is negative. Not the variational maximum-entropy-production principle. The catalog records this id as not-a-bridge; this lemma does not decide that'],
  ['be-40', 'PhysJS.CompositeHiggs.scale_free', 'derivation-step: for f ≠ 0 and θ = h/f, V(h)/f⁴ = −α sin²θ + β [sin⁴θ − sin²θ cos²θ]. Both terms carry f⁴, so the ratio depends on h only through θ. The pre-correction first term −α f² sin²θ, divided by f⁴, is −α sin²θ / f². It depends on f, and it agrees with −α sin²θ only when f² = 1. Not SILH matching onto a confining theory. The catalog records this id as not-a-bridge; this lemma does not decide that'],
  ['be-35', 'PhysJS.Crossing.antisymmetry', 'derivation-step: for a real function g, g(u,v) − g(v,u) = −(g(v,u) − g(u,v)). The swap is the negation of a difference. The residual is 0 for every g when u = v, including u = v = 1/4, so that point is not a control. A block that is not symmetric does not vanish at u = 1/2, v = 1/4. Not the infinite sum over (Δ, ℓ), and not positivity or unitarity. The catalog records this id as not-a-bridge; this lemma does not decide that'],
  ['be-63', 'PhysJS.Chandrasekhar.prefactor', 'derivation-step: with n = ρ/(μ_e m_u), p_F = ℏ (3π² n)^{1/3}, and P = (1/4) n p_F c, one has P = K_ρ ρ^{4/3} where K_ρ = K_n/(μ_e m_u)^{4/3} and K_n = (ℏ c/4)(3π²)^{1/3}. For the n = 3 Lane–Emden scale the central density cancels, and M = (ω₃⁰ √(3π)/2) (ℏ c/G)^{3/2} (μ_e m_u)^{−2}. ω₃⁰ stays symbolic; the decimal 2.01824 is not in the theorem. With ℏ = c = μ_e = m_u = 1 both routes give the same K. √π/2 in place of √(3π)/2 fails when ω₃⁰ ≠ 0, and dropping ω₃⁰ fails when ω₃⁰ ≠ 1. Not stellar rotation or magnetic support'],
  ['be-30', 'PhysJS.Entanglement.first_variation', 'derivation-step: for a smooth curve of full-rank density matrices that stay diagonal in a fixed basis and have trace 1, d/dt S(ρ(t)) = −⟪ρ̇(t), log ρ(t)⟫, the trace inner product. The modular Hamiltonian K = −log ρ is frozen at the base point, and that derivative equals d/dt ⟨K⟩. A finite jump from diag(1/2, 1/2) to diag(3/4, 1/4) leaves ⟨K⟩ unchanged and changes S. Not the holographic first law that identifies K with an area variation'],
  ['be-66', 'PhysJS.RadiationPressure.pressure_eq', 'derivation-step: foreshortening I cos θ, normal momentum per energy (cos θ)/c, and an opaque split that deposits the absorbed fraction once and the specular fraction twice give P_n = (I/c)(1+R) cos²θ. R = 0, θ = 0 is I/c and R = 1, θ = 0 is 2I/c. A single cosine is not that pressure when cos θ is neither 0 nor 1. Homogeneity in I and c gives P = C I/c with C = f(1,1) unfixed. Not the Maxwell stress tensor, and not the Eddington luminosity'],
  ['be-67', 'PhysJS.AlfvenSpeed.speed_eq', 'derivation-step: one transverse monochromatic polarization along a uniform field, with ∂b/∂t = B ∂v/∂z and ρ ∂v/∂t = (B/μ0) ∂b/∂z, has phase speed |ω/k| = B/√(μ0 ρ) for B > 0, μ0 > 0, ρ > 0, and k ≠ 0. ρ is the density in that momentum premise, read as the total mass density. Proton-only n m_p is a different density when electrons contribute, and a density r ρ with r ≠ 1 is a different speed. Inserting tesla and the SI density into B/√(4πρ) is not the SI speed. 4π×10^{-7} is the permeability stand-in, not a measured μ0. A factor C ≠ 1 is not the catalog speed. Not a kinetic dispersion relation'],
  ['be-68', 'PhysJS.TolmanEhrenfest.hydrostatic_constant', 'derivation-step: on a static interval with g_00 < 0, hydrostatic balance dp = -(ρ+p) d ln √(-g_00) and the equilibrium Gibbs relation dp = (ρ+p) d ln T, with ρ+p ≠ 0, give T √(-g_00) equal at the endpoints. The 1930 writing T √g_44 agrees when g_44 = -g_00. Real.sqrt g_00 = 0 when g_00 < 0, so the product without the minus is 0. d ln T = 0 is not g dr/c². Not a horizon temperature and not PhysJS.HawkingUnruh.dictionary. T ‖ξ‖ = const is out of scope. The hydrostatic equation is not derived from ∇_μ T^{μν} = 0, and the Gibbs relation is not derived from an equation of state'],

  ['be-69', 'PhysJS.FastMagnetosonic.speed_eq', 'derivation-step: a monochromatic compressional polarization perpendicular to a uniform field, with ∂b/∂t = −B ∂v/∂x, ∂δρ/∂t = −ρ ∂v/∂x, δp = c_s² δρ, and ρ ∂v/∂t = −∂δp/∂x − (B/μ0) ∂b/∂x, has phase speed |ω/k| = √(c_s² + B²/(μ0 ρ)) for μ0 > 0, ρ > 0, and k ≠ 0. The velocity wave is not identically zero. c_s² = γ p / ρ is a reading of the closure, not an energy equation. The textbook quartic at k_∥ = 0 has roots ω² = 0 and ω² = (c_s² + v_A²) k²; ω = 0 does not solve compressional induction. √(c_s² + v_A²) is not c_s, not v_A, and not c_s + v_A when the other speed is nonzero. c_s = 0 recovers B/√(μ0 ρ), the Alfvén value of a different polarization. A factor C ≠ 1 is not the catalog speed. Not a kinetic dispersion relation, and not the oblique fast mode. The linearized equations are hypotheses'],
  ['be-70', 'PhysJS.EinsteinRelation.diffusion_eq', 'derivation-step: for the Boltzmann profile n = n_ref exp(−q V/(k_B T)) with n_ref > 0, k_B T ≠ 0, and q ≠ 0, a nonzero field E = −dV/dx at which the drift flux μ n E cancels the diffusion flux D dn/dx gives D = μ k_B T / q. The force-mobility writing D = μ_force k_B T needs μ_force = μ/q. Dropping q fails when q ≠ 1. The Fermi-liquid form μ E_F / q fails when E_F ≠ k_B T. Stokes–Einstein fails unless μ/q = 1/(6 π η a). A factor C ≠ 1 is not this diffusivity. Not a master equation, and not a Fermi liquid'],
  ['be-71', 'PhysJS.Clapeyron.slope_eq', 'derivation-step: where the specific Gibbs energies agree along coexistence and each phase obeys dg = −s dT + v dP, dP/dT = (s2−s1)/(v2−v1). With L = T (s2−s1), T ≠ 0, and Δv ≠ 0, dP/dT = L/(T Δv). Dropping T fails when T ≠ 1. Replacing Δv by one phase volume fails when the other volume is nonzero. A factor C ≠ 1 is not this slope. Not the ideal-gas integrated vapor-pressure law. The Gibbs differential is a hypothesis, not a Legendre transform'],
  ['be-72', 'PhysJS.GravitationalRedshift.frequency_ratio', 'derivation-step: two static observers of one coordinate period, with ν √(−g_00) = 1/Δt and g_00 < 0, have ν1/ν2 = √(−g2)/√(−g1) = √(g2/g1). If the Tolman products T √(−g_00) also agree, then T1/T2 = ν1/ν2. Equal temperatures on g_00 = −1 and g_00 = −4 are not a Tolman equilibrium, while the frequency ratio is 2. For g_00 = −(1+2Φ/c²) at c = 1, Φ = 0 and Φ = 4, the exact ratio is neither (Φ2−Φ1)/c² nor 1+(Φ2−Φ1)/c². z = 0 is not Φ/c². Not PhysJS.TolmanEhrenfest.hydrostatic_constant, not a horizon temperature, and not PhysJS.HawkingUnruh.dictionary'],
  ['be-73', 'PhysJS.KelvinRelation.peltier_eq', 'derivation-step: for J_e = L11 E/T + L12 (−∇T)/T² and J_q = L21 E/T + L22 (−∇T)/T², the open-circuit Seebeck coefficient S = E/∇T and the isothermal Peltier coefficient Π = J_q/J_e satisfy Π = S T when L12 = L21. That equality is ThermoelectricOnsager.onsager, a structure field naming microscopic reversibility, not an axiom. Without it the two coefficients disagree. Not the first Thomson relation μ = T dS/dT, and not a measured thermopower. The linear fluxes are hypotheses'],

  ['be-74', 'PhysJS.MagneticPressure.pressure_eq', 'derivation-step: a linear inductor with dU/dI = L I and U(0) = 0 stores U = (L/2) I². A long solenoid with B = μ0 n I and flux linkage Λ = (n ℓ) B A has L = μ0 n² V. At fixed current the battery supplies I ΔΛ. The stored energy rises by half of that, and the difference is the mechanical work p ΔV, so p = B²/(2 μ0). Homogeneity in B and μ0 gives p = C B²/μ0 with C unfixed. C = 1 is the battery work per volume, not this pressure. Not a kinetic pressure, and not a Lagrangian derivation of the Maxwell stress tensor. Ampere\'s law, the flux linkage, and the quasistatic work balance are hypotheses'],
  ['be-75', 'PhysJS.LondonPenetration.depth_eq', 'derivation-step: on B(x) = B0 exp(−x/λ) with λ > 0, Ampere\'s law j = −(1/μ0) dB/dx and the London equation dj/dx = −(n e²/m) B give λ = √(m/(μ0 n e²)). e is the elementary charge. The dimension matrix of {m, μ0, n, e} admits both that monomial and μ0 e²/m, so units do not choose. Those lengths disagree when n (μ0 e²/m)³ ≠ 1. The growing exponential is not the screened field. Replacing e by 2e at the same n and m fails, and dropping the square on e fails when e ≠ 1. A factor C ≠ 1 is not this depth. Not the classical skin depth. The London equation and Ampere\'s law are hypotheses'],
  ['be-76', 'PhysJS.PlasmaBeta.beta_eq', 'derivation-step: β = p_gas / p_B where p_B is PhysJS.MagneticPressure.pressure_eq, so β = p_gas / (B²/(2 μ0)) = 2 μ0 p_gas / B². The ideal-gas closure p_gas = n k_B T gives β = 2 μ0 n k_B T / B². B ≠ 0. Using B²/μ0 in place of the magnetic pressure is a different ratio. The constant 1 is dimensionless and is not this beta when the ratio is not 1. A factor C ≠ 1 is not this beta. Dropping p = n k_B T fails. Not a unique monomial, and not a plasma-β inequality'],
  ["be-77", "PhysJS.HagenPoiseuille.flow_eq", "derivation-step: steady axisymmetric Newtonian flow with d/dr (r du/dr) = (G/\u03bc) r, centerline slope 0, and no-slip u(R) = 0 integrates to u = (G/(4\u03bc))(r\u00b2\u2212R\u00b2). With G = \u2212\u0394P/L the flux Q = \u222b u 2\u03c0 r dr is \u03c0 R\u2074 \u0394P/(8 \u03bc L). Darcy's definition then gives f_D Re = 64. The same wall shear with the Fanning normalization is 16. A factor other than 8 is not this flux. Not a square duct. The axial balance, no-slip, and the Darcy definitions are hypotheses"],
  ["be-78", "PhysJS.EulerBuckling.critical_load", "derivation-step: the Euler\u2013Bernoulli balance y'' = \u2212\u03c9\u00b2 y with \u03c9\u00b2 = P/(E I) and pinned ends y(0) = y(L) = 0 has the eigenfunction sin(\u03c0 x/L) at P = \u03c0\u00b2 E I/L\u00b2, and every nontrivial solution has \u03c9 L = n \u03c0 for a nonzero integer n, so the load is at least that value. The clamped-free column is \u03c0\u00b2 E I/(4 L\u00b2). That factor is not the pinned load. Not read off from units. The beam equation is a hypothesis"],
  ["be-79", "PhysJS.PullIn.pull_in_eq", "derivation-step: C = \u03b50 A/g has dC/dg = \u2212\u03b50 A/g\u00b2. Equilibrium of a linear spring against the coenergy force is k(g0\u2212g) = \u03b50 A V\u00b2/(2 g\u00b2), so V\u00b2 is proportional to (g0\u2212g) g\u00b2. The derivative 2 g0 g \u2212 3 g\u00b2 vanishes only at g = 0 and g = 2 g0/3, and the second derivative at the fold is \u22122 g0. Substituting the gap gives V_pi\u00b2 = 8 k g0\u00b3/(27 \u03b50 A) = 8 k g0\u00b2/(27 C0) with C0 = \u03b50 A/g0. g = g0/2 is not the fold. Not a fringing field. The parallel-plate law and the quasi-static balance are hypotheses"],
  ["be-80", "PhysJS.MottGurney.current_eq", "derivation-step: drift J = q n \u03bc E and Poisson dE/dx = q n/\u03b5 give E dE/dx = J/(\u03b5 \u03bc). With E(0) = 0 the integral is E\u00b2/2 = J x/(\u03b5 \u03bc). The nonnegative root integrated from 0 to d is V = sqrt(2 J/(\u03b5 \u03bc)) (2/3) d^{3/2}, so J = (9/8) \u03b5 \u03bc V\u00b2/d\u00b3. A factor other than 9/8 is not this current. Not Child\u2013Langmuir. Drift, Poisson, and the injecting contact are hypotheses"],
  ["be-81", "PhysJS.ChildLangmuir.current_eq", "derivation-step: collisionless energy (1/2) m v\u00b2 = e \u03c6, J = \u03c1 v, and Poisson \u03c6'' = \u03c1/\u03b50 give J = \u03b50 \u03c6'' v. A power \u03c6 \u221d x^\u03b1 makes \u03c6'' v independent of x only for \u03b1 = 4/3. The profile \u03c6 = V (x/d)^{4/3} has \u03c6(0) = 0, \u03c6(d) = V, and cathode field 0, and for x > 0 its current is (4 \u03b50/9) sqrt(2 e/m) V^{3/2}/d\u00b2. e is the elementary charge. The Mott\u2013Gurney exponent 3/2 does not cancel. Poisson is not claimed at x = 0. Not a drift-only solid"],
  ["be-82", "PhysJS.ShockleyDiode.shockley_eq", "derivation-step: quasi-equilibrium multiplies the equilibrium flux by exp(e V/(\u03b7 k_B T)). Ideality 1 sets \u03b7 = 1. Detailed balance sets the reverse flux equal to the forward flux at V = 0, and low injection keeps that reverse flux under bias. The net current is I = I_s (exp(e V/(k_B T)) \u2212 1). Zero bias carries zero current. Ideality 2 is not this current when e V \u2260 0. e is the elementary charge. Not a diffusion-length ODE"],
  ["be-83", "PhysJS.Thomson.thomson_eq", "derivation-step: the Kelvin relation \u03a0(t) = S(t) t, which is PhysJS.KelvinRelation.peltier_eq read along temperature, and the Thomson split \u03bc = d\u03a0/dT \u2212 S, give \u03bc = T dS/dT by the product rule. d\u03a0/dT is not \u03bc when S T \u2260 0. Not a second copy of \u03a0 = S T. The functional Kelvin relation and the Thomson split are hypotheses"],
  ["be-84", "PhysJS.FourPoint.sheet_eq", "derivation-step: on an infinite sheet the radial field of a point current is (I R_s)/(2 \u03c0 r), and the potential drop is the integral of 1/r. Probes at 0, s, 2s, and 3s, with current in at 0 and out at 3s, each contribute (I R_s/(2 \u03c0)) ln 2 on the inner pair. Superposition gives R_s = (\u03c0/ln 2)(V/I). A sink at 4s gives 2\u03c0/ln 3 instead. Not PhysJS.Crossing.antisymmetry. The Laplace field and linear superposition are hypotheses"],
  ["be-85", "PhysJS.ShotNoise.shot_eq", "derivation-step: in a window of length T the count N has mean (I/e) T, and the Poisson premise is Var(N) = mean(N). Charge e scales the variance by e\u00b2 and the windowed current divides by T, so Var(I) = e I/T. The one-sided bandwidth of that window is \u0394f = 1/(2 T), and S_I = Var(I)/\u0394f is 2 e I. The two-sided bandwidth \u0394f = 1/T gives e I. e is the elementary charge. Not a Fourier theorem and not Johnson\u2013Nyquist. The Poisson variance and the one-sided convention are hypotheses"],
  ["be-86", "PhysJS.ReynoldsAnalogy.reynolds_eq", "derivation-step: wall fluxes \u03c4 = \u03bc du/dy and q = k dT/dy, with C_f = \u03c4/(\u03c1 U\u00b2/2), h = q/\u0394T, St = h/(\u03c1 U c_p), and Pr = \u03bc c_p/k, satisfy St Pr = C_f/2 when the normalized wall gradients agree. That common slope is the equal-diffusivity hypothesis. At Pr = 1, St = C_f/2. Pr \u2260 1 with nonzero skin friction is not this equality. Not a Nusselt correlation"],
  ["be-87", "PhysJS.CapacitorNoise.noise_eq", "derivation-step: dU/dV = C V and U(0) = 0 integrate to U = (C/2) V\u00b2. The normalized Boltzmann weight of that energy is the Gaussian of mean 0 and variance k_B T/C, because the partition function is the Gaussian integral. The mean square on that law is k_B T/C, and (C/2) of it is (1/2) k_B T. (3/2) k_B T/C is not this variance. Dropping the energy half replaces it by k_B T/(2 C). Not three kinetic degrees of freedom"],
  ["be-88", "PhysJS.FermiSea.fermi_sea", "derivation-step: two spin states times the sphere (4π/3) k_F³/(2π)³ give n, so k_F³ = 3 π² n and the nonnegative root is k_F = (3 π² n)^{1/3}. The isotropic parabola E = ℏ² k²/(2 m*) is E_F at k_F. Its first derivative is v_F = ℏ k_F/m*, and ℏ⁻² times the second derivative is 1/m*. One spin is k_F³ = 6 π² n. Not a lattice band. The band, the two-spin count, and T = 0 are hypotheses"],
  ["be-89", "PhysJS.DebyeCutoff.debye_cutoff", "derivation-step: three acoustic branches filling 3n states, 3·(4π/3) k_D³/(2π)³ = 3n, give k_D³ = 6 π² n. A linear branch ω_D = v_s k_D is ω_D = v_s (6 π² n)^{1/3}. Equating the three-branch sum to n gives k_D³ = 2 π² n. The branch count and the common speed are hypotheses"],
  ["be-90", "PhysJS.DebyeHeat.debye_heat", "derivation-step: the mode integral ∫₀^{ω_D} 9 N ω²/ω_D³ dω = 3 N. The Debye energy with the integral extended to infinity is the hypothesis U = 9 N k_B T (T/θ_D)³ I, and I = π⁴/15 is a hypothesis, not an evaluation of ∫ x³/(exp(x)−1) dx. Nine times π⁴/15 is 3 π⁴/5, and U = A T⁴ differentiates to C_V = (12 π⁴/5) N k_B (T/θ_D)³. The energy prefactor 3 π⁴/5 is not the heat capacity. The phonon integral, the extension to infinity, and π⁴/15 are hypotheses"],
  ["be-91", "PhysJS.EinsteinSolid.einstein_heat", "derivation-step: three Planck oscillators per atom, each of energy k_B θ_E/(exp(θ_E/T)−1), differentiate to C_V = 3 N k_B (θ_E/T)² exp(θ_E/T)/(exp(θ_E/T)−1)². The zero-point k_B θ_E/2 is constant. The kernel x² e^x/(e^x−1)² tends to 1 as x → 0⁺, so the high-temperature limit is 3 N k_B. One oscillator tends to N k_B. Three oscillators and the Einstein spectrum are hypotheses"],
  ["be-92", "PhysJS.SommerfeldHeat.electronic_heat", "derivation-step: the Sommerfeld energy correction δU = (π²/6) (k_B T)² g(E_F) is a hypothesis, and its temperature derivative is c_V = (π²/3) k_B² T g(E_F). PhysJS.FermiSea.dos_factor is g(E_F) = (3/2) n/E_F for a √E density, so c_V = (π²/2) n k_B² T/E_F. A flat density g = n/E_F leaves π²/3. Not the Wiedemann–Franz law and not a second proof of be-61"],
  ["be-93", "PhysJS.CurieWeiss.curie_weiss", "derivation-step: linear response χ k_B T = μ₀ n (g μ_B)² ⟨S_z²⟩ with the high-temperature moment ⟨S_z²⟩ = S(S+1)/3 gives the Curie constant C = μ₀ n g² μ_B² S(S+1)/(3 k_B). Equal weights on m = ±1/2 give 1/4 = S(S+1)/3 at S = 1/2. Mean field B_eff = B + λ M with θ = C λ/μ₀ gives χ = C/(T−θ). θ = 0 is C/T. A classical moment uses μ²/3. The second moment and the mean-field shift are hypotheses. Not an su(2) derivation"],
  ["be-94", "PhysJS.PauliParamagnetism.pauli", "derivation-step: the Zeeman imbalance M = μ_B² g(E_F) B is a hypothesis, and χ_P = μ₀ M/B is μ₀ μ_B² g(E_F). PhysJS.FermiSea.dos_factor supplies g(E_F) = (3/2) n/E_F, so χ_P = μ₀ μ_B² (3 n)/(2 E_F). A flat density leaves the factor 1. Not Landau diamagnetism"],
  ["be-95", "PhysJS.GinzburgLandau.type_boundary", "derivation-step: in the normalization with gradient coefficient 1/κ², quartic (1/2)(1−f²)², and field B², the density at κ² = 1/2 is (√2 f' − a f)² + (B + (1−f²)/√2)² minus √2 times the derivative of a(1−f²). Vanishing squares and equal endpoints make that wall integral zero. A trial profile with that critical integral has energy (1/κ² − 2) times the gradient integral: negative when κ > 1/√2, zero at κ = 1/√2, and positive when κ < 1/√2. The positive side is this trial, not every minimizer. The GL density and the profile are hypotheses"],
  ["be-96", "PhysJS.UpperCritical.critical_field", "derivation-step: the linearized GL instability sets the Landau-level ground energy ℏ q B/(2 m*) of charge q = 2e equal to |α| = ℏ²/(2 m* ξ²). That level is a hypothesis, not the spectrum of the covariant Laplacian. The field is B = ℏ/(2 e ξ²). With Φ₀ = h/(2e) and h = 2 π ℏ this is B_c2 = Φ₀/(2 π ξ²). Charge e instead of 2e is a different field"],
  ["be-97", "PhysJS.AmbegaokarBaratoff.ambegaokar_baratoff", "derivation-step: the chain rule along E = Δ cosh t pulls the coherence-factor integrand back to sech t for t > 0. ∫₀^T sech = arctan(sinh T), and the limit T → ∞ is π/2. The tunnel Hamiltonian at zero temperature and identical gaps is the hypothesis that e I_c R_n is Δ times that improper integral, so I_c R_n = π Δ/(2 e). A coefficient other than π/2 fails. Not the finite-temperature tanh factor"],
  ["be-98", "PhysJS.BcsJump.heat_jump", "derivation-step: the weak-coupling excess free energy F = N(0) (T−T_c)/T_c · Δ² + 7 ζ N(0)/(16 π² T_c²) · Δ⁴ is a hypothesis, with k_B = 1. Its minimum is −α₀² (T−T_c)²/(4 β), and −T ∂²F/∂T² at T_c is ΔC = T_c α₀²/(2 β) = 8 π² N(0) T_c/(7 ζ). The normal heat capacity C_n = (2 π²/3) N(0) T_c is the both-spin Sommerfeld value, a hypothesis. The ratio is 12/(7 ζ). ζ is the quartic coefficient, not a series evaluation. One spin in C_n misses the ratio. Not 2π exp(−γ)"],
  ["be-99", "PhysJS.MassAction.mass_action", "derivation-step: the Boltzmann tails n = N_c exp(−(E_c−μ)/(k_B T)) and p = N_v exp(−(μ−E_v)/(k_B T)), with E_g = E_c − E_v, multiply to N_c N_v exp(−E_g/(k_B T)). That product is the square of n_i = √(N_c N_v) exp(−E_g/(2 k_B T)). Dropping the 2 in the exponent is a different density. The tails are hypotheses. Not a Fermi–Dirac integral"],
  ["be-100", "PhysJS.LyddaneSachsTeller.lst", "derivation-step: the undamped oscillator ε(ω) = ε(∞) + S/(ω_TO² − ω²) has a zero at ω_LO, which fixes S, and ε(0) is the same function at zero frequency. The ratio is ω_LO²/ω_TO² = ε(0)/ε(∞). The unsquared frequency ratio fails when ω_LO ≠ ω_TO. No damping is a hypothesis"],
  ["be-101", "PhysJS.BktJump.bkt_jump", "derivation-step: the phase gradient of a θ = φ vortex integrates to π J ln(R/a) between the core and radius R. The entropy hypothesis is the area of core positions, S = k_B ln((R/a)²) = 2 k_B ln(R/a). The free energy E − T S vanishes at a radius past the core only when k_B T = π J/2. Circumference entropy unbinds at π J. J is the stiffness in the vortex energy. Not the renormalization-group flow"],
  ["be-102", "PhysJS.LandauerConductance.conductance_eq", "derivation-step: a one-dimensional mode of speed v in a length L has density of states L/(h v) per spin, and the flux times v/L cancels to 1/h. Current is spin · e · (Σ T_n) · (1/h) · Δμ with spin = 2 and Δμ = e V, so G = (2 e²/h) Σ T_n. One spin is e²/h. The transmissions and the bias window are hypotheses. Not the Hall conductance and not Landauer erasure"],
];

const RANK1_PLANE_WAVE: readonly (readonly [string, string])[] = [
  ['ab-kg-schrodinger', 'PhysJS.KgSchrodinger.planeWave_iff_dispersion'],
  ['ab-klein-gordon-wave', 'PhysJS.KleinGordonWave.planeWave_iff_dispersion'],
  ['ab-stiff-string', 'PhysJS.StiffString.planeWave_iff_dispersion'],
  ['ab-telegraph-diffusion', 'PhysJS.TelegraphDiffusion.planeWave_iff_dispersion'],
  ['ab-telegraph-wave', 'PhysJS.TelegraphWave.planeWave_iff_dispersion'],
];

const PLANE_WAVE_COVERS = 'a plane wave solves the PDE iff ω(k) obeys the dispersion relation';

const COVERAGE = 'covers its statement only';

describe('vendored PhysJS manifest', () => {
  it('records commit 03e8bb77c952f720bdd2730af2afc6a7f2d36243, and every coverage phrase says the reference covers its statement only', () => {
    expect(manifest.commit).toBe('03e8bb77c952f720bdd2730af2afc6a7f2d36243');
    expect(manifest.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.commit).toBe(PHYSJS_COMMIT);
    expect(manifest.toolchain).toBe('leanprover/lean4:v4.34.1');
    expect(manifest.entries).toHaveLength(EXPECTED.length);
    expect(manifest.entries.every((entry) => entry.coverage === COVERAGE)).toBe(true);
  });

  it('names the eighty-three theorems and keys, in manifest order', () => {
    expect(manifest.entries.map((entry) => [entry.key, entry.theorem, entry.covers])).toEqual(EXPECTED.map((row) => [...row]));
  });

  it('every manifest entry resolves to a bridge whose formalRef is that entry', () => {
    expect(physjsManifestProblems({ manifest, bridges: carriers })).toEqual([]);
    for (const entry of manifest.entries) {
      const bridge = carriers.find((candidate) => candidate.id === entry.key);
      expect(bridge, entry.key).toBeDefined();
      expect(entry.bridgeId).toBe(entry.key);
      expect(bridge!.formalRef?.system).toBe('lean4-physjs');
      expect(bridge!.formalRef?.statement).toBe(entry.theorem);
      expect(bridge!.formalRef?.covers).toContain(entry.covers);
      expect(bridge!.formalRef?.covers).toContain(COVERAGE);
      expect(bridge!.formalRef?.version).toContain(`physjs@${manifest.commit}`);
      expect(bridge!.formalRef?.fidelity).not.toBe('unreviewed');
      const kind = entry.covers.split(':')[0];
      if (entry.key.startsWith('be-')) {
        expect(['reduction', 'limit', 'derivation-step', 'property', 'cross-check']).toContain(kind);
      }
    }
  });

  it('the pendulum theorem imports the Physlib statement and does not claim bound.delta', () => {
    const pendulum = manifest.entries.find((entry) => entry.key === 'ab-pendulum-linear');
    expect(pendulum?.imports).toBe('ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff');
    expect(pendulum?.covers).toBe('the transformation, not bound.delta');
  });

  it('ten reviewed formalRefs derive formally-proved, and none of them stores the tag', () => {
    const reviewed = atlasBridges.filter((bridge) => bridge.formalRef !== undefined && bridge.formalRef.fidelity !== 'unreviewed');
    expect(reviewed.map((bridge) => bridge.id)).toEqual([
      'ab-spring-lc',
      'ab-damped-rlc',
      'ab-pendulum-linear',
      'ab-telegraph-diffusion',
      'ab-telegraph-wave',
      'ab-wave-dalembert',
      'ab-klein-gordon-wave',
      'ab-kg-schrodinger',
      'ab-kg-oscillator',
      'ab-stiff-string',
    ]);
    for (const bridge of reviewed) {
      expect(deriveEvidence(bridge, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
      expect(bridge.evidence.has('formally-proved')).toBe(false);
    }
  });

  it('fails on a wrong commit, theorem, key, or coverage phrase', () => {
    const wrongCommit = { ...manifest, commit: '0000000' };
    expect(physjsManifestProblems({ manifest: wrongCommit, bridges: carriers }).join('\n')).toMatch(/commit is '0000000'/);

    const wrongTheorem = {
      ...manifest,
      entries: manifest.entries.map((entry, index) =>
        index === 0 ? { ...entry, theorem: 'PhysJS.Wrong.theorem' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: wrongTheorem, bridges: carriers }).join('\n')).toMatch(/PhysJS\.Wrong\.theorem/);

    const wrongKey = {
      ...manifest,
      entries: manifest.entries.map((entry, index) =>
        index === 0 ? { ...entry, key: 'ab-no-such-bridge', bridgeId: 'ab-no-such-bridge' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: wrongKey, bridges: carriers }).join('\n')).toMatch(
      /'ab-no-such-bridge' does not resolve to a bridge/,
    );

    const wrongCoverage = {
      ...manifest,
      entries: manifest.entries.map((entry) => ({ ...entry, coverage: 'covers the whole bridge' })),
    };
    expect(physjsManifestProblems({ manifest: wrongCoverage, bridges: carriers }).join('\n')).toMatch(/coverage phrase/);
  });

  it('carries nested planeWave objects on the five rank-1 entries and does not promote them', () => {
    expect(manifest.entries.filter((entry) => entry.planeWave !== undefined)).toHaveLength(RANK1_PLANE_WAVE.length);
    for (const [key, theorem] of RANK1_PLANE_WAVE) {
      const entry = manifest.entries.find((candidate) => candidate.key === key);
      expect(entry?.planeWave?.theorem).toBe(theorem);
      expect(entry?.planeWave?.covers).toBe(PLANE_WAVE_COVERS);
      expect(entry?.planeWave?.coverage).toBe(COVERAGE);
      expect(entry?.theorem.endsWith('covers_bound_delta')).toBe(true);
      const bridge = atlasBridges.find((candidate) => candidate.id === key);
      expect(bridge?.formalRef?.statement).toBe(entry?.theorem);
      expect(bridge?.formalRef?.statement).not.toBe(theorem);
      expect(bridge?.formalRef?.covers).toContain('bound.delta exactly, at the dispersion relation');
    }
    for (const key of ['ab-pendulum-linear', 'ab-kg-oscillator', 'ab-spring-lc', 'ab-damped-rlc', 'ab-wave-dalembert']) {
      expect(manifest.entries.find((entry) => entry.key === key)?.planeWave).toBeUndefined();
    }
  });

  it('fails when a nested planeWave object is dropped or named as the formalRef', () => {
    const stripped = {
      ...manifest,
      entries: manifest.entries.map((entry) => {
        const { planeWave: _planeWave, ...rest } = entry;
        return rest;
      }),
    };
    expect(physjsManifestProblems({ manifest: stripped, bridges: carriers }).join('\n')).toMatch(
      /compiled entry for 'ab-kg-schrodinger' disagrees with the vendored manifest/,
    );

    const promoted = carriers.map((bridge) =>
      bridge.id === 'ab-kg-schrodinger'
        ? {
            ...bridge,
            formalRef: {
              ...bridge.formalRef!,
              statement: 'PhysJS.KgSchrodinger.planeWave_iff_dispersion',
            },
          }
        : bridge,
    );
    expect(physjsManifestProblems({ manifest, bridges: promoted }).join('\n')).toMatch(
      /formalRef names the nested planeWave theorem/,
    );
  });

  it('does not skip a lean4-physjs reference the manifest does not name', () => {
    const extra = [...carriers, { id: 'ab-not-in-manifest', formalRef: physjsFormalRef('ab-pendulum-linear') }];
    expect(physjsManifestProblems({ manifest, bridges: extra }).join('\n')).toMatch(
      /lean4-physjs formalRef on 'ab-not-in-manifest' has no manifest entry/,
    );
  });

  it('records the milestone 2b nested statements and does not promote them', () => {
    const nested: readonly (readonly [string, string, string])[] = [
      ['be-53', 'oneLoop', 'PhysJS.YangMills.alphaRun_hasDerivAt'],
      ['be-38', 'inversion', 'PhysJS.Mond.mu_inversion'],
      ['be-13', 'vacuum', 'PhysJS.Einstein.vacuum_density'],
      ['be-13', 'corollary', 'PhysJS.Einstein.friedmann_corollary'],
      ['be-54', 'friedmann', 'PhysJS.RandallSundrum.flat_friedmann'],
      ['be-15', 'lengthMonomial', 'PhysJS.Coarsening.length_monomial_at'],
      ['be-17', 'torsionMonomial', 'PhysJS.EinsteinCartan.torsion_monomial'],
      ['be-17', 'coefficientNotFixed', 'PhysJS.EinsteinCartan.coefficient_not_fixed'],
      ['be-17', 'unitCoefficient', 'PhysJS.EinsteinCartan.inversion_of_unit_coefficient'],
      ['be-33', 'scalingShape', 'PhysJS.QuantumCritical.scaling_shape'],
      ['be-33', 'everyPower', 'PhysJS.QuantumCritical.every_power_homogeneous'],
    ];
    for (const [key, field, theorem] of nested) {
      const entry = manifest.entries.find((candidate) => candidate.key === key) as
        | (PhysjsManifestFile['entries'][number] & Record<string, { theorem?: string; covers?: string } | undefined>)
        | undefined;
      expect(entry?.[field]?.theorem).toBe(theorem);
      expect(entry?.[field]?.covers?.split(':')[0]).toMatch(/^(reduction|limit|derivation-step)$/);
      const formalRef = catalogFormalRef(Number(key.slice(3)));
      expect(formalRef?.statement).toBe(entry?.theorem);
      expect(formalRef?.statement).not.toBe(theorem);
    }
    expect(catalogFormalRef(20)).toBeUndefined();
    expect(manifest.entries.some((entry) => entry.key === 'be-20')).toBe(false);
  });

  it('the Buckingham nested covers name the assumed hypothesis', () => {
    const named: readonly (readonly [string, string, readonly string[]])[] = [
      ['be-15', 'lengthMonomial', ['dimensionally homogeneous', '[Γ] = L^z T⁻¹', 'C is not fixed', 'z = 2 is not derived']],
      ['be-17', 'torsionMonomial', ['dimensionally homogeneous', 'C is not fixed']],
      ['be-17', 'coefficientNotFixed', ['A factor other than 1 is not the catalog coefficient']],
      ['be-17', 'unitCoefficient', ['C = 1 is a hypothesis']],
      ['be-33', 'scalingShape', ['dimensionally homogeneous', 'φ is not fixed']],
      ['be-33', 'everyPower', ['The exponent p is not chosen']],
    ];
    for (const [key, field, phrases] of named) {
      const entry = manifest.entries.find((candidate) => candidate.key === key) as
        | (PhysjsManifestFile['entries'][number] & Record<string, { covers?: string } | undefined>)
        | undefined;
      const covers = entry?.[field]?.covers ?? '';
      expect(covers.startsWith('derivation-step: '), `${key} ${field}`).toBe(true);
      for (const phrase of phrases) {
        expect(covers, `${key} ${field}`).toContain(phrase);
      }
      expect(catalogFormalRef(Number(key.slice(3)))?.statement).not.toContain(field);
    }
  });

  it('fails when a nested catalog statement is dropped or named as the formalRef', () => {
    const stripped = {
      ...manifest,
      entries: manifest.entries.map((entry) => {
        if (entry.key !== 'be-53') return entry;
        const { oneLoop: _oneLoop, ...rest } = entry;
        return rest;
      }),
    };
    expect(physjsManifestProblems({ manifest: stripped, bridges: carriers }).join('\n')).toMatch(
      /compiled entry for 'be-53' disagrees with the vendored manifest/,
    );

    const promoted = carriers.map((bridge) =>
      bridge.id === 'be-53'
        ? {
            ...bridge,
            formalRef: {
              ...bridge.formalRef!,
              statement: 'PhysJS.YangMills.alphaRun_hasDerivAt',
            },
          }
        : bridge,
    );
    expect(physjsManifestProblems({ manifest, bridges: promoted }).join('\n')).toMatch(
      /formalRef names the nested oneLoop theorem/,
    );
  });

  it('keeps property and cross-check as their own kinds, and a missing kind word fails', () => {
    const counted = manifest.entries.filter((entry) => /^(reduction|limit|derivation-step): /.test(entry.covers));
    const crossChecks = manifest.entries.filter((entry) => entry.covers.startsWith('cross-check: '));
    const properties = manifest.entries.filter((entry) => entry.covers.startsWith('property: '));
    expect(counted.map((entry) => entry.key)).toEqual(['be-64', 'be-53', 'be-58', 'be-38', 'be-13', 'be-34', 'be-16', 'be-65', 'be-51', 'be-61', 'be-12', 'be-59', 'be-55', 'be-60', 'be-21', 'be-14', 'be-43', 'be-37', 'be-54', 'be-17', 'be-27', 'be-22', 'be-15', 'be-33', 'be-50', 'be-32', 'be-28', 'be-40', 'be-35', 'be-63', 'be-30', 'be-66', 'be-67', 'be-68', 'be-69', 'be-70', 'be-71', 'be-72', 'be-73', 'be-74', 'be-75', 'be-76', 'be-77', 'be-78', 'be-79', 'be-80', 'be-81', 'be-82', 'be-83', 'be-84', 'be-85', 'be-86', 'be-87', 'be-88', 'be-89', 'be-90', 'be-91', 'be-92', 'be-93', 'be-94', 'be-95', 'be-96', 'be-97', 'be-98', 'be-99', 'be-100', 'be-101', 'be-102']);
    expect(crossChecks.map((entry) => entry.key)).toEqual(['be-42', 'be-24', 'be-19']);
    expect(properties.map((entry) => entry.key)).toEqual(['be-29', 'be-11']);
    expect(counted.length + crossChecks.length + properties.length).toBe(73);
    // 58 is the record from before be-88..102.

    const unlabeled = {
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.key === 'be-16' ? { ...entry, covers: 'the two-state entropy equals k_B log 2' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: unlabeled, bridges: carriers }).join('\n')).toMatch(/catalog kind/);

    const dropped = carriers.map((bridge) => (bridge.id === 'be-16' ? { ...bridge, formalRef: undefined } : bridge));
    expect(physjsManifestProblems({ manifest, bridges: dropped }).join('\n')).toMatch(
      /bridge 'be-16' has no lean4-physjs formalRef/,
    );
  });

  it('a catalog covers line that is not a catalog kind fails', () => {
    const unkind = {
      ...manifest,
      entries: manifest.entries.map((entry) =>
        entry.key === 'be-64' ? { ...entry, covers: 'the whole bridge' } : entry,
      ),
    };
    expect(physjsManifestProblems({ manifest: unkind, bridges: carriers }).join('\n')).toMatch(/catalog kind/);
  });

  it('catalog formalRefs do not light formally-proved, and the atlas ten still do', () => {
    const countedIds = [64, 53, 58, 38, 13, 34, 65, 51, 61];
    const labeledIds = [42, 24, 19, 29, 11];
    for (const id of countedIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      const formalRef = catalogFormalRef(id);
      expect(formalRef?.system).toBe('lean4-physjs');
      expect(formalRef?.covers).toMatch(/^(reduction|limit|derivation-step): /);
      expect(deriveEvidence({ ...row!, formalRef }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    for (const id of labeledIds) {
      const row = BRIDGE_EQUATIONS.find((entry) => entry.id === id);
      const formalRef = catalogFormalRef(id);
      expect(formalRef?.system).toBe('lean4-physjs');
      expect(formalRef?.covers).toMatch(/^(property|cross-check): /);
      expect(deriveEvidence({ ...row!, formalRef }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
    const landauer = catalogFormalRef(16);
    expect(landauer?.statement).toBe('PhysJS.Landauer.erasure_eq');
    expect(landauer?.kind).toBe('bridge');
    expect(landauer?.axioms).toEqual(['propext', 'Classical.choice', 'Quot.sound']);
    expect(landauer?.covers.startsWith('derivation-step: ')).toBe(true);
    expect(deriveEvidence({ formalRef: landauer }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
    expect(deriveEdgeEvidence(16).has('formally-proved')).toBe(true);
    const reviewed = atlasBridges.filter(
      (bridge) => bridge.formalRef !== undefined && bridge.formalRef.fidelity !== 'unreviewed',
    );
    expect(reviewed).toHaveLength(10);
    for (const id of [36, 20, 57]) {
      expect(catalogFormalRef(id)).toBeUndefined();
      expect(manifest.entries.some((entry) => entry.key === `be-${id}`)).toBe(false);
    }
    const be36 = BRIDGE_EQUATIONS.find((entry) => entry.id === 36);
    expect(be36?.name).toBe('MOND - Dark Matter Interpolation Function (TeVeS relativistic MOND)');
  });
});
