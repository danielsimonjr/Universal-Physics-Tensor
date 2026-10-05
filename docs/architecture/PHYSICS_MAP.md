# The Physics Map

<!-- repo-map:no-verification -->

> **No `## Verification` block, deliberately.** This document is a map of the physics catalog -- bridges, quantities and their relations. Every count in it is of catalog entries, established by reading the catalog; repo_map measures files, exports and imports and cannot hold any of them.
> The drift gate treats a missing Verification section as a failure, so the opt-out is
> stated here explicitly rather than left to be inferred from its absence.

Current catalog and edge counts, and the places the same concept is implemented twice, are `INTEGRATION_MAP.md`. A count in this essay that still says 46 edges or 58 bridges is older than the 92-row, 83-edge tree.

UPT's bridge/law catalog is a **graph**. Round nodes are *quantities*
(`mass`, `temperature`, `photon-energy`, …). Box nodes are *equations* —
laws, bridges, or machine-derived proposals. Each one is an n-ary
junction whose source quantities point in and whose target points out.
`upt map` renders that graph straight from the live data
(`CATALOG_GRAPH` / `CANONICAL_GRAPH` / `PROPOSED_BRIDGES`), as Mermaid
or Graphviz-DOT **source text**, or as rendered SVG.

> **Read this map honestly.** It is *deliberately disjointed*. The catalog is
> sparse — one anchored cluster hubbed on a few quantities, plus a long tail of
> isolated equations that share no quantity with anything else. The rank-6
> tensor framing is *aspirational* about connectivity the catalog does not yet
> have, and most cross-cluster "links" the discovery tools surface are
> dimensional coincidences, not physics (see `upt discover` and
> `docs/research/`). The map's job is to show that structure truthfully, **not**
> to imply a unified theory.

## The standard-physics (canonical) layer

The textbook L-layer alone — every node a `law` (blue). Even established
physics is only loosely connected. The layer has an 84-law core hubbed on
`mass`, `temperature`, `length`, `force`, and other widely-shared quantities.
The layer also has three small two-law clusters (`radioactive-decay ↔ half-life`
on the decay constant, `thomson-cross-section ↔ classical-electron-radius`,
and the flat Friedmann equation with its curvature form). It also has 19 isolated laws, listed in the
map's `isolated` group below, that share no quantity with any other law in
this layer.

