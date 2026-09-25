import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PterodactylClient } from "../lib/pterodactyl.js";
import { attrs, attrsList, json, error } from "./helpers.js";

export function registerClientTools(
  server: McpServer,
  ptero: PterodactylClient,
) {
  // ─── Servers ───────────────────────────────────────────────────────

  server.tool(
    "list_servers",
    "List game servers accessible to the authenticated user",
    { page: z.number().optional(), per_page: z.number().optional() },
    async (params) => {
      try {
        return json(attrsList(await ptero.client.listServers(params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_account_activity",
    "Get activity history for the authenticated account",
    { page: z.number().int().positive().optional(), per_page: z.number().int().positive().optional() },
    async (query) => {
      try {
        return json(attrsList(await ptero.client.getAccountActivity(query)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_server",
    "Get details of a game server by its short identifier",
    { server_id: z.string().describe("Server identifier (short ID, e.g. 'abc123')") },
    async ({ server_id }) => {
      try {
        return json(attrs(await ptero.client.getServer(server_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_resource_usage",
    "Get live resource usage (CPU, memory, disk, network) for a server",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        return json(attrs(await ptero.client.getResourceUsage(server_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "server_power",
    "Send a power action to a game server (start, stop, restart, kill)",
    {
      server_id: z.string().describe("Server identifier"),
      action: z.enum(["start", "stop", "restart", "kill"]),
    },
    async ({ server_id, action }) => {
      try {
        await ptero.client.sendPowerAction(server_id, action);
        return json({ success: true, action });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "server_command",
    "Send a console command to a running game server",
    {
      server_id: z.string().describe("Server identifier"),
      command: z.string().describe("Console command to execute"),
    },
    async ({ server_id, command }) => {
      try {
        await ptero.client.sendCommand(server_id, command);
        return json({ success: true, command });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_server_activity",
    "Get the activity log for a server",
    {
      server_id: z.string().describe("Server identifier"),
      page: z.number().optional(),
      per_page: z.number().optional(),
    },
    async ({ server_id, ...query }) => {
      try {
        return json(attrsList(await ptero.client.getActivity(server_id, query)));
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Files ─────────────────────────────────────────────────────────

  server.tool(
    "list_files",
    "List files and directories in a server's filesystem",
    {
      server_id: z.string().describe("Server identifier"),
      directory: z.string().optional().describe("Path to list, defaults to /"),
    },
    async ({ server_id, directory }) => {
      try {
        return json(
          attrsList(await ptero.client.listFiles(server_id, directory ?? "/")),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "read_file",
    "Read the contents of a file on the server",
    {
      server_id: z.string().describe("Server identifier"),
      file: z.string().describe("File path, e.g. /server.properties"),
    },
    async ({ server_id, file }) => {
      try {
        const content = await ptero.client.getFileContents(server_id, file);
        return json({ file, content });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_file_download_url",
    "Get a temporary download URL for a server file",
    {
      server_id: z.string().describe("Server identifier"),
      file: z.string().describe("File path on the server"),
    },
    async ({ server_id, file }) => {
      try {
        const result = await ptero.client.getDownloadUrl(server_id, file);
        return json({ url: result.attributes.url });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "write_file",
    "Write exact file contents on the server (creates or overwrites). Pass plain content without JSON.stringify or wrapper quotes. Use content_base64 to preserve exact bytes and line endings, or set content_json_encoded=true only when content itself is a JSON-encoded string.",
    {
      server_id: z.string().describe("Server identifier"),
      file: z.string().describe("File path"),
      content: z.string().optional().describe("Raw file contents, including actual newline characters"),
      content_base64: z.string().optional().describe("Optional exact file bytes encoded as standard base64; mutually exclusive with content"),
      content_json_encoded: z.boolean().optional().default(false).describe("Set true only if content is wrapped/escaped as a JSON string, to decode that wrapper before writing"),
    },
    async ({ server_id, file, content, content_base64, content_json_encoded }) => {
      try {
        if ((content === undefined) === (content_base64 === undefined)) {
          throw new Error("Provide exactly one of content or content_base64");
        }

        let fileContent: string | Uint8Array;
        if (content_base64 !== undefined) {
          if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content_base64)) {
            throw new Error("content_base64 must be valid standard base64");
          }
          fileContent = Buffer.from(content_base64, "base64");
        } else if (content_json_encoded) {
          try {
            const decoded: unknown = JSON.parse(content!);
            if (typeof decoded !== "string") {
              throw new Error("JSON content must encode a string");
            }
            fileContent = decoded;
          } catch (cause) {
            throw new Error(`Could not decode JSON-encoded content: ${cause instanceof Error ? cause.message : String(cause)}`);
          }
        } else {
          fileContent = content!;
        }

        await ptero.client.writeFile(server_id, file, fileContent);
        const bytesWritten = typeof fileContent === "string"
          ? Buffer.byteLength(fileContent, "utf8")
          : fileContent.byteLength;
        return json({ success: true, file, bytes_written: bytesWritten });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "upload_files",
    "Upload files and folders to a server. File contents must be base64-encoded; relative paths preserve the folder structure. Empty folders can be provided separately.",
    {
      server_id: z.string().describe("Server identifier"),
      directory: z.string().default("/").describe("Existing destination directory on the server"),
      files: z.array(z.object({
        path: z.string().min(1).describe("Relative file path, e.g. plugins/example.jar"),
        content_base64: z.string().describe("File bytes encoded as standard base64"),
      })).default([]),
      directories: z.array(z.string().min(1)).default([]).describe("Relative folder paths, including empty folders"),
    },
    async ({ server_id, directory, files, directories }) => {
      try {
        const decodedFiles = files.map(({ path, content_base64 }) => {
          if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content_base64)) {
            throw new Error(`File ${path} has invalid base64 content`);
          }
          return { path, content: Buffer.from(content_base64, "base64") };
        });
        const result = await ptero.client.uploadFiles(
          server_id,
          directory,
          decodedFiles,
          directories,
        );
        return json({ success: true, ...result, directory });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "rename_files",
    "Rename or move files on the server",
    {
      server_id: z.string().describe("Server identifier"),
      root: z.string().describe("Root directory, e.g. /"),
      files: z
        .array(z.object({ from: z.string(), to: z.string() }))
        .describe("Array of {from, to} rename pairs"),
    },
    async ({ server_id, root, files }) => {
      try {
        await ptero.client.renameFile(server_id, root, files);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "copy_file",
    "Copy a file on the server",
    {
      server_id: z.string().describe("Server identifier"),
      location: z.string().describe("Path of the file to copy"),
    },
    async ({ server_id, location }) => {
      try {
        await ptero.client.copyFile(server_id, location);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "compress_files",
    "Compress files into a tar.gz archive on the server",
    {
      server_id: z.string().describe("Server identifier"),
      root: z.string().describe("Root directory"),
      files: z.array(z.string()).describe("File/folder names to compress"),
    },
    async ({ server_id, root, files }) => {
      try {
        const result = await ptero.client.compressFiles(server_id, root, files);
        return json(result);
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "decompress_file",
    "Decompress an archive on the server",
    {
      server_id: z.string().describe("Server identifier"),
      root: z.string().describe("Root directory"),
      file: z.string().describe("Archive file name"),
    },
    async ({ server_id, root, file }) => {
      try {
        await ptero.client.decompressFile(server_id, root, file);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_files",
    "Delete files or directories on the server",
    {
      server_id: z.string().describe("Server identifier"),
      root: z.string().describe("Root directory"),
      files: z.array(z.string()).describe("File/folder names to delete"),
    },
    async ({ server_id, root, files }) => {
      try {
        await ptero.client.deleteFiles(server_id, root, files);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "chmod_files",
    "Change permissions for files and folders on the server",
    {
      server_id: z.string().describe("Server identifier"),
      root: z.string().describe("Root directory containing the files"),
      files: z.array(z.object({
        file: z.string().describe("File or folder name relative to root"),
        mode: z.string().regex(/^[0-7]{3,4}$/).describe("Unix permission mode in octal, e.g. 0644 or 0755"),
      })),
    },
    async ({ server_id, root, files }) => {
      try {
        await ptero.client.chmodFiles(
          server_id,
          root,
          files,
        );
        return json({ success: true, updated: files.length });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_folder",
    "Create a new directory on the server",
    {
      server_id: z.string().describe("Server identifier"),
      root: z.string().describe("Parent directory"),
      name: z.string().describe("New folder name"),
    },
    async ({ server_id, root, name }) => {
      try {
        await ptero.client.createFolder(server_id, root, name);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "pull_file",
    "Download a file from a URL onto the server",
    {
      server_id: z.string().describe("Server identifier"),
      url: z.string().describe("URL to download from"),
      directory: z.string().describe("Target directory on server"),
    },
    async ({ server_id, url, directory }) => {
      try {
        await ptero.client.pullFile(server_id, url, directory);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Databases ─────────────────────────────────────────────────────

  server.tool(
    "list_databases",
    "List databases for a game server",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        return json(attrsList(await ptero.client.listDatabases(server_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_database",
    "Create a new database for a game server",
    {
      server_id: z.string().describe("Server identifier"),
      database: z.string().describe("Database name"),
      remote: z.string().describe("Allowed remote host, e.g. %"),
    },
    async ({ server_id, ...params }) => {
      try {
        return json(
          attrs(await ptero.client.createDatabase(server_id, params)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "rotate_database_password",
    "Rotate the password for a server database",
    {
      server_id: z.string().describe("Server identifier"),
      database_id: z.string().describe("Database ID"),
    },
    async ({ server_id, database_id }) => {
      try {
        return json(
          attrs(
            await ptero.client.rotateDatabasePassword(server_id, database_id),
          ),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_database",
    "Delete a database from a game server",
    {
      server_id: z.string().describe("Server identifier"),
      database_id: z.string().describe("Database ID"),
    },
    async ({ server_id, database_id }) => {
      try {
        await ptero.client.deleteDatabase(server_id, database_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Schedules ─────────────────────────────────────────────────────

  server.tool(
    "list_schedules",
    "List schedules for a game server",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        return json(attrsList(await ptero.client.listSchedules(server_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_schedule",
    "Get a schedule by ID",
    {
      server_id: z.string().describe("Server identifier"),
      schedule_id: z.number().describe("Schedule ID"),
    },
    async ({ server_id, schedule_id }) => {
      try {
        return json(
          attrs(await ptero.client.getSchedule(server_id, schedule_id)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_schedule",
    "Create a cron schedule for a game server",
    {
      server_id: z.string().describe("Server identifier"),
      name: z.string(),
      minute: z.string().describe("Cron minute field"),
      hour: z.string().describe("Cron hour field"),
      day_of_week: z.string().describe("Cron day of week"),
      day_of_month: z.string().describe("Cron day of month"),
      month: z.string().describe("Cron month"),
      is_active: z.boolean().optional(),
      only_when_online: z.boolean().optional(),
    },
    async ({ server_id, ...params }) => {
      try {
        return json(
          attrs(await ptero.client.createSchedule(server_id, params)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "update_schedule",
    "Update an existing schedule",
    {
      server_id: z.string().describe("Server identifier"),
      schedule_id: z.number().describe("Schedule ID"),
      name: z.string().optional(),
      minute: z.string().optional(),
      hour: z.string().optional(),
      day_of_week: z.string().optional(),
      day_of_month: z.string().optional(),
      month: z.string().optional(),
      is_active: z.boolean().optional(),
      only_when_online: z.boolean().optional(),
    },
    async ({ server_id, schedule_id, ...params }) => {
      try {
        return json(
          attrs(
            await ptero.client.updateSchedule(server_id, schedule_id, params),
          ),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "execute_schedule",
    "Execute a schedule immediately",
    {
      server_id: z.string().describe("Server identifier"),
      schedule_id: z.number().describe("Schedule ID"),
    },
    async ({ server_id, schedule_id }) => {
      try {
        await ptero.client.executeSchedule(server_id, schedule_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_schedule",
    "Delete a schedule",
    {
      server_id: z.string().describe("Server identifier"),
      schedule_id: z.number().describe("Schedule ID"),
    },
    async ({ server_id, schedule_id }) => {
      try {
        await ptero.client.deleteSchedule(server_id, schedule_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_schedule_task",
    "Add a task to a schedule",
    {
      server_id: z.string().describe("Server identifier"),
      schedule_id: z.number().describe("Schedule ID"),
      action: z.enum(["command", "power", "backup"]),
      payload: z.string().describe("Command text, power signal, or empty for backup"),
      time_offset: z.number().int().nonnegative().describe("Seconds after schedule trigger"),
      continue_on_failure: z.boolean().optional(),
    },
    async ({ server_id, schedule_id, ...params }) => {
      try {
        return json(
          attrs(
            await ptero.client.createScheduleTask(
              server_id,
              schedule_id,
              params,
            ),
          ),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "update_schedule_task",
    "Update an existing schedule task",
    {
      server_id: z.string().describe("Server identifier"),
      schedule_id: z.number().describe("Schedule ID"),
      task_id: z.number().describe("Task ID"),
      action: z.enum(["command", "power", "backup"]).optional(),
      payload: z.string().optional().describe("Command text, power signal, or empty for backup"),
      time_offset: z.number().int().nonnegative().optional().describe("Seconds after schedule trigger"),
      continue_on_failure: z.boolean().optional(),
    },
    async ({ server_id, schedule_id, task_id, ...params }) => {
      try {
        return json(attrs(await ptero.client.updateScheduleTask(
          server_id,
          schedule_id,
          task_id,
          params,
        )));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_schedule_task",
    "Remove a task from a schedule",
    {
      server_id: z.string().describe("Server identifier"),
      schedule_id: z.number().describe("Schedule ID"),
      task_id: z.number().describe("Task ID"),
    },
    async ({ server_id, schedule_id, task_id }) => {
      try {
        await ptero.client.deleteScheduleTask(
          server_id,
          schedule_id,
          task_id,
        );
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Network ───────────────────────────────────────────────────────

  server.tool(
    "list_network_allocations",
    "List network allocations (ports) for a server",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        return json(attrsList(await ptero.client.listAllocations(server_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "set_primary_allocation",
    "Set the primary allocation (port) for a server",
    {
      server_id: z.string().describe("Server identifier"),
      allocation_id: z.number().describe("Allocation ID"),
    },
    async ({ server_id, allocation_id }) => {
      try {
        return json(
          attrs(
            await ptero.client.setPrimaryAllocation(server_id, allocation_id),
          ),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_allocation",
    "Allocate an additional port to a server",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        return json(attrs(await ptero.client.createAllocation(server_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "update_allocation",
    "Update notes for a server network allocation",
    {
      server_id: z.string().describe("Server identifier"),
      allocation_id: z.number().describe("Allocation ID"),
      notes: z.string().describe("Allocation notes; provide an empty string to clear"),
    },
    async ({ server_id, allocation_id, notes }) => {
      try {
        return json(attrs(await ptero.client.updateAllocation(
          server_id,
          allocation_id,
          notes,
        )));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_allocation",
    "Remove an additional network allocation from a server",
    {
      server_id: z.string().describe("Server identifier"),
      allocation_id: z.number().describe("Allocation ID"),
    },
    async ({ server_id, allocation_id }) => {
      try {
        await ptero.client.deleteAllocation(server_id, allocation_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Subusers ──────────────────────────────────────────────────────

  server.tool(
    "list_subusers",
    "List subusers (additional accounts) for a server",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        return json(attrsList(await ptero.client.listSubusers(server_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_subuser",
    "Add a subuser to a server",
    {
      server_id: z.string().describe("Server identifier"),
      email: z.string().describe("User email"),
      permissions: z
        .array(z.string())
        .describe("Permissions list, e.g. ['control.console', 'control.start']"),
    },
    async ({ server_id, ...params }) => {
      try {
        return json(attrs(await ptero.client.createSubuser(server_id, params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "update_subuser",
    "Update a subuser's permissions",
    {
      server_id: z.string().describe("Server identifier"),
      user_id: z.string().describe("Subuser UUID"),
      permissions: z.array(z.string()),
    },
    async ({ server_id, user_id, permissions }) => {
      try {
        return json(
          attrs(
            await ptero.client.updateSubuser(server_id, user_id, permissions),
          ),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_subuser",
    "Get a subuser and their permissions for a server",
    {
      server_id: z.string().describe("Server identifier"),
      user_id: z.string().describe("Subuser UUID"),
    },
    async ({ server_id, user_id }) => {
      try {
        return json(attrs(await ptero.client.getSubuser(server_id, user_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_subuser",
    "Remove a subuser from a server",
    {
      server_id: z.string().describe("Server identifier"),
      user_id: z.string().describe("Subuser UUID"),
    },
    async ({ server_id, user_id }) => {
      try {
        await ptero.client.deleteSubuser(server_id, user_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Backups ───────────────────────────────────────────────────────

  server.tool(
    "list_backups",
    "List backups for a game server",
    {
      server_id: z.string().describe("Server identifier"),
      page: z.number().optional(),
      per_page: z.number().optional(),
    },
    async ({ server_id, ...query }) => {
      try {
        return json(
          attrsList(await ptero.client.listBackups(server_id, query)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_backup",
    "Create a new backup of a game server",
    {
      server_id: z.string().describe("Server identifier"),
      name: z.string().optional().describe("Backup name"),
      ignored: z.string().optional().describe("Newline-separated ignore patterns"),
      is_locked: z.boolean().optional(),
    },
    async ({ server_id, ...params }) => {
      try {
        return json(attrs(await ptero.client.createBackup(server_id, params)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_backup",
    "Get details of a specific backup",
    {
      server_id: z.string().describe("Server identifier"),
      backup_id: z.string().describe("Backup UUID"),
    },
    async ({ server_id, backup_id }) => {
      try {
        return json(attrs(await ptero.client.getBackup(server_id, backup_id)));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "get_backup_download_url",
    "Get a download URL for a backup",
    {
      server_id: z.string().describe("Server identifier"),
      backup_id: z.string().describe("Backup UUID"),
    },
    async ({ server_id, backup_id }) => {
      try {
        const result = await ptero.client.getBackupDownloadUrl(
          server_id,
          backup_id,
        );
        return json({ url: result.attributes.url });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "toggle_backup_lock",
    "Toggle the lock state of a backup (prevents/allows deletion)",
    {
      server_id: z.string().describe("Server identifier"),
      backup_id: z.string().describe("Backup UUID"),
    },
    async ({ server_id, backup_id }) => {
      try {
        return json(
          attrs(await ptero.client.toggleBackupLock(server_id, backup_id)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "restore_backup",
    "Restore a server from a backup",
    {
      server_id: z.string().describe("Server identifier"),
      backup_id: z.string().describe("Backup UUID"),
      truncate: z
        .boolean()
        .optional()
        .describe("Delete all files before restoring"),
    },
    async ({ server_id, backup_id, truncate }) => {
      try {
        await ptero.client.restoreBackup(
          server_id,
          backup_id,
          truncate ?? false,
        );
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_backup",
    "Delete a backup",
    {
      server_id: z.string().describe("Server identifier"),
      backup_id: z.string().describe("Backup UUID"),
    },
    async ({ server_id, backup_id }) => {
      try {
        await ptero.client.deleteBackup(server_id, backup_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Startup Variables ─────────────────────────────────────────────

  server.tool(
    "list_startup_variables",
    "List startup variables for a game server",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        return json(
          attrsList(await ptero.client.listStartupVariables(server_id)),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "update_startup_variable",
    "Update a startup variable value",
    {
      server_id: z.string().describe("Server identifier"),
      key: z.string().describe("Variable environment key, e.g. SERVER_JARFILE"),
      value: z.string().describe("New value"),
    },
    async ({ server_id, key, value }) => {
      try {
        return json(
          attrs(
            await ptero.client.updateStartupVariable(server_id, key, value),
          ),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Settings ──────────────────────────────────────────────────────

  server.tool(
    "rename_server",
    "Rename a game server",
    {
      server_id: z.string().describe("Server identifier"),
      name: z.string().describe("New server name"),
      description: z.string().optional(),
    },
    async ({ server_id, name, description }) => {
      try {
        await ptero.client.renameServer(server_id, name, description);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "reinstall_server",
    "Reinstall a game server (resets to egg defaults)",
    { server_id: z.string().describe("Server identifier") },
    async ({ server_id }) => {
      try {
        await ptero.client.reinstallServer(server_id);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "set_docker_image",
    "Change the Docker image for a game server",
    {
      server_id: z.string().describe("Server identifier"),
      docker_image: z.string().describe("Docker image, e.g. ghcr.io/pterodactyl/yolks:java_17"),
    },
    async ({ server_id, docker_image }) => {
      try {
        await ptero.client.setDockerImage(server_id, docker_image);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  // ─── Account ───────────────────────────────────────────────────────

  server.tool(
    "get_account",
    "Get the authenticated user's account info",
    {},
    async () => {
      try {
        return json(attrs(await ptero.client.getAccount()));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "update_account_email",
    "Change the authenticated account email (requires current password)",
    {
      email: z.string().email(),
      password: z.string().describe("Current account password"),
    },
    async ({ email, password }) => {
      try {
        await ptero.client.updateEmail(email, password);
        return json({ success: true, email });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "update_account_password",
    "Change the authenticated account password",
    {
      current_password: z.string(),
      password: z.string().min(8),
      password_confirmation: z.string().min(8),
    },
    async (params) => {
      try {
        if (params.password !== params.password_confirmation) {
          throw new Error("password and password_confirmation must match");
        }
        await ptero.client.updatePassword(params.current_password, params.password, params.password_confirmation);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "list_api_keys",
    "List API keys for the authenticated account",
    {},
    async () => {
      try {
        return json(attrsList(await ptero.client.listApiKeys()));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "create_api_key",
    "Create a new client API key",
    {
      description: z.string(),
      allowed_ips: z.array(z.string()).optional(),
    },
    async ({ description, allowed_ips }) => {
      try {
        return json(
          await ptero.client.createApiKey(description, allowed_ips),
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "delete_api_key",
    "Delete a client API key",
    { identifier: z.string().describe("API key identifier") },
    async ({ identifier }) => {
      try {
        await ptero.client.deleteApiKey(identifier);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "list_ssh_keys",
    "List SSH public keys on the authenticated account",
    {},
    async () => {
      try {
        return json(attrsList(await ptero.client.listSshKeys()));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "add_ssh_key",
    "Add an SSH public key to the authenticated account",
    {
      name: z.string().min(1),
      public_key: z.string().min(1),
    },
    async ({ name, public_key }) => {
      try {
        return json(await ptero.client.addSshKey(name, public_key));
      } catch (e) {
        return error(e);
      }
    },
  );

  server.tool(
    "remove_ssh_key",
    "Remove an SSH public key from the authenticated account",
    { fingerprint: z.string().describe("SSH key fingerprint") },
    async ({ fingerprint }) => {
      try {
        await ptero.client.removeSshKey(fingerprint);
        return json({ success: true });
      } catch (e) {
        return error(e);
      }
    },
  );

}
