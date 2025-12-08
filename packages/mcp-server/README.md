# RR MCP Server

The RR MCP Server provides tools to AI Agents for working with the codebase.

## Available Tools

### PRD Manager

Tools for managing Product Requirements Documents (PRDs):

- `list_prds` - List all PRD files
- `get_prd` - Get the contents of a specific PRD
- `create_prd` - Create a new structured PRD
- `add_user_story` - Add a user story to an existing PRD
- `update_story_status` - Update the status of a user story
- `export_prd_markdown` - Export PRD as markdown
- `get_implementation_prompts` - Generate implementation prompts from PRD
- `get_improvement_suggestions` - Get suggestions to improve the PRD
- `get_project_status` - Get project status overview

PRDs are stored in a `.prds/` directory in your project root.

## Build MCP Server

Run the command:

```bash
pnpm --filter "@rr/mcp-server" build
```

The command will build the MCP Server at `packages/mcp-server/build/index.js`.

## Adding MCP Servers to AI Coding Tools

Before getting started, retrieve the absolute path to the `index.js` file created above. You can normally do this in your IDE by right-clicking the `index.js` file and selecting `Copy Path`.

I will reference this as `<full-path>` in the steps below: please replace it with the full path to your `index.js`.

### Claude Code

Run the command below:

```bash
claude mcp add rr-product-service node <full-path>
```

Restart Claude Code. If no errors appear, the MCP should be correctly configured.

### Codex

Open the Codex YAML config and add the following:

```yaml
[mcp_servers.rr-product-service]
command = "node"
args = ["<full-path>"]
```

### Cursor

Open the `mcp.json` config in Cursor and add the following config:

```json
{
  "mcpServers": {
    "rr-product-service": {
      "command": "node",
      "args": ["<full-path>"]
    }
  }
}
```

## Adding New Tools

To add new tools to the MCP server:

1. Create a new file in `src/tools/` (e.g., `src/tools/my-tool.ts`)
2. Export a registration function (e.g., `registerMyTools(server: McpServer)`)
3. Import and call the registration function in `src/index.ts`
4. Add the export to `package.json` under `exports`
5. Rebuild the server with `pnpm --filter "@rr/mcp-server" build`
