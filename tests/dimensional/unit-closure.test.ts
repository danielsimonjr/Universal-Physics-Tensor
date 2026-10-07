import { describe, expect, it } from 'vitest';
import { convertValue, parseUnit } from '../../src/dimensional/units.js';
import { readBinding } from '../../src/numerical/binding-value.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';
import { formulaNames, formulaScope } from '../../src/bridges/expr-parse.js';

const close = (got: number, want: number, rel = 1e-12): void => {
  expect(Math.abs(got - want) <= rel * Math.abs(want), `${got} vs ${want}`).toBe(true);
};
const si = (raw: string, target: string): number => convertValue(raw, target).value;

describe('a prefixed numerator token is the prefix reading (issues 469, 477, 475)', () => {
  it.each([
    ['72mN/m', 'N/m', 0.072],
    ['720mW/cm^2', 'W/m^2', 7200],
    ['1mPa*s', 'Pa*s', 1e-3],
    ['1mg/L', 'kg/m^3', 1e-3],
    ['1mmol/L', 'mol/m^3', 1],
    ['1mJ/m^2', 'J/m^2', 1e-3],
    ['1mV/m', 'V/m', 1e-3],
    ['1mA/cm^2', 'A/m^2', 10],
    ['1mS/m', 'S/m', 1e-3],
    ['1GW/cm^2', 'W/m^2', 1e13],
    ['1TW/cm^2', 'W/m^2', 1e16],
    ['1GV/m', 'V/m', 1e9],
    ['1mJ/cm^2', 'J/m^2', 10],
    ['1mW/mK', 'W/(m*K)', 1e-3],
  ])('%s into %s', (raw, target, want) => close(si(raw, target), want));

  it('still refuses a token that has no single-factor reading and several products (control)', () => {
    expect(() => parseUnit('mAs')).toThrow(/ambiguous/);
  });

  it('a prefix letter that is also a unit does not split off a denominator (Gyr, Gpc, hPa)', () => {
    close(parseUnit('Msun/Gyr').scale, parseUnit('Msun').scale / (1e9 * parseUnit('yr').scale));
    close(si('1hPa', 'Pa'), 100);
  });

  it('a milli- denominator still needs the target to choose (control: refusal kept)', () => {
    expect(() => parseUnit('W/mK')).toThrow(/ambiguous/);
    expect(si('401W/mK', 'W/(m*K)')).toBeCloseTo(401, 9);
  });
});

describe('prefixed gauss and astronomy tokens (issues 461, 477)', () => {
  it.each([
    ['3ugauss', 'T', 3e-10],
    ['1mG', 'T', 1e-7],
    ['1mgauss', 'T', 1e-7],
    ['1uG', 'T', 1e-10],
    ['1nG', 'T', 1e-13],
    ['1kG', 'T', 0.1],
    ['1mas', 'rad', 4.84813681109536e-9],
    ['1uas', 'rad', 4.84813681109536e-12],
    ['1arcsec', 'rad', 4.84813681109536e-6],
    ['1arcmin', 'rad', 2.908882086657216e-4],
  ])('%s', (raw, target, want) => close(si(raw, target), want, 1e-9));

  it('eval (no target) reads 1mas as an angle, not metre times attosecond', () => {
    const r = readBinding('1mas');
    close(r.value, 4.84813681109536e-9, 1e-9);
  });
  it('a bare G is still the gauss and GPa a gigapascal', () => {
    close(si('1G', 'T'), 1e-4);
    close(si('1GPa', 'Pa'), 1e9);
  });
});

