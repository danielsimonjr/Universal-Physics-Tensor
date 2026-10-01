export function versionFromTag(tag: string): string | null;

export function assertTagMatchesPackageVersion(
  tag: string,
  packageVersion: string,
): { ok: boolean; message: string };
