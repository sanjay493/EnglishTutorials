#!/usr/bin/env node
// Validates the curriculum, lesson front matter, required sections and links,
// then confirms that generated files are up to date.
// Usage: node scripts/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ROOT,
  readCurriculum,
  listLessons,
  parseFrontMatter,
  readText,
  dayNumber,
} from './lib.mjs';

const errors = [];
const warnings = [];
const ok = [];

const { days, modules, moduleById } = readCurriculum();

/* ------------------------------------------------------------- curriculum */

if (days.length !== 120) errors.push(`curriculum.json should contain 120 days, found ${days.length}.`);

const seen = new Set();
for (let i = 0; i < days.length; i += 1) {
  const d = days[i];
  if (d.day !== i + 1) errors.push(`curriculum day order broken at index ${i}: expected day ${i + 1}, got ${d.day}.`);
  if (seen.has(d.day)) errors.push(`Duplicate curriculum day ${d.day}.`);
  seen.add(d.day);
  if (!moduleById.has(d.module)) errors.push(`Day ${d.day} points to unknown module ${d.module}.`);
}

for (const m of modules) {
  const list = days.filter((d) => d.module === m.id);
  if (list.length !== m.end - m.start + 1) {
    errors.push(
      `Module ${m.id} declares days ${m.start}-${m.end} (${m.end - m.start + 1}) but has ${list.length} entries.`
    );
  }
}
ok.push(`curriculum: ${days.length} days across ${modules.length} modules`);

/* ---------------------------------------------------------------- lessons */

const REQUIRED_HEADINGS = [
  'Warm-up',
  'Grammar',
  'Speaking lab',
  'Writing lab',
  'Practice',
  'Answer key',
];
const REQUIRED_KEYS = ['day', 'title', 'module', 'level', 'status', 'updated'];
const lessons = listLessons();
let complete = 0;

for (const lesson of lessons) {
  const file = `days/day-${dayNumber(lesson.day)}.md`;
  if (path.basename(lesson.file) !== `day-${dayNumber(lesson.day)}.md`) {
    errors.push(`${file}: filename does not match front matter day ${lesson.day}.`);
  }
  for (const key of REQUIRED_KEYS) {
    if (lesson[key] === undefined || lesson[key] === '') errors.push(`${file}: missing front matter "${key}".`);
  }
  if (!['draft', 'review', 'complete'].includes(lesson.status)) {
    errors.push(`${file}: status must be draft, review or complete (found "${lesson.status}").`);
  }
  const meta = days.find((d) => d.day === lesson.day);
  if (!meta) {
    errors.push(`${file}: day ${lesson.day} is not in curriculum.json.`);
    continue;
  }
  if (Number(lesson.module) !== meta.module) {
    errors.push(`${file}: module ${lesson.module} does not match curriculum module ${meta.module}.`);
  }
  if (lesson.status === 'complete') {
    complete += 1;
    const text = readText(lesson.file);
    const { body } = parseFrontMatter(text);
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    for (const heading of REQUIRED_HEADINGS) {
      if (!headings.some((h) => h.startsWith(heading))) {
        errors.push(`${file}: complete lesson is missing the "## ${heading}" section.`);
      }
    }
    if (lesson.words < 400) {
      warnings.push(`${file}: only ${lesson.words} words; aim for 700+ for a full lesson.`);
    }
    if (!/^##\s+Answer key/m.test(body)) {
      errors.push(`${file}: complete lesson needs an answer key.`);
    }
  }
}
ok.push(`lessons: ${lessons.length} files, ${complete} complete, ${lessons.length - complete} draft/review`);

/* ------------------------------------------------------------------ links */

const mdFiles = [];
function collect(dir, depth = 0) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === ROOT && !['days', 'modules', 'ops', 'scripts'].includes(entry.name)) continue;
      collect(full, depth + 1);
    } else if (entry.name.endsWith('.md')) {
      mdFiles.push(full);
    }
  }
}
collect(ROOT);

let linkCount = 0;
for (const file of mdFiles) {
  const text = readText(file);
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const raw = match[1].trim();
    if (/^(https?:|mailto:|#)/.test(raw) || raw.startsWith('<') || raw.includes('{{')) continue;
    const target = decodeURI(raw.split('#')[0].split('?')[0]);
    if (!target || !/\.md$/.test(target)) continue;
    linkCount += 1;
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      errors.push(`${path.relative(ROOT, file)}: broken link to ${target}`);
    }
  }
}
ok.push(`links: ${linkCount} relative markdown links checked in ${mdFiles.length} files`);

/* -------------------------------------------------------- generated files */

for (const script of ['build-plan.mjs', 'build-index.mjs']) {
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), '--check'], {
    encoding: 'utf8',
  });
  if (run.status !== 0) {
    const message = (run.stderr || run.stdout || '').trim();
    errors.push(`${script} --check failed: ${message}`);
  }
}
if (!errors.length) ok.push('generated files: PLAN.md, _sidebar.md, PROGRESS.md, days/README.md, modules/*.md');

/* ---------------------------------------------------------------- report */

for (const line of ok) console.log(`ok   ${line}`);
for (const line of warnings) console.log(`warn ${line}`);
for (const line of errors) console.error(`FAIL ${line}`);

console.log('');
if (errors.length) {
  console.error(`${errors.length} error(s). Fix them before publishing.`);
  process.exit(1);
}
console.log(`All checks passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.`);
