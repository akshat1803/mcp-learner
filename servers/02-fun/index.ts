/**
 * LEVEL 1 · Server 02 — Fun Tools
 * --------------------------------
 * New concepts:
 *   • Optional arguments with default values
 *   • Tools with NO arguments
 *   • Arrays as input
 *   • Returning multiple content blocks
 *
 * Run it:     npm run fun
 * Inspect it: npm run inspect:fun
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "fun-tools", version: "1.0.0" });

// Optional args: .optional() or .default(). If the AI doesn't send it, we use the default.
server.registerTool(
  "roll_dice",
  {
    title: "Roll dice",
    description: "Roll one or more dice. Use when the user wants a random number or to play a game.",
    inputSchema: {
      sides: z.number().int().min(2).max(100).default(6).describe("Sides per die (default 6)"),
      count: z.number().int().min(1).max(10).default(1).describe("How many dice to roll (default 1)"),
    },
  },
  async ({ sides, count }) => {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((sum, r) => sum + r, 0);
    return {
      content: [{ type: "text", text: `🎲 Rolled ${count}d${sides}: [${rolls.join(", ")}] — total ${total}` }],
    };
  }
);

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
  "Why did the developer go broke? Because he used up all his cache.",
  "There are 10 types of people: those who understand binary and those who don't.",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  "My code doesn't work, I have no idea why. My code works, I have no idea why.",
];

// A tool with no arguments — just leave out inputSchema.
server.registerTool(
  "get_joke",
  {
    title: "Get a programming joke",
    description: "Return a random programming joke. Use when the user wants something funny.",
  },
  async () => ({
    content: [{ type: "text", text: jokes[Math.floor(Math.random() * jokes.length)] }],
  })
);

// Arrays as input: the AI can pass a whole list.
server.registerTool(
  "pick_random_student",
  {
    title: "Pick a random student",
    description: "Pick one or more random names from a list. Great for choosing who answers next in class.",
    inputSchema: {
      names: z.array(z.string()).min(1).describe("List of student names to choose from"),
      howMany: z.number().int().min(1).default(1).describe("How many students to pick"),
    },
  },
  async ({ names, howMany }) => {
    // Fisher–Yates shuffle, then take the first N.
    const shuffled = [...names];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled.slice(0, Math.min(howMany, names.length));
    // Multiple content blocks: the AI receives both pieces of text.
    return {
      content: [
        { type: "text", text: `🎯 Picked: ${picked.join(", ")}` },
        { type: "text", text: `(from ${names.length} students)` },
      ],
    };
  }
);

server.registerTool(
  "flip_coin",
  {
    title: "Flip a coin",
    description: "Flip a coin and return heads or tails.",
  },
  async () => ({
    content: [{ type: "text", text: Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails" }],
  })
);

await server.connect(new StdioServerTransport());
console.error("✅ fun-tools MCP server running on stdio");
