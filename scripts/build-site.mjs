import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const publicDocuments = {
  masterPlan: 'docs/master-plan.md',
  timeline: 'docs/timeline.md',
  decisions: 'docs/decisions.md',
  sources: 'docs/immigration/official-sources.md',
  archiveAudit: 'artifacts/research/2026-09-15-telegram-archive-audit.md',
};
const repositoryUrl = 'https://github.com/Ayashi777/way-to-canada/blob/main/';

function rows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2)
    .map((line) => line.trim().slice(1, -1).split('|').map((cell) => cell.trim()));
}

function link(cell, base = '') {
  const match = cell.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (!match) return { label: cell, href: null };
  const [, label, href] = match;
  return {
    label,
    href: href.startsWith('http') ? href : `${repositoryUrl}${base}${href}`,
  };
}

function section(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const rest = markdown.slice(start + heading.length + 3);
  const end = rest.search(/\n## /);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

function updateDate(markdown) {
  return markdown.match(/Оновлено:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function bullets(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2));
}

const raw = Object.fromEntries(
  await Promise.all(
    Object.entries(publicDocuments).map(async ([name, relativePath]) => [
      name,
      await readFile(path.join(root, relativePath), 'utf8'),
    ]),
  ),
);
const journalFiles = (await readdir(path.join(root, 'journal')))
  .filter((file) => /^\d{4}-\d{2}\.md$/.test(file))
  .sort()
  .reverse();
const journalText = await Promise.all(
  journalFiles.map((file) => readFile(path.join(root, 'journal', file), 'utf8')),
);

const planRows = rows(section(raw.masterPlan, 'Напрями')).map(([area, status, nextStep, document]) => ({
  area,
  status,
  nextStep,
  document: link(document, 'docs/'),
}));
const timelineRows = rows(raw.timeline).map(([when, event, action, source]) => ({
  when,
  event,
  action,
  source: link(source),
}));
const sourceRows = rows(raw.sources).map(([topic, summary, checked, source]) => ({
  topic,
  summary,
  checked,
  source: link(source),
}));

const data = {
  schemaVersion: 1,
  generatedFrom: [...Object.values(publicDocuments), ...journalFiles.map((file) => `journal/${file}`)],
  updated: updateDate(raw.masterPlan),
  plan: planRows,
  timeline: timelineRows,
  sources: sourceRows,
  decisions: bullets(section(raw.decisions, '2026-09-15 — Публічний GitHub як журнал, не як сховище документів')),
  journal: journalText.flatMap((markdown) => markdown
    .split('\n## ')
    .slice(1)
    .map((entry) => ({ title: entry.split('\n')[0], points: bullets(entry) }))),
  archive: {
    summary: bullets(section(raw.archiveAudit, 'Знеособлений зріз')),
    integrity: bullets(section(raw.archiveAudit, 'Перевірка цілісності індексу')),
  },
};

await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'knowledge.html', 'styles.css', 'app.js']) {
  await cp(path.join(root, file), path.join(dist, file));
}
await writeFile(path.join(dist, 'site-data.json'), `${JSON.stringify(data, null, 2)}\n`);
