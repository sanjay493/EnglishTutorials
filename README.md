# English 120: Zero to Confident

A free, open, 120-day English course: **grammar from A1 to C2**, plus speaking, writing, business English, and the differences between British, American, Indian, and other world Englishes.

No sign-up. No app. Just one lesson a day, 45-60 minutes, in plain Markdown.

**[Start with Day 1 →](days/day-001.md)** · [See the plan](PLAN.md) · [Check progress](PROGRESS.md) · [Read the style guide](STYLE-GUIDE.md)

---

## What this course is

Most courses teach grammar in one book and speaking in another. This one puts them in the **same daily lesson**, so every rule you meet is used out loud and on paper the same day.

Each lesson has five parts:

| Part | Time | What happens |
| --- | --- | --- |
| **Warm-up** | 5 min | Bridge from yesterday, plus 8-16 new words |
| **Grammar** | 15 min | One rule, a form table, real examples, common mistakes, one contrast |
| **Speaking lab** | 15 min | An informal **and** a formal dialogue, pronunciation notes, a role-play |
| **Writing lab** | 15 min | A model text, a reusable structure, an editing checklist |
| **Practice** | 10 min | Four exercises and a full answer key with reasons |

Every 15th day is an **assessment day** with a longer task, a rubric, and a review list.

## The 120 days at a glance

| Module | Level | Days | Focus |
| --- | --- | --- | --- |
| [1. Foundations](modules/01-foundations.md) | A1 | 1-15 | First sentences, introductions, everyday basics |
| [2. Elementary](modules/02-elementary.md) | A2 | 16-30 | Past and future, travel, transactions, short texts |
| [3. Intermediate](modules/03-intermediate.md) | B1 | 31-45 | Stories, opinions, processes, advice, essays |
| [4. Upper-Intermediate I](modules/04-upper-intermediate-one.md) | B2 | 46-60 | Hypotheticals, formal tone, reports, interviews |
| [5. Upper-Intermediate II](modules/05-upper-intermediate-two.md) | B2+ | 61-75 | Naturalness, cohesion, pronunciation, self-editing |
| [6. Advanced](modules/06-advanced.md) | C1 | 76-90 | Nuance, rhetoric, precision, debate, editing |
| [7. Professional & Business](modules/07-professional.md) | B2-C1 | 91-105 | Meetings, negotiation, presentations, business writing |
| [8. World Englishes & Trends](modules/08-world-englishes.md) | C1-C2 | 106-120 | British vs American vs global English, jargon, slang, AI-era writing, final exam |

The full day-by-day syllabus is in **[PLAN.md](PLAN.md)**.

## Why the course looks like this

- **Frequency first.** The structures you need most come first, and rare structures wait until you can use them well.
- **Contrast, not isolation.** Present perfect arrives on Day 27 and is contrasted with past simple on Day 31. That gap is deliberate.
- **Register is a skill.** Almost every speaking lab gives you the same conversation twice: once casual, once formal. You learn *when* to say it, not just *how*.
- **Varieties are equal.** British spelling is the house default, American forms appear in brackets, and Indian, Australian, Nigerian, and Singaporean English get their own module. No variety is treated as a mistake.
- **Writing is a craft.** Models, structures, and checklists, from a two-line chat message to a 400-word report.

## Start here

1. Read **[START-HERE.md](START-HERE.md)** for the study routine and a 10-minute placement check.
2. Open **[Day 1](days/day-001.md)** and do it today, not tomorrow.
3. Keep a notebook for exercises and a folder for writing tasks.
4. Come back to **[PROGRESS.md](PROGRESS.md)** to see what is written and what is next.

If you are not a beginner, the placement check in START-HERE tells you which module to enter. Do not skip the assessment day of the module before it.

## How the lessons are produced

This repository is designed to grow daily without turning into a mess:

| Tool | Purpose |
| --- | --- |
| `ops/curriculum.json` | Single source of truth for all 120 days |
| `TUTORIAL-TEMPLATE.md` | The structure every lesson must follow |
| `STYLE-GUIDE.md` | House style: voice, level calibration, register, accuracy |
| `SOURCES.md` | The references behind the syllabus |
| `scripts/` | Build the plan, sidebar, index, and budget report; validate everything |
| `.opencode/agents/lesson-writer.md` | The agent that writes the next lessons within a token budget |
| `ops/token-budget.json` | Your daily free-tier limit and per-lesson estimate |
| `ops/run-log.jsonl` | What was written, when, and at what estimated cost |

```powershell
# see what fits in today's budget
node scripts/budget.mjs

# scaffold the next lesson
node scripts/new-day.mjs next

# rebuild PLAN.md, the sidebar, PROGRESS.md and module pages, then validate
node scripts/build-all.mjs
```

Then either write the lesson yourself or ask OpenCode:

```text
/next-lesson
```

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full workflow.

## Project structure

```text
EnglishTutorials/
├── index.html              # Docsify site (GitHub Pages)
├── _sidebar.md             # generated navigation
├── README.md               # site home + repo readme
├── START-HERE.md           # how to study, placement check
├── PLAN.md                 # generated 120-day syllabus
├── PROGRESS.md             # generated dashboard
├── STYLE-GUIDE.md          # house style
├── SOURCES.md              # references
├── TUTORIAL-TEMPLATE.md    # lesson skeleton
├── CONTRIBUTING.md         # maintenance workflow
├── days/                   # the lessons
├── modules/                # generated module overview pages
├── ops/                    # curriculum, budget, run log
├── scripts/                # Node build and validation scripts
└── .opencode/              # agent + slash command for daily writing
```

## Licence

Content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) - use it, remix it, teach with it; credit the source.
Code and scripts: MIT.

---

*Built to be read on a phone, printed for a classroom, or forked into your own course.*