```mermaid
flowchart LR
%% UPT physics map — canonical (standard-physics L-layer, bridges excluded)
  subgraph cl_0["anchored cluster (84)"]
    direction LR
    j_CE_pendulum_period["Pendulum period"]:::law
    q_length(["length"]):::qty
    q_length --> j_CE_pendulum_period
    q_gravity(["gravity"]):::qty
    q_gravity --> j_CE_pendulum_period
    q_period(["period"]):::qty
    j_CE_pendulum_period --> q_period
    j_CE_kepler_third["Kepler's third law"]:::law
    q_semi_major_axis(["semi-major-axis"]):::qty
    q_semi_major_axis --> j_CE_kepler_third
    q_mass(["mass"]):::qty
    q_mass --> j_CE_kepler_third
    j_CE_kepler_third --> q_period
    j_CE_schwarzschild_radius["Schwarzschild radius"]:::law
    q_mass --> j_CE_schwarzschild_radius
    q_radius(["radius"]):::qty
    j_CE_schwarzschild_radius --> q_radius
    j_CE_string_wave_speed["Wave speed on a string"]:::law
    q_tension(["tension"]):::qty
    q_tension --> j_CE_string_wave_speed
    q_linear_density(["linear-density"]):::qty
    q_linear_density --> j_CE_string_wave_speed
    q_speed(["speed"]):::qty
    j_CE_string_wave_speed --> q_speed
    j_CE_compton_wavelength["Reduced Compton wavelength"]:::law
    q_mass --> j_CE_compton_wavelength
    q_compton_wavelength(["compton-wavelength"]):::qty
    j_CE_compton_wavelength --> q_compton_wavelength
    j_CE_thermal_de_broglie["Thermal de Broglie wavelength"]:::law
    q_mass --> j_CE_thermal_de_broglie
    q_temperature(["temperature"]):::qty
    q_temperature --> j_CE_thermal_de_broglie
    q_thermal_wavelength(["thermal-wavelength"]):::qty
    j_CE_thermal_de_broglie --> q_thermal_wavelength
    j_CE_hawking_temperature["Hawking temperature"]:::law
    q_mass --> j_CE_hawking_temperature
    j_CE_hawking_temperature --> q_temperature
    j_CE_light_deflection["Light deflection (Eddington weak-field)"]:::law
    q_mass --> j_CE_light_deflection
    q_impact_parameter(["impact_parameter"]):::qty
    q_impact_parameter --> j_CE_light_deflection
    q_light_deflection(["light-deflection"]):::qty
    j_CE_light_deflection --> q_light_deflection
    j_CE_perihelion_precession["Perihelion precession (Einstein)"]:::law
    q_mass --> j_CE_perihelion_precession
    q_a(["a"]):::qty
    q_a --> j_CE_perihelion_precession
    q_one_minus_e_sq(["one_minus_e_sq"]):::qty
    q_one_minus_e_sq --> j_CE_perihelion_precession
    q_perihelion_precession(["perihelion-precession"]):::qty
    j_CE_perihelion_precession --> q_perihelion_precession
    j_CE_newton_gravitation["Newton's law of gravitation"]:::law
    q_mass --> j_CE_newton_gravitation
    q_secondary_mass(["secondary-mass"]):::qty
    q_secondary_mass --> j_CE_newton_gravitation
    q_r(["r"]):::qty
    q_r --> j_CE_newton_gravitation
    q_gravitational_force(["gravitational-force"]):::qty
    j_CE_newton_gravitation --> q_gravitational_force
    j_CE_newton_second_law["Newton's second law"]:::law
    q_mass --> j_CE_newton_second_law
    q_acceleration(["acceleration"]):::qty
    q_acceleration --> j_CE_newton_second_law
    q_force(["force"]):::qty
    j_CE_newton_second_law --> q_force
    j_CE_mass_energy["Mass–energy equivalence"]:::law
    q_mass --> j_CE_mass_energy
    q_rest_energy(["rest-energy"]):::qty
    j_CE_mass_energy --> q_rest_energy
    j_CE_momentum["Momentum (non-relativistic)"]:::law
    q_mass --> j_CE_momentum
    q_velocity(["velocity"]):::qty
    q_velocity --> j_CE_momentum
    q_p(["p"]):::qty
    j_CE_momentum --> q_p
    j_CE_kinetic_energy["Kinetic energy"]:::law
    q_mass --> j_CE_kinetic_energy
    q_speed --> j_CE_kinetic_energy
    q_kinetic_energy(["kinetic-energy"]):::qty
    j_CE_kinetic_energy --> q_kinetic_energy
    j_CE_rotational_kinetic_energy["Rotational kinetic energy"]:::law
    q_moment_of_inertia(["moment-of-inertia"]):::qty
    q_moment_of_inertia --> j_CE_rotational_kinetic_energy
    q_angular_velocity(["angular-velocity"]):::qty
    q_angular_velocity --> j_CE_rotational_kinetic_energy
    q_rotational_kinetic_energy(["rotational-kinetic-energy"]):::qty
    j_CE_rotational_kinetic_energy --> q_rotational_kinetic_energy
    j_CE_gravitational_potential_energy["Gravitational potential energy"]:::law
    q_mass --> j_CE_gravitational_potential_energy
    q_secondary_mass --> j_CE_gravitational_potential_energy
    q_r --> j_CE_gravitational_potential_energy
    q_gravitational_potential_energy(["gravitational-potential-energy"]):::qty
    j_CE_gravitational_potential_energy --> q_gravitational_potential_energy
    j_CE_work["Work (constant force)"]:::law
    q_force --> j_CE_work
    q_distance(["distance"]):::qty
    q_distance --> j_CE_work
    q_work(["work"]):::qty
    j_CE_work --> q_work
    j_CE_spring_potential_energy["Elastic potential energy"]:::law
    q_spring_constant(["spring-constant"]):::qty
    q_spring_constant --> j_CE_spring_potential_energy
    q_displacement(["displacement"]):::qty
    q_displacement --> j_CE_spring_potential_energy
    q_spring_potential_energy(["spring-potential-energy"]):::qty
    j_CE_spring_potential_energy --> q_spring_potential_energy
    j_CE_power["Mechanical power"]:::law
    q_force --> j_CE_power
    q_velocity --> j_CE_power
    q_power(["power"]):::qty
    j_CE_power --> q_power
    j_CE_centripetal_force["Centripetal force"]:::law
    q_mass --> j_CE_centripetal_force
    q_speed --> j_CE_centripetal_force
    q_radius --> j_CE_centripetal_force
    j_CE_centripetal_force --> q_force
    j_CE_hooke_law["Hooke's law"]:::law
    q_spring_constant --> j_CE_hooke_law
    q_displacement --> j_CE_hooke_law
    j_CE_hooke_law --> q_force
    j_CE_torque["Torque (perpendicular force)"]:::law
    q_radius --> j_CE_torque
    q_force --> j_CE_torque
    q_torque(["torque"]):::qty
    j_CE_torque --> q_torque
    j_CE_angular_momentum["Angular momentum (point particle)"]:::law
    q_radius --> j_CE_angular_momentum
    q_p --> j_CE_angular_momentum
    q_angular_momentum(["angular-momentum"]):::qty
    j_CE_angular_momentum --> q_angular_momentum
    j_CE_moment_of_inertia["Moment of inertia (point mass)"]:::law
    q_mass --> j_CE_moment_of_inertia
    q_radius --> j_CE_moment_of_inertia
    j_CE_moment_of_inertia --> q_moment_of_inertia
    j_CE_impulse["Impulse (constant force)"]:::law
    q_force --> j_CE_impulse
    q_time(["time"]):::qty
    q_time --> j_CE_impulse
    j_CE_impulse --> q_p
    j_CE_simple_harmonic_frequency["Simple-harmonic angular frequency"]:::law
    q_spring_constant --> j_CE_simple_harmonic_frequency
    q_mass --> j_CE_simple_harmonic_frequency
    j_CE_simple_harmonic_frequency --> q_angular_velocity
    j_CE_ohm_law["Ohm's law"]:::law
    q_current(["current"]):::qty
    q_current --> j_CE_ohm_law
    q_resistance(["resistance"]):::qty
    q_resistance --> j_CE_ohm_law
    q_voltage(["voltage"]):::qty
    j_CE_ohm_law --> q_voltage
    j_CE_electrical_power["Electrical power"]:::law
    q_current --> j_CE_electrical_power
    q_voltage --> j_CE_electrical_power
    j_CE_electrical_power --> q_power
    j_CE_resistance_material["Resistance of a uniform conductor"]:::law
    q_resistivity(["resistivity"]):::qty
    q_resistivity --> j_CE_resistance_material
    q_length --> j_CE_resistance_material
    q_area(["area"]):::qty
    q_area --> j_CE_resistance_material
    j_CE_resistance_material --> q_resistance
    j_CE_capacitance_parallel_plate["Parallel-plate capacitance"]:::law
    q_area --> j_CE_capacitance_parallel_plate
    q_distance --> j_CE_capacitance_parallel_plate
    q_capacitance(["capacitance"]):::qty
    j_CE_capacitance_parallel_plate --> q_capacitance
    j_CE_capacitor_energy["Capacitor stored energy"]:::law
    q_capacitance --> j_CE_capacitor_energy
    q_voltage --> j_CE_capacitor_energy
    q_energy(["energy"]):::qty
    j_CE_capacitor_energy --> q_energy
    j_CE_inductor_energy["Inductor stored energy"]:::law
    q_inductance(["inductance"]):::qty
    q_inductance --> j_CE_inductor_energy
    q_current --> j_CE_inductor_energy
    j_CE_inductor_energy --> q_energy
    j_CE_magnetic_field_wire["Magnetic field of a long straight wire"]:::law
    q_mu_0(["mu_0"]):::qty
    q_mu_0 --> j_CE_magnetic_field_wire
    q_current --> j_CE_magnetic_field_wire
    q_distance --> j_CE_magnetic_field_wire
    q_magnetic_field(["magnetic-field"]):::qty
    j_CE_magnetic_field_wire --> q_magnetic_field
    j_CE_cyclotron_frequency["Cyclotron frequency"]:::law
    q_charge(["charge"]):::qty
    q_charge --> j_CE_cyclotron_frequency
    q_magnetic_field --> j_CE_cyclotron_frequency
    q_mass --> j_CE_cyclotron_frequency
    q_cyclotron_frequency(["cyclotron-frequency"]):::qty
    j_CE_cyclotron_frequency --> q_cyclotron_frequency
    j_CE_larmor_radius["Larmor (gyro) radius"]:::law
    q_mass --> j_CE_larmor_radius
    q_speed --> j_CE_larmor_radius
    q_charge --> j_CE_larmor_radius
    q_magnetic_field --> j_CE_larmor_radius
    q_larmor_radius(["larmor-radius"]):::qty
    j_CE_larmor_radius --> q_larmor_radius
    j_CE_point_charge_field["Point-charge electric field (Coulomb field)"]:::law
    q_charge --> j_CE_point_charge_field
    q_r --> j_CE_point_charge_field
    q_electric_field(["electric-field"]):::qty
    j_CE_point_charge_field --> q_electric_field
    j_CE_lc_resonance["LC resonant angular frequency"]:::law
    q_inductance --> j_CE_lc_resonance
    q_capacitance --> j_CE_lc_resonance
    q_angular_frequency(["angular-frequency"]):::qty
    j_CE_lc_resonance --> q_angular_frequency
    j_CE_coulomb["Coulomb's law"]:::law
    q_q_1(["q_1"]):::qty
    q_q_1 --> j_CE_coulomb
    q_q_2(["q_2"]):::qty
    q_q_2 --> j_CE_coulomb
    q_r --> j_CE_coulomb
    q_coulomb_force(["coulomb-force"]):::qty
    j_CE_coulomb --> q_coulomb_force
    j_CE_rc_time_constant["RC time constant"]:::law
    q_resistance --> j_CE_rc_time_constant
    q_capacitance --> j_CE_rc_time_constant
    q_rc_time_constant(["rc-time-constant"]):::qty
    j_CE_rc_time_constant --> q_rc_time_constant
    j_CE_poynting_flux["Poynting vector (magnitude)"]:::law
    q_electric_field --> j_CE_poynting_flux
    q_magnetic_flux_density(["magnetic-flux-density"]):::qty
    q_magnetic_flux_density --> j_CE_poynting_flux
    q_mu_0 --> j_CE_poynting_flux
    q_poynting_flux(["poynting-flux"]):::qty
    j_CE_poynting_flux --> q_poynting_flux
    j_CE_solenoid_field["Solenoid magnetic field"]:::law
    q_mu_0 --> j_CE_solenoid_field
    q_turn_density(["turn-density"]):::qty
    q_turn_density --> j_CE_solenoid_field
    q_current --> j_CE_solenoid_field
    q_solenoid_field(["solenoid-field"]):::qty
    j_CE_solenoid_field --> q_solenoid_field
    j_CE_larmor_power["Larmor radiated power"]:::law
    q_charge --> j_CE_larmor_power
    q_acceleration --> j_CE_larmor_power
    q_speed_of_light(["speed-of-light"]):::qty
    q_speed_of_light --> j_CE_larmor_power
    q_larmor_power(["larmor-power"]):::qty
    j_CE_larmor_power --> q_larmor_power
    j_CE_field_energy_density["Electric-field energy density"]:::law
    q_electric_field --> j_CE_field_energy_density
    q_field_energy_density(["field-energy-density"]):::qty
    j_CE_field_energy_density --> q_field_energy_density
    j_CE_hydrostatic_pressure["Hydrostatic pressure"]:::law
    q_density(["density"]):::qty
    q_density --> j_CE_hydrostatic_pressure
    q_g(["g"]):::qty
    q_g --> j_CE_hydrostatic_pressure
    q_height(["height"]):::qty
    q_height --> j_CE_hydrostatic_pressure
    q_pressure(["pressure"]):::qty
    j_CE_hydrostatic_pressure --> q_pressure
    j_CE_pressure_definition["Pressure (force per area)"]:::law
    q_force --> j_CE_pressure_definition
    q_area --> j_CE_pressure_definition
    j_CE_pressure_definition --> q_pressure
    j_CE_density_definition["Mass density"]:::law
    q_mass --> j_CE_density_definition
    q_volume(["volume"]):::qty
    q_volume --> j_CE_density_definition
    j_CE_density_definition --> q_density
    j_CE_buoyant_force["Buoyant force (Archimedes')"]:::law
    q_density --> j_CE_buoyant_force
    q_volume --> j_CE_buoyant_force
    q_g --> j_CE_buoyant_force
    j_CE_buoyant_force --> q_force
    j_CE_stokes_drag["Stokes' drag"]:::law
    q_viscosity(["viscosity"]):::qty
    q_viscosity --> j_CE_stokes_drag
    q_radius --> j_CE_stokes_drag
    q_speed --> j_CE_stokes_drag
    j_CE_stokes_drag --> q_force
    j_CE_wave_speed["Wave relation (v = fλ)"]:::law
    q_frequency(["frequency"]):::qty
    q_frequency --> j_CE_wave_speed
    q_wavelength(["wavelength"]):::qty
    q_wavelength --> j_CE_wave_speed
    j_CE_wave_speed --> q_speed
    j_CE_sound_speed["Speed of sound in a fluid"]:::law
    q_pressure --> j_CE_sound_speed
    q_density --> j_CE_sound_speed
    q_sound_speed(["sound-speed"]):::qty
    j_CE_sound_speed --> q_sound_speed
    j_CE_volume_flow_rate["Volume flow rate (continuity)"]:::law
    q_cross_sectional_area(["cross-sectional-area"]):::qty
    q_cross_sectional_area --> j_CE_volume_flow_rate
    q_flow_velocity(["flow-velocity"]):::qty
    q_flow_velocity --> j_CE_volume_flow_rate
    q_volume_flow_rate(["volume-flow-rate"]):::qty
    j_CE_volume_flow_rate --> q_volume_flow_rate
    j_CE_shear_stress["Shear stress (Newtonian fluid)"]:::law
    q_dynamic_viscosity(["dynamic-viscosity"]):::qty
    q_dynamic_viscosity --> j_CE_shear_stress
    q_velocity_gradient(["velocity-gradient"]):::qty
    q_velocity_gradient --> j_CE_shear_stress
    q_shear_stress(["shear-stress"]):::qty
    j_CE_shear_stress --> q_shear_stress
    j_CE_dynamic_pressure["Dynamic pressure"]:::law
    q_density --> j_CE_dynamic_pressure
    q_flow_velocity --> j_CE_dynamic_pressure
    q_dynamic_pressure(["dynamic-pressure"]):::qty
    j_CE_dynamic_pressure --> q_dynamic_pressure
    j_CE_oscillator_energy["Harmonic oscillator energy"]:::law
    q_spring_constant --> j_CE_oscillator_energy
    q_amplitude(["amplitude"]):::qty
    q_amplitude --> j_CE_oscillator_energy
    q_oscillator_energy(["oscillator-energy"]):::qty
    j_CE_oscillator_energy --> q_oscillator_energy
    j_CE_heat_capacity["Sensible heat (heat capacity)"]:::law
    q_mass --> j_CE_heat_capacity
    q_specific_heat(["specific-heat"]):::qty
    q_specific_heat --> j_CE_heat_capacity
    q_temperature_change(["temperature-change"]):::qty
    q_temperature_change --> j_CE_heat_capacity
    q_heat_energy(["heat-energy"]):::qty
    j_CE_heat_capacity --> q_heat_energy
    j_CE_landauer["Landauer erasure bound"]:::law
    q_temperature --> j_CE_landauer
    q_erasure_energy(["erasure-energy"]):::qty
    j_CE_landauer --> q_erasure_energy
    j_CE_jarzynski["Jarzynski free-energy equality"]:::law
    q_temperature --> j_CE_jarzynski
    q_free_energy_difference(["free-energy-difference"]):::qty
    j_CE_jarzynski --> q_free_energy_difference
    j_CE_stefan_boltzmann["Stefan–Boltzmann law"]:::law
    q_temperature --> j_CE_stefan_boltzmann
    q_radiative_flux(["radiative-flux"]):::qty
    j_CE_stefan_boltzmann --> q_radiative_flux
    j_CE_ideal_gas["Ideal gas law"]:::law
    q_temperature --> j_CE_ideal_gas
    q_V(["V"]):::qty
    q_V --> j_CE_ideal_gas
    q_N(["N"]):::qty
    q_N --> j_CE_ideal_gas
    j_CE_ideal_gas --> q_pressure
    j_CE_wien["Wien's displacement law"]:::law
    q_temperature --> j_CE_wien
    q_peak_wavelength(["peak-wavelength"]):::qty
    j_CE_wien --> q_peak_wavelength
    j_CE_latent_heat["Latent heat of phase transition"]:::law
    q_mass --> j_CE_latent_heat
    q_specific_latent_heat(["specific-latent-heat"]):::qty
    q_specific_latent_heat --> j_CE_latent_heat
    q_latent_heat(["latent-heat"]):::qty
    j_CE_latent_heat --> q_latent_heat
    j_CE_clausius_entropy["Clausius entropy change"]:::law
    q_heat(["heat"]):::qty
    q_heat --> j_CE_clausius_entropy
    q_temperature --> j_CE_clausius_entropy
    q_entropy_change(["entropy-change"]):::qty
    j_CE_clausius_entropy --> q_entropy_change
    j_CE_thermal_diffusivity["Thermal diffusivity"]:::law
    q_thermal_conductivity(["thermal-conductivity"]):::qty
    q_thermal_conductivity --> j_CE_thermal_diffusivity
    q_density --> j_CE_thermal_diffusivity
    q_specific_heat_capacity(["specific-heat-capacity"]):::qty
    q_specific_heat_capacity --> j_CE_thermal_diffusivity
    q_thermal_diffusivity(["thermal-diffusivity"]):::qty
    j_CE_thermal_diffusivity --> q_thermal_diffusivity
    j_CE_de_broglie["de Broglie wavelength"]:::law
    q_p --> j_CE_de_broglie
    j_CE_de_broglie --> q_compton_wavelength
    j_CE_compton_wavelength_full["Compton wavelength"]:::law
    q_mass --> j_CE_compton_wavelength_full
    q_compton_wavelength_full(["compton-wavelength-full"]):::qty
    j_CE_compton_wavelength_full --> q_compton_wavelength_full
    j_CE_carrier_mobility["Carrier mobility"]:::law
    q_charge --> j_CE_carrier_mobility
    q_relaxation_time(["relaxation-time"]):::qty
    q_relaxation_time --> j_CE_carrier_mobility
    q_mass --> j_CE_carrier_mobility
    q_carrier_mobility(["carrier-mobility"]):::qty
    j_CE_carrier_mobility --> q_carrier_mobility
    j_CE_electrical_conductivity["Electrical conductivity (Drude)"]:::law
    q_carrier_density(["carrier-density"]):::qty
    q_carrier_density --> j_CE_electrical_conductivity
    q_charge --> j_CE_electrical_conductivity
    q_carrier_mobility --> j_CE_electrical_conductivity
    q_electrical_conductivity(["electrical-conductivity"]):::qty
    j_CE_electrical_conductivity --> q_electrical_conductivity
    j_CE_drude_resistivity["Drude resistivity"]:::law
    q_mass --> j_CE_drude_resistivity
    q_carrier_density --> j_CE_drude_resistivity
    q_charge --> j_CE_drude_resistivity
    q_relaxation_time --> j_CE_drude_resistivity
    q_electrical_resistivity(["electrical-resistivity"]):::qty
    j_CE_drude_resistivity --> q_electrical_resistivity
    j_CE_hall_coefficient["Hall coefficient"]:::law
    q_carrier_density --> j_CE_hall_coefficient
    q_charge --> j_CE_hall_coefficient
    q_hall_coefficient(["hall-coefficient"]):::qty
    j_CE_hall_coefficient --> q_hall_coefficient
    j_CE_drift_velocity["Carrier drift velocity"]:::law
    q_carrier_mobility --> j_CE_drift_velocity
    q_electric_field --> j_CE_drift_velocity
    q_drift_velocity(["drift-velocity"]):::qty
    j_CE_drift_velocity --> q_drift_velocity
    j_CE_fermi_energy["Fermi energy"]:::law
    q_reduced_planck_constant(["reduced-planck-constant"]):::qty
    q_reduced_planck_constant --> j_CE_fermi_energy
    q_mass --> j_CE_fermi_energy
    q_carrier_density --> j_CE_fermi_energy
    q_fermi_energy(["fermi-energy"]):::qty
    j_CE_fermi_energy --> q_fermi_energy
    j_CE_fermi_velocity["Fermi velocity"]:::law
    q_reduced_planck_constant --> j_CE_fermi_velocity
    q_mass --> j_CE_fermi_velocity
    q_carrier_density --> j_CE_fermi_velocity
    q_fermi_velocity(["fermi-velocity"]):::qty
    j_CE_fermi_velocity --> q_fermi_velocity
    j_CE_plasma_frequency["Plasma frequency"]:::law
    q_carrier_density --> j_CE_plasma_frequency
    q_charge --> j_CE_plasma_frequency
    q_vacuum_permittivity(["vacuum-permittivity"]):::qty
    q_vacuum_permittivity --> j_CE_plasma_frequency
    q_mass --> j_CE_plasma_frequency
    q_plasma_frequency(["plasma-frequency"]):::qty
    j_CE_plasma_frequency --> q_plasma_frequency
    j_CE_debye_frequency["Debye frequency"]:::law
    q_sound_speed --> j_CE_debye_frequency
    q_number_density(["number-density"]):::qty
    q_number_density --> j_CE_debye_frequency
    q_debye_frequency(["debye-frequency"]):::qty
    j_CE_debye_frequency --> q_debye_frequency
    j_CE_equipartition["Equipartition (mean kinetic energy)"]:::law
    q_boltzmann_constant(["boltzmann-constant"]):::qty
    q_boltzmann_constant --> j_CE_equipartition
    q_temperature --> j_CE_equipartition
    q_thermal_energy(["thermal-energy"]):::qty
    j_CE_equipartition --> q_thermal_energy
    j_CE_stokes_einstein["Stokes-Einstein diffusion"]:::law
    q_boltzmann_constant --> j_CE_stokes_einstein
    q_temperature --> j_CE_stokes_einstein
    q_dynamic_viscosity --> j_CE_stokes_einstein
    q_particle_radius(["particle-radius"]):::qty
    q_particle_radius --> j_CE_stokes_einstein
    q_diffusion_coefficient(["diffusion-coefficient"]):::qty
    j_CE_stokes_einstein --> q_diffusion_coefficient
    j_CE_kinetic_pressure["Kinetic pressure of an ideal gas"]:::law
    q_number_density --> j_CE_kinetic_pressure
    q_molecular_mass(["molecular-mass"]):::qty
    q_molecular_mass --> j_CE_kinetic_pressure
    q_mean_square_speed(["mean-square-speed"]):::qty
    q_mean_square_speed --> j_CE_kinetic_pressure
    q_kinetic_pressure(["kinetic-pressure"]):::qty
    j_CE_kinetic_pressure --> q_kinetic_pressure
    j_CE_mb_most_probable_speed["Maxwell-Boltzmann most-probable speed"]:::law
    q_boltzmann_constant --> j_CE_mb_most_probable_speed
    q_temperature --> j_CE_mb_most_probable_speed
    q_molecular_mass --> j_CE_mb_most_probable_speed
    q_most_probable_speed(["most-probable-speed"]):::qty
    j_CE_mb_most_probable_speed --> q_most_probable_speed
    j_CE_bernoulli["Bernoulli equation"]:::law
    q_density --> j_CE_bernoulli
    q_flow_velocity --> j_CE_bernoulli
    q_gravitational_acceleration(["gravitational-acceleration"]):::qty
    q_gravitational_acceleration --> j_CE_bernoulli
    q_height --> j_CE_bernoulli
    q_static_pressure(["static-pressure"]):::qty
    q_static_pressure --> j_CE_bernoulli
    q_bernoulli_total_pressure(["bernoulli-total-pressure"]):::qty
    j_CE_bernoulli --> q_bernoulli_total_pressure
    j_CE_photoelectric["Photoelectric equation"]:::law
    q_planck_constant(["planck-constant"]):::qty
    q_planck_constant --> j_CE_photoelectric
    q_photon_frequency(["photon-frequency"]):::qty
    q_photon_frequency --> j_CE_photoelectric
    q_work_function(["work-function"]):::qty
    q_work_function --> j_CE_photoelectric
    q_photoelectron_max_energy(["photoelectron-max-energy"]):::qty
    j_CE_photoelectric --> q_photoelectron_max_energy
    j_CE_boltzmann_factor["Boltzmann factor"]:::law
    q_state_energy(["state-energy"]):::qty
    q_state_energy --> j_CE_boltzmann_factor
    q_boltzmann_constant --> j_CE_boltzmann_factor
    q_temperature --> j_CE_boltzmann_factor
    q_boltzmann_factor(["boltzmann-factor"]):::qty
    j_CE_boltzmann_factor --> q_boltzmann_factor
    j_CE_lorentz_factor["Lorentz factor"]:::law
    q_velocity --> j_CE_lorentz_factor
    q_speed_of_light --> j_CE_lorentz_factor
    q_lorentz_factor(["lorentz-factor"]):::qty
    j_CE_lorentz_factor --> q_lorentz_factor
    j_CE_compton_shift["Compton shift"]:::law
    q_planck_constant --> j_CE_compton_shift
    q_electron_mass(["electron-mass"]):::qty
    q_electron_mass --> j_CE_compton_shift
    q_speed_of_light --> j_CE_compton_shift
    q_scattering_angle(["scattering-angle"]):::qty
    q_scattering_angle --> j_CE_compton_shift
    q_compton_wavelength_shift(["compton-wavelength-shift"]):::qty
    j_CE_compton_shift --> q_compton_wavelength_shift
    j_CE_boltzmann_entropy["Boltzmann entropy"]:::law
    q_boltzmann_constant --> j_CE_boltzmann_entropy
    q_microstate_count(["microstate-count"]):::qty
    q_microstate_count --> j_CE_boltzmann_entropy
    q_boltzmann_entropy(["boltzmann-entropy"]):::qty
    j_CE_boltzmann_entropy --> q_boltzmann_entropy
  end
  subgraph cl_1["anchored cluster (2)"]
    direction LR
    j_CE_classical_electron_radius["Classical electron radius"]:::law
    q_classical_electron_radius(["classical-electron-radius"]):::qty
    j_CE_classical_electron_radius --> q_classical_electron_radius
    j_CE_thomson_cross_section["Thomson scattering cross-section"]:::law
    q_classical_electron_radius --> j_CE_thomson_cross_section
    q_thomson_cross_section(["thomson-cross-section"]):::qty
    j_CE_thomson_cross_section --> q_thomson_cross_section
  end
  subgraph cl_2["anchored cluster (2)"]
    direction LR
    j_CE_friedmann_curvature["Friedmann equation (with curvature)"]:::law
    q_rho(["rho"]):::qty
    q_rho --> j_CE_friedmann_curvature
    q_curvature_k(["curvature-k"]):::qty
    q_curvature_k --> j_CE_friedmann_curvature
    q_scale_factor(["scale-factor"]):::qty
    q_scale_factor --> j_CE_friedmann_curvature
    q_hubble_rate_squared(["hubble-rate-squared"]):::qty
    j_CE_friedmann_curvature --> q_hubble_rate_squared
    j_CE_friedmann["Friedmann equation (flat, matter-dominated)"]:::law
    q_rho --> j_CE_friedmann
    j_CE_friedmann --> q_hubble_rate_squared
  end
  subgraph cl_3["anchored cluster (2)"]
    direction LR
    j_CE_half_life["Radioactive half-life"]:::law
    q_decay_constant(["decay-constant"]):::qty
    q_decay_constant --> j_CE_half_life
    q_half_life(["half-life"]):::qty
    j_CE_half_life --> q_half_life
    j_CE_radioactive_decay["Radioactive decay law"]:::law
    q_initial_nuclei(["initial-nuclei"]):::qty
    q_initial_nuclei --> j_CE_radioactive_decay
    q_decay_constant --> j_CE_radioactive_decay
    q_elapsed_time(["elapsed-time"]):::qty
    q_elapsed_time --> j_CE_radioactive_decay
    q_remaining_nuclei(["remaining-nuclei"]):::qty
    j_CE_radioactive_decay --> q_remaining_nuclei
  end
  subgraph cl_iso["isolated (19)"]
    direction LR
    j_CE_bekenstein_hawking["Bekenstein–Hawking entropy"]:::law
    q_A(["A"]):::qty
    q_A --> j_CE_bekenstein_hawking
    q_bh_entropy(["bh-entropy"]):::qty
    j_CE_bekenstein_hawking --> q_bh_entropy
    j_CE_bohr_magneton["Bohr magneton"]:::law
    q_bohr_magneton(["bohr-magneton"]):::qty
    j_CE_bohr_magneton --> q_bohr_magneton
    j_CE_bohr_radius["Bohr radius"]:::law
    q_bohr_radius(["bohr-radius"]):::qty
    j_CE_bohr_radius --> q_bohr_radius
    j_CE_carnot_efficiency["Carnot efficiency"]:::law
    q_cold_reservoir_temperature(["cold-reservoir-temperature"]):::qty
    q_cold_reservoir_temperature --> j_CE_carnot_efficiency
    q_hot_reservoir_temperature(["hot-reservoir-temperature"]):::qty
    q_hot_reservoir_temperature --> j_CE_carnot_efficiency
    q_carnot_efficiency(["carnot-efficiency"]):::qty
    j_CE_carnot_efficiency --> q_carnot_efficiency
    j_CE_einstein_field_eq["Einstein field equation"]:::law
    q_stress_energy_density(["stress-energy-density"]):::qty
    q_stress_energy_density --> j_CE_einstein_field_eq
    q_efe_curvature(["efe-curvature"]):::qty
    j_CE_einstein_field_eq --> q_efe_curvature
    j_CE_first_law_thermodynamics["First law of thermodynamics"]:::law
    q_heat_added(["heat-added"]):::qty
    q_heat_added --> j_CE_first_law_thermodynamics
    q_work_done_by_system(["work-done-by-system"]):::qty
    q_work_done_by_system --> j_CE_first_law_thermodynamics
    q_internal_energy_change(["internal-energy-change"]):::qty
    j_CE_first_law_thermodynamics --> q_internal_energy_change
    j_CE_hubble_distance["Hubble distance"]:::law
    q_hubble_rate(["hubble-rate"]):::qty
    q_hubble_rate --> j_CE_hubble_distance
    q_hubble_distance(["hubble-distance"]):::qty
    j_CE_hubble_distance --> q_hubble_distance
    j_CE_laplace_pressure["Laplace pressure (surface tension)"]:::law
    q_surface_tension(["surface-tension"]):::qty
    q_surface_tension --> j_CE_laplace_pressure
    q_droplet_radius(["droplet-radius"]):::qty
    q_droplet_radius --> j_CE_laplace_pressure
    q_laplace_pressure(["laplace-pressure"]):::qty
    j_CE_laplace_pressure --> q_laplace_pressure
    j_CE_lorentz_force["Lorentz force (magnitude)"]:::law
    q_q(["q"]):::qty
    q_q --> j_CE_lorentz_force
    q_v(["v"]):::qty
    q_v --> j_CE_lorentz_force
    q_B(["B"]):::qty
    q_B --> j_CE_lorentz_force
    q_lorentz_force(["lorentz-force"]):::qty
    j_CE_lorentz_force --> q_lorentz_force
    j_CE_malus_law["Malus's law"]:::law
    q_incident_intensity(["incident-intensity"]):::qty
    q_incident_intensity --> j_CE_malus_law
    q_polarization_angle(["polarization-angle"]):::qty
    q_polarization_angle --> j_CE_malus_law
    q_transmitted_intensity(["transmitted-intensity"]):::qty
    j_CE_malus_law --> q_transmitted_intensity
    j_CE_normal_distribution["Normal (Gaussian) distribution"]:::law
    q_standard_deviation(["standard-deviation"]):::qty
    q_standard_deviation --> j_CE_normal_distribution
    q_deviation_from_mean(["deviation-from-mean"]):::qty
    q_deviation_from_mean --> j_CE_normal_distribution
    q_normal_probability_density(["normal-probability-density"]):::qty
    j_CE_normal_distribution --> q_normal_probability_density
    j_CE_planck_einstein["Planck–Einstein relation"]:::law
    q_nu(["nu"]):::qty
    q_nu --> j_CE_planck_einstein
    q_photon_energy(["photon-energy"]):::qty
    j_CE_planck_einstein --> q_photon_energy
    j_CE_planck_length["Planck length"]:::law
    q_planck_length(["planck-length"]):::qty
    j_CE_planck_length --> q_planck_length
    j_CE_planck_mass["Planck mass"]:::law
    q_planck_mass(["planck-mass"]):::qty
    j_CE_planck_mass --> q_planck_mass
    j_CE_planck_time["Planck time"]:::law
    q_planck_time(["planck-time"]):::qty
    j_CE_planck_time --> q_planck_time
    j_CE_rydberg_energy["Rydberg energy"]:::law
    q_rydberg_energy(["rydberg-energy"]):::qty
    j_CE_rydberg_energy --> q_rydberg_energy
    j_CE_rydberg_formula["Rydberg formula"]:::law
    q_rydberg_constant(["rydberg-constant"]):::qty
    q_rydberg_constant --> j_CE_rydberg_formula
    q_lower_level_n(["lower-level-n"]):::qty
    q_lower_level_n --> j_CE_rydberg_formula
    q_upper_level_n(["upper-level-n"]):::qty
    q_upper_level_n --> j_CE_rydberg_formula
    q_inverse_transition_wavelength(["inverse-transition-wavelength"]):::qty
    j_CE_rydberg_formula --> q_inverse_transition_wavelength
    j_CE_snell_law["Snell's law"]:::law
    q_incident_index(["incident-index"]):::qty
    q_incident_index --> j_CE_snell_law
    q_angle_of_incidence(["angle-of-incidence"]):::qty
    q_angle_of_incidence --> j_CE_snell_law
    q_angle_of_refraction(["angle-of-refraction"]):::qty
    q_angle_of_refraction --> j_CE_snell_law
    q_refracted_index(["refracted-index"]):::qty
    j_CE_snell_law --> q_refracted_index
    j_CE_uncertainty_principle["Heisenberg uncertainty principle"]:::law
    q_position_momentum_uncertainty_product(["position-momentum-uncertainty-product"]):::qty
    j_CE_uncertainty_principle --> q_position_momentum_uncertainty_product
  end
  classDef law fill:#cfe3f7,stroke:#3a6ea5
  classDef qty fill:#ffffff,stroke:#999999
```

