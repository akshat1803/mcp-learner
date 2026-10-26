# 02 · Fun Tools 🟢

Quick, playful tools — perfect for the first class demo.

## 🆕 What you'll learn
- **Optional arguments** with defaults: `z.number().default(6)`
- **Tools with no arguments** (just leave out `inputSchema`)
- **Arrays** as input: `z.array(z.string())`
- Returning **multiple content blocks**

## 🔧 Tools
| Tool | Input | What it does |
|---|---|---|
| `roll_dice` | `sides?` (6), `count?` (1) | 🎲 Rolls dice |
| `get_joke` | – | 😂 Random programming joke |
| `pick_random_student` | `names[]`, `howMany?` (1) | 🎯 Picks who answers next |
| `flip_coin` | – | 🪙 Heads or tails |

## ▶️ Run
```bash
npm run try -- fun
npm run inspect:fun
```

## 💬 Ask Claude
- "Roll two 20-sided dice."
- "Tell me a programming joke."
- "Pick 3 students from: Aarav, Diya, Rohan, Priya, Kabir."

## 🏋️ Exercises
1. Add a `random_password` tool (`length`, `includeSymbols?`).
2. Add `magic_8_ball` that answers a yes/no `question`.
3. Make `pick_random_student` return the remaining students too.
4. 🧠 Ask Claude *"pick someone"* without giving names. What happens? How could a better description help?
