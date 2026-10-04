/**
 * Exact prefactors for canonical equations that `src/canonical` records only
 * dimensionally or only up to a constant.
 *
 * CE-pendulum-period is a monomial and CE-kinetic-energy's AST is `m·v²`, so a
 * user formula wrong by 2π or ½ could not be caught (persona findings L2, L7).
 * `src/canonical` is a pinned Criterion 3 input tree, so the prefactors live
 * here, outside it (Mothership ruling 2026-09-25). Each prefactor multiplies the
 * entry's AST, or its monomial when it has no AST; a test holds that neither
 * carries a constant of its own.
 *
 * Every quote is verbatim wikitext from the pinned Wikipedia revision in its
 * locator, fetched and matched on 2026-09-25 (the first nine), 2026-09-27 (the
 * next rows, and the group prefactor below), or 2026-10-04 (dynamic pressure,
 * Laplace pressure, inductor energy, equipartition, kinetic pressure, half-life,
 * and the Thomson cross-section).
 *
 * A prefactor that depends on a dimensionless group the entry's dimensional
 * record does not carry (CE-sound-speed's √γ) is not a constant, so it is not in
 * CANONICAL_PREFACTORS and canonicalPrefactor does not return it: it is in
 * CANONICAL_GROUP_PREFACTORS, which only a caller that can bind the group uses.
 *
 * @module composition/canonical-prefactors
 */

/** One sourced prefactor. @internal */
export interface CanonicalPrefactor {
  /** A `CanonicalEquation.id`. */
  readonly id: string;
  /** The exact dimensionless factor in front of the entry's AST or monomial. */
  readonly prefactor: number;
  /** Verbatim source text the factor is read from. */
  readonly quote: string;
  /** Where the quote is: page, revision id and wikitext line. */
  readonly locator: string;
}

