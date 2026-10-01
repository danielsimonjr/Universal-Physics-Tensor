import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
// Node >=18.20.2 / >=20.12.2 refuse to spawn a `.cmd` without a shell (the CVE-2024-27980
// argument-injection fix), so `execFileSync('npm.cmd', ...)` dies with EINVAL on Windows.
// `package:check` runs inside `prepublishOnly`, including when `npm run validate` is run on
// Windows. CI and the publish workflow run on ubuntu and take the `npm` branch. The Windows
// failure once blocked `prepublishOnly`, and therefore every release, while every other gate
// stayed green. `shell: true` is safe here: every argument below is a literal, none is
// derived from input.
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const raw = execFileSync(npmBin, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
const report = JSON.parse(raw)[0];
const files = new Set(report.files.map((f) => f.path));
const required = new Set(['package.json', 'README.md', 'LICENSE', pkg.bin.upt]);
for (const target of Object.values(pkg.exports)) {
  for (const path of Object.values(target)) required.add(path.replace(/^\.\//, ''));
}
for (const path of required) {
  if (!files.has(path)) throw new Error(`package smoke: required published file missing: ${path}`);
}
for (const path of files) {
  if (/^(src|tests|bench|tools|docs\/planning|\.github)\//.test(path)) {
    throw new Error(`package smoke: development-only path leaked into package: ${path}`);
  }
}
console.log(`package smoke: ${files.size} files, ${report.size} bytes; exports/bin present; no dev-tree leakage`);
