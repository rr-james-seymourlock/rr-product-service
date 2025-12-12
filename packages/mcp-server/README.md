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

### Store Onboarding

Tools for onboarding new stores to the product ID extraction system:

- `store_check_exists` - Check if a store already exists by ID or domain
- `store_validate_metadata` - Validate store ID and domain format
- `store_filter_urls` - Filter URLs to remove non-product pages (cart, account, etc.)
- `store_analyze_urls` - Analyze product URLs to identify ID patterns
- `store_generate_patterns` - Generate ts-regex-builder code for patterns
- `store_insert_config` - Auto-insert generated config into store-registry config.ts
- `store_generate_fixture` - Generate test fixture JSON for product-id-extractor
- `store_run_tests` - Run tests for a specific store fixture
- `store_run_regression_tests` - Run all tests to check for regressions
- `store_commit_and_push` - Commit changes, push to remote, and optionally create PR

#### How It Works

You don't need to specify which tools to use - Claude automatically sees all available MCP tools and uses them when relevant. Just describe what you want naturally.

#### Example Prompts

**Full request:**
```
Add a new store: Ace Hardware (ID: 1234, domain: acehardware.com)

Product URLs:
- https://www.acehardware.com/departments/chainsaws/7011953
- https://www.acehardware.com/departments/faucets/4293065
- https://www.acehardware.com/departments/drills/8765432
```

**Shorter version:**
```
Onboard acehardware.com (store ID 1234) with these URLs:
[paste URLs]
```

**Just analyze patterns (no code generation):**
```
Analyze these URLs and tell me what product ID pattern you see:
[paste URLs]
```

#### What Happens Behind the Scenes

When you mention store onboarding + URLs, Claude will automatically:

1. Check if store exists (`store_check_exists`)
2. Validate metadata (`store_validate_metadata`)
3. Filter non-product URLs (`store_filter_urls`)
4. Analyze patterns (`store_analyze_urls`)
5. Generate config code (`store_generate_patterns`)
6. Create test fixture (`store_generate_fixture`)
7. Run tests (`store_run_tests`)

#### Tips

- **More URLs = better** - 5-10 product URLs helps identify patterns confidently
- **Include edge cases** - URLs with query params, different product types, variants
- **You can ask for specific steps** - e.g., "just analyze these URLs" if you only want pattern detection

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