## The bridge catalog and the full map

Two larger, more disjointed graphs exist. One is the 55-bridge catalog
(`--source=catalog`, 46 edges → 26 components). The other is the combined
laws-plus-bridges graph (`--source=both`, 155 edges → 42 components, over
the 109-law canonical L-layer). Rendered SVG shows them better than the
inline view. Both the DOT sources and the rendered SVGs are committed
under [`maps/`](./maps/):

- catalog — [`maps/catalog.svg`](./maps/catalog.svg) · [`maps/catalog.dot`](./maps/catalog.dot)
- canonical (109-law L-layer) — [`maps/canonical.svg`](./maps/canonical.svg) · [`maps/canonical.dot`](./maps/canonical.dot)
- laws + bridges — [`maps/both.svg`](./maps/both.svg) · [`maps/both.dot`](./maps/both.dot)

**`upt map` defaults to `--source=both`** — a pure connectivity question gets
the honest, all-known-physics answer by default. A bare `upt map` prints the text
linkage for that source; `--format=mermaid|dot|svg` renders the "laws + bridges"
graphic above. `--source=catalog` renders the bridge-catalog-only view.

`upt map --format=svg` renders the graphic in one step via the optional
`@viz-js/viz` peer (`npm i @viz-js/viz`):

```bash
node bin/upt.mjs map --source=both --format=svg --out=docs/architecture/maps/both.svg
# or, with a system Graphviz instead of the peer:
dot -Tsvg docs/architecture/maps/both.dot > both.svg
```

