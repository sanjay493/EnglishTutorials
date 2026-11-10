# Automation: how the daily lesson gets written

**Short answer: you do not keep a terminal open.** The loop runs when a trigger fires. Pick one of the three options below.

| Option | Needs | Runs when | Best for |
| --- | --- | --- | --- |
| **A. On demand** | You, a terminal | You type the command | Full control, irregular schedule |
| **B. Windows Task Scheduler** | This PC switched on and you logged in | Every day at a set time | Your personal free-tier quota, no cloud secrets |
| **C. GitHub Actions** | A provider API key in repository secrets | Every day in the cloud | No PC needed, works while you sleep |

All three call the same agent (`lesson-writer`) and the same budget script, so the token rules do not change.

---

## A. On demand

```powershell
node scripts/budget.mjs      # how many lessons fit today
/next-lesson                 # inside OpenCode
# or, from any terminal:
.\scripts\daily.ps1
```

The terminal only needs to stay open while the run is happening (a few minutes). Close it afterwards.

---

## B. Windows Task Scheduler (recommended for a free-tier account)

This uses the OpenCode login already stored on this machine, so it consumes **your** daily free quota. No API key is copied anywhere.

### Register it

```powershell
.\scripts\register-daily-task.ps1 -Time "09:00"
```

That creates a task named **English120 Daily Lesson**. It runs `scripts\daily.ps1` with a hidden window.

### What the task does

1. Reads `ops/automation.json`.
2. Runs `scripts/budget.mjs` and works out how many lessons fit in what is left of today's allowance.
3. Calls `opencode run --agent lesson-writer`.
4. Runs `scripts/build-all.mjs` (rebuilds the plan, sidebar, progress and module pages, then validates).
5. Commits and pushes. The push triggers the normal Pages deploy.

### Configure it

`ops/automation.json`:

```json
{
  "enabled": true,
  "model": "opencode/deepseek-v4.1-flash-free",
  "maxLessonsPerRun": 0,
  "push": true
}
```

- `enabled: false` pauses everything without touching the task.
- `model` must be a `provider/model` id. Run `opencode models` if you change providers.
- `maxLessonsPerRun: 0` means "use the budget recommendation". Set `1` to be extra gentle on tokens.
- `push: false` keeps commits local, for reviewing before publishing.

### Check it

```powershell
Get-ScheduledTaskInfo -TaskName "English120 Daily Lesson"
Get-Content ops\automation.log -Tail 40
```

### Test it now, without waiting for the time

```powershell
Start-ScheduledTask -TaskName "English120 Daily Lesson"
```

Or dry-run the script directly (no model call, no commit):

```powershell
.\scripts\daily.ps1 -DryRun
```

### Limits you should know

- The PC must be **on** and you must be **logged in**. `-StartWhenAvailable` catches up a missed run when the machine next wakes.
- It does not run while the machine is asleep. Set the trigger to a time you are usually at the desk, or use option C.
- If you change your Windows password or sign out, the task still runs for your user, because it does not store a password.
- If the free quota is exhausted, the model call fails; the log records it and nothing is committed.

### Remove it

```powershell
Unregister-ScheduledTask -TaskName "English120 Daily Lesson" -Confirm:$false
```

---

## C. GitHub Actions (runs in the cloud)

`.github/workflows/daily-lesson.yml` writes lessons and deploys the site in one run.

### Setup

1. Create a provider API key (for example OpenRouter).
2. In the repository: **Settings → Secrets and variables → Actions → Secrets**, add `OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`).
3. Under **Variables**, add `OPENCODE_MODEL`, for example `openrouter/anthropic/claude-sonnet-4.5`.
4. Run **Actions → Daily lesson (optional) → Run workflow** once to test.
5. Uncomment the `schedule:` block in `.github/workflows/daily-lesson.yml`:
   ```yaml
   schedule:
     - cron: "30 3 * * *"
   ```
   That is **03:30 UTC** (09:00 in India). Cron uses UTC.

### Important details

- The quota is tied to the **API key**, not your desktop login. A free key has its own daily limit; set `ops/token-budget.json` to match.
- Pushes made with the workflow's `GITHUB_TOKEN` do **not** trigger other workflows (GitHub suppresses them to prevent loops). That is why this workflow deploys the site itself at the end instead of relying on `deploy-pages.yml`.
- The workflow validates before deploying. A failing check blocks publication.
- To pause it: disable the workflow in the Actions tab, or remove the schedule.

---

## How the budget protects you

`ops/token-budget.json`:

```json
{
  "dailyTokenLimit": 100000,
  "reserveTokens": 12000,
  "stopAtPercent": 80,
  "estimatedTokensPerLesson": 6000,
  "maxLessonsPerRun": 2
}
```

```text
usable    = dailyTokenLimit × stopAtPercent − reserveTokens
remaining = usable − tokens already logged today in ops/run-log.jsonl
lessons   = min(maxLessonsPerRun, floor(remaining ÷ estimatedTokensPerLesson))
```

If `lessons` is 0, the run stops without calling the model. The agent also checks the budget itself, so the two layers agree.

**Set `dailyTokenLimit` to about 80% of your provider's published free limit.** Limits change without notice; the reserve is there so a run never dies mid-lesson.

---

## What gets committed

- `days/day-NNN.md` - the lesson
- `ops/run-log.jsonl` - one appended line with date, lessons, estimated tokens
- `_sidebar.md`, `PLAN.md`, `PROGRESS.md`, `days/README.md`, `modules/*.md` - regenerated

`ops/automation.log` is local only and is not committed.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Task says "last run result: 0x1" | Script error | Read `ops/automation.log` |
| "No lesson fits in today's remaining budget" | Limit reached | Wait for the daily reset, or raise `dailyTokenLimit` if it is set too low |
| `opencode` not found | PATH differs in Task Scheduler | Re-register the task; it stores the full path |
| Model or provider error | Wrong `model` id or expired login | Run `opencode` once interactively, then check `opencode models` |
| Commit created but push failed | Credentials expired | Run `gh auth login`, then `Start-ScheduledTask` again |
| Cloud run fails at Configure Pages | Pages not enabled | Settings → Pages → Source: GitHub Actions |
