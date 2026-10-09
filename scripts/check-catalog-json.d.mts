/** The cross-file problems of a catalog object; `[]` when sound. See `check-catalog-json.mjs`. */
export function crossChecks(
  catalog: {
    schemaVersion: number;
    packageVersion: string;
    entries: ReadonlyArray<{ id: number; type?: string; formalKey?: string }>;
    relations: ReadonlyArray<{ id: string; catalogId: number | null }>;
  },
  packageVersion: string,
  manifestKeys: ReadonlySet<string>,
): string[];
