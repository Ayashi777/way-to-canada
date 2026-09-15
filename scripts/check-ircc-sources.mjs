import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve(import.meta.dirname, '../docs/immigration');
const urls = new Set();
for (const entry of readdirSync(directory)) {
  if (!entry.endsWith('.md')) continue;
  const source = readFileSync(resolve(directory, entry), 'utf8');
  for (const match of source.matchAll(/https:\/\/www\.canada\.ca\/[^\s)>]+/g)) urls.add(match[0]);
}

const checks = await Promise.all([...urls].sort().map(async (url) => {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    return { url, status: response.status, ok: response.ok };
  } catch (error) {
    return { url, status: error.message, ok: false };
  }
}));

for (const check of checks) console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.status} ${check.url}`);
if (checks.some((check) => !check.ok)) process.exit(1);
