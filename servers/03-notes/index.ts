/**
 * LEVEL 2 · Server 03 — Notes (CRUD with a JSON file)
 * ----------------------------------------------------
 * New concepts:
 *   • State: data that survives between tool calls (saved to notes.json)
 *   • Read tools vs Write tools (and tool annotations that say which is which)
 *   • "Not found" error handling
 *   • Resources: read-only data the client can browse (notes://all)
 *
 * Run it:     npm run notes
 * Inspect it: npm run inspect:notes
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

type Note = { id: number; title: string; body: string; tags: string[]; createdAt: string };

// Data lives next to this file. (In a real app this would be a database.)
const DATA_FILE = process.env.NOTES_FILE ?? join(import.meta.dirname, "notes.json");

async function loadNotes(): Promise<Note[]> {
  if (!existsSync(DATA_FILE)) return [];
  return JSON.parse(await readFile(DATA_FILE, "utf-8"));
}
async function saveNotes(notes: Note[]) {
  await writeFile(DATA_FILE, JSON.stringify(notes, null, 2));
}
const formatNote = (n: Note) =>
  `#${n.id} ${n.title}${n.tags.length ? ` [${n.tags.join(", ")}]` : ""}\n${n.body}`;

const server = new McpServer({ name: "notes", version: "1.0.0" });

// ---------- WRITE tool (Create) ----------
server.registerTool(
  "add_note",
  {
    title: "Add a note",
    description: "Save a new note with a title, body and optional tags.",
    inputSchema: {
      title: z.string().min(1).describe("Short title of the note"),
      body: z.string().describe("The note content"),
      tags: z.array(z.string()).default([]).describe("Optional tags like 'dsa', 'exam'"),
    },
  },
  async ({ title, body, tags }) => {
    const notes = await loadNotes();
    const id = notes.length ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
    const note: Note = { id, title, body, tags, createdAt: new Date().toISOString() };
    notes.push(note);
    await saveNotes(notes);
    return { content: [{ type: "text", text: `📝 Saved note #${id}: "${title}"` }] };
  }
);

// ---------- READ tools ----------
// annotations.readOnlyHint tells the client this tool never changes anything.
server.registerTool(
  "list_notes",
  {
    title: "List notes",
    description: "List all saved notes, optionally filtered by a tag.",
    inputSchema: { tag: z.string().optional().describe("Only show notes with this tag") },
    annotations: { readOnlyHint: true },
  },
  async ({ tag }) => {
    let notes = await loadNotes();
    if (tag) notes = notes.filter((n) => n.tags.includes(tag));
    if (notes.length === 0) return { content: [{ type: "text", text: "No notes found." }] };
    return { content: [{ type: "text", text: notes.map(formatNote).join("\n\n") }] };
  }
);

server.registerTool(
  "search_notes",
  {
    title: "Search notes",
    description: "Search notes by a keyword in the title or body (case-insensitive).",
    inputSchema: { query: z.string().min(1).describe("Word or phrase to search for") },
    annotations: { readOnlyHint: true },
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const hits = (await loadNotes()).filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
    return {
      content: [{ type: "text", text: hits.length ? hits.map(formatNote).join("\n\n") : `No notes match "${query}".` }],
    };
  }
);

// ---------- WRITE tool (Update) ----------
server.registerTool(
  "update_note",
  {
    title: "Update a note",
    description: "Change the title, body or tags of an existing note by its id.",
    inputSchema: {
      id: z.number().int().describe("Id of the note to update"),
      title: z.string().optional(),
      body: z.string().optional(),
      tags: z.array(z.string()).optional(),
    },
  },
  async ({ id, title, body, tags }) => {
    const notes = await loadNotes();
    const note = notes.find((n) => n.id === id);
    if (!note) return { isError: true, content: [{ type: "text", text: `Note #${id} not found.` }] };
    if (title !== undefined) note.title = title;
    if (body !== undefined) note.body = body;
    if (tags !== undefined) note.tags = tags;
    await saveNotes(notes);
    return { content: [{ type: "text", text: `✏️ Updated note #${id}` }] };
  }
);

// ---------- WRITE tool (Delete) — marked destructive ----------
server.registerTool(
  "delete_note",
  {
    title: "Delete a note",
    description: "Permanently delete a note by its id. Confirm with the user before calling.",
    inputSchema: { id: z.number().int().describe("Id of the note to delete") },
    annotations: { destructiveHint: true },
  },
  async ({ id }) => {
    const notes = await loadNotes();
    const remaining = notes.filter((n) => n.id !== id);
    if (remaining.length === notes.length) {
      return { isError: true, content: [{ type: "text", text: `Note #${id} not found.` }] };
    }
    await saveNotes(remaining);
    return { content: [{ type: "text", text: `🗑️ Deleted note #${id}` }] };
  }
);

// ---------- RESOURCE ----------
// Tools = actions the AI calls. Resources = data the client/user can open and read.
server.registerResource(
  "all-notes",
  "notes://all",
  { title: "All notes", description: "Every note as JSON", mimeType: "application/json" },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await loadNotes(), null, 2) }],
  })
);

await server.connect(new StdioServerTransport());
console.error(`✅ notes MCP server running on stdio (data: ${DATA_FILE})`);
