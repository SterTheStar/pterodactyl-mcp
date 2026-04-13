import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WebSocketManager } from "../lib/websocket.js";
import { json, error } from "./helpers.js";

export function registerWebSocketTools(
  server: McpServer,
  wsManager: WebSocketManager,
) {
  server.tool(
    "websocket_connect",
    "Connect a persistent WebSocket to a game server's console. Records all console output, status changes, and stats in a local buffer for later retrieval.",
    {
      server_id: z.string().describe("Server identifier (short ID)"),
      max_history: z
        .number()
        .optional()
        .describe("Maximum lines to retain in buffer (default 2000)"),
    },
    async ({ server_id, max_history }) => {
      try {
        await wsManager.connect(server_id, max_history ?? 2000);
        return json({
          success: true,
          server_id,
          message: `WebSocket connected. Console output is now being recorded. Use websocket_read to retrieve history.`,
        });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "websocket_disconnect",
    "Disconnect the WebSocket from a game server's console. History is discarded.",
    {
      server_id: z.string().describe("Server identifier (short ID)"),
    },
    async ({ server_id }) => {
      try {
        wsManager.disconnect(server_id);
        return json({ success: true, server_id });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "websocket_disconnect_all",
    "Disconnect all active WebSocket connections",
    {},
    async () => {
      try {
        const count = wsManager.disconnectAll();
        return json({ success: true, disconnected: count });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "websocket_read",
    "Read console output history from a connected WebSocket. Returns buffered lines with timestamps.",
    {
      server_id: z.string().describe("Server identifier (short ID)"),
      lines: z
        .number()
        .optional()
        .describe("Number of recent lines to return (default: all)"),
      since: z
        .number()
        .optional()
        .describe("Only return entries after this Unix timestamp (ms)"),
      type: z
        .enum(["output", "install", "status", "stats", "daemon"])
        .optional()
        .describe("Filter by entry type (default: all types)"),
    },
    async ({ server_id, lines, since, type }) => {
      try {
        const conn = wsManager.getConnection(server_id);
        const entries = conn.getHistory({ lines, since, type });
        return json({
          server_id,
          count: entries.length,
          entries: entries.map((e) => ({
            time: new Date(e.timestamp).toISOString(),
            type: e.type,
            line: e.line,
          })),
        });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "websocket_clear_history",
    "Clear the console history buffer for a connected server",
    {
      server_id: z.string().describe("Server identifier (short ID)"),
    },
    async ({ server_id }) => {
      try {
        const conn = wsManager.getConnection(server_id);
        const cleared = conn.clearHistory();
        return json({ success: true, server_id, lines_cleared: cleared });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "websocket_list",
    "List all active WebSocket connections and their status",
    {},
    async () => {
      try {
        const connections = wsManager.listConnections();
        return json({
          active_connections: connections.length,
          connections: connections.map((c) => ({
            server_id: c.serverId,
            server_status: c.serverStatus,
            connected_since: new Date(c.connectedAt).toISOString(),
            last_activity: new Date(c.lastActivity).toISOString(),
            history_lines: c.historySize,
          })),
        });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "websocket_status",
    "Get detailed status of a specific WebSocket connection",
    {
      server_id: z.string().describe("Server identifier (short ID)"),
    },
    async ({ server_id }) => {
      try {
        const conn = wsManager.getConnection(server_id);
        const info = conn.getInfo();
        const now = Date.now();
        return json({
          server_id: info.serverId,
          server_status: info.serverStatus,
          connected: true,
          connected_since: new Date(info.connectedAt).toISOString(),
          uptime_seconds: Math.floor((now - info.connectedAt) / 1000),
          last_activity: new Date(info.lastActivity).toISOString(),
          idle_seconds: Math.floor((now - info.lastActivity) / 1000),
          history_lines: info.historySize,
        });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "websocket_send",
    "Send a console command via WebSocket and return output received within a timeout window",
    {
      server_id: z.string().describe("Server identifier (short ID)"),
      command: z.string().describe("Console command to execute"),
      wait_ms: z
        .number()
        .optional()
        .describe("Milliseconds to wait for output after sending (default 1000)"),
    },
    async ({ server_id, command, wait_ms }) => {
      try {
        const conn = wsManager.getConnection(server_id);
        const before = Date.now();
        conn.sendCommand(command);

        const delay = Math.min(wait_ms ?? 1000, 10000);
        await new Promise((r) => setTimeout(r, delay));

        const entries = conn.getHistory({ since: before, type: "output" });
        return json({
          server_id,
          command,
          output_lines: entries.length,
          output: entries.map((e) => e.line),
        });
      } catch (e) {
        return error(e);
      }
    },
  );
}
