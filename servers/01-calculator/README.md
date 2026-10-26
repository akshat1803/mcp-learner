# 01 · Calculator 🟢

Your first MCP server. The maths is boring **on purpose** so you can focus on how MCP works.

## 🆕 What you'll learn
- The 3 steps of every server: **create → register tools → connect transport**
- Describing inputs with **zod** (`z.number()`, `z.enum([...])`)
- Returning an **error result** (`isError: true`) instead of crashing
- Why `console.log` is forbidden in stdio servers

## 🔧 Tools
| Tool | Input | Example result |
|---|---|---|
| `add` | `a`, `b` | `2 + 3 = 5` |
| `multiply` | `a`, `b` | `4 × 5 = 20` |
| `divide` | `a`, `b` | `10 ÷ 0` → ❌ error message |
| `convert_units` | `value`, `conversion` | `37 → 98.60 (celsius_to_fahrenheit)` |

## ▶️ Run
```bash
npm run try -- calculator        # quick test
npm run inspect:calculator       # click around in the Inspector
```

## 💬 Ask Claude
- "What's 1234 × 5678?"
- "Convert 42 km to miles."
- "Divide 10 by 0." → watch how Claude explains the error

## 🏋️ Exercises
1. Add a `subtract` tool.
2. Add a `power` tool (`base`, `exponent`). Limit `exponent` to 0–20 using zod `.min()` / `.max()`.
3. Add `inr_to_usd` to `convert_units` with a fixed rate.
4. 🧠 Change the description of `add` to just `"math"`. Does Claude still pick the right tool? What does this teach you?
