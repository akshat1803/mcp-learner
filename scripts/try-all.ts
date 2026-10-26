/**
 * try-all.ts — be the AI app yourself!
 * -------------------------------------
 * This script is an MCP CLIENT. It does exactly what Claude Desktop does:
 *   1. start each server as a child process (stdio)
 *   2. ask it "what tools do you have?"   (tools/list)
 *   3. call a few tools with arguments     (tools/call)
 *
 * Reading this file is the best way to understand the client side of MCP.
 *
 *   npm run try                 → run every server
 *   npm run try -- calculator   → run only one (calculator, fun, notes, ...)
 *   npm run try -- remote       → test the HTTP server (start `npm run remote` first)
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Call = { tool: string; args?: Record<string, unknown> };
type Demo = { name: string; folder: string; calls: Call[]; resources?: string[]; prompts?: { name: string; args: Record<string, string> }[] };

// Use a temp folder for data so trying things never touches your real notes/progress.
const tmp = mkdtempSync(join(tmpdir(), "mcp-learner-"));

const demos: Demo[] = [
  {
    name: "calculator",
    folder: "01-calculator",
    calls: [
      { tool: "add", args: { a: 2, b: 3 } },
      { tool: "divide", args: { a: 10, b: 0 } }, // shows an error result
      { tool: "convert_units", args: { value: 37, conversion: "celsius_to_fahrenheit" } },
    ],
  },
  {
    name: "fun",
    folder: "02-fun",
    calls: [
      { tool: "roll_dice", args: { count: 2 } },
      { tool: "pick_random_student", args: { names: ["Aarav", "Diya", "Rohan", "Priya"], howMany: 2 } },
    ],
  },
  {
    name: "notes",
    folder: "03-notes",
    calls: [
      { tool: "add_note", args: { title: "DSA tip", body: "Sliding window for substring problems", tags: ["dsa"] } },
      { tool: "add_note", args: { title: "DBMS", body: "Normalize to 3NF", tags: ["exam"] } },
      { tool: "search_notes", args: { query: "window" } },
      { tool: "delete_note", args: { id: 99 } }, // not found → error
    ],
    resources: ["notes://all"],
  },
  {
    name: "attendance",
    folder: "04-attendance",
    calls: [
      { tool: "students_below_attendance", args: {} },
      { tool: "subject_stats", args: { subject: "dsa", branch: "CSE" } },
      { tool: "class_toppers", args: { top: 3 } },
    ],
    prompts: [{ name: "weekly_report", args: { branch: "CSE" } }],
  },
  { name: "weather", folder: "05-weather", calls: [{ tool: "get_current_weather", args: { city: "Jaipur" } }] },
  { name: "github", folder: "06-github-profile", calls: [{ tool: "analyze_profile", args: { username: "octocat" } }] },
  {
    name: "placement",
    folder: "07-placement-prep",
    calls: [
      { tool: "get_random_question", args: { topic: "arrays", difficulty: "easy" } },
      { tool: "mark_solved", args: { id: 1, notes: "hash map, O(n)" } },
      { tool: "my_progress" },
    ],
    resources: ["question://1"],
  },
];

const textOf = (content: unknown) =>
  (content as { type: string; text?: string }[]).map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n");
const indent = (s: string) => s.split("\n").map((l) => "    " + l).join("\n");

async function exercise(client: Client, demo: Pick<Demo, "calls" | "resources" | "prompts">) {
  const { tools } = await client.listTools();
  console.log(`  🔧 tools: ${tools.map((t) => t.name).join(", ")}`);

  for (const call of demo.calls) {
    const result = await client.callTool({ name: call.tool, arguments: call.args ?? {} });
    console.log(`\n  ▶ ${call.tool}(${JSON.stringify(call.args ?? {})})${result.isError ? "  ❌ isError" : ""}`);
    console.log(indent(textOf(result.content)));
  }
  for (const uri of demo.resources ?? []) {
    const r = await client.readResource({ uri });
    console.log(`\n  📄 resource ${uri}`);
    console.log(indent(String((r.contents[0] as { text?: string }).text).slice(0, 300)));
  }
  for (const p of demo.prompts ?? []) {
    const r = await client.getPrompt({ name: p.name, arguments: p.args });
    console.log(`\n  💬 prompt ${p.name} →`);
    console.log(indent(textOf(r.messages.map((m) => m.content))));
  }
}

async function runStdio(demo: Demo) {
  console.log(`\n━━━━━━━━ ${demo.name} (servers/${demo.folder}) ━━━━━━━━`);
  // 1. Start the server as a child process, exactly like Claude Desktop would.
  const transport = new StdioClientTransport({
    command: process.execPath, // node
    args: ["--import", "tsx", join("servers", demo.folder, "index.ts")],
    env: {
      ...(process.env as Record<string, string>),
      NOTES_FILE: join(tmp, "notes.json"),
      PROGRESS_FILE: join(tmp, "progress.json"),
    },
    stderr: "ignore",
  });
  const client = new Client({ name: "mcp-learner-try", version: "1.0.0" });
  await client.connect(transport); // 2. handshake (initialize)
  try {
    await exercise(client, demo); // 3. list + call
  } finally {
    await client.close();
  }
}

async function runRemote() {
  const url = process.env.MCP_URL ?? "http://localhost:3000/mcp";
  console.log(`\n━━━━━━━━ remote (${url}) ━━━━━━━━`);
  const headers: Record<string, string> = process.env.MCP_API_KEY ? { Authorization: `Bearer ${process.env.MCP_API_KEY}` } : {};
  const client = new Client({ name: "mcp-learner-try", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));
  try {
    await exercise(client, {
      calls: [
        { tool: "cgpa_to_percentage", args: { cgpa: 8.4 } },
        { tool: "attendance_planner", args: { attended: 30, held: 45 } },
        { tool: "attendance_planner", args: { attended: 42, held: 50 } },
      ],
    });
  } finally {
    await client.close();
  }
}

const only = process.argv[2];
let failed = 0;
if (only === "remote") {
  await runRemote();
} else {
  const selected = only ? demos.filter((d) => d.name === only) : demos;
  if (selected.length === 0) {
    console.error(`Unknown server "${only}". Choose one of: ${demos.map((d) => d.name).join(", ")}, remote`);
    process.exit(1);
  }
  for (const demo of selected) {
    try {
      await runStdio(demo);
    } catch (err) {
      failed++;
      console.log(`  💥 ${demo.name} failed: ${(err as Error).message}`);
    }
  }
}
console.log(failed ? `\n${failed} server(s) failed.` : "\n✅ Done.");
process.exit(failed ? 1 : 0);
