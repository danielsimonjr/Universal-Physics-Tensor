/** Metric names and the terminology their reports expose in search. */
export const METRIC_TOPICS = {
  minkowski: { title: 'Minkowski metric', terms: 'flat spacetime Ricci scalar' },
  schwarzschild: { title: 'Schwarzschild metric', terms: 'Kretschmann scalar event horizon' },
  flrw: { title: 'FLRW metric', terms: 'Friedmann Lemaître Robertson Walker metric Ricci scalar' },
  kerr: {
    title: 'Kerr metric',
    terms: 'Kerr black hole Boyer Lindquist coordinates Kretschmann scalar event horizons ISCO innermost stable circular orbit photon orbit',
  },
} as const;