Junctions are colored by epistemic status: **blue** = textbook law, **green** =
established bridge, **amber** = speculative, **red** = highly-speculative,
**gray dashed** = proposed (unadjudicated), **violet** = a user-supplied equation
(`--equation`). Proposed relations appear only with `--proposed`; the violet node
only with `--equation`.

## Place your own equation on the map

`upt map --equation "TARGET = EXPR"` injects a user-supplied equation as a
**violet `user` junction** and **dimensionally validates it**. It reports where
the equation lands — which cluster it joins and the quantities that connect
it — without ever writing it into the catalog. The left of `=` is the target
quantity. The right-hand symbols, minus constants like `pi`/`hbar`/`c` and
functions, are the sources. The equation connects by **shared quantity
name**, so use the catalog vocabulary (multi-word names with underscores,
e.g. `photon_energy` → `photon-energy`).

`parsePhysics` parses the equation to a dimensional `ExprNode`, over the
catalog's dimensions, with physics constants carrying their real dimensions.
The CLI then reports whether the RHS is **dimensionally consistent** with the
target. For a single unknown symbol, the CLI also **infers its dimension**.
The CLI uses the inferred dimension to select the "did you mean?"
candidates. When it cannot infer the dimension, it uses all catalog names.
One ranking orders both sets: edit distance to the typed name first, where a
swap of two adjacent letters counts as one edit (`lenght` → `length`).
`upt explain` uses the same ranking.

