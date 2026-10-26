# 03 · Notes 🟡

A full **CRUD** app — like your college project — but the "frontend" is an AI.

## 🆕 What you'll learn
- **State**: data saved to `notes.json` survives between tool calls and restarts
- **Read vs Write vs Destructive** tools, marked with `annotations`:
  - `readOnlyHint: true` → safe, only reads
  - `destructiveHint: true` → deletes/changes things; apps may ask the user first
- **Resources**: `notes://all` is data the app can *open*, not a function it *calls*

## 🔧 Tools
| Tool | Type | Input |
|---|---|---|
| `add_note` | ✏️ write | `title`, `body`, `tags?` |
| `list_notes` | 👀 read | `tag?` |
| `search_notes` | 👀 read | `query` |
| `update_note` | ✏️ write | `id`, `title?`, `body?`, `tags?` |
| `delete_note` | 🗑️ destructive | `id` |

## 📄 Resource
| URI | Content |
|---|---|
| `notes://all` | All notes as JSON |

**Tool vs Resource?** A tool is a *verb* the AI decides to run ("search notes"). A resource is a *noun* the user/app attaches as context ("here are all my notes").

## ▶️ Run
```bash
npm run try -- notes
npm run inspect:notes        # check the "Resources" tab too!
```
Data is stored in `servers/03-notes/notes.json` (set `NOTES_FILE` to change it).

## 💬 Ask Claude
- "Save a note titled 'OS' saying 'deadlock needs 4 conditions', tag it exam."
- "What notes do I have tagged exam?"
- "Delete note 2." (notice Claude may confirm first)

## 🏋️ Exercises
1. Add a `pinned` boolean and a `list_pinned_notes` tool.
2. Add `export_notes_markdown` that returns all notes as a Markdown string.
3. Add a resource template `note://{id}` (hint: see `07-placement-prep`).
4. 🧠 Replace the JSON file with SQLite. Which tool handlers had to change? Which didn't?