describe('the unit table is closed over the units the dogfood rounds named', () => {
  it.each([
    ['1sr', '', 1],
    ['1%', '', 0.01],
    ['1percent', '', 0.01],
    ['1ppm', '', 1e-6],
    ['1H', 'kg*m^2/(s^2*A^2)', 1],
    ['1nH', 'kg*m^2/(s^2*A^2)', 1e-9],
    ['1uWb', 'kg*m^2/(s^2*A)', 1e-6],
    ['1kOhm', 'ohm', 1e3],
    ['1Ohm', 'ohm', 1],
    ['1uohm.cm', 'ohm*m', 1e-8],
    ['1u', 'kg', 1.6605390666e-27],
    ['2amu', 'kg', 3.3210781332e-27],
    ['1Da', 'kg', 1.6605390666e-27],
    ['1erg', 'J', 1e-7],
    ['1cc', 'm^3', 1e-6],
    ['1Jy', 'W/(m^2*Hz)', 1e-26],
    ['1Lsun', 'W', 3.828e26],
    ['1Rsun', 'm', 6.957e8],
    ['1Rearth', 'm', 6.3781e6],
    ['1Mearth', 'kg', 5.9722e24],
    ['1Mjup', 'kg', 1.89813e27],
    ['1day', 's', 86400],
    ['1hr', 's', 3600],
    ['1M', 'mol/m^3', 1000],
    ['1mM', 'mol/m^3', 1],
    ['1psia', 'Pa', 6894.757293168361],
    ['25℃', 'K', 298.15],
    ['1tonne', 'kg', 1000],
    ['1therm', 'J', 105480400],
    ['1in', 'm', 0.0254],
    ['1inch', 'm', 0.0254],
    ['1ft', 'm', 0.3048],
    ['1mil', 'm', 2.54e-5],
    ['1lb', 'kg', 0.45359237],
    ['1lbf', 'N', 4.4482216152605],
    ['1kgf', 'N', 9.80665],
    ['1dyn', 'N', 1e-5],
    ['1mph', 'm/s', 0.44704],
    ['1knot', 'm/s', 1852 / 3600],
    ['1ksi', 'Pa', 6894757.293168361],
    ['1mmH2O', 'Pa', 9.80665],
    ['1inHg', 'Pa', 3386.388640341],
    ['1ft/s', 'm/s', 0.3048],
    ['1rayl', 'Pa*s/m', 1],
    ['1cSt', 'm^2/s', 1e-6],
    ['1St', 'm^2/s', 1e-4],
    ['1poise', 'Pa*s', 0.1],
    ['1cd', 'cd', 1],
  ])('%s', (raw, target, want) => close(si(raw, target), want, 1e-9));

  it('1W/(m^2*sr) names no wrong token and has the dimension of W/m^2', () => {
    close(si('1W/(m^2*sr)', 'W/m^2'), 1);
  });
  it('1 g/cm^3 is exactly 1000', () => {
    expect(si('1g/cm^3', 'kg/m^3')).toBe(1000);
  });
  it('a logarithmic or ratio unit is refused with the reason, not "unknown"', () => {
    expect(() => parseUnit('dB')).toThrow(/logarithmic/);
    expect(() => parseUnit('Np')).toThrow(/logarithmic/);
    expect(() => parseUnit('dBm')).toThrow(/logarithmic/);
    expect(() => parseUnit('Mach')).toThrow(/speed of sound/);
    expect(() => parseUnit('ton')).toThrow(/tonne/);
  });
  it('an accessor in a unit text is read as a product, and a bad one names the unit text', () => {
    expect(() => readBinding('1uohm.cm')).not.toThrow();
    expect(() => readBinding('1nonsense.thing')).toThrow(/^(?!.*AccessorNode)/);
  });
  it('1m_p does not leak the substitution placeholder', () => {
    let message = '';
    try {
      readBinding('1m_p');
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toMatch(/__u/);
  });
});

describe('the gas constant R = N_A k_B is an eval name (issue 485)', () => {
  it('is registered with the value of N_A k_B', () => {
    expect(formulaNames().has('R')).toBe(true);
    close(formulaScope().R!, 6.02214076e23 * 1.380649e-23, 1e-12);
  });
});

describe('evaluator slots (issues 445, 450, 465, 446)', () => {
  const params = (id: number) => BRIDGE_EVALUATORS.get(id)!.parameters;
  const read = (id: number, args: string[]) => resolveEvaluatorInputs(params(id), args).inputs;

  it('a molar energy and a volume carry their units (445)', () => {
    expect(read(147, ['A_Hz=1e13', 'Ea_J_per_mol=50kJ/mol', 'T_K=300']).Ea_J_per_mol).toBeCloseTo(50000, 6);
    expect(read(161, ['rho_kg_per_m3=8960', 'c_J_per_kg_K=385', 'V_m3=1L', 'h_W_per_m2_K=20', 'A_m2=0.01', 't_s=0', 'theta_difference_K=10']).V_m3).toBeCloseTo(1e-3, 12);
  });
  it('a fraction nu=1/3 is a number, not a unit (450)', () => {
    close(read(60, ['nu=1/3']).nu, 1 / 3);
  });
  it('a cycle unit in an angular-frequency slot is multiplied by 2π (465)', () => {
    close(read(143, ['n_per_m3=1e28', 'm_kg=9.1e-31', 'tau_s=25fs', 'omega_rad_s=1THz']).omega_rad_s, 2 * Math.PI * 1e12);
    close(read(143, ['n_per_m3=1e28', 'm_kg=9.1e-31', 'tau_s=25fs', 'omega_rad_s=60rpm']).omega_rad_s, 2 * Math.PI);
    close(read(143, ['n_per_m3=1e28', 'm_kg=9.1e-31', 'tau_s=25fs', 'omega_rad_s=1e12rad/s']).omega_rad_s, 1e12);
    close(read(143, ['n_per_m3=1e28', 'm_kg=9.1e-31', 'tau_s=25fs', 'omega_rad_s=1e12/s']).omega_rad_s, 1e12);
  });
  it('a cyclic slot does not take 2π (control: Hz into a Hz slot)', () => {
    close(read(164, ['nu_Hz=5e14Hz', 'T_K=5800']).nu_Hz, 5e14);
  });
  it('a Celsius excess is a difference on the Newton-cooling slot (446)', () => {
    close(read(161, ['rho_kg_per_m3=8960', 'c_J_per_kg_K=385', 'V_m3=0.001', 'h_W_per_m2_K=20', 'A_m2=0.01', 't_s=0', 'theta_difference_K=10degC']).theta_difference_K, 10);
  });
});