/** The sourced prefactors, by canonical id. @internal */
export const CANONICAL_PREFACTORS: readonly CanonicalPrefactor[] = [
  {
    id: 'CE-pendulum-period',
    prefactor: 2 * Math.PI,
    quote: String.raw`T_0 = 2\pi\sqrt{\frac \ell g}`,
    locator: "Wikipedia, 'Pendulum (mechanics)', revision 1374595895, wikitext line 171",
  },
  {
    id: 'CE-kinetic-energy',
    prefactor: 0.5,
    quote: String.raw`E_\text{k} = \frac{1}{2} mv^2`,
    locator: "Wikipedia, 'Kinetic energy', revision 1370969006, wikitext line 56",
  },
  {
    id: 'CE-rotational-kinetic-energy',
    prefactor: 0.5,
    quote: String.raw`E_\text{rotational} = \tfrac{1}{2} I \omega^2`,
    locator: "Wikipedia, 'Rotational energy', revision 1258577842, wikitext line 3",
  },
  {
    id: 'CE-capacitor-energy',
    prefactor: 0.5,
    quote: String.raw`W = \frac{1}{2}CV^2`,
    locator: "Wikipedia, 'Capacitor', revision 1375788837, wikitext line 137",
  },
  {
    id: 'CE-schwarzschild-radius',
    prefactor: 2,
    quote: String.raw`Schwarzschild radius{{br}}<math display="inline">\frac{2GM}{c^2}</math>`,
    locator: "Wikipedia, 'Schwarzschild radius', revision 1373854769, wikitext line 25",
  },
  {
    // a³/T² = GM/(4π²) for M ≫ m gives T = 2π √(a³/(GM)); the canonical monomial is a^1.5 (GM)^-0.5.
    id: 'CE-kepler-third',
    prefactor: 2 * Math.PI,
    quote: String.raw`\frac{a^3}{T^2} = \frac{G(M + m)}{4\pi^2} \approx \frac{GM}{4\pi^2}`,
    locator: "Wikipedia, 'Kepler's laws of planetary motion', revision 1376360196, wikitext line 232",
  },
  {
    id: 'CE-lc-resonance',
    prefactor: 1,
    quote: String.raw`\omega_0 = \frac{1}{\sqrt{LC}},`,
    locator: "Wikipedia, 'LC circuit', revision 1350658867, wikitext line 66",
  },
  {
    // The Stokes friction coefficient ζ = 6πηr; the drag at speed v is F = ζ v.
    id: 'CE-stokes-drag',
    prefactor: 6 * Math.PI,
    quote: String.raw`\zeta = 6 \pi \, \eta \, r,`,
    locator: "Wikipedia, 'Einstein relation (kinetic theory)', revision 1353047788, wikitext line 77",
  },
  {
    id: 'CE-stokes-einstein',
    prefactor: 1 / (6 * Math.PI),
    quote: String.raw`D = \frac{k_\text{B} T}{6\pi\,\eta\,r}.`,
    locator: "Wikipedia, 'Einstein relation (kinetic theory)', revision 1353047788, wikitext line 79",
  },
  {
    id: 'CE-simple-harmonic-frequency',
    prefactor: 1,
    quote: String.raw`\omega = \sqrt{\frac k m}.`,
    locator: "Wikipedia, 'Harmonic oscillator', revision 1373924880, wikitext line 44",
  },
  {
    id: 'CE-spring-potential-energy',
    prefactor: 0.5,
    quote: String.raw`U_\mathrm{el}(x) = \tfrac 1 2 kx^2`,
    locator: "Wikipedia, 'Hooke's law', revision 1375736650, wikitext line 146",
  },
  {
    id: 'CE-oscillator-energy',
    prefactor: 0.5,
    quote: String.raw`E = K + U = \tfrac12 k A^2.`,
    locator: "Wikipedia, 'Simple harmonic motion', revision 1347475303, wikitext line 80",
  },
  {
    // The source writes the tension T; the canonical entry calls it F.
    id: 'CE-string-wave-speed',
    prefactor: 1,
    quote: String.raw`v=\sqrt{T\over\mu},`,
    locator: "Wikipedia, 'String vibration', revision 1306385524, wikitext line 40",
  },
  {
    // The three Planck units are all-constant: compared once, at the SI values (persona finding W5).
    id: 'CE-planck-length',
    prefactor: 1,
    quote: String.raw`<math>l_\text{P} = \sqrt{\frac{\hbar G}{c^3}}</math>`,
    locator: "Wikipedia, 'Planck units', revision 1375441167, wikitext line 77",
  },
  {
    id: 'CE-planck-mass',
    prefactor: 1,
    quote: String.raw`<math>m_\text{P} = \sqrt{\frac{\hbar c}{G}}</math>`,
    locator: "Wikipedia, 'Planck units', revision 1375441167, wikitext line 82",
  },
  {
    id: 'CE-planck-time',
    prefactor: 1,
    quote: String.raw`<math>t_\text{P} = \sqrt{\frac{\hbar G}{c^5}}</math>`,
    locator: "Wikipedia, 'Planck units', revision 1375441167, wikitext line 87",
  },
  {
    // The AST is μ₀ I / r; the quoted wire field divides by 2π.
    id: 'CE-magnetic-field-wire',
    prefactor: 1 / (2 * Math.PI),
    quote: String.raw`B = \frac{\mu_0I}{2\pi x}`,
    locator: "Wikipedia, 'Magnetic field', revision 1375215267, wikitext line 876",
  },
  {
    // The AST divides by ε₀ c³ only; the quoted power divides by 6π as well.
    id: 'CE-larmor-power',
    prefactor: 1 / (6 * Math.PI),
    quote: String.raw`\frac{q^2 a^2}{6 \pi \varepsilon_0 c^3}`,
    locator: "Wikipedia, 'Larmor formula', revision 1352376843, wikitext line 9",
  },
  {
    // The quote's electric term is ε E²/2. In vacuum ε = ε₀, and the AST is ε₀ E².
    id: 'CE-field-energy-density',
    prefactor: 0.5,
    quote: String.raw`u = \frac{\varepsilon}{2} \mathbf{E}^2 + \frac{1}{2 \mu} \mathbf{B}^2`,
    locator: "Wikipedia, 'Energy density', revision 1366889538, wikitext line 81",
  },
  {
    // The L0 monomial is ħ/(m c). The quote is the reduced wavelength, so the factor is 1.
    // λ = h/(m c) is the separate fully-quantitative entry CE-compton-wavelength-full.
    id: 'CE-compton-wavelength',
    prefactor: 1,
    quote: String.raw`\lambda\!\!\!\bar{} = \frac{\lambda}{2 \pi} = \frac{\hbar}{m c},`,
    locator: "Wikipedia, 'Compton wavelength', revision 1376812882, wikitext line 13",
  },
  {
    id: 'CE-dynamic-pressure',
    prefactor: 0.5,
    quote: String.raw`q = \frac{1}{2}\rho\, u^2`,
    locator: "Wikipedia, 'Dynamic pressure', revision 1323192083, wikitext line 6",
  },
  {
    id: 'CE-laplace-pressure',
    prefactor: 2,
    quote: String.raw`\Delta p = \frac{2 \gamma}{R}.`,
    locator: "Wikipedia, 'Young–Laplace equation', revision 1350190310, wikitext line 40",
  },
  {
    id: 'CE-inductor-energy',
    prefactor: 0.5,
    quote: String.raw`\tfrac{1}{2} L\,I^2`,
    locator: "Wikipedia, 'Inductance', revision 1372308482, wikitext line 109",
  },
  {
    id: 'CE-equipartition',
    prefactor: 1.5,
    quote: String.raw`\langle H_{\mathrm{kin}} \rangle = \left\langle \frac{p^2}{2m} \right\rangle = \langle \tfrac{1}{2} m v^{2} \rangle = \tfrac{3}{2} k_\text{B} T.`,
    locator: "Wikipedia, 'Equipartition theorem', revision 1373697867, wikitext line 304",
  },
  {
    id: 'CE-kinetic-pressure',
    prefactor: 1 / 3,
    quote: String.raw`= \frac{1}{3} n mv_\text{rms}^2`,
    locator: "Wikipedia, 'Kinetic theory of gases', revision 1371478093, wikitext line 173",
  },
  {
    id: 'CE-half-life',
    prefactor: Math.log(2),
    quote: String.raw`t_{1/2} = \frac{\ln (2)}{\lambda} = \tau \ln(2)`,
    locator: "Wikipedia, 'Half-life', revision 1373221894, wikitext line 64",
  },
  {
    id: 'CE-thomson-cross-section',
    prefactor: (8 * Math.PI) / 3,
    quote: String.raw`\sigma_\text{t} = \frac{8\pi} 3 \left(\frac{q^2}{4\pi\varepsilon_0 mc^2}\right)^2 = \frac{8\pi} 3 {r}^2 = \frac{8 \pi}{3} \left(\alpha \lambda\!\!\!\bar{}_\text{c}\right)^2 ,`,
    locator: "Wikipedia, 'Thomson scattering', revision 1348001870, wikitext line 31",
  },
];

