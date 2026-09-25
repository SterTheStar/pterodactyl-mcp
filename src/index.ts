#!/usr/bin/env node

import "dotenv/config";
import { randomUUID } from "node:crypto";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PterodactylClient } from "./lib/pterodactyl.js";
import { WebSocketManager } from "./lib/websocket.js";
import { registerTools, type ToolClients } from "./tools/index.js";

// --- CLI args / env ---

const transportMode = process.argv.includes("--stdio") ? "stdio" : "http";

function getPort(): number {
  const idx = process.argv.indexOf("--port");
  if (idx !== -1 && process.argv[idx + 1]) {
    return parseInt(process.argv[idx + 1], 10);
  }
  return parseInt(process.env.PORT ?? "3000", 10);
}

// --- Pterodactyl clients (one per API scope) ---

const PTERO_URL = process.env.PTERODACTYL_URL;
const PTERO_APP_KEY = process.env.PTERODACTYL_APP_KEY;
const PTERO_CLIENT_KEY = process.env.PTERODACTYL_CLIENT_KEY;
const MCP_JSON_LIMIT = process.env.MCP_JSON_LIMIT ?? "50mb";

if (!PTERO_URL) {
  console.error("Missing PTERODACTYL_URL environment variable.");
  process.exit(1);
}

if (!PTERO_APP_KEY && !PTERO_CLIENT_KEY) {
  console.error(
    "At least one API key is required:\n" +
      "  PTERODACTYL_APP_KEY    (ptla_*) for admin tools\n" +
      "  PTERODACTYL_CLIENT_KEY (ptlc_*) for client tools\n" +
      "Copy .env.example to .env and fill in your panel credentials.",
  );
  process.exit(1);
}

const clients: ToolClients = {};

if (PTERO_APP_KEY) {
  clients.admin = new PterodactylClient({ baseUrl: PTERO_URL, apiKey: PTERO_APP_KEY });
}
if (PTERO_CLIENT_KEY) {
  clients.client = new PterodactylClient({ baseUrl: PTERO_URL, apiKey: PTERO_CLIENT_KEY });
  clients.wsManager = new WebSocketManager(clients.client.client, PTERO_URL.replace(/\/+$/, ""));
}

const scopes = [
  clients.admin && "admin (ptla_)",
  clients.client && "client (ptlc_)",
].filter(Boolean);
console.error(`Pterodactyl API scopes: ${scopes.join(", ")}`);

// --- MCP Server Factory ---

function createServer(): McpServer {
  const server = new McpServer({
    name: "pterodactyl-mcp",
    version: "0.1.0",
  });

  registerTools(server, clients);

  return server;
}

// --- Stdio transport ---

async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// --- HTTP transport ---

function startHttp() {
  const app = express();
  app.use(express.json({ limit: MCP_JSON_LIMIT }));

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

  const port = getPort();
  app.listen(port, () => {
    console.log(
      `Pterodactyl MCP server listening on http://localhost:${port}/mcp`,
    );
  });
}

// --- Start ---

if (transportMode === "stdio") {
  startStdio();
} else {
  startHttp();
}
