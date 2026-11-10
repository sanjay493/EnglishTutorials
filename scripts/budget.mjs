#!/usr/bin/env node
// Works out how many lessons fit inside today's remaining token allowance.
// Usage: node scripts/budget.mjs [--json]
import fs from 'node:fs';
import path from 'node:path';
import { OPS_DIR, ROOT, readJson, readText, readCurriculum, listLessons, dayNumber } from './lib.mjs';

const budget = readJson(path.join(OPS_DIR, 'token-budget.json'));
const { days, moduleById } = readCurriculum();
const lessons = listLessons();
const written = new Set(lessons.filter((l) => l.status === 'complete').map((l) => l.day));

const localDate = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const today = localDate();
const logPath = path.join(OPS_DIR, 'run-log.jsonl');
let usedToday = 0;
let runsToday = 0;
if (fs.existsSync(logPath)) {
  for (const line of readText(logPath).split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.date === today) {
        usedToday += Number(entry.estTokens) || 0;
        runsToday += 1;
      }
    } catch {
      /* ignore malformed lines */
    }
  }
}

const limit = Number(budget.dailyTokenLimit) || 100000;
const reserve = Number(budget.reserveTokens) || 0;
const stopPercent = Number(budget.stopAtPercent) || 80;
const perLesson = Number(budget.estimatedTokensPerLesson) || 6000;
const maxPerRun = Number(budget.maxLessonsPerRun) || 2;
const usableToday = Math.max(0, Math.floor((limit * stopPercent) / 100) - reserve);
const remaining = Math.max(0, usableToday - usedToday);
const fits = Math.floor(remaining / perLesson);
const recommended = Math.min(maxPerRun, Math.max(0, fits));

const nextDays = days
  .filter((d) => !written.has(d.day))
  .slice(0, Math.max(recommended, 1))
  .map((d) => ({
    day: d.day,
    title: d.title,
    module: d.module,
    level: moduleById.get(d.module)?.level ?? '',
    file: `days/day-${dayNumber(d.day)}.md`,
    exists: fs.existsSync(path.join(ROOT, 'days', `day-${dayNumber(d.day)}.md`)),
    complete: written.has(d.day),
    grammar: d.grammar,
    speaking: d.speaking,
    writing: d.writing,
    vocab: d.vocab,
  }));

const result = {
  date: today,
  dailyTokenLimit: limit,
  reserveTokens: reserve,
  stopAtPercent: stopPercent,
  usableToday,
  usedToday,
  remaining,
  runsToday,
  estimatedTokensPerLesson: perLesson,
  maxLessonsPerRun: maxPerRun,
  recommendedLessons: recommended,
  lessonsComplete: written.size,
  lessonsRemaining: days.length - written.size,
  nextDays,
  notes:
    recommended === 0
      ? ['No budget left for a full lesson today. Stop, or lower estimatedTokensPerLesson only if you are sure the output stays short.']
      : [],
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

console.log(`Daily budget for ${today}`);
console.log(`  Limit            : ${limit.toLocaleString()} tokens`);
console.log(`  Usable (${stopPercent}% - reserve): ${usableToday.toLocaleString()} tokens`);
console.log(`  Used today       : ${usedToday.toLocaleString()} tokens in ${runsToday} run(s)`);
console.log(`  Remaining        : ${remaining.toLocaleString()} tokens`);
console.log(`  ~Per lesson      : ${perLesson.toLocaleString()} tokens`);
console.log(`  Recommended      : ${recommended} lesson(s), max ${maxPerRun} per run`);
console.log('');
if (nextDays.length && recommended > 0) {
  console.log('Write these next:');
  for (const d of nextDays) console.log(`  Day ${d.day}: ${d.title} (${d.file})`);
} else if (recommended === 0) {
  console.log('No lesson fits in the remaining budget today.');
}
console.log('');
console.log('---BUDGET-JSON---');
console.log(JSON.stringify(result, null, 2));
