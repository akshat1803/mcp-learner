/**
 * LEVEL 4 · Server 08 — Remote MCP over HTTP
 * -------------------------------------------
 * Until now every server talked over stdio: the AI app STARTED your program
 * on the same computer. That's great locally, but you can't share it.
 *
 * This server uses the Streamable HTTP transport instead, so it can run on
 * a cloud host (Render, Railway, a VPS...) and anyone can connect to its URL.
 *
 * New concepts:
 *   • HTTP transport (POST /mcp)
 *   • Stateless mode: a fresh server per request (simple + scales easily)
 *   • A basic API-key check (Authorization: Bearer <key>)
 *   • Health check endpoint for hosting platforms
 *
 * Run it:     npm run remote          (listens on http://localhost:3000/mcp)
 * Inspect it: npx @modelcontextprotocol/inspector  → choose "Streamable HTTP", URL http://localhost:3000/mcp
 */
import { createServer, type IncomingMessage } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 3000);
const API_KEY = process.env.MCP_API_KEY; // if set, clients must send it

// Build a server with its tools. Called once per request (stateless mode).
function buildServer() {
  const server = new McpServer({ name: "campus-remote", version: "1.0.0" });

  server.registerTool(
    "server_time",
    {
      title: "Server time",
      description: "Return the current date and time on the server in IST.",
      annotations: { readOnlyHint: true },
    },
    async () => ({
      content: [{ type: "text", text: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" }],
    })
  );

  server.registerTool(
    "cgpa_to_percentage",
    {
      title: "CGPA to percentage",
      description: "Convert a CGPA (10-point scale) to percentage using the common ×9.5 formula, or a custom multiplier.",
      inputSchema: {
        cgpa: z.number().min(0).max(10),
        multiplier: z.number().positive().default(9.5).describe("Most Indian universities use 9.5"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cgpa, multiplier }) => ({
      content: [{ type: "text", text: `CGPA ${cgpa} ≈ ${(cgpa * multiplier).toFixed(2)}% (×${multiplier})` }],
    })
  );

  server.registerTool(
    "attendance_planner",
    {
      title: "Attendance planner",
      description: "Given classes attended and held so far, tell how many more classes are needed to reach a target %, or how many can be skipped.",
      inputSchema: {
        attended: z.number().int().min(0),
        held: z.number().int().min(1),
        target: z.number().min(1).max(100).default(75),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ attended, held, target }) => {
      const t = target / 100;
      const now = ((attended / held) * 100).toFixed(1);
      if (attended / held >= t) {
        // max k such that attended / (held + k) >= t
        const canSkip = Math.floor(attended / t - held);
        return { content: [{ type: "text", text: `You're at ${now}%. You can skip ${canSkip} more class(es) and stay ≥ ${target}%.` }] };
      }
      // min k such that (attended + k) / (held + k) >= t
      const need = Math.ceil((t * held - attended) / (1 - t));
      return { content: [{ type: "text", text: `You're at ${now}%. Attend the next ${need} class(es) in a row to reach ${target}%.` }] };
    }
  );

  return server;
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : undefined;
}

const http = createServer(async (req, res) => {
  // Health check: hosting platforms ping this to know you're alive.
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url !== "/mcp") {
    res.writeHead(404).end("Not found. MCP endpoint is /mcp");
    return;
  }
  // Simple API-key auth (real apps should use OAuth — see the README).
  if (API_KEY && req.headers.authorization !== `Bearer ${API_KEY}`) {
    res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  if (req.method !== "POST") {
    // Stateless servers don't keep open streams, so only POST is supported.
    res.writeHead(405, { Allow: "POST" }).end("Method not allowed");
    return;
  }

  try {
    const server = buildServer();
    // sessionIdGenerator: undefined  →  stateless mode
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, await readBody(req));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end("Internal error");
  }
});

http.listen(PORT, () => {
  console.log(`✅ campus-remote MCP server on http://localhost:${PORT}/mcp ${API_KEY ? "(API key required)" : "(no auth)"}`);
});
