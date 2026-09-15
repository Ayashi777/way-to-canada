import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
const publicDocuments = [
  ['Початок', 'README.md'], ['План', 'docs/master-plan.md'], ['План', 'docs/timeline.md'], ['Рішення', 'docs/decisions.md'],
  ['Імміграція', 'docs/immigration/status-and-visas.md'], ['Імміграція', 'docs/immigration/work-permit-extension.md'], ['Імміграція', 'docs/immigration/pr-strategy.md'], ['Імміграція', 'docs/immigration/official-sources.md'],
  ['Кар’єра', 'docs/career/job-search-strategy.md'], ['Кар’єра', 'docs/career/resume-and-linkedin.md'], ['Кар’єра', 'docs/career/target-employers.md'],
  ['Поселення', 'docs/settlement/budget.md'], ['Поселення', 'docs/settlement/housing-health-school.md'], ['Поселення', 'docs/settlement/first-90-days.md'],
  ['Навички', 'docs/language-and-skills.md'], ['Дані', 'docs/data/README.md'], ['Дані', 'docs/data/telegram-archive-governance.md'], ['Дані', 'docs/data/telegram-archive-local-index.md'],
  ['Приватність', 'docs/private-materials-index.md'], ['Журнал', 'journal/2026-09.md'], ['Артефакти', 'artifacts/research/2026-09-15-telegram-archive-audit.md'], ['Шаблони', 'artifacts/templates/daily-review-checklist.md'], ['Проєкт', 'repository_restructure_plan.md'], ['Проєкт', 'docs/site-content-policy.md'],
];
const slug = (value) => value.replace(/\.md$/i, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase();
const documentByPath = new Map(publicDocuments.map(([, path]) => [path, `doc-${slug(path)}`]));
const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function resolveLink(href, sourcePath) {
  if (/^(https?:|mailto:|#)/i.test(href)) return href;
  const target = relative(root, resolve(dirname(resolve(root, sourcePath)), href)).replaceAll('\\', '/');
  return documentByPath.has(target) ? `#${documentByPath.get(target)}` : href;
}
function inline(value, sourcePath) {
  let safe = escapeHtml(value.trim());
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  safe = safe.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, href) => {
    const link = resolveLink(href, sourcePath); const external = /^https?:/i.test(link) ? ' target="_blank" rel="noreferrer"' : '';
    return `<a href="${escapeHtml(link)}"${external}>${label}</a>`;
  });
  return safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function table(lines, sourcePath) {
  const rows = lines.map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
  const header = rows.shift(); rows.shift();
  return `<div class="table-wrap"><table><thead><tr>${header.map((cell) => `<th>${inline(cell, sourcePath)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell, sourcePath)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function markdown(markdown, sourcePath) {
  const lines = markdown.replace(/\r/g, '').split('\n'); const html = []; let index = 0;
  while (index < lines.length) {
    const line = lines[index]; if (!line.trim()) { index += 1; continue; }
    if (/^```/.test(line)) { const code = []; index += 1; while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]); index += 1; html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { const level = Math.min(heading[1].length + 1, 5); html.push(`<h${level}>${inline(heading[2], sourcePath)}</h${level}>`); index += 1; continue; }
    if (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(lines[index + 1] || '')) { const tableLines = [line, lines[index + 1]]; index += 2; while (index < lines.length && /^\|/.test(lines[index])) tableLines.push(lines[index++]); html.push(table(tableLines, sourcePath)); continue; }
    const unordered = line.match(/^[-*]\s+(.+)$/); const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) { const tag = unordered ? 'ul' : 'ol'; const items = []; while (index < lines.length) { const item = lines[index].match(unordered ? /^[-*]\s+(.+)$/ : /^\d+\.\s+(.+)$/); if (!item) break; items.push(`<li>${inline(item[1], sourcePath)}</li>`); index += 1; } html.push(`<${tag}>${items.join('')}</${tag}>`); continue; }
    const paragraph = [line]; index += 1; while (index < lines.length && lines[index].trim() && !/^(#|\||[-*]\s+|\d+\.\s+|```)/.test(lines[index])) paragraph.push(lines[index++]); html.push(`<p>${paragraph.map((item) => inline(item.replace(/ {2}$/, ''), sourcePath)).join('<br>')}</p>`);
  }
  return html.join('\n');
}
const title = (markdown, fallback) => markdown.match(/^#\s+(.+)$/m)?.[1] || fallback;
function commitDate() { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', 'README.md', 'docs', 'journal', 'artifacts'], { cwd: root, encoding: 'utf8' }).trim(); } catch { return new Date().toISOString().slice(0, 10); } }
function extractPlanRows(markdown) {
  const lines = markdown.split('\n'); const start = lines.findIndex((line) => line.startsWith('| Напрям')); if (start < 0) return '';
  const finish = lines.findIndex((line, index) => index > start + 1 && !line.startsWith('|'));
  return lines.slice(start, finish).filter((line) => /^\|/.test(line)).slice(2).map((line) => { const [area, state, step] = line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()); return `<article class="status-card"><p class="label">${inline(area, 'docs/master-plan.md')}</p><p>${inline(state, 'docs/master-plan.md')}</p><a href="#doc-docs-master-plan">${inline(step, 'docs/master-plan.md')} <span aria-hidden="true">→</span></a></article>`; }).join('');
}

rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true }); cpSync(resolve(root, 'site'), output, { recursive: true });
const docs = publicDocuments.map(([group, path]) => { const source = readFileSync(resolve(root, path), 'utf8'); return { group, path, id: documentByPath.get(path), title: title(source, basename(path, '.md')), source, html: markdown(source, path) }; });
const plan = docs.find((doc) => doc.path === 'docs/master-plan.md'); const groups = [...new Set(docs.map((doc) => doc.group))];
const nav = groups.map((group) => `<a href="#group-${slug(group)}">${group}</a>`).join('');
const content = groups.map((group) => `<section class="group" id="group-${slug(group)}"><div class="group-heading"><p>${group}</p><span>${docs.filter((doc) => doc.group === group).length} документ(и)</span></div>${docs.filter((doc) => doc.group === group).map((doc) => `<article class="document" id="${doc.id}" data-document data-search="${escapeHtml(`${doc.group} ${doc.title} ${doc.source}`.toLowerCase())}"><div class="document-meta"><span>GitHub / ${doc.path}</span><a href="https://github.com/Ayashi777/way-to-canada/blob/main/${doc.path}" target="_blank" rel="noreferrer">Відкрити файл ↗</a></div><h2>${inline(doc.title, doc.path)}</h2><div class="markdown">${doc.html}</div></article>`).join('')}</section>`).join('');
const page = `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Публічне дзеркало плану та бази знань Way to Canada."><meta name="theme-color" content="#13252e"><title>Way to Canada · публічний журнал</title><link rel="stylesheet" href="styles.css"></head><body><a class="skip-link" href="#content">До основного вмісту</a><header class="masthead"><div class="masthead-top"><p>Way to Canada / Public notebook</p><p>Зібрано з GitHub · ${commitDate()}</p></div><div class="hero"><div><h1>План, який живе<br>у GitHub.</h1><p>Публічне дзеркало погодженого плану, рішень, журналу й досліджень. Зміни у Markdown з’являються тут після кожного деплою.</p></div><aside><strong>Правило публікації</strong><span>Без паспортів, адрес, контактів, Telegram-експортів або приватних документів.</span></aside></div><nav class="site-nav" aria-label="Розділи бази знань">${nav}</nav></header><main id="content"><section class="now" aria-labelledby="now-title"><div class="section-intro"><p class="kicker">Погоджений поточний стан</p><h2 id="now-title">Що важливо зараз</h2><p>Ці картки автоматично формуються з таблиці у <a href="#doc-docs-master-plan">головному плані</a>. Вони не є чеклістом.</p></div><div class="status-grid">${extractPlanRows(plan.source)}</div></section><section class="browse"><div><p class="kicker">Повна публічна база</p><h2>Документи, а не перекази</h2></div><label class="search"><span>Пошук у публічних матеріалах</span><input id="search" type="search" name="search" placeholder="Наприклад: TRV, бюджет, резюме…" autocomplete="off"></label></section><p id="search-result" class="search-result" aria-live="polite"></p><div id="documents">${content}</div></main><footer><div><strong>Way to Canada</strong><p>Сайт згенеровано з безпечних файлів репозиторію. Оновлюйте зміст у GitHub — не в HTML.</p></div><a href="https://github.com/Ayashi777/way-to-canada" target="_blank" rel="noreferrer">Переглянути репозиторій ↗</a></footer><script src="app.js"></script></body></html>`;
writeFileSync(resolve(output, 'index.html'), page); console.log(`Built ${docs.length} public documents into ${output}`);
