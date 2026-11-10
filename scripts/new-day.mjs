#!/usr/bin/env node
// Scaffolds the next lesson from TUTORIAL-TEMPLATE.md.
// Usage:
//   node scripts/new-day.mjs next          # first unwritten day
//   node scripts/new-day.mjs 7             # a specific day
//   node scripts/new-day.mjs 7 --force     # overwrite an existing draft
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  DAYS_DIR,
  readCurriculum,
  readText,
  lessonExists,
  dayNumber,
} from './lib.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
const { days, moduleById } = readCurriculum();

function firstUnwritten() {
  for (const d of days) {
    if (!lessonExists(d.day)) return d.day;
  }
  return null;
}

let dayArg = args[0] ?? 'next';
let day = dayArg === 'next' ? firstUnwritten() : Number(dayArg);

if (day === null) {
  console.log('All 120 lessons already exist. Nothing to scaffold.');
  process.exit(0);
}
if (!Number.isInteger(day) || day < 1 || day > days.length) {
  console.error(`Day must be an integer between 1 and ${days.length}.`);
  process.exit(1);
}

const meta = days.find((d) => d.day === day);
const mod = moduleById.get(meta.module);
const target = path.join(DAYS_DIR, `day-${dayNumber(day)}.md`);

if (fs.existsSync(target) && !force) {
  console.log(`days/day-${dayNumber(day)}.md already exists. Use --force to overwrite it.`);
  process.exit(0);
}

const template = readText(path.join(ROOT, 'TUTORIAL-TEMPLATE.md'));
const today = new Date().toISOString().slice(0, 10);
const values = {
  '{{DAY}}': String(day),
  '{{TITLE}}': meta.title,
  '{{MODULE}}': String(mod.id),
  '{{MODULE_TITLE}}': mod.title,
  '{{MODULE_SLUG}}': mod.slug,
  '{{ROOT}}': '../',
  '{{LEVEL}}': mod.level,
  '{{GRAMMAR}}': meta.grammar,
  '{{SPEAKING}}': meta.speaking,
  '{{WRITING}}': meta.writing,
  '{{VOCAB}}': meta.vocab,
  '{{DATE}}': today,
  '{{STATUS}}': 'draft',
  '{{NEXT_DAY}}': day < days.length ? String(day + 1) : 'complete',
};

let content = template;
for (const [token, value] of Object.entries(values)) {
  content = content.split(token).join(value);
}

fs.mkdirSync(DAYS_DIR, { recursive: true });
fs.writeFileSync(target, content, 'utf8');

console.log(`Created days/day-${dayNumber(day)}.md`);
console.log(`  Module ${mod.id} · ${mod.title} (${mod.level})`);
console.log(`  Grammar: ${meta.grammar}`);
console.log(`  Speaking: ${meta.speaking}`);
console.log(`  Writing: ${meta.writing}`);
console.log('');
console.log('Next: write the lesson, set status: complete, then run `node scripts/build-all.mjs`.');
