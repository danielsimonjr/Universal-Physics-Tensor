/**
 * The validity domain of a canonical equation, as a condition over its source
 * names (the grammar of `bridges/holds.ts`). An input outside it is a domain
 * violation. It is not an unset coefficient: `unset` means the prefactor has
 * no source, and an invalid input says nothing about that.
 *
 * A bound is stated only where the law itself needs it: a magnitude that must
 * be positive, a temperature that is absolute, an angle in radians, a ratio
 * that cannot pass 1. An entry with no row has no stated domain.
 *
 * @module canonical/domains
 */

/** Condition text by canonical id. */
export const CANONICAL_DOMAINS: Readonly<Record<string, string>> = {
  // mechanics and fluids
  'CE-pendulum-period': 'length > 0 && gravity > 0',
  'CE-simple-harmonic-frequency': 'spring-constant > 0 && mass > 0',
  'CE-string-wave-speed': 'tension >= 0 && linear-density > 0',
  'CE-sound-speed': 'pressure >= 0 && density > 0',
  'CE-laplace-pressure': 'surface-tension >= 0 && droplet-radius > 0',
  'CE-dynamic-pressure': 'density >= 0',
  'CE-kinetic-pressure': 'number-density >= 0 && molecular-mass > 0 && mean-square-speed >= 0',
  'CE-wave-speed': 'frequency > 0 && wavelength > 0',
  'CE-shear-stress': 'dynamic-viscosity > 0',
  'CE-stokes-drag': 'viscosity > 0 && radius > 0',
  'CE-thermal-diffusivity': 'thermal-conductivity > 0 && density > 0 && specific-heat-capacity > 0',
  // gravitation and cosmology
  'CE-schwarzschild-radius': 'mass > 0',
  'CE-hawking-temperature': 'mass > 0',
  'CE-kepler-third': 'semi-major-axis > 0 && mass > 0',
  'CE-newton-gravitation': 'mass >= 0 && secondary-mass >= 0 && r > 0',
  'CE-gravitational-potential-energy': 'mass >= 0 && secondary-mass >= 0 && r > 0',
  'CE-friedmann': 'rho >= 0',
  // H² is a square: a negative right-hand side is the universe past turnaround, not a real rate.
  'CE-friedmann-curvature':
    'rho >= 0 && scale-factor > 0 && 8 * pi * G * rho / 3 - curvature-k * c ^ 2 / scale-factor ^ 2 >= 0',
  'CE-hubble-distance': 'hubble-rate > 0',
  'CE-bekenstein-hawking': 'A >= 0',
  'CE-lorentz-factor': 'abs(velocity) < speed-of-light',
  // optics and quantum; angles are radians
  'CE-photoelectric': 'planck-constant * photon-frequency >= work-function && work-function >= 0',
  'CE-rydberg-formula':
    'integer(lower-level-n) && integer(upper-level-n) && lower-level-n >= 1 && upper-level-n > lower-level-n',
  'CE-malus-law': 'incident-intensity >= 0',
  'CE-snell-law':
    'incident-index > 0 && angle-of-incidence >= 0 && angle-of-incidence <= pi / 2 && angle-of-refraction > 0 && angle-of-refraction <= pi / 2',
  'CE-compton-shift': 'scattering-angle >= 0 && scattering-angle <= pi',
  // the wavelength of the magnitude of p
  'CE-de-broglie': 'p > 0',
  // thermodynamics and statistical mechanics
  'CE-stefan-boltzmann': 'temperature >= 0',
  'CE-wien': 'temperature > 0',
  'CE-landauer': 'temperature >= 0',
  'CE-jarzynski': 'temperature > 0',
  'CE-equipartition': 'temperature >= 0',
  'CE-clausius-entropy': 'temperature > 0',
  'CE-carnot-efficiency':
    'cold-reservoir-temperature >= 0 && hot-reservoir-temperature > 0 && cold-reservoir-temperature <= hot-reservoir-temperature',
  'CE-boltzmann-entropy': 'microstate-count >= 1',
  'CE-ideal-gas': 'temperature > 0 && V > 0 && N >= 0',
  'CE-heat-capacity': 'mass > 0',
  'CE-latent-heat': 'mass > 0',
  'CE-stokes-einstein': 'temperature > 0 && dynamic-viscosity > 0 && particle-radius > 0',
  'CE-mb-most-probable-speed': 'temperature >= 0 && molecular-mass > 0',
};
