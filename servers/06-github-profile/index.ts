/**
 * LEVEL 3 · Server 06 — GitHub Profile Analyzer
 * ----------------------------------------------
 * New concepts:
 *   • Environment variables for secrets (GITHUB_TOKEN) — never hard-code keys!
 *   • Request headers (User-Agent, Authorization)
 *   • Rate limits: what happens when an API says "slow down"
 *   • Turning raw API data into an INSIGHT, not a data dump
 *
 * Works without a token (60 requests/hour). Set GITHUB_TOKEN for 5000/hour.
 *
 * Run it:     npm run github
 * Inspect it: npm run inspect:github
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const TOKEN = process.env.GITHUB_TOKEN; // read secret from env, not from code

async function gh(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      "User-Agent": "mcp-learner",
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) throw new Error("User not found");
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const when = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : "later";
    throw new Error(`GitHub rate limit hit. Try again ${when === "later" ? "later" : `after ${when}`}, or set GITHUB_TOKEN.`);
  }
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res.json();
}

type Repo = {
  name: string; description: string | null; language: string | null; stargazers_count: number;
  forks_count: number; fork: boolean; pushed_at: string; html_url: string;
};

const fail = (err: unknown) => ({ isError: true, content: [{ type: "text" as const, text: (err as Error).message }] });

const server = new McpServer({ name: "github-profile", version: "1.0.0" });

server.registerTool(
  "get_profile",
  {
    title: "Get GitHub profile",
    description: "Get a GitHub user's public profile: name, bio, followers, public repo count, join date.",
    inputSchema: { username: z.string().describe("GitHub username, e.g. 'torvalds'") },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ username }) => {
    try {
      const u = await gh(`/users/${encodeURIComponent(username)}`);
      return {
        content: [
          {
            type: "text",
            text:
              `👤 ${u.name ?? u.login} (@${u.login})\n${u.bio ?? "No bio"}\n` +
              `📦 ${u.public_repos} public repos · 👥 ${u.followers} followers · following ${u.following}\n` +
              `📅 Joined ${u.created_at.slice(0, 10)}${u.location ? ` · 📍 ${u.location}` : ""}\n${u.html_url}`,
          },
        ],
      };
    } catch (e) { return fail(e); }
  }
);

server.registerTool(
  "get_repos",
  {
    title: "List repositories",
    description: "List a user's own (non-fork) public repositories, sorted by stars or by last update.",
    inputSchema: {
      username: z.string(),
      sortBy: z.enum(["stars", "updated"]).default("updated"),
      limit: z.number().int().min(1).max(30).default(10),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ username, sortBy, limit }) => {
    try {
      const repos: Repo[] = (await gh(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`)).filter(
        (r: Repo) => !r.fork
      );
      if (sortBy === "stars") repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
      const lines = repos
        .slice(0, limit)
        .map((r) => `• ${r.name} — ⭐${r.stargazers_count} · ${r.language ?? "?"} · updated ${r.pushed_at.slice(0, 10)}${r.description ? `\n  ${r.description}` : ""}`);
      return { content: [{ type: "text", text: lines.length ? lines.join("\n") : "No public repositories." }] };
    } catch (e) { return fail(e); }
  }
);

// An "insight" tool: does the analysis so the AI gets a summary, not 100 raw repos.
server.registerTool(
  "analyze_profile",
  {
    title: "Analyze profile for placements",
    description:
      "Analyze a GitHub profile like a recruiter would: top languages, activity, stars, and missing descriptions. Use when a student asks how their GitHub looks.",
    inputSchema: { username: z.string() },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ username }) => {
    try {
      const repos: Repo[] = (await gh(`/users/${encodeURIComponent(username)}/repos?per_page=100`)).filter((r: Repo) => !r.fork);
      if (repos.length === 0) return { content: [{ type: "text", text: `@${username} has no original public repos yet.` }] };

      const langCount: Record<string, number> = {};
      for (const r of repos) if (r.language) langCount[r.language] = (langCount[r.language] ?? 0) + 1;
      const topLangs = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const active = repos.filter((r) => new Date(r.pushed_at).getTime() > ninetyDaysAgo).length;
      const stars = repos.reduce((s, r) => s + r.stargazers_count, 0);
      const noDesc = repos.filter((r) => !r.description).map((r) => r.name);

      return {
        content: [
          {
            type: "text",
            text: [
              `🔍 Analysis of @${username} (${repos.length} original repos)`,
              `Top languages: ${topLangs.map(([l, c]) => `${l} (${c})`).join(", ") || "none detected"}`,
              `Active in last 90 days: ${active} repo(s)`,
              `Total stars: ${stars}`,
              noDesc.length
                ? `Missing descriptions (${noDesc.length}): ${noDesc.slice(0, 8).join(", ")}${noDesc.length > 8 ? ", …" : ""}`
                : "All repos have descriptions 👍",
            ].join("\n"),
          },
        ],
      };
    } catch (e) { return fail(e); }
  }
);

await server.connect(new StdioServerTransport());
console.error(`✅ github-profile MCP server running on stdio (${TOKEN ? "authenticated" : "anonymous, 60 req/hr"})`);
