# 05 · Weather 🟠

Your first server that talks to the **internet**. Uses [Open-Meteo](https://open-meteo.com) — free, no API key.

## 🆕 What you'll learn
- `fetch()` + `async/await`
- **Chaining API calls**: city name → coordinates (geocoding) → weather
- **Timeouts** with `AbortSignal.timeout()` so a slow API never freezes the AI
- Catching network errors and returning them as `isError` results
- `openWorldHint: true` → tells apps this tool reaches the outside world

## 🔧 Tools
| Tool | Input | Returns |
|---|---|---|
| `get_current_weather` | `city` | Temperature, feels-like, humidity, wind |
| `get_forecast` | `city`, `days?` (3, max 7) | Daily min/max and rain chance |

## ▶️ Run
```bash
npm run try -- weather
npm run inspect:weather
```

## 💬 Ask Claude
- "What's the weather in Jaipur right now?"
- "Should I carry an umbrella in Mumbai tomorrow?"
- "Compare the weather in Delhi and Bengaluru." (watch Claude call the tool twice!)

## 🏋️ Exercises
1. Add `get_air_quality` using the Open-Meteo Air Quality API.
2. Add a `units` option (`celsius` / `fahrenheit`).
3. Cache geocoding results in a `Map` so the same city isn't looked up twice.
4. 🧠 Turn off Wi-Fi and call a tool. Is the error message helpful to the AI? Improve it.
