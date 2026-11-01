/**
 * One-shot builder: merge declarative fields from the live case modules with
 * check records (expr + bound). Not part of the runtime; run after editing checks.
 */
import { writeFileSync } from 'node:fs';
import { APPLIED_CASES } from '../src/cases/index.ts';
import { CHECKS_BY_CASE_ID } from '../src/cases/catalog-checks.ts';

const cases = [...APPLIED_CASES.values()].map((c) => {
  const { run, regimeAt, ...rest } = c;
  const checks = CHECKS_BY_CASE_ID[c.id];
  if (checks === undefined) throw new Error(`missing checks for ${c.id}`);
  const record = {
    ...rest,
    outputs: rest.outputs.map((o) => ({ key: o.key, symbol: o.symbol, unit: o.unit, meaning: o.meaning })),
    checks: [...checks],
  };
  if (regimeAt !== undefined) record.regimeAt = 'brownianSphereRegimeAt';
  return record;
});

writeFileSync(
  new URL('../data/applied-cases.json', import.meta.url),
  `${JSON.stringify({ schemaVersion: 1, cases }, null, 2)}\n`,
);
