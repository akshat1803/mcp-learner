# 07 · Placement Prep Assistant 🔴 (Capstone)

A personal DSA/SQL coach. This server uses **every concept** from 01–06, so read it end to end.

## 🧩 How the pieces fit
| Concept | Used for |
|---|---|
| Read tools | `list_topics`, `get_random_question`, `get_hint`, `my_progress` |
| Write tool + state | `mark_solved` → `progress.json` |
| Enums from data | `topic` choices are built from `questions.json` automatically |
| Resource template | `question://{id}` — every question is browsable |
| Static resource | `progress://me` — raw progress JSON |
| Prompt | `mock_interview` — one click starts a full interview session |
| Description as instructions | `get_hint` says *"only when the student asks"* — the AI respects it |

## 🔧 Tools
| Tool | Input |
|---|---|
| `list_topics` | – |
| `get_random_question` | `topic?`, `difficulty?` |
| `get_hint` | `id` |
| `mark_solved` | `id`, `notes?` |
| `my_progress` | – |

Topics: arrays, strings, linked-list, stack-queue, trees, graphs, dp, sql (24 questions).

## ▶️ Run
```bash
npm run try -- placement
npm run inspect:placement
```
Progress is stored in `servers/07-placement-prep/progress.json` (set `PROGRESS_FILE` to change it).

## 💬 Ask Claude
- "Give me a medium DP question. Don't give hints unless I ask."
- "I solved it using a hash map in O(n), mark it done."
- "How am I doing? What should I focus on?"
- Use the **mock_interview** prompt with topic `trees` 🎤

## 🏋️ Exercises
1. Add 10 questions to `questions.json` (new topic: `heap`).
2. Add a `daily_challenge` tool that returns the same question for everyone on the same date (hint: seed with today's date).
3. Add `reset_progress` — mark it `destructiveHint: true`.
4. 🧠 Add a `companies` field (e.g. `["TCS", "Amazon"]`) and a filter. How does Claude use it when you say "I have an Amazon interview"?
