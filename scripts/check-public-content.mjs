import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const publicFiles = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const forbiddenPaths = [
  /(^|\/)private\//i,
  /(^|\/)telegram-export\//i,
  /(^|\/)(?:result\.json|\.env(?:\.|$))/i,
  /\.(?:sqlite3?|pem|key)$/i,
];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
];

const failures = [];
for (const file of publicFiles) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) failures.push(`Forbidden tracked path: ${file}`);
  const contents = readFileSync(resolve(root, file));
  if (contents.includes(0)) continue;
  const text = contents.toString('utf8');
  if (secretPatterns.some((pattern) => pattern.test(text))) failures.push(`Possible secret in: ${file}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Public-content check passed for ${publicFiles.length} public files.`);
