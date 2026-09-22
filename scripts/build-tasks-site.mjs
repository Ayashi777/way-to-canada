#!/usr/bin/env node
// Build the simple task-checklist Pages site from docs/tasks.md.
// No dependencies, no JS in the output: simple line-based parsing only.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcPath = resolve(root, 'docs/tasks.md');
const outDir = resolve(root, 'dist');
const outPath = resolve(outDir, 'index.html');

const src = readFileSync(srcPath, 'utf8');

const doc = { title: '', subtitle: '', sections: [] };
let section = null;
let inNotes = false;

for (const rawLine of src.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line) continue;

  if (!doc.title && line.startsWith('# ')) {
    doc.title = line.slice(2).trim();
    continue;
  }
  if (line.startsWith('## ')) {
    section = { title: line.slice(3).trim(), intro: [], tasks: [], notesTitle: '', notes: [] };
    doc.sections.push(section);
    inNotes = false;
    continue;
  }
  if (section === null) {
    doc.subtitle = doc.subtitle ? `${doc.subtitle} ${line}` : line;
    continue;
  }
  if (line.startsWith('### ')) {
    inNotes = true;
    section.notesTitle = line.slice(4).trim();
    continue;
  }
  if (line.startsWith('- ✅ ') || line.startsWith('- ⬜ ')) {
    const done = line.startsWith('- ✅ ');
    const [name = '', deadline = '', ...rest] = line.slice(4).split(' — ');
    if (!name || !deadline) throw new Error(`Bad task line (need "name — deadline — detail"): ${line}`);
    section.tasks.push({ done, name, deadline, detail: rest.join(' — ') });
    continue;
  }
  if (inNotes && line.startsWith('- ')) {
    section.notes.push(line.slice(2).trim());
    continue;
  }
  if (!inNotes && section.tasks.length === 0) {
    section.intro.push(line);
  }
}

if (!doc.title) throw new Error('No H1 title found in docs/tasks.md');
if (doc.sections.length < 7) throw new Error(`Expected 7 block sections, found ${doc.sections.length}`);
const total = doc.sections.reduce((n, s) => n + s.tasks.length, 0);
if (total < 70) throw new Error(`Expected >70 tasks, found ${total}`);
const doneTotal = doc.sections.reduce((n, s) => n + s.tasks.filter((t) => t.done).length, 0);

const esc = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const css = `:root{color-scheme:light dark;--bg:#f5f6f8;--card:#fff;--card-path:#fff;--border:#e2e6ec;--border-soft:#eef1f5;--text:#1d2530;--path-text:#33404f;--muted:#6a7482;--detail:#5c6672;--faint:#8b94a0;--done:#1a7f37;--open:#b3661a;--badge-bg:#eef2f7;--badge-border:#dde3ea;--badge-text:#3c4a5a;--counter-bg:#e7f5ec;--counter-border:#cdeadd}
@media (prefers-color-scheme:dark){:root{--bg:#0f141a;--card:#171e26;--card-path:#1c2530;--border:#2a3340;--border-soft:#232c37;--text:#e6ebf1;--path-text:#c3ccd8;--muted:#99a3b0;--detail:#99a3b0;--faint:#99a3b0;--done:#4ade80;--open:#fbbf24;--badge-bg:#232c37;--badge-border:#333e4d;--badge-text:#c3ccd8;--counter-bg:#16311f;--counter-border:#1f5c38}}
*{box-sizing:border-box}
body{margin:0;padding:2rem 1rem 3rem;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto}
h1{font-size:1.6rem;margin:0 0 .2rem}
.subtitle{margin:0 0 1.4rem;color:var(--muted);font-size:.95rem}
.path{background:var(--card-path);border:1px solid var(--border);border-radius:12px;padding:.9rem 1.1rem;margin-bottom:1rem}
.path div{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86rem;color:var(--path-text);padding:.12rem 0}
section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem .9rem;margin:0 0 1rem}
h2{display:flex;justify-content:space-between;align-items:baseline;gap:.8rem;font-size:1.08rem;margin:.1rem 0 .5rem}
.counter{flex:none;font-size:.78rem;font-weight:600;color:var(--done);background:var(--counter-bg);border:1px solid var(--counter-border);border-radius:999px;padding:.12rem .6rem}
ul.tasks{list-style:none;margin:0;padding:0}
li.task{display:flex;gap:.6rem;padding:.5rem 0;border-top:1px solid var(--border-soft)}
li.task:first-child{border-top:none}
.mark{flex:none;font-size:.95rem;line-height:1.4}
li.done .name{color:var(--done);text-decoration:line-through}
li.open .mark{color:var(--open)}
.badge{display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.72rem;background:var(--badge-bg);border:1px solid var(--badge-border);border-radius:6px;padding:.1rem .45rem;white-space:nowrap;color:var(--badge-text)}
.detail{color:var(--detail);font-size:.87rem;margin-top:.1rem}
h3{font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:.8rem 0 .3rem}
ul.notes{list-style:none;margin:0;padding:0;color:var(--faint);font-size:.82rem}
ul.notes li{padding:.12rem 0}
footer{color:var(--faint);font-size:.8rem;text-align:center;margin-top:1.2rem}`;

const html = [];
html.push('<!DOCTYPE html>');
html.push('<html lang="uk">');
html.push('<head>');
html.push('<meta charset="utf-8">');
html.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
html.push('<meta name="color-scheme" content="light dark">');
html.push(`<title>${esc(doc.title)}</title>`);
html.push(`<style>${css}</style>`);
html.push('</head>');
html.push('<body>');
html.push('<main>');
html.push(`<h1>${esc(doc.title)}</h1>`);
html.push(`<p class="subtitle">${esc(doc.subtitle)}</p>`);

for (const section of doc.sections) {
  const doneCount = section.tasks.filter((t) => t.done).length;
  const counter = section.tasks.length ? `<span class="counter">${doneCount}/${section.tasks.length} зроблено</span>` : '';
  html.push('<section>');
  html.push(`<h2><span>${esc(section.title)}</span>${counter}</h2>`);
  if (section.intro.length) {
    html.push('<div class="path">');
    for (const line of section.intro) html.push(`<div>${esc(line)}</div>`);
    html.push('</div>');
  }
  if (section.tasks.length) {
    html.push('<ul class="tasks">');
    for (const task of section.tasks) {
      html.push(`<li class="task ${task.done ? 'done' : 'open'}">`);
      html.push(`<span class="mark">${task.done ? '✅' : '⬜'}</span>`);
      html.push('<div>');
      html.push(`<span class="name">${esc(task.name)}</span> <span class="badge">${esc(task.deadline)}</span>`);
      if (task.detail) html.push(`<div class="detail">${esc(task.detail)}</div>`);
      html.push('</div>');
      html.push('</li>');
    }
    html.push('</ul>');
  }
  if (section.notes.length) {
    html.push(`<h3>${esc(section.notesTitle || 'Зроблено раніше')}</h3>`);
    html.push('<ul class="notes">');
    for (const note of section.notes) html.push(`<li>${esc(note)}</li>`);
    html.push('</ul>');
  }
  html.push('</section>');
}

html.push(`<footer>Оновлено: ${esc(doc.subtitle)}</footer>`);
html.push('</main>');
html.push('</body>');
html.push('</html>');

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html.join('\n') + '\n');
console.log(`Built ${outPath}: ${doc.sections.length} sections, ${total} tasks (${doneTotal} done, ${total - doneTotal} open).`);
