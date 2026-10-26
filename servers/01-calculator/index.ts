/**
 * LEVEL 1 · Server 01 — Calculator
 * ---------------------------------
 * Your very first MCP server. It does boring maths on purpose,
 * so you can focus on the 3 building blocks of every MCP server:
 *
 *   1. Create a server        -> new McpServer({ name, version })
 *   2. Register tools         -> server.registerTool(name, config, handler)
 *   3. Connect a transport    -> server.connect(new StdioServerTransport())
 *
 * Run it:     npm run calculator
 * Inspect it: npm run inspect:calculator
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 1️⃣ Create the server. The name is what the AI client (e.g. Claude) sees.
const server = new McpServer({
  name: "calculator",
  version: "1.0.0",
});

// 2️⃣ Register tools.
// A tool = a function the AI is ALLOWED to call.
// - description : tells the AI WHEN to use it (write it carefully!)
// - inputSchema : tells the AI WHAT arguments to send (validated by zod)
// - handler     : your actual code. Must return { content: [...] }
server.registerTool(
  "add",
  {
    title: "Add two numbers",
    description: "Add two numbers together and return the sum.",
    inputSchema: {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${a} + ${b} = ${a + b}` }],
  })
);

server.registerTool(
  "multiply",
  {
    title: "Multiply two numbers",
    description: "Multiply two numbers and return the product.",
    inputSchema: {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${a} × ${b} = ${a * b}` }],
  })
);

server.registerTool(
  "divide",
  {
    title: "Divide two numbers",
    description: "Divide a by b. Returns an error if b is zero.",
    inputSchema: {
      a: z.number().describe("Dividend (top number)"),
      b: z.number().describe("Divisor (bottom number)"),
    },
  },
  async ({ a, b }) => {
    // 💡 How to report an error: return isError: true with a helpful message.
    // The AI reads this message and can explain it to the user or retry.
    if (b === 0) {
      return {
        isError: true,
        content: [{ type: "text", text: "Cannot divide by zero. Ask the user for a non-zero divisor." }],
      };
    }
    return { content: [{ type: "text", text: `${a} ÷ ${b} = ${a / b}` }] };
  }
);

// Unit conversion shows how to use enums (a fixed list of allowed values).
const conversions: Record<string, (v: number) => number> = {
  km_to_miles: (v) => v * 0.621371,
  miles_to_km: (v) => v / 0.621371,
  celsius_to_fahrenheit: (v) => (v * 9) / 5 + 32,
  fahrenheit_to_celsius: (v) => ((v - 32) * 5) / 9,
  kg_to_pounds: (v) => v * 2.20462,
  pounds_to_kg: (v) => v / 2.20462,
};

server.registerTool(
  "convert_units",
  {
    title: "Convert units",
    description: "Convert a value between common units (distance, temperature, weight).",
    inputSchema: {
      value: z.number().describe("The value to convert"),
      conversion: z
        .enum(Object.keys(conversions) as [string, ...string[]])
        .describe("Which conversion to apply"),
    },
  },
  async ({ value, conversion }) => {
    const result = conversions[conversion](value);
    return {
      content: [{ type: "text", text: `${value} → ${result.toFixed(2)} (${conversion})` }],
    };
  }
);

// 3️⃣ Connect a transport. stdio = talk over stdin/stdout.
// ⚠️ Golden rule for stdio servers: NEVER use console.log — stdout is
// reserved for MCP messages. Use console.error for your own logs.
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("✅ calculator MCP server running on stdio");
