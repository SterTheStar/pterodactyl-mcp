#!/usr/bin/env node

import "dotenv/config";
import { randomUUID } from "node:crypto";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// --- CLI args / env ---

function getPort(): number {
  const idx = process.argv.indexOf("--port");
  if (idx !== -1 && process.argv[idx + 1]) {
    return parseInt(process.argv[idx + 1], 10);
  }
  return parseInt(process.env.PORT ?? "3000", 10);
}

// --- MCP Server Factory ---

function createServer(): McpServer {
  const server = new McpServer({
    name: "pterodactyl-mcp",
    version: "0.1.0",
  });

  // Example: ping
  server.tool("ping", "Check if the server is running", {}, async () => ({
    content: [{ type: "text", text: "pong" }],
  }));

  // Example: echo
  server.tool(
    "echo",
    "Echo back the provided message",
    { message: z.string().describe("The message to echo back") },
    async ({ message }) => ({
      content: [{ type: "text", text: message }],
    }),
  );

  return server;
}

// --- HTTP Server ---

const app = express();
app.use(express.json());

const transports = new Map<string, StreamableHTTPServerTransport>();

// POST /mcp  — client-to-server messages (including initialize)
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session
  if (sessionId) {
    const transport = transports.get(sessionId);
    if (transport) {
      await transport.handleRequest(req, res, req.body);
      return;
    }
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid session" },
      id: null,
    });
    return;
  }

  // New session
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);

  if (transport.sessionId) {
    transports.set(transport.sessionId, transport);
  }
});

// GET /mcp  — SSE stream for server-to-client notifications
app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid session" },
      id: null,
    });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// DELETE /mcp  — session termination
app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid session" },
      id: null,
    });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
  transports.delete(sessionId);
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// --- Start ---

const port = getPort();
app.listen(port, () => {
  console.log(`Pterodactyl MCP server listening on http://localhost:${port}/mcp`);
});
