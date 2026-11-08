/** Golden corpus — the preserved success surface (spec §5.1). stdout only;
 *  stderr is NOT pinned (map --out + --equation deliberately write there),
 *  except for `pinStderr` cases where the whole point is the stderr routing.
 *  svg is excluded (peer-version-dependent bytes — spec Adam A3). */
// Case shape: { name, args, peerGated?, pinStderr? } — pinStderr additionally
// captures/asserts CRLF-normalized stderr as tests/cli/golden/<name>.stderr.txt.
export const GOLDEN_CASES = [
  { name: 'demo-no-args',        args: [] },
  { name: 'help',                args: ['help'] },
  { name: 'explain-mass-value',  args: ['explain', 'hawking-temperature', 'mass=1.989e30'] },
  { name: 'explain-bare-names',  args: ['explain', 'hawking-temperature', 'mass'] },
  { name: 'priority',            args: ['priority'] },
  { name: 'audit',               args: ['audit'] },
  { name: 'map-text',            args: ['map'] },
  { name: 'map-text-catalog',    args: ['map', '--source=catalog'] },
  { name: 'map-text-canonical',  args: ['map', '--source=canonical'] },
  { name: 'map-text-both',       args: ['map', '--source=both'] },
  { name: 'map-mermaid',         args: ['map', '--format=mermaid'] },
  { name: 'map-dot',             args: ['map', '--format=dot'] },
  { name: 'map-mermaid-proposed', args: ['map', '--format=mermaid', '--proposed'] },
  { name: 'map-equation-ok',     args: ['map', '--source=canonical', '--equation', 'period = 2*pi*sqrt(length/gravity)'] },
  // A dimension mismatch is a failed check: exit 3 since 0.47.0 (persona finding F2).
  { name: 'map-equation-mismatch', args: ['map', '--source=canonical', '--equation', 'period = mass'], exitCode: 3 },
  // Visual mode routes the landing report to STDERR (stdout stays pure diagram
  // source) — pinStderr captures <name>.stderr.txt alongside the stdout golden.
  { name: 'map-equation-visual', args: ['map', '--source=canonical', '--format=mermaid', '--equation', 'period = 2*pi*sqrt(length/gravity)'], pinStderr: true },
  { name: 'candidates',          args: ['candidates'] },
  { name: 'candidates-both',     args: ['candidates', '--source=both'] },
  { name: 'predict',             args: ['predict'] },
  { name: 'discover',            args: ['discover'] },
  { name: 'discover-canonical',  args: ['discover', '--source=canonical'] },
  { name: 'discover-opts',       args: ['discover', '--max-orders=4', '--anchor=mass=1.989e30'] },
  { name: 'discover-derive',     args: ['discover', '--derive', '--source=both'] },
  { name: 'discover-show-adjudicated', args: ['discover', '--source=canonical', '--show-adjudicated'] },
  { name: 'connectors',          args: ['connectors'] },
  { name: 'coverage',            args: ['coverage'] },
  { name: 'confront',            args: ['confront'] },
  { name: 'canonical',           args: ['canonical'] },
  { name: 'recover',             args: ['recover'] },
  { name: 'symbolic',            args: ['symbolic'] },
  { name: 'symbolic-simplify',   args: ['symbolic', '--simplify'], peerGated: true },
  { name: 'eval',                args: ['eval', 'hbar*c^3/(8*pi*G*M*k_B)', 'hbar=1.054571817e-34', 'c=299792458', 'G=6.6743e-11', 'M=1.989e30', 'k_B=1.380649e-23'] },
  { name: 'derive-plain',        args: ['derive', 'period:time', 'length:length', 'gravity:acceleration'] },
  { name: 'derive-formula',      args: ['derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', '2*pi*sqrt(length/gravity)'] },
  { name: 'atlas-list',          args: ['atlas'] },
  { name: 'atlas-pendulum',      args: ['atlas', 'ab-pendulum-linear'] },
  // The norm-transport rows of the JSON envelope (normTransportFields, src/atlas/serialize.ts).
  { name: 'atlas-spring-lc-json', args: ['atlas', 'ab-spring-lc', '--json'] },
];
