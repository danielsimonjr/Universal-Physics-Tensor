# Bridge type classification

The `type` field on each record in `data/bridge-catalog.json` is authoritative. This file is the human-readable ledger: one line for why each id was filed `standard` or `cross-domain`. When the two disagree, the catalog field is the filing and this ledger is wrong.

`cross-domain` means the equation joins quantities or constants from two distinct fields. `standard` means the equation stays inside one field. `type` does not light an evidence tag. The specification writes up the cross-domain records. A standard record has no specification heading.

The rule recorded with this ledger: for ids 11–133, cross-domain when the equation joins quantities or constants from two distinct fields (thermodynamics, electromagnetism, quantum theory, gravitation, information), and standard when the equation stays inside one field. Ids 134–146 stayed inside condensed matter and were filed standard. Ids 147–170 follow the round-9 table. Inside 11–133, id 26 (DNA tunneling) and id 118 (Parker critical radius) are cross-domain, the same pattern as Jeans (65).

| id | type | reason |
|---|---|---|
| 11 | standard | Lindblad evolution stays inside open quantum systems. |
| 12 | cross-domain | Thermal wavelength joins Planck's constant to k_B T. |
| 13 | standard | The Einstein trace is a contraction inside general relativity. |
| 14 | cross-domain | A bulk state is rebuilt from a boundary code, quantum information joined to holography. |
| 15 | standard | Model A gradient flow stays inside critical dynamics. |
| 16 | cross-domain | Minimum erasure energy joins k_B T to one bit. |
| 17 | cross-domain | Torsion is sourced by spin density, gravitation joined to quantum spin. |
| 18 | standard | The hidden-sector Lagrangian stays inside one gauge theory. |
| 19 | cross-domain | The bounce joins the Friedmann equation to a Planck-scale critical density. |
| 20 | standard | Vacuum density from Λ stays inside general relativity. |
| 21 | cross-domain | The viscosity-to-entropy ratio joins hydrodynamics to ℏ and k_B. |
| 22 | cross-domain | The topological correction joins entanglement entropy to a quantum-gravity constant. |
| 23 | cross-domain | Strange-metal resistivity joins transport to ℏ, k_B, and the elementary charge. |
| 24 | standard | Förster efficiency relates distance to the Förster radius inside molecular photophysics. |
| 25 | standard | Φ_max is defined inside integrated-information theory. |
| 26 | cross-domain | The mutation rate multiplies a tunneling integral in ℏ by temperature, pH, and an electromagnetic factor. |
| 27 | standard | The active-matter temperature stays inside non-equilibrium statistical mechanics. |
| 28 | standard | Entropy production stays inside non-equilibrium thermodynamics. |
| 29 | standard | The Jarzynski equality stays inside non-equilibrium statistical mechanics. |
| 30 | cross-domain | The entanglement first law joins modular energy to geometry. |
| 31 | cross-domain | Causal-set curvature is counted in Planck lengths. |
| 32 | standard | A quantum reference-frame map stays inside quantum foundations. |
| 33 | standard | The Hertz–Millis length stays inside quantum-critical condensed matter. |
| 34 | cross-domain | Freeze-out in curved spacetime joins a critical exponent to a cosmological scale. |
| 35 | standard | The crossing equation stays inside conformal field theory. |
| 36 | standard | The graviton-speed bound stays inside gravitational-wave propagation. |
| 37 | standard | Shapiro delay stays inside weak-field general relativity. |
| 38 | standard | The interpolation function stays inside modified Newtonian dynamics. |
| 39 | standard | The beta functions renormalize the gravitational couplings inside asymptotic safety. |
| 40 | standard | The composite-Higgs potential stays inside one particle-physics model. |
| 41 | cross-domain | The mass depends on a field excursion measured in Planck units. |
| 42 | cross-domain | Hawking temperature joins surface gravity to ℏ and k_B. |
| 43 | cross-domain | The area law joins entanglement entropy to the Planck length. |
| 44 | standard | Soft hair stays inside the horizon charge algebra. |
| 45 | cross-domain | The censorship bound compares e-folds with the Planck mass over the inflationary Hubble scale. |
| 46 | standard | The measure stays inside one multiverse proposal. |
| 47 | cross-domain | The yield joins Standard-Model nucleon densities to a dark-sector transfer. |
| 48 | standard | The mass-proportional collapse rate stays inside objective-collapse quantum mechanics. |
| 49 | standard | Redundancy stays inside quantum Darwinism. |
| 50 | standard | The half-advanced field stays inside one absorber-theory proposal. |
| 51 | standard | Light deflection stays inside weak-field general relativity. |
| 52 | standard | Perihelion advance stays inside general relativity. |
| 54 | standard | The quadratic density correction stays inside brane cosmology. |
| 53 | standard | The one-loop coefficient stays inside Yang–Mills theory. |
| 55 | standard | Integer Hall conductance is the conductance quantum of the quantum Hall effect. |
| 56 | cross-domain | Casimir pressure joins ℏ to a macroscopic force. |
| 57 | cross-domain | Unruh temperature joins proper acceleration to ℏ, c, and k_B. |
| 58 | cross-domain | Voltage noise joins k_B T to an electrical resistance. |
| 59 | standard | The Josephson frequency stays inside superconductivity. |
| 60 | standard | The fractional plateau stays inside the fractional quantum Hall effect. |
| 61 | cross-domain | Thermal conductivity is tied to electrical conductivity by (k_B/e)². |
| 62 | standard | The gap ratio stays inside weak-coupling superconductivity. |
| 63 | cross-domain | The limiting mass joins electron degeneracy to gravitational equilibrium. |
| 64 | cross-domain | The luminosity joins G to the Thomson cross section. |
| 65 | cross-domain | The collapse mass joins k_B T to G. |
| 66 | standard | Radiation pressure on an opaque surface stays inside optics. |
| 67 | standard | The Alfvén speed stays inside ideal magnetohydrodynamics. |
| 68 | cross-domain | Local temperature is tied to the gravitational redshift factor. |
| 69 | standard | The fast speed stays inside ideal magnetohydrodynamics. |
| 70 | cross-domain | Diffusivity is tied to mobility by k_B T/q. |
| 71 | standard | The coexistence slope stays inside phase equilibrium. |
| 72 | standard | The frequency ratio of static observers stays inside general relativity. |
| 73 | cross-domain | The Peltier coefficient is tied to the Seebeck coefficient by temperature. |
| 74 | standard | Solenoid pressure stays inside magnetostatics. |
| 75 | standard | The penetration depth stays inside superconductivity. |
| 76 | standard | Plasma beta stays inside magnetohydrodynamics. |
| 77 | standard | Pipe flux stays inside viscous flow. |
| 78 | standard | The buckling load stays inside structural mechanics. |
| 79 | standard | Pull-in voltage stays inside electrostatic actuation. |
| 80 | standard | The space-charge current stays inside a solid dielectric. |
| 81 | standard | The space-charge current stays inside a vacuum diode. |
| 82 | cross-domain | Diode current joins an electrical bias to k_B T. |
| 83 | cross-domain | The Thomson coefficient joins a thermoelectric entropy derivative to temperature. |
| 84 | standard | Sheet resistance stays inside a four-point electrical measurement. |
| 85 | standard | The one-sided noise stays inside electrical shot noise. |
| 86 | standard | The analogy at Prandtl number 1 stays inside convective transport. |
| 87 | cross-domain | Voltage variance joins k_B T to capacitance. |
| 88 | standard | The Fermi wavevector stays inside the free-electron gas. |
| 89 | standard | The cutoff stays inside lattice dynamics. |
| 90 | standard | The T³ heat capacity stays inside lattice thermodynamics. |
| 91 | standard | The Einstein function stays inside lattice thermodynamics. |
| 92 | standard | The linear heat capacity stays inside the degenerate electron gas. |
| 93 | standard | The susceptibility stays inside magnetism. |
| 94 | standard | The Pauli susceptibility stays inside the degenerate electron gas. |
| 95 | standard | The wall factor stays inside Ginzburg–Landau theory. |
| 96 | standard | The upper critical field stays inside superconductivity. |
| 97 | standard | The zero-temperature product stays inside a Josephson junction. |
| 98 | standard | The heat-capacity jump stays inside BCS theory. |
| 99 | standard | The intrinsic density stays inside semiconductor statistics. |
| 100 | standard | The frequency ratio stays inside lattice dielectrics. |
| 101 | standard | The unbinding temperature stays inside two-dimensional superconductivity. |
| 102 | standard | The channel conductance stays inside mesoscopic electrical transport. |
| 103 | standard | The sheath threshold stays inside plasma kinetics. |
| 104 | standard | The ion-acoustic dispersion stays inside plasma waves. |
| 105 | standard | The upper-hybrid frequency stays inside plasma waves. |
| 106 | standard | The cutoff stays inside cold-plasma waves. |
| 107 | standard | The lower-hybrid frequency stays inside plasma waves. |
| 108 | standard | The oblique speed stays inside magnetohydrodynamic waves. |
| 109 | standard | The pinch balance stays inside magnetohydrodynamics. |
| 110 | standard | The loss-cone pitch stays inside magnetic mirroring. |
| 111 | standard | The drift stays inside single-particle motion in an inhomogeneous field. |
| 112 | standard | The drift stays inside single-particle motion in crossed fields. |
| 113 | standard | The damping rate stays inside plasma kinetic theory. |
| 114 | standard | The Coulomb argument stays inside plasma screening. |
| 115 | standard | The two-species length stays inside plasma screening. |
| 116 | standard | The resistivity stays inside plasma transport. |
| 117 | standard | The decay time stays inside resistive magnetohydrodynamics. |
| 118 | cross-domain | The critical radius joins GM to the isothermal sound speed. |
| 119 | standard | The spiral ratio stays inside the frozen-in solar-wind field. |
| 120 | standard | The standoff stays inside magnetospheric pressure balance. |
| 121 | standard | The breakeven product stays inside fusion confinement. |
| 122 | standard | The floating potential stays inside probe theory. |
| 123 | standard | The diffusion ratio stays inside cross-field plasma transport. |
| 124 | standard | The firehose margin stays inside plasma anisotropy. |
| 125 | standard | The mirror margin stays inside plasma anisotropy. |
| 126 | standard | The lateral force stays inside electrostatic actuation. |
| 127 | cross-domain | The swing joins the thermal voltage k_B T/e to a capacitive divider. |
| 128 | standard | The conversion ratio stays inside an ideal switching converter. |
| 129 | standard | Fin efficiency stays inside conduction–convection heat transfer. |
| 130 | cross-domain | The efficiency joins a Carnot factor to a thermoelectric figure of merit. |
| 131 | standard | The pressure rise stays inside unsteady pipe flow. |
| 132 | standard | Capacitance per length stays inside electrostatics of a coaxial line. |
| 133 | standard | The damping ratio stays inside a second-order mechanical oscillator. |
| 134 | standard | r8 report prints no filing token. The magnon deficit stays inside ferromagnetism, so the row is standard. |
| 135 | standard | r8 report prints no filing token. The three-dimensional density of states stays inside band counting, so the row is standard. |
| 136 | standard | r8 report prints no filing token. The two-dimensional density of states stays inside band counting, so the row is standard. |
| 137 | standard | r8 report prints no filing token. Thomas–Fermi screening of a Fermi gas stays inside condensed matter, so the row is standard. |
| 138 | standard | r8 report prints no filing token. Built-in voltage stays inside a p–n junction, so the row is standard. |
| 139 | standard | r8 report prints no filing token. The Fermi offset stays inside semiconductor statistics, so the row is standard. |
| 140 | standard | r8 report prints no filing token. The oscillation frequency stays inside Fermi-surface orbits, so the row is standard. |
| 141 | standard | r8 report prints no filing token. The inductance stays inside the Josephson equations, so the row is standard. |
| 142 | standard | r8 report prints no filing token. The lower critical field stays inside London theory, so the row is standard. |
| 143 | standard | r8 report prints no filing token. The Lorentzian stays inside the Drude model, so the row is standard. |
| 144 | standard | r8 report prints no filing token. Adding scattering rates stays inside transport, so the row is standard. |
| 145 | standard | r8 report prints no filing token. The Stoner factor stays inside itinerant magnetism, so the row is standard. |
| 146 | standard | r8 report prints no filing token. The two-fluid fraction stays inside superconductivity, so the row is standard. |
| 147 | standard | r9 table labels the row standard. The Arrhenius rate stays inside chemical kinetics. |
| 148 | standard | r9 table labels the row standard. The Eyring rate stays inside chemical kinetics. |
| 149 | standard | r9 table labels the row standard. The van 't Hoff slope stays inside chemical equilibrium. |
| 150 | standard | r9 table labels the row standard. The isotherm stays inside chemical equilibrium. |
| 151 | standard | r9 table labels the row standard. The Nernst voltage stays inside electrochemistry. |
| 152 | standard | r9 table labels the row standard. The integrated Clausius–Clapeyron relation stays inside phase equilibrium. |
| 153 | standard | r9 table labels the row standard. Raoult's law stays inside phase equilibrium. |
| 154 | standard | r9 table labels the row standard. The Prandtl number stays inside convective transport. |
| 155 | standard | r9 table labels the row standard. The Reynolds number stays inside fluid mechanics. |
| 156 | standard | r9 table labels the row standard. The Biot number stays inside heat transfer. |
| 157 | standard | r9 table labels the row standard. The Nusselt number stays inside convection. |
| 158 | standard | r9 table labels the row standard. The Schmidt number stays inside mass transfer. |
| 159 | standard | r9 table labels the row standard. The Sherwood number stays inside mass transfer. |
| 160 | standard | r9 table labels the row standard. Fourier's law stays inside heat conduction. |
| 161 | standard | r9 table labels the row standard. Newton cooling stays inside convection. |
| 162 | standard | r9 table labels the row standard. Otto efficiency stays inside a thermodynamic cycle. |
| 163 | standard | r9 table labels the row standard. The Joule–Thomson coefficient stays inside real-gas thermodynamics. |
| 164 | cross-domain | r9 table labels the row cross-domain. The spectrum joins thermal radiation to quantum electromagnetism. |
| 165 | cross-domain | r9 table labels the row cross-domain. The constant joins the Planck integral to c and ℏ. |
| 166 | cross-domain | r9 table labels the row cross-domain. The displacement constant joins a thermal wavelength to h and c. |
| 167 | cross-domain | r9 table labels the row cross-domain. The entropy joins thermodynamics to the quantum concentration. |
| 168 | cross-domain | r9 table labels the row cross-domain. The ionization constant joins a chemical balance to the thermal wavelength. |
| 169 | cross-domain | r9 table labels the row cross-domain. The current joins thermionic emission to a quantum phase-space factor. |
| 170 | cross-domain | r9 table labels the row cross-domain. Reciprocity joins a thermodynamic potential to the transport matrix. |
