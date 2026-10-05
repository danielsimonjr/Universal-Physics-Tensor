/**
 * Catalog rows for BE-126 through BE-133.
 *
 * Registered through `registerBridge`. No right-hand-side AST: each row's
 * numeric body is the evaluator.
 *
 * @module bridges/engineering-r7-catalog
 */

/** Engineering catalog rows, in id order. */
export const ENGINEERING_R7_CATALOG_ROWS = [
  {
    id: 126,
    name: 'Comb-drive lateral force',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['electromagnetic', 'mechanical'] as [string, string],
    status: 'established' as const,
    context:
      'For n fingers, overlap along x, gap g, and thickness h, both sidewalls give C = 2 n ε h x / g. Voltage-controlled coenergy (1/2) C V² has lateral force (1/2) V² dC/dx, so the sidewall 2 and the coenergy 1/2 cancel and F = n ε h V² / g. One sidewall leaves the 1/2. Fringe is neglected and the gap is fixed. Not the normal pull-in of be-79. A comb drive',
    formula_latex: 'F = n \\varepsilon h V^2 / g',
    source_part: 'III' as const,
    source_section: 'Engineering catalog (be-126) — established textbook relation, PhysJS.CombDrive.force_eq',
    known_issues: [],
    references: [
      'Both sidewalls give C = 2 n ε h x / g. The coenergy derivative at fixed voltage is (1/2) V² dC/dx. Not be-79.',
    ],
    dependencies: [],
    dimensional_signature: '[force]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateCombDrive in src/bridges/engineering-r7.ts. The overlay formalRef is PhysJS.CombDrive.force_eq, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. No confrontation.',
  },
  {
    id: 127,
    name: 'Subthreshold swing',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['electromagnetic', 'condensed'] as [string, string],
    status: 'established' as const,
    context:
      'Weak-inversion current is exponential in the surface potential, and the gate and depletion capacitances divide that potential. One decade of drain current gives S = ln(10) (k_B T / e) (1 + C_d / C_ox), in volts per decade. e is the elementary charge. The ln is the natural logarithm. Dropping C_d is not the swing when C_d ≠ 0. Not the ideal diode of be-82. A MOSFET subthreshold swing',
    formula_latex: 'S = \\ln(10)\\,(k_B T / e)\\,(1 + C_d / C_{ox})',
    source_part: 'III' as const,
    source_section: 'Engineering catalog (be-127) — established textbook relation, PhysJS.SubthresholdSwing.swing_eq',
    known_issues: [],
    references: [
      'Boltzmann electrons, the capacitive divider, and one decade of current are the hypotheses of PhysJS.SubthresholdSwing.swing_eq. e is the elementary charge.',
    ],
    dependencies: [],
    dimensional_signature: '[L^2 M T^-3 I^-1]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateSubthresholdSwing in src/bridges/engineering-r7.ts. The overlay formalRef is PhysJS.SubthresholdSwing.swing_eq, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. No confrontation.',
  },
  {
    id: 128,
    name: 'Ideal boost ratio',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['electromagnetic', 'electrical'] as [string, string],
    status: 'established' as const,
    context:
      'An ideal boost converter in periodic steady state with continuous inductor current has V_out / V_in = 1 / (1 − D) for D ≠ 1. On, the inductor sees V_in. Off, it sees V_in − V_out. Volt-second balance sets the period average to zero. No real duty equals both this ratio and the buck ratio D. A boost converter',
    formula_latex: 'V_{out} / V_{in} = 1 / (1 - D)',
    source_part: 'III' as const,
    source_section: 'Engineering catalog (be-128) — established textbook relation, PhysJS.BoostConverter.boost_ratio',
    known_issues: [],
    references: [
      'Ideal switches, constant voltages over a period, and current that does not reach zero are the hypotheses of PhysJS.BoostConverter.boost_ratio.',
    ],
    dependencies: [],
    dimensional_signature: '[1]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateBoostConverter in src/bridges/engineering-r7.ts. The overlay formalRef is PhysJS.BoostConverter.boost_ratio, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. No confrontation.',
  },
  {
    id: 129,
    name: 'Straight-fin efficiency',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['thermal', 'mechanical'] as [string, string],
    status: 'established' as const,
    context:
      'The steady fin equation is θ\'\' = m² θ with m² = h P / (k A). A rectangle with w ≫ t has P/A = 2/t, so m = √(2 h / (k t)). An adiabatic tip and an imposed base temperature give η = tanh(m L) / (m L). One face is not that m. tanh is not 1, so this is not an infinite fin. Fin efficiency',
    formula_latex: 'm = \\sqrt{2 h / (k t)},\\quad \\eta = \\tanh(m L) / (m L)',
    source_part: 'III' as const,
    source_section: 'Engineering catalog (be-129) — established textbook relation, PhysJS.FinEfficiency.efficiency_eq',
    known_issues: [],
    references: [
      'The fin equation, the adiabatic tip, and P/A = 2/t are the hypotheses of PhysJS.FinEfficiency.efficiency_eq.',
    ],
    dependencies: [],
    dimensional_signature: '[1]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateFinEfficiency in src/bridges/engineering-r7.ts. The edge value is η. m is on the same result and is not a second edge. The overlay formalRef is PhysJS.FinEfficiency.efficiency_eq, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. No confrontation.',
  },
  {
    id: 130,
    name: 'Thermoelectric generator efficiency',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['thermal', 'electromagnetic'] as [string, string],
    status: 'established' as const,
    context:
      'At the current that maximizes efficiency, η = (1 − T_c/T_h) (√(1 + Z T_m) − 1) / (√(1 + Z T_m) + T_c/T_h), with Z = S² / (R K) and T_m = (T_h + T_c) / 2. The hot-junction heat splits Joule heating in half. Matched load m = 1 is not stationary when Z T_m ≠ 0. The Carnot factor alone is not this efficiency. Thermoelectric generator efficiency. Figure of merit',
    formula_latex:
      '\\eta = (1 - T_c/T_h) (\\sqrt{1 + Z T_m} - 1) / (\\sqrt{1 + Z T_m} + T_c/T_h)',
    source_part: 'III' as const,
    source_section:
      'Engineering catalog (be-130) — established textbook relation, PhysJS.ThermoelectricGenerator.efficiency_eq',
    known_issues: [],
    references: [
      'Constant properties, the split of Joule heat, and dη/dI = 0 are the hypotheses of PhysJS.ThermoelectricGenerator.efficiency_eq.',
    ],
    dependencies: [],
    dimensional_signature: '[1]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateThermoelectricGenerator in src/bridges/engineering-r7.ts. The overlay formalRef is PhysJS.ThermoelectricGenerator.efficiency_eq, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. Not Carnot alone. No confrontation.',
  },
  {
    id: 131,
    name: 'Joukowsky pressure',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['fluid', 'mechanical'] as [string, string],
    status: 'established' as const,
    context:
      'A sudden closure gives Δp = ρ c Δv. For a thin elastic pipe the wave speed is c = √(K/ρ) / √(1 + (K/E)(D/e_wall)), with K the fluid bulk modulus, E the wall modulus, D the diameter, and e_wall the wall thickness. ρ (Δv)² is not ρ c Δv when c ≠ Δv. Dropping the wall term is the rigid-pipe speed. Joukowsky. Water hammer',
    formula_latex:
      '\\Delta p = \\rho c \\Delta v,\\quad c = \\sqrt{K/\\rho} / \\sqrt{1 + (K/E)(D/e_{wall})}',
    source_part: 'III' as const,
    source_section: 'Engineering catalog (be-131) — established textbook relation, PhysJS.Joukowsky.joukowsky_eq',
    known_issues: [],
    references: [
      'The momentum jump and the thin-wall closure are the hypotheses of PhysJS.Joukowsky.joukowsky_eq. Mass on the front is not required for the pressure.',
    ],
    dependencies: [],
    dimensional_signature: '[L^-1 M T^-2]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateJoukowsky in src/bridges/engineering-r7.ts. The edge value is Δp. The thin-wall speed is on the same result and is not a second edge. The overlay formalRef is PhysJS.Joukowsky.joukowsky_eq, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. No confrontation.',
  },
  {
    id: 132,
    name: 'Coaxial capacitance per length',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['electromagnetic', 'electrical'] as [string, string],
    status: 'established' as const,
    context:
      'A long coaxial pair, inner radius a, outer radius b, and insulator permittivity ε, has C\' = 2 π ε / ln(b/a). Gauss\'s law gives the radial field, and the potential is the integral of 1/r. End fringe is neglected. Dropping 2 π is not this capacitance. Not a parallel-plate ε A/d. Coaxial. Coax',
    formula_latex: 'C\' = 2 \\pi \\varepsilon / \\ln(b/a)',
    source_part: 'III' as const,
    source_section:
      'Engineering catalog (be-132) — established textbook relation, PhysJS.CoaxialCapacitance.capacitance_per_length',
    known_issues: [],
    references: [
      'The cylindrical field and C\' = λ/ΔV are the hypotheses of PhysJS.CoaxialCapacitance.capacitance_per_length.',
    ],
    dependencies: [],
    dimensional_signature: '[L^-3 M^-1 T^4 I^2]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateCoaxialCapacitance in src/bridges/engineering-r7.ts. The overlay formalRef is PhysJS.CoaxialCapacitance.capacitance_per_length, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. No confrontation.',
  },
  {
    id: 133,
    name: 'Damping ratio',
    category: 'D',
    category_name: 'Field Unification Bridges',
    bridges: ['mechanical', 'dynamical'] as [string, string],
    status: 'established' as const,
    context:
      'For m ẍ + c ẋ + k x = 0, ζ = c / (2 √(k m)). The characteristic polynomial is s² + (c/m) s + k/m. The 2 is the binomial coefficient in 2 ζ ω with ω = √(k/m). For c ≥ 0 a zero discriminant is ζ = 1, so c_crit = 2 √(k m). Dropping the 2 is not this ratio. √(k/m) is not ζ. Damping ratio',
    formula_latex: '\\zeta = c / (2 \\sqrt{k m})',
    source_part: 'III' as const,
    source_section: 'Engineering catalog (be-133) — established textbook relation, PhysJS.DampingRatio.damping_ratio',
    known_issues: [],
    references: [
      'Constant coefficients and c/m = 2 ζ ω are the hypotheses of PhysJS.DampingRatio.damping_ratio.',
    ],
    dependencies: [],
    dimensional_signature: '[1]',
    tractability_class: 'closed-form' as const,
    notes: 'Closed-form evaluator evaluateDampingRatio in src/bridges/engineering-r7.ts. The overlay formalRef is PhysJS.DampingRatio.damping_ratio, kind bridge. The catalog path passes it, so catalog evidence and edge evidence are formally-proved. The edge confidence stays established. No confrontation.',
  },
];
