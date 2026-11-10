# CONTRIBUTING

How to grow this course without breaking it.

## Quick start

```powershell
# rebuild, validate, commit and push in one step
.\scripts\publish.ps1 "lesson(day-006): present simple questions"

# preview the site locally (Docsify needs HTTP, not file://)
python -m http.server 8080
# then open http://localhost:8080
```

```powershell
# see what fits in today's token budget
node scripts/budget.mjs

# scaffold the next lesson
node scripts/new-day.mjs next

# rebuild PLAN.md, _sidebar.md, PROGRESS.md, days/README.md, modules/*.md and validate
node scripts/build-all.mjs
```

Node 18+ is required. There are **no npm dependencies**; the scripts use only the standard library.

## The daily loop

1. `node scripts/budget.mjs` tells you how many lessons fit in the remaining free-tier allowance.
2. Either write the lesson yourself from `TUTORIAL-TEMPLATE.md`, or run:
   ```text
   /next-lesson
   ```
   That command uses the `lesson-writer` agent, which follows `STYLE-GUIDE.md`, writes the files, validates, and commits.
3. `node scripts/build-all.mjs` must pass before you push.
4. `git push`.

## Writing a lesson by hand

```powershell
node scripts/new-day.mjs 6      # scaffold Day 6
node scripts/build-all.mjs      # see it appear in the sidebar as a draft
```

Then:

1. Replace every `<!-- comment -->` and `{{placeholder}}`.
2. Keep the nine headings in `TUTORIAL-TEMPLATE.md`, in order.
3. Aim for the word range for the level (see `STYLE-GUIDE.md` section 3).
4. Set `status: complete`, the real `words` count, and `updated: YYYY-MM-DD`.
5. Run `node scripts/build-all.mjs`. Fix every error.

A lesson is only published when `status: complete`. Drafts are visible in the repository but not linked from the sidebar.

## How the token budget works

`ops/token-budget.json` holds your daily allowance and a per-lesson estimate:

```json
{
  "dailyTokenLimit": 100000,
  "reserveTokens": 12000,
  "stopAtPercent": 80,
  "estimatedTokensPerLesson": 6000,
  "maxLessonsPerRun": 2
}
```

The budget script subtracts today's entries in `ops/run-log.jsonl` and recommends a lesson count:

```text
usable   = dailyTokenLimit * stopAtPercent/100 - reserveTokens
remaining= usable - tokens already logged today
lessons  = min(maxLessonsPerRun, floor(remaining / estimatedTokensPerLesson))
```

Rules of thumb:

- Set `dailyTokenLimit` to **80%** of your provider's published free limit. Limits change; leave headroom.
- One lesson is roughly 1,000 words, about 1,400 output tokens, plus reading and reasoning. `6000` is a deliberately cautious estimate for a full run.
- If runs keep failing at the cap, raise `estimatedTokensPerLesson` or lower `maxLessonsPerRun`.
- The log is append-only. Never delete a line to "reset" the budget; change the date or the limit instead.

## Publishing to GitHub Pages

The repository is `https://github.com/sanjay493/EnglishTutorials.git`.

```powershell
git add -A
git commit -m "lesson(day-006): present simple questions"
git push -u origin main
```

Then, once:

1. Open **Settings → Pages** in the repository.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Run the **Deploy site** workflow (it also runs automatically on every push to `main`).
4. The site appears at `https://sanjay493.github.io/EnglishTutorials/`.

The workflow tries to enable Pages by itself, but GitHub's repository token usually cannot create the Pages site. If the
**Configure Pages** step fails, set the source once in **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After that the same workflow deploys on every push.

If `git push` asks for credentials, use a GitHub personal access token as the password, or authenticate the GitHub CLI first:

```powershell
gh auth login
gh auth setup-git
```

### Optional: fully automated daily lessons

`.github/workflows/daily-lesson.yml` can write lessons on a schedule.

1. Add a provider key under **Settings → Secrets and variables → Actions → Secrets** (for example `OPENROUTER_API_KEY`).
2. Add a repository **variable** `OPENCODE_MODEL` with a value like `openrouter/anthropic/claude-sonnet-4.5`.
3. Run the workflow manually once to check it.
4. Uncomment the `schedule:` block in the workflow file.

Without those two settings the workflow will fail at the model call. That is why it is manual by default.

## Adding or changing the curriculum

`ops/curriculum.json` drives `PLAN.md`, the sidebar, the module pages, and the agent's instructions.

- To change a day's topic, edit its entry. If the lesson file already exists, update it too or delete it and regenerate.
- To add a day, add it to `days` **and** extend the module's `start`/`end`. Days must stay sequential, 1-120.
- After any change: `node scripts/build-all.mjs`.

`node scripts/check.mjs` fails if a module's declared range does not match its entries, if a day is out of order, or if a lesson's front matter disagrees with the curriculum.

## Quality gate

Before you mark a lesson complete:

- [ ] Front matter matches `ops/curriculum.json`.
- [ ] All nine template headings exist, in order.
- [ ] Word count is in range for the level.
- [ ] Grammar: form table, 3+ examples, 2+ mistakes with reasons, one contrast.
- [ ] Two dialogues (informal and formal) with a "What changed?" table.
- [ ] Writing lab: model, reusable structure, checklist.
- [ ] Four exercises and an answer key with reasons.
- [ ] No placeholders, no broken links.
- [ ] `node scripts/build-all.mjs` passes.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `PLAN.md is out of date` | `node scripts/build-plan.mjs` |
| `Out of date: _sidebar.md, ...` | `node scripts/build-index.mjs` |
| Site shows raw Markdown or 404s on `_sidebar.md` | Add `.nojekyll` at the repository root (already present) |
| Sidebar does not show a new lesson | The lesson is still `status: draft`, or the index was not rebuilt |
| `check.mjs` reports a broken link | Fix the target or remove the link; do not disable the check |
| Docsify shows a cached page | Hard refresh (`Ctrl+F5`), or append `?v=2` to the URL |
| Push rejected | `git pull --rebase origin main`, then push |
| Agent wrote a weak lesson | Open the file, compare with `days/day-001.md`, and revise before committing |

## House rules

- British spelling in prose, American variants in brackets on first use.
- Never present one accent or variety as superior.
- No invented facts or sources. Use `SOURCES.md`.
- One lesson per commit. Keep commit messages in the `lesson(day-NNN): ...` form.
- Do not edit generated files by hand.
