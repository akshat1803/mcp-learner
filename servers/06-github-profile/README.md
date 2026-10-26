# 06 · GitHub Profile Analyzer 🟠

Every student wants to know: *"Does my GitHub look good to recruiters?"*

## 🆕 What you'll learn
- **Secrets in environment variables** (`GITHUB_TOKEN`), never in code
- Request **headers** (`User-Agent`, `Authorization`)
- **Rate limits** — reading `x-ratelimit-reset` and telling the user when to retry
- **Insight over data dump**: `analyze_profile` turns 100 repos into 5 useful lines

## 🔧 Tools
| Tool | Input | Returns |
|---|---|---|
| `get_profile` | `username` | Name, bio, followers, repos, join date |
| `get_repos` | `username`, `sortBy?`, `limit?` | Own (non-fork) repos |
| `analyze_profile` | `username` | Top languages, recent activity, stars, repos missing descriptions |

## 🔑 Optional: add a token (60 → 5000 requests/hour)
1. GitHub → Settings → Developer settings → **Personal access tokens → Fine-grained** → Generate (no extra permissions needed for public data).
2. Run with it:
   ```bash
   GITHUB_TOKEN=github_pat_xxx npm run try -- github         # Mac/Linux
   set GITHUB_TOKEN=github_pat_xxx && npm run try -- github  # Windows cmd
   ```
3. In Claude Desktop add it under `"env"` (see `claude_desktop_config.example.json`).

⚠️ Never commit a token. `.env` is already in `.gitignore`.

## ▶️ Run
```bash
npm run try -- github
npm run inspect:github
```

## 💬 Ask Claude
- "Analyze the GitHub profile of akshat1803 like a placement recruiter."
- "What are my 5 most starred repos? My username is ___"
- "Which of my repos need a better description? Suggest one for each."

## 🏋️ Exercises
1. Add `get_readme(username, repo)` (API: `/repos/{owner}/{repo}/readme`, content is base64).
2. Add `compare_profiles(userA, userB)`.
3. 🧠 `analyze_profile` only looks at the first 100 repos. How would you handle pagination?
