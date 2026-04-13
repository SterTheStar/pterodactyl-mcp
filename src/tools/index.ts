import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PterodactylClient } from "../lib/pterodactyl.js";
import type { WebSocketManager } from "../lib/websocket.js";
import { registerAdminTools } from "./admin.js";
import { registerClientTools } from "./client.js";
import { registerWebSocketTools } from "./websocket.js";

export interface ToolClients {
  admin?: PterodactylClient;
  client?: PterodactylClient;
  wsManager?: WebSocketManager;
}

export function registerTools(server: McpServer, clients: ToolClients) {
  if (clients.admin) {
    registerAdminTools(server, clients.admin);
  }
  if (clients.client) {
    registerClientTools(server, clients.client);
  }
  if (clients.wsManager) {
    registerWebSocketTools(server, clients.wsManager);
  }
}
