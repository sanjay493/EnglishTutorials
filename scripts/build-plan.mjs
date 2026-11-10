#!/usr/bin/env node
// Generates PLAN.md from ops/curriculum.json.
// Usage: node scripts/build-plan.mjs [--check]
import path from 'node:path';
import {
  ROOT,
  readCurriculum,
  lessonExists,
  dayLink,
  dayNumber,
  escapeCell,
  writeIfChanged,
  readText,
} from './lib.mjs';

const checkOnly = process.argv.includes('--check');
const { course, modules, days } = readCurriculum();

const lines = [];
lines.push(`# ${course.title} — the 120-day plan`);
lines.push('');
lines.push(
  `> ${course.subtitle}. Levels: ${course.levels}. Daily commitment: ${course.dailyTime}.`
);
lines.push('');
lines.push(
  'This file is generated from `ops/curriculum.json`. Do not edit it by hand: change the JSON, then run `node scripts/build-all.mjs`.'
);
lines.push('');
lines.push('## How the course works');
lines.push('');
lines.push(
  'Every day is one self-contained lesson built from the same five parts, so grammar, speaking, and writing improve together instead of in separate silos.'
);
lines.push('');
lines.push('| Part | Time | What you do |');
lines.push('| --- | --- | --- |');
lines.push('| 1. Warm-up | 5 min | Review yesterday, preview today, learn 8-10 new words |');
lines.push('| 2. Grammar | 15 min | One rule, explained plainly, with a table and common mistakes |');
lines.push('| 3. Speaking lab | 15 min | Formal and informal dialogues, pronunciation notes, role-play task |');
lines.push('| 4. Writing lab | 15 min | A model text, a structure you can reuse, and an editing checklist |');
lines.push('| 5. Practice and key | 5-10 min | Exercises with a full answer key and a self-check score |');
lines.push('');
lines.push(
  'Each lesson ends with **Tomorrow** (what comes next) and **Go deeper** (one or two curated sources from [`SOURCES.md`](SOURCES.md)).'
);
lines.push('');
lines.push('### Study rhythm');
lines.push('');
lines.push('1. Read the lesson once without writing anything.');
lines.push('2. Do the exercises in a notebook or a notes app, then mark them with the key.');
lines.push('3. Say the speaking lab dialogues **out loud** twice: once slowly, once at natural speed.');
lines.push('4. Write the writing task in 10 minutes, then edit it with the checklist.');
lines.push('5. Add new words to your personal vocabulary log and review them on Day 7, 14, 21, and so on.');
lines.push('');
lines.push(
  'Assessment days (every 15th day) contain a longer task, a scoring rubric, and a review list. They are the natural place to repeat earlier material.'
);
lines.push('');
lines.push('## Course map');
lines.push('');
lines.push('| Module | Level | Days | Focus |');
lines.push('| --- | --- | --- | --- |');
for (const m of modules) {
  lines.push(
    `| [${m.id}. ${escapeCell(m.title)}](modules/${m.slug}.md) | ${m.level} | ${m.start}-${m.end} | ${escapeCell(
      m.goal
    )} |`
  );
}
lines.push('');
lines.push('## The 120 days');
lines.push('');
lines.push(
  'Status: ✅ written · ⬜ planned. The live dashboard is [`PROGRESS.md`](PROGRESS.md).'
);
lines.push('');

for (const m of modules) {
  lines.push(`### Module ${m.id} · ${m.title} (${m.level}) · Days ${m.start}-${m.end}`);
  lines.push('');
  lines.push(`**Goal:** ${m.goal}`);
  lines.push('');
  lines.push(`**Checkpoint:** ${m.checkpoint}`);
  lines.push('');
  lines.push('| Day | Lesson | Grammar focus | Speaking lab | Writing lab | Status |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const d of days.filter((x) => x.module === m.id)) {
    const label = `Day ${d.day}: ${escapeCell(d.title)}`;
    const link = lessonExists(d.day) ? `[${label}](${dayLink(d.day)})` : label;
    const done = lessonExists(d.day) ? '✅' : '⬜';
    lines.push(
      `| ${d.day} | ${link} | ${escapeCell(d.grammar)} | ${escapeCell(d.speaking)} | ${escapeCell(
        d.writing
      )} | ${done} |`
    );
  }
  lines.push('');
}

lines.push('## Milestones');
lines.push('');
for (const m of modules) {
  lines.push(
    `- **Day ${m.end}:** ${m.checkpoint}`
  );
}
lines.push('');
lines.push('## After Day 120');
lines.push('');
lines.push(
  '- Re-run the final exam and compare scores; target 80% or higher on each section.'
);
lines.push(
  '- Keep a weekly output habit: one 250-word text and one five-minute recording.'
);
lines.push(
  '- Move from "learning English" to "using English": read one long-form article a day and summarise it in three sentences.'
);
lines.push(
  '- If you teach or mentor others, the lesson template doubles as a ready-made worksheet generator.'
);
lines.push('');
lines.push('---');
lines.push('');
lines.push(
  `Licence: ${course.license}. Source of truth: \`ops/curriculum.json\` · Generated file, version ${course.version}.`
);
lines.push('');

const target = path.join(ROOT, 'PLAN.md');
const content = lines.join('\n');

if (checkOnly) {
  const current = readText(target);
  if (current.replace(/\r\n/g, '\n') !== content) {
    console.error('PLAN.md is out of date. Run: node scripts/build-plan.mjs');
    process.exitCode = 1;
  } else {
    console.log('PLAN.md is up to date.');
  }
} else {
  const changed = writeIfChanged(target, content);
  console.log(changed ? 'Wrote PLAN.md' : 'PLAN.md unchanged');
}
