/**
 * LEVEL 3 · Server 05 — Weather (calling a real API)
 * ---------------------------------------------------
 * New concepts:
 *   • async/await + fetch() to call an external HTTP API
 *   • Chaining two API calls (city name -> coordinates -> weather)
 *   • Handling network failures and bad input gracefully
 *   • Timeouts so a slow API never hangs the AI
 *
 * API used: Open-Meteo (https://open-meteo.com) — free, no API key needed.
 *
 * Run it:     npm run weather
 * Inspect it: npm run inspect:weather
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "weather", version: "1.0.0" });

// WMO weather codes -> human words (a small subset)
const WEATHER_CODES: Record<number, string> = {
  0: "☀️ Clear sky", 1: "🌤️ Mainly clear", 2: "⛅ Partly cloudy", 3: "☁️ Overcast",
  45: "🌫️ Fog", 48: "🌫️ Rime fog", 51: "🌦️ Light drizzle", 53: "🌦️ Drizzle", 55: "🌧️ Heavy drizzle",
  61: "🌧️ Light rain", 63: "🌧️ Rain", 65: "🌧️ Heavy rain", 71: "🌨️ Light snow", 73: "🌨️ Snow",
  75: "❄️ Heavy snow", 80: "🌦️ Rain showers", 81: "🌧️ Heavy showers", 95: "⛈️ Thunderstorm",
};

// Helper: fetch JSON with a timeout. Every external call should have one!
async function fetchJson(url: string, timeoutMs = 10_000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

// Step 1: turn a city name into latitude/longitude
async function geocode(city: string) {
  const data = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  const place = data.results?.[0];
  if (!place) return null;
  return { name: place.name, country: place.country, lat: place.latitude, lon: place.longitude };
}

server.registerTool(
  "get_current_weather",
  {
    title: "Get current weather",
    description: "Get the current weather for a city by name, e.g. 'Jaipur' or 'Bengaluru'.",
    inputSchema: { city: z.string().min(2).describe("City name") },
    annotations: { readOnlyHint: true, openWorldHint: true }, // openWorld = talks to the internet
  },
  async ({ city }) => {
    try {
      const place = await geocode(city);
      if (!place) return { isError: true, content: [{ type: "text", text: `Could not find a city called "${city}".` }] };

      // Step 2: use the coordinates to get the weather
      const w = await fetchJson(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
      );
      const c = w.current;
      return {
        content: [
          {
            type: "text",
            text:
              `${place.name}, ${place.country}\n` +
              `${WEATHER_CODES[c.weather_code] ?? `Code ${c.weather_code}`}\n` +
              `🌡️ ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C)\n` +
              `💧 Humidity ${c.relative_humidity_2m}% · 💨 Wind ${c.wind_speed_10m} km/h`,
          },
        ],
      };
    } catch (err) {
      // Network errors, timeouts, etc. Never crash the server — report it.
      return { isError: true, content: [{ type: "text", text: `Weather service failed: ${(err as Error).message}` }] };
    }
  }
);

server.registerTool(
  "get_forecast",
  {
    title: "Get daily forecast",
    description: "Get a day-by-day forecast (max/min temperature and rain chance) for a city.",
    inputSchema: {
      city: z.string().min(2).describe("City name"),
      days: z.number().int().min(1).max(7).default(3).describe("Number of days (1-7)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ city, days }) => {
    try {
      const place = await geocode(city);
      if (!place) return { isError: true, content: [{ type: "text", text: `Could not find a city called "${city}".` }] };
      const w = await fetchJson(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
          `&forecast_days=${days}&timezone=auto`
      );
      const d = w.daily;
      const lines = d.time.map(
        (date: string, i: number) =>
          `${date}: ${WEATHER_CODES[d.weather_code[i]] ?? ""} ${d.temperature_2m_min[i]}–${d.temperature_2m_max[i]}°C, rain ${d.precipitation_probability_max[i]}%`
      );
      return { content: [{ type: "text", text: `${days}-day forecast for ${place.name}, ${place.country}\n${lines.join("\n")}` }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Weather service failed: ${(err as Error).message}` }] };
    }
  }
);

await server.connect(new StdioServerTransport());
console.error("✅ weather MCP server running on stdio");
