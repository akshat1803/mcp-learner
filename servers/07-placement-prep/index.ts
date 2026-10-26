/**
 * LEVEL 4 · Server 07 — Placement Prep Assistant (capstone)
 * ----------------------------------------------------------
 * Puts everything together:
 *   • Tools      (read + write)        → get questions, mark solved, track progress
 *   • Resources  (static + template)   → question://{id}, progress://me
 *   • Prompts                          → "mock_interview" one-click session
 *   • State                            → progress.json
 *
 * Run it:     npm run placement
 * Inspect it: npm run inspect:placement
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

type Question = { id: number; topic: string; difficulty: "easy" | "medium" | "hard"; title: string; problem: string; hint: string };
type Progress = { solved: { id: number; solvedAt: string; notes?: string }[] };

const QUESTIONS: Question[] = JSON.parse(readFileSync(join(import.meta.dirname, "questions.json"), "utf-8"));
const PROGRESS_FILE = process.env.PROGRESS_FILE ?? join(import.meta.dirname, "progress.json");
const TOPICS = [...new Set(QUESTIONS.map((q) => q.topic))];

const loadProgress = (): Progress =>
  existsSync(PROGRESS_FILE) ? JSON.parse(readFileSync(PROGRESS_FILE, "utf-8")) : { solved: [] };
const saveProgress = (p: Progress) => writeFile(PROGRESS_FILE, JSON.stringify(p, null, 2));
const isSolved = (id: number) => loadProgress().solved.some((s) => s.id === id);

// The hint is NOT included here on purpose — the student must ask for it.
const show = (q: Question) =>
  `#${q.id} [${q.topic} · ${q.difficulty}] ${q.title}${isSolved(q.id) ? " ✅" : ""}\n${q.problem}`;

const server = new McpServer({ name: "placement-prep", version: "1.0.0" });

// ===================== TOOLS =====================
server.registerTool(
  "list_topics",
  {
    title: "List topics",
    description: "List all DSA/SQL topics in the question bank with how many questions each has.",
    annotations: { readOnlyHint: true },
  },
  async () => ({
    content: [
      {
        type: "text",
        text: TOPICS.map((t) => {
          const qs = QUESTIONS.filter((q) => q.topic === t);
          const done = qs.filter((q) => isSolved(q.id)).length;
          return `• ${t}: ${qs.length} questions (${done} solved)`;
        }).join("\n"),
      },
    ],
  })
);

server.registerTool(
  "get_random_question",
  {
    title: "Get a practice question",
    description:
      "Pick a random UNSOLVED practice question, optionally by topic and difficulty. Do not reveal the hint unless the student asks.",
    inputSchema: {
      topic: z.enum(TOPICS as [string, ...string[]]).optional().describe("Topic to practise"),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ topic, difficulty }) => {
    const pool = QUESTIONS.filter(
      (q) => (!topic || q.topic === topic) && (!difficulty || q.difficulty === difficulty) && !isSolved(q.id)
    );
    if (pool.length === 0) {
      return { content: [{ type: "text", text: "🎉 No unsolved questions match. Try another topic or difficulty!" }] };
    }
    const q = pool[Math.floor(Math.random() * pool.length)];
    return { content: [{ type: "text", text: show(q) }] };
  }
);

server.registerTool(
  "get_hint",
  {
    title: "Get a hint",
    description: "Reveal the hint for a question id. Only call this when the student explicitly asks for a hint.",
    inputSchema: { id: z.number().int() },
    annotations: { readOnlyHint: true },
  },
  async ({ id }) => {
    const q = QUESTIONS.find((x) => x.id === id);
    if (!q) return { isError: true, content: [{ type: "text", text: `No question #${id}.` }] };
    return { content: [{ type: "text", text: `💡 Hint for #${id}: ${q.hint}` }] };
  }
);

server.registerTool(
  "mark_solved",
  {
    title: "Mark question solved",
    description: "Record that the student solved a question, with optional notes on their approach.",
    inputSchema: {
      id: z.number().int(),
      notes: z.string().optional().describe("e.g. 'used two pointers, O(n)'"),
    },
  },
  async ({ id, notes }) => {
    const q = QUESTIONS.find((x) => x.id === id);
    if (!q) return { isError: true, content: [{ type: "text", text: `No question #${id}.` }] };
    const p = loadProgress();
    if (p.solved.some((s) => s.id === id)) return { content: [{ type: "text", text: `#${id} was already solved 👍` }] };
    p.solved.push({ id, solvedAt: new Date().toISOString(), notes });
    await saveProgress(p);
    return { content: [{ type: "text", text: `✅ Marked #${id} "${q.title}" as solved. Total solved: ${p.solved.length}/${QUESTIONS.length}` }] };
  }
);

server.registerTool(
  "my_progress",
  {
    title: "My progress",
    description: "Show overall progress: solved count by difficulty and topic, and the weakest topic to focus on next.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    const solvedIds = new Set(loadProgress().solved.map((s) => s.id));
    const byDiff = (["easy", "medium", "hard"] as const).map((d) => {
      const all = QUESTIONS.filter((q) => q.difficulty === d);
      return `${d}: ${all.filter((q) => solvedIds.has(q.id)).length}/${all.length}`;
    });
    const topicRates = TOPICS.map((t) => {
      const all = QUESTIONS.filter((q) => q.topic === t);
      return { t, rate: all.filter((q) => solvedIds.has(q.id)).length / all.length };
    }).sort((a, b) => a.rate - b.rate);
    const bar = (r: number) => "█".repeat(Math.round(r * 10)).padEnd(10, "░");
    return {
      content: [
        {
          type: "text",
          text:
            `📈 Solved ${solvedIds.size}/${QUESTIONS.length}\n${byDiff.join(" · ")}\n\n` +
            topicRates.map(({ t, rate }) => `${bar(rate)} ${t} ${Math.round(rate * 100)}%`).join("\n") +
            `\n\n👉 Focus next on: ${topicRates[0].t}`,
        },
      ],
    };
  }
);

// ===================== RESOURCES =====================
// A resource TEMPLATE has a variable in its URI: question://1, question://2, ...
server.registerResource(
  "question",
  new ResourceTemplate("question://{id}", {
    list: async () => ({
      resources: QUESTIONS.map((q) => ({ uri: `question://${q.id}`, name: `#${q.id} ${q.title}`, mimeType: "text/plain" })),
    }),
  }),
  { title: "Practice question", description: "A single question from the bank (without the hint)" },
  async (uri, { id }) => {
    const q = QUESTIONS.find((x) => x.id === Number(id));
    return { contents: [{ uri: uri.href, mimeType: "text/plain", text: q ? show(q) : `No question #${id}` }] };
  }
);

server.registerResource(
  "progress",
  "progress://me",
  { title: "My progress (raw)", description: "Raw progress.json", mimeType: "application/json" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(loadProgress(), null, 2) }] })
);

// ===================== PROMPTS =====================
server.registerPrompt(
  "mock_interview",
  {
    title: "Mock interview",
    description: "Start a 3-question mock technical interview on a topic.",
    argsSchema: { topic: z.string().describe(`One of: ${TOPICS.join(", ")}`) },
  },
  ({ topic }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text:
            `Act as a friendly technical interviewer for a campus placement. Run a mock interview on "${topic}". ` +
            `Use get_random_question to pick questions one at a time (easy, then medium, then medium/hard). ` +
            `For each: ask me to explain my approach and time complexity BEFORE coding. Only use get_hint if I ask. ` +
            `When I solve one, call mark_solved with a one-line note on my approach. At the end, give honest feedback and call my_progress.`,
        },
      },
    ],
  })
);

await server.connect(new StdioServerTransport());
console.error(`✅ placement-prep MCP server running on stdio (${QUESTIONS.length} questions)`);
