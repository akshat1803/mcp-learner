# 04 · Attendance & Marks 🟡

Turn a boring CSV into something you can **ask questions** in plain English.

## 🆕 What you'll learn
- Loading tabular data (`students.csv`) once at startup
- Tools that answer questions by **filtering, sorting and aggregating**
- **Structured output**: `outputSchema` + `structuredContent` give programs typed JSON alongside the text
- **Prompts**: reusable templates (`weekly_report`) a teacher can run in one click

## 🔧 Tools
| Tool | Input | Answers |
|---|---|---|
| `get_student` | `query` (roll no or name) | One student's attendance + marks |
| `students_below_attendance` | `threshold?` (75), `branch?` | Who is short of attendance (structured JSON too) |
| `subject_stats` | `subject` (dsa/dbms/os/cn), `branch?` | Average, topper, lowest |
| `class_toppers` | `top?` (3) | Ranking by total marks |

## 💬 Prompt
| Prompt | Args | What it does |
|---|---|---|
| `weekly_report` | `branch` | Asks the AI to use the tools above and write a class report |

In Claude Desktop, prompts appear in the **"+" menu** of the chat box.

## ▶️ Run
```bash
npm run try -- attendance
npm run inspect:attendance   # look at the "Prompts" tab
```

## 💬 Ask Claude
- "Which CSE students are below 75% attendance?"
- "How did the class do in DBMS? Compare branches."
- "Who are the top 5 students?"

## 🏋️ Exercises
1. Add your own class to `students.csv` (keep the same columns).
2. Add a `failing_students` tool (any subject < 40).
3. Add an `outputSchema` to `subject_stats`.
4. 🧠 Add a write tool `mark_attendance(roll_no, present)`. What extra checks do you need before letting an AI change attendance?