```bash
node bin/upt.mjs map --source=canonical --equation "period = 2*pi*sqrt(length/gravity)"
#   ✓ dimensionally consistent: [time]
#   ● your equation joins the ANCHORED cluster of 84 via {gravity, length, period}
node bin/upt.mjs map --source=canonical --equation "period = mass"
#   ⚠ dimensional MISMATCH: RHS is [mass] but the target is [time]
node bin/upt.mjs map --source=canonical --equation "period = uu / gravity"
#   · UNKNOWN: RHS is [L^-1 T^2] but the target is [time]; the mismatch involves the unresolved placeholder 'uu' (taken as dimensionless), so it is not a failed check
#   ⚠ 'uu' is unknown — by its inferred dimension, did you mean: v, speed, velocity, sound-speed, flow-velocity?
```

The active formula parser extracts the free variables. That parser is the
MathTS expression parser when the optional peer is installed, and the
built-in parser otherwise.

## Regenerating

These artifacts are generated from live data — never hand-edit them; rerun the
CLI:

```bash
# inline Mermaid above (the canonical layer):
node bin/upt.mjs map --source=canonical --format=mermaid

# the committed DOT sources:
node bin/upt.mjs map --source=catalog   --format=dot --out=docs/architecture/maps/catalog.dot
node bin/upt.mjs map --source=canonical --format=dot --out=docs/architecture/maps/canonical.dot
node bin/upt.mjs map --source=both      --format=dot --out=docs/architecture/maps/both.dot

# the committed SVGs (needs the optional @viz-js/viz peer):
node bin/upt.mjs map --source=catalog   --format=svg --out=docs/architecture/maps/catalog.svg
node bin/upt.mjs map --source=canonical --format=svg --out=docs/architecture/maps/canonical.svg
node bin/upt.mjs map --source=both      --format=svg --out=docs/architecture/maps/both.svg

# overlay the unadjudicated proposed relations:
node bin/upt.mjs map --source=both --proposed --format=dot
```

See [`cli/README.md`](../../cli/README.md) for the full `upt map` reference.