/** The sourced prefactor of a canonical entry, or `undefined`. @internal */
export function canonicalPrefactor(id: string): number | undefined {
  return CANONICAL_PREFACTORS.find((p) => p.id === id)?.prefactor;
}

/**
 * A sourced prefactor that is a power of a dimensionless group: the factor in
 * front of the entry's AST or monomial is `coefficient · group^exponent`. @internal
 */
export interface CanonicalGroupPrefactor {
  readonly id: string;
  /** The group as the entry's formula names it (`'gamma'` for γ). */
  readonly group: string;
  readonly coefficient: number;
  readonly exponent: number;
  readonly quote: string;
  readonly locator: string;
}

/** The sourced group prefactors, by canonical id. @internal */
export const CANONICAL_GROUP_PREFACTORS: readonly CanonicalGroupPrefactor[] = [
  {
    // c = √(γ p/ρ): the monomial p^½ ρ^-½ times γ^½, γ the adiabatic index.
    id: 'CE-sound-speed',
    group: 'gamma',
    coefficient: 1,
    exponent: 0.5,
    quote: String.raw`c = \sqrt{\gamma \cdot {p \over \rho}},`,
    locator: "Wikipedia, 'Speed of sound', revision 1373106219, wikitext line 142",
  },
];

/** The prefactor of a group-dependent entry at a value of its group, or `undefined`. @internal */
export function canonicalGroupPrefactor(id: string, groupValue: number): number | undefined {
  const p = CANONICAL_GROUP_PREFACTORS.find((q) => q.id === id);
  return p === undefined ? undefined : p.coefficient * groupValue ** p.exponent;
}
