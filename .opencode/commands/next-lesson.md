---
description: Write the next lesson(s) allowed by today's token budget
agent: lesson-writer
---

Run the daily lesson workflow.

1. Check the budget with `node scripts/budget.mjs`.
2. Write up to `recommendedLessons` lessons for the next unwritten days, following `TUTORIAL-TEMPLATE.md` and `STYLE-GUIDE.md`.
3. Run `node scripts/build-all.mjs` until it passes.
4. Append the run to `ops/run-log.jsonl` and commit.

Optional arguments: $ARGUMENTS
- A number (for example `1`) overrides the number of lessons, but only downwards.
- `--no-push` stops after the commit.
