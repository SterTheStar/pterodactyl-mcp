# pterodactyl-mcp

MCP server for managing [Pterodactyl Panel](https://pterodactyl.io) servers. Supports both HTTP (Streamable HTTP) and stdio transports.

## Features

- **Admin tools** (application API) — manage users, servers, nodes, locations, nests, eggs, databases, and allocations
- **Client tools** (client API) — control servers, manage files, backups, schedules, subusers, databases, startup variables, and network allocations
- **WebSocket console** — real-time server console streaming via Pterodactyl's websocket API

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your panel credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PTERODACTYL_URL` | Your panel URL (e.g. `https://panel.example.com`) |
| `PTERODACTYL_APP_KEY` | Application API key (`ptla_*`) for admin operations (optional) |
| `PTERODACTYL_CLIENT_KEY` | Client API key (`ptlc_*`) for client operations (optional) |
| `PORT` | HTTP server port (default: `3000`) |

At least one API key is required. You can use both to enable all tools.

### 3. Run

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start
```

## Transport modes

### HTTP (default)

Starts an Express server on the configured port:

```bash
npm start
# or
npx pterodactyl-mcp
```

The MCP endpoint is available at `http://localhost:3000/mcp`. A health check is at `/health`.

### Stdio

For use with MCP clients that communicate over stdin/stdout:

```bash
npx pterodactyl-mcp --stdio
```

## MCP client configuration

Add to your MCP client config (e.g. `.mcp.json`, Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "pterodactyl": {
      "command": "npx",
      "args": ["pterodactyl-mcp", "--stdio"],
      "env": {
        "PTERODACTYL_URL": "https://panel.example.com",
        "PTERODACTYL_APP_KEY": "ptla_your_application_key_here",
        "PTERODACTYL_CLIENT_KEY": "ptlc_your_client_key_here"
      }
    }
  }
}
```

## License

[MIT](LICENSE)
