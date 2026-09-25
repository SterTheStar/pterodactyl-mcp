import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PterodactylClient } from "../lib/pterodactyl.js";
import { attrs, attrsList, json, error } from "./helpers.js";

export function registerAdminTools(
  server: McpServer,
  ptero: PterodactylClient,
) {
  // ─── Users ─────────────────────────────────────────────────────────

  server.tool(
    "admin_list_users",
    "List all panel users (admin)",
    { page: z.number().optional(), per_page: z.number().optional() },
    async (params) => {
      try {
        return json(attrsList(await ptero.application.listUsers(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_user",
    "Get a panel user by ID (admin)",
    { id: z.number().describe("User ID") },
    async ({ id }) => {
      try {
        return json(attrs(await ptero.application.getUser(id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_user_by_external_id",
    "Get a panel user by external ID (admin)",
    { external_id: z.string().describe("External user ID") },
    async ({ external_id }) => {
      try {
        return json(attrs(await ptero.application.getUserByExternalId(external_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_create_user",
    "Create a new panel user (admin)",
    {
      email: z.string(),
      username: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      password: z.string().optional(),
      root_admin: z.boolean().optional(),
      language: z.string().optional(),
      external_id: z.string().optional(),
    },
    async (params) => {
      try {
        return json(attrs(await ptero.application.createUser(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_update_user",
    "Update an existing panel user (admin)",
    {
      id: z.number().describe("User ID"),
      email: z.string().optional(),
      username: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      password: z.string().optional(),
      root_admin: z.boolean().optional(),
      language: z.string().optional(),
      external_id: z.string().optional(),
    },
    async ({ id, ...params }) => {
      try {
        return json(attrs(await ptero.application.updateUser(id, params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_delete_user",
    "Delete a panel user (admin)",
    { id: z.number().describe("User ID") },
    async ({ id }) => {
      try {
        await ptero.application.deleteUser(id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Nodes ─────────────────────────────────────────────────────────

  server.tool(
    "admin_list_nodes",
    "List all nodes (admin)",
    { page: z.number().optional(), per_page: z.number().optional() },
    async (params) => {
      try {
        return json(attrsList(await ptero.application.listNodes(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_node",
    "Get a node by ID (admin)",
    { id: z.number().describe("Node ID") },
    async ({ id }) => {
      try {
        return json(attrs(await ptero.application.getNode(id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_create_node",
    "Create a new node (admin)",
    {
      name: z.string(),
      location_id: z.number(),
      fqdn: z.string(),
      scheme: z.enum(["http", "https"]),
      memory: z.number().describe("Total memory in MB"),
      memory_overallocate: z.number(),
      disk: z.number().describe("Total disk in MB"),
      disk_overallocate: z.number(),
      upload_size: z.number().describe("Max upload size in MB"),
      daemon_sftp: z.number().describe("SFTP port"),
      daemon_listen: z.number().describe("Daemon port"),
      daemon_base: z.string().optional(),
      description: z.string().optional(),
      public: z.boolean().optional(),
      behind_proxy: z.boolean().optional(),
      maintenance_mode: z.boolean().optional(),
    },
    async (params) => {
      try {
        return json(attrs(await ptero.application.createNode(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_update_node",
    "Update a node (admin)",
    {
      id: z.number().describe("Node ID"),
      name: z.string().optional(),
      location_id: z.number().optional(),
      fqdn: z.string().optional(),
      scheme: z.enum(["http", "https"]).optional(),
      memory: z.number().optional(),
      memory_overallocate: z.number().optional(),
      disk: z.number().optional(),
      disk_overallocate: z.number().optional(),
      upload_size: z.number().optional(),
      daemon_sftp: z.number().optional(),
      daemon_listen: z.number().optional(),
      daemon_base: z.string().optional(),
      description: z.string().optional(),
      public: z.boolean().optional(),
      behind_proxy: z.boolean().optional(),
      maintenance_mode: z.boolean().optional(),
    },
    async ({ id, ...params }) => {
      try {
        return json(attrs(await ptero.application.updateNode(id, params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_delete_node",
    "Delete a node (admin)",
    { id: z.number().describe("Node ID") },
    async ({ id }) => {
      try {
        await ptero.application.deleteNode(id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_node_config",
    "Get Wings configuration for a node (admin)",
    { id: z.number().describe("Node ID") },
    async ({ id }) => {
      try {
        return json(await ptero.application.getNodeConfiguration(id));
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Node Allocations ─────────────────────────────────────────────

  server.tool(
    "admin_list_allocations",
    "List allocations for a node (admin)",
    {
      node_id: z.number().describe("Node ID"),
      page: z.number().optional(),
      per_page: z.number().optional(),
    },
    async ({ node_id, ...query }) => {
      try {
        return json(
          attrsList(await ptero.application.listAllocations(node_id, query)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_create_allocation",
    "Create allocation(s) on a node (admin)",
    {
      node_id: z.number().describe("Node ID"),
      ip: z.string().describe("IP address to bind"),
      ports: z.array(z.string()).describe('Port ranges, e.g. ["25565", "25570-25580"]'),
      alias: z.string().optional(),
    },
    async ({ node_id, ...params }) => {
      try {
        await ptero.application.createAllocation(node_id, params);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_delete_allocation",
    "Delete an allocation from a node (admin)",
    {
      node_id: z.number().describe("Node ID"),
      allocation_id: z.number().describe("Allocation ID"),
    },
    async ({ node_id, allocation_id }) => {
      try {
        await ptero.application.deleteAllocation(node_id, allocation_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Locations ─────────────────────────────────────────────────────

  server.tool(
    "admin_list_locations",
    "List all locations (admin)",
    { page: z.number().optional(), per_page: z.number().optional() },
    async (params) => {
      try {
        return json(attrsList(await ptero.application.listLocations(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_location",
    "Get a location by ID (admin)",
    { id: z.number().describe("Location ID") },
    async ({ id }) => {
      try {
        return json(attrs(await ptero.application.getLocation(id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_create_location",
    "Create a new location (admin)",
    {
      short: z.string().describe("Short identifier"),
      long: z.string().optional().describe("Long description"),
    },
    async (params) => {
      try {
        return json(attrs(await ptero.application.createLocation(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_update_location",
    "Update a location (admin)",
    {
      id: z.number().describe("Location ID"),
      short: z.string().optional(),
      long: z.string().optional(),
    },
    async ({ id, ...params }) => {
      try {
        return json(attrs(await ptero.application.updateLocation(id, params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_delete_location",
    "Delete a location (admin)",
    { id: z.number().describe("Location ID") },
    async ({ id }) => {
      try {
        await ptero.application.deleteLocation(id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Servers (admin) ───────────────────────────────────────────────

  server.tool(
    "admin_list_servers",
    "List all servers across the panel (admin)",
    { page: z.number().optional(), per_page: z.number().optional() },
    async (params) => {
      try {
        return json(attrsList(await ptero.application.listServers(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_server",
    "Get full server details by internal ID (admin)",
    { id: z.number().describe("Server internal ID") },
    async ({ id }) => {
      try {
        return json(attrs(await ptero.application.getServer(id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_server_by_external_id",
    "Get full server details by external ID (admin)",
    { external_id: z.string().describe("External server ID") },
    async ({ external_id }) => {
      try {
        return json(attrs(await ptero.application.getServerByExternalId(external_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_create_server",
    "Create a new game server (admin)",
    {
      name: z.string(),
      user: z.number().describe("Owner user ID"),
      egg: z.number().describe("Egg ID"),
      docker_image: z.string(),
      startup: z.string().describe("Startup command"),
      environment: z
        .record(z.string())
        .describe("Environment variables required by the egg"),
      limits: z.object({
        memory: z.number().describe("MB"),
        swap: z.number().describe("MB, -1 for unlimited"),
        disk: z.number().describe("MB"),
        io: z.number().describe("IO weight 10-1000"),
        cpu: z.number().describe("Percentage, 0 for unlimited"),
      }),
      feature_limits: z.object({
        databases: z.number(),
        allocations: z.number(),
        backups: z.number(),
      }),
      allocation: z.object({
        default: z.number().describe("Default allocation ID"),
        additional: z.array(z.number()).optional(),
      }).optional(),
      deploy: z.object({
        locations: z.array(z.number()).min(1),
        dedicated_ip: z.boolean(),
        port_range: z.array(z.string()).optional(),
      }).optional().describe("Automatically select allocations from these locations instead of specifying allocation.default"),
      description: z.string().optional(),
      external_id: z.string().optional(),
      start_on_completion: z.boolean().optional(),
      skip_scripts: z.boolean().optional(),
      oom_disabled: z.boolean().optional(),
    },
    async (params) => {
      try {
        return json(attrs(await ptero.application.createServer(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_update_server_details",
    "Update server name/owner/description (admin)",
    {
      id: z.number().describe("Server internal ID"),
      name: z.string().optional(),
      user: z.number().optional().describe("New owner user ID"),
      external_id: z.string().optional(),
      description: z.string().optional(),
    },
    async ({ id, ...params }) => {
      try {
        return json(
          attrs(await ptero.application.updateServerDetails(id, params)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_update_server_build",
    "Update server resource limits and allocation (admin)",
    {
      id: z.number().describe("Server internal ID"),
      allocation: z.number().optional().describe("Default allocation ID"),
      memory: z.number().optional().describe("MB"),
      swap: z.number().optional().describe("MB"),
      disk: z.number().optional().describe("MB"),
      io: z.number().optional(),
      cpu: z.number().optional(),
      threads: z.string().nullable().optional().describe("CPU threads pinning"),
      feature_limits: z
        .object({
          databases: z.number().optional(),
          allocations: z.number().optional(),
          backups: z.number().optional(),
        })
        .optional(),
      allocation_additional: z.array(z.number()).optional().describe("Additional allocation IDs"),
      oom_disabled: z.boolean().optional(),
    },
    async ({ id, ...params }) => {
      try {
        return json(
          attrs(await ptero.application.updateServerBuild(id, params)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_update_server_startup",
    "Update server startup command, egg, or image (admin)",
    {
      id: z.number().describe("Server internal ID"),
      startup: z.string().optional(),
      environment: z.record(z.string()).optional(),
      egg: z.number().optional(),
      image: z.string().optional(),
      skip_scripts: z.boolean().optional(),
      docker_image: z.string().optional(),
    },
    async ({ id, ...params }) => {
      try {
        return json(
          attrs(await ptero.application.updateServerStartup(id, params)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_suspend_server",
    "Suspend a server (admin)",
    { id: z.number().describe("Server internal ID") },
    async ({ id }) => {
      try {
        await ptero.application.suspendServer(id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_unsuspend_server",
    "Unsuspend a server (admin)",
    { id: z.number().describe("Server internal ID") },
    async ({ id }) => {
      try {
        await ptero.application.unsuspendServer(id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_reinstall_server",
    "Reinstall a server (admin)",
    { id: z.number().describe("Server internal ID") },
    async ({ id }) => {
      try {
        await ptero.application.reinstallServer(id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_delete_server",
    "Delete a server (admin). Use force=true to skip Wings confirmation.",
    {
      id: z.number().describe("Server internal ID"),
      force: z.boolean().optional().describe("Force delete"),
    },
    async ({ id, force }) => {
      try {
        await ptero.application.deleteServer(id, force ?? false);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Server Databases (admin) ──────────────────────────────────────

  server.tool(
    "admin_list_server_databases",
    "List databases for a server (admin)",
    { server_id: z.number().describe("Server internal ID") },
    async ({ server_id }) => {
      try {
        return json(
          attrsList(await ptero.application.listServerDatabases(server_id)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_create_server_database",
    "Create a database for a server (admin)",
    {
      server_id: z.number().describe("Server internal ID"),
      database: z.string().describe("Database name"),
      remote: z.string().describe("Remote connection string, e.g. %"),
      host: z.number().describe("Database host ID"),
    },
    async ({ server_id, ...params }) => {
      try {
        return json(
          attrs(await ptero.application.createServerDatabase(server_id, params)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_delete_server_database",
    "Delete a database from a server (admin)",
    {
      server_id: z.number().describe("Server internal ID"),
      database_id: z.number().describe("Database ID"),
    },
    async ({ server_id, database_id }) => {
      try {
        await ptero.application.deleteServerDatabase(server_id, database_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_server_database",
    "Get a server database by ID (admin)",
    {
      server_id: z.number().describe("Server internal ID"),
      database_id: z.number().describe("Database ID"),
    },
    async ({ server_id, database_id }) => {
      try {
        return json(attrs(await ptero.application.getServerDatabase(server_id, database_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_reset_server_database_password",
    "Reset a server database password (admin)",
    {
      server_id: z.number().describe("Server internal ID"),
      database_id: z.number().describe("Database ID"),
    },
    async ({ server_id, database_id }) => {
      try {
        return json(await ptero.application.resetServerDatabasePassword(server_id, database_id));
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Nests & Eggs ──────────────────────────────────────────────────

  server.tool(
    "admin_list_nests",
    "List all nests (server type categories) (admin)",
    { page: z.number().optional(), per_page: z.number().optional() },
    async (params) => {
      try {
        return json(attrsList(await ptero.application.listNests(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_nest",
    "Get a nest by ID (admin)",
    { id: z.number().describe("Nest ID") },
    async ({ id }) => {
      try {
        return json(attrs(await ptero.application.getNest(id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_list_eggs",
    "List eggs in a nest (admin)",
    {
      nest_id: z.number().describe("Nest ID"),
      page: z.number().optional(),
      per_page: z.number().optional(),
    },
    async ({ nest_id, ...query }) => {
      try {
        return json(attrsList(await ptero.application.listEggs(nest_id, query)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "admin_get_egg",
    "Get an egg by ID (admin)",
    {
      nest_id: z.number().describe("Nest ID"),
      egg_id: z.number().describe("Egg ID"),
    },
    async ({ nest_id, egg_id }) => {
      try {
        return json(attrs(await ptero.application.getEgg(nest_id, egg_id)));
      } catch (e) {
        return error(e);
      }
    },
  );
}
