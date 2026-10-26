/**
 * LEVEL 2 · Server 04 — Attendance & Marks
 * -----------------------------------------
 * New concepts:
 *   • Loading real tabular data (CSV) once at startup
 *   • Tools that ANSWER QUESTIONS by filtering / aggregating data
 *   • Returning structured data (structuredContent + outputSchema)
 *   • Prompts: reusable message templates the user can pick in the client
 *
 * Run it:     npm run attendance
 * Inspect it: npm run inspect:attendance
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SUBJECTS = ["dsa", "dbms", "os", "cn"] as const;
type Subject = (typeof SUBJECTS)[number];
type Student = {
  roll_no: string;
  name: string;
  branch: string;
  attended: number;
  total: number;
  marks: Record<Subject, number>;
};

// ---- Load the CSV once when the server starts ----
// (Tiny hand-written parser so you can see exactly what happens. In real
//  projects use a library like `csv-parse`, or a database.)
function loadStudents(): Student[] {
  const csv = readFileSync(join(import.meta.dirname, "students.csv"), "utf-8").trim();
  const [header, ...rows] = csv.split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((line) => {
    const v = Object.fromEntries(line.split(",").map((val, i) => [cols[i], val]));
    return {
      roll_no: v.roll_no,
      name: v.name,
      branch: v.branch,
      attended: Number(v.attended),
      total: Number(v.total),
      marks: Object.fromEntries(SUBJECTS.map((s) => [s, Number(v[s])])) as Record<Subject, number>,
    };
  });
}
const students = loadStudents();
const pct = (s: Student) => Math.round((s.attended / s.total) * 1000) / 10;

const server = new McpServer({ name: "attendance", version: "1.0.0" });

server.registerTool(
  "get_student",
  {
    title: "Get student details",
    description: "Get attendance and marks for one student by roll number or (part of) their name.",
    inputSchema: { query: z.string().describe("Roll number like 21CS001, or a name like 'Priya'") },
    annotations: { readOnlyHint: true },
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const s = students.find((st) => st.roll_no.toLowerCase() === q || st.name.toLowerCase().includes(q));
    if (!s) return { isError: true, content: [{ type: "text", text: `No student matches "${query}".` }] };
    const marks = SUBJECTS.map((sub) => `${sub.toUpperCase()}: ${s.marks[sub]}`).join(", ");
    return {
      content: [
        { type: "text", text: `${s.name} (${s.roll_no}, ${s.branch})\nAttendance: ${s.attended}/${s.total} = ${pct(s)}%\nMarks: ${marks}` },
      ],
    };
  }
);

// Structured output: besides text, we return a typed JSON object.
// outputSchema describes its shape so clients/programs can rely on it.
server.registerTool(
  "students_below_attendance",
  {
    title: "Students below attendance threshold",
    description: "List students whose attendance % is below a threshold (default 75%, the usual college rule).",
    inputSchema: {
      threshold: z.number().min(0).max(100).default(75).describe("Attendance % cutoff"),
      branch: z.string().optional().describe("Optional branch filter: CSE, IT, ECE"),
    },
    outputSchema: {
      threshold: z.number(),
      count: z.number(),
      students: z.array(z.object({ roll_no: z.string(), name: z.string(), percent: z.number() })),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ threshold, branch }) => {
    const list = students
      .filter((s) => !branch || s.branch.toLowerCase() === branch.toLowerCase())
      .filter((s) => pct(s) < threshold)
      .map((s) => ({ roll_no: s.roll_no, name: s.name, percent: pct(s) }));
    const result = { threshold, count: list.length, students: list };
    const text = list.length
      ? `⚠️ ${list.length} student(s) below ${threshold}%:\n` + list.map((s) => `- ${s.name} (${s.roll_no}): ${s.percent}%`).join("\n")
      : `🎉 Everyone is at or above ${threshold}%.`;
    return { content: [{ type: "text", text }], structuredContent: result };
  }
);

server.registerTool(
  "subject_stats",
  {
    title: "Subject statistics",
    description: "Average, highest and lowest marks for a subject, optionally per branch.",
    inputSchema: {
      subject: z.enum(SUBJECTS).describe("Subject code"),
      branch: z.string().optional().describe("Optional branch filter"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ subject, branch }) => {
    const pool = students.filter((s) => !branch || s.branch.toLowerCase() === branch.toLowerCase());
    if (pool.length === 0) return { isError: true, content: [{ type: "text", text: `No students in branch "${branch}".` }] };
    const sorted = [...pool].sort((a, b) => b.marks[subject] - a.marks[subject]);
    const avg = pool.reduce((sum, s) => sum + s.marks[subject], 0) / pool.length;
    const top = sorted[0], low = sorted[sorted.length - 1];
    return {
      content: [
        {
          type: "text",
          text: `📊 ${subject.toUpperCase()}${branch ? ` (${branch})` : ""} — ${pool.length} students\nAverage: ${avg.toFixed(1)}\nTopper: ${top.name} (${top.marks[subject]})\nLowest: ${low.name} (${low.marks[subject]})`,
        },
      ],
    };
  }
);

server.registerTool(
  "class_toppers",
  {
    title: "Class toppers",
    description: "Rank students by total marks across all subjects and return the top N.",
    inputSchema: { top: z.number().int().min(1).max(10).default(3) },
    annotations: { readOnlyHint: true },
  },
  async ({ top }) => {
    const ranked = students
      .map((s) => ({ s, total: SUBJECTS.reduce((sum, sub) => sum + s.marks[sub], 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, top);
    const medals = ["🥇", "🥈", "🥉"];
    return {
      content: [
        { type: "text", text: ranked.map((r, i) => `${medals[i] ?? `${i + 1}.`} ${r.s.name} (${r.s.branch}) — ${r.total}/400`).join("\n") },
      ],
    };
  }
);

// ---- PROMPT ----
// A prompt is a ready-made message template. In Claude Desktop it shows up
// in the "+" / attachments menu so a teacher can run it in one click.
server.registerPrompt(
  "weekly_report",
  {
    title: "Weekly class report",
    description: "Ask the AI to write a short weekly report for a branch using the tools above.",
    argsSchema: { branch: z.string().describe("CSE, IT or ECE") },
  },
  ({ branch }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Write a short weekly report for the ${branch} branch. Use the attendance tools to find students below 75% attendance and the subject_stats tool for every subject. End with 3 actionable suggestions for the class teacher.`,
        },
      },
    ],
  })
);

await server.connect(new StdioServerTransport());
console.error(`✅ attendance MCP server running on stdio (${students.length} students loaded)`);
