# AGENTS.md

Project instructions for any AI agent working in this repository.

## What this project is

A 120-day English course published as a static Docsify site on GitHub Pages. `ops/curriculum.json` is the single source of truth. Lessons live in `days/` as `day-NNN.md`.

## Read before writing

1. `ops/curriculum.json` - the day's title and topics.
2. `TUTORIAL-TEMPLATE.md` - required section order.
3. `STYLE-GUIDE.md` - voice, level calibration, register, quality gate.
4. `SOURCES.md` - allowed references.

## Rules

- Never edit generated files by hand: `PLAN.md`, `_sidebar.md`, `PROGRESS.md`, `days/README.md`, `modules/*.md`. Run `node scripts/build-all.mjs` instead.
- Never change `ops/curriculum.json` to make a lesson easier. Change the lesson.
- One lesson per file. Keep the front matter keys exactly as scaffolded.
- British spelling in prose, American variants in brackets on first use.
- No invented facts, statistics, or sources.
- Every lesson must pass `node scripts/check.mjs` before it counts as complete.
- Keep replies short; the lesson file is the deliverable.
- Do not commit secrets. `.opencode/` is project configuration and is safe to commit.

## Commands

```powershell
node scripts/budget.mjs        # what fits in today's token budget
node scripts/new-day.mjs next  # scaffold the next lesson
node scripts/build-all.mjs     # regenerate PLAN, sidebar, progress, modules; validate
node scripts/check.mjs         # validate only
```

## Publishing

Push to `main`. The GitHub Actions workflow `.github/workflows/deploy-pages.yml` rebuilds generated files, validates, and deploys the site. A failing check blocks the deploy on purpose.

## Tone of the course

Direct, warm, concrete. Explain the rule once, then make the learner use it. Never scold. Never claim one accent or variety is superior. See `STYLE-GUIDE.md`.
