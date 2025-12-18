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

Tools for onboarding new stores and updating existing stores in the product ID extraction system:

- `store_check_exists` - Check if a store config and/or test fixture already exists
- `store_validate_metadata` - Validate store ID and domain format
- `store_filter_urls` - Filter URLs to remove non-product pages (cart, account, etc.)
- `store_analyze_urls` - Analyze product URLs to identify ID patterns
- `store_generate_patterns` - Generate ts-regex-builder code for patterns
- `store_insert_config` - Auto-insert generated config into store-registry config.ts
- `store_generate_fixture` - Generate test fixture JSON for product-id-extractor
- `store_append_fixture` - Append new test cases to an existing fixture (for updating stores)
- `store_run_tests` - Run tests for a specific store fixture (checks if generic rules work)
- `store_run_regression_tests` - Run all tests to check for regressions
- `store_commit_and_push` - Commit changes, push to remote, and optionally create PR

#### How It Works

You don't need to specify which tools to use - Claude automatically sees all available MCP tools and uses them when relevant. Just describe what you want naturally.

#### Example Prompts

**Add a new store:**
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

**Update an existing store with more test cases:**
```
Add these URLs to the existing acehardware.com fixture:
- https://www.acehardware.com/departments/paint/1234567
- https://www.acehardware.com/departments/tools/7654321
```

**Just analyze patterns (no code generation):**
```
Analyze these URLs and tell me what product ID pattern you see:
[paste URLs]
```

**Check if generic rules work (no store config needed):**
```
Check if existing rules work for bloomingdales.com - run the tests
```

#### What Happens Behind the Scenes

When you mention store onboarding + URLs, Claude follows a **fixture-first workflow**:

1. **Check if store/fixture exists** (`store_check_exists`) - checks both config AND fixture
2. **Validate metadata** (`store_validate_metadata`)
3. **Filter non-product URLs** (`store_filter_urls`)
4. **Create test fixture** (`store_generate_fixture`) - creates fixture BEFORE config
5. **Run tests to check generic rules** (`store_run_tests`) - tests if built-in patterns work
6. **Only if generic rules fail:**
   - Analyze patterns (`store_analyze_urls`)
   - Generate config code (`store_generate_patterns`)
   - Run tests again (`store_run_tests`)

**Key insight:** Many stores work with generic extraction rules (e.g., common query params like `?id=`, `?sku=`). The tool tests these first to avoid creating unnecessary store-specific configs.

#### Tips

- **More URLs = better** - 5-10 product URLs helps identify patterns confidently
- **Include edge cases** - URLs with query params, different product types, variants
- **You can ask for specific steps** - e.g., "just analyze these URLs" if you only want pattern detection
- **Not all stores need configs** - Generic rules may work! The tool will tell you if a store-specific config is needed

### Cart Enricher Analysis

Tools for analyzing cart session data, validating matching logic, and generating test fixtures:

#### Data Analysis Tools

- `cart_analyze_session` - Analyze raw session data (product views + cart events) and generate a structured report with store metadata, product identification, and cart evolution tracking
- `cart_predict_matches` - Predict which matching strategies will apply to each cart item with confidence levels and rationale
- `cart_run_full_analysis` - Run the complete analysis workflow end-to-end (orchestrates all analysis tools)

#### System Evaluation Tools

- `cart_check_store_registry` - Verify store is configured in store-registry for ID extraction
- `cart_validate_id_extraction` - Run ID extraction on all session URLs and report results
- `cart_review_matching_logic` - Review cart-enricher's 9 matching strategies against session data and identify gaps
- `cart_suggest_improvements` - Recommend matching logic improvements based on data patterns (new strategies, confidence tuning, code examples)

#### Fixture Management Tools

- `cart_create_fixture` - Generate cart-enricher fixture TypeScript files from analyzed session data
- `cart_append_store_urls` - Add new URL test cases from session data to existing store-registry fixtures

#### How It Works

When you provide raw session data (product views and cart events), Claude uses these tools to:

1. **Analyze the session** - Extract store metadata, identify unique products, trace cart evolution
2. **Check store registry** - Verify ID extraction is configured for the store
3. **Validate ID extraction** - Test URL patterns against store-registry
4. **Predict matches** - Determine which of the 9 matching strategies will apply
5. **Review matching logic** - Identify which strategies work and which have gaps
6. **Suggest improvements** - Recommend code changes to improve matching
7. **Generate fixtures** - Create TypeScript test fixtures for cart-enricher

#### Matching Strategies

The cart-enricher uses 9 matching strategies with different confidence levels:

| Strategy | Confidence | Description |
|----------|------------|-------------|
| `sku` | High | Cart SKU matches product SKU |
| `variant_sku` | High | Cart SKU matches product variant SKU |
| `image_sku` | High | SKU extracted from cart image URL matches product SKU |
| `extracted_id_sku` | High | Extracted ID from cart URL matches product SKU |
| `url` | Medium | Normalized URL comparison |
| `extracted_id` | Medium | Extracted IDs from URLs match |
| `title_color` | Medium | Parsed "Title - Color" matches product title + color |
| `title` | Low | Fuzzy title similarity (Dice/Levenshtein) |
| `price` | Low | Price within 10% tolerance (supporting signal only) |

#### Example Prompts

**Full analysis of session data:**
```
Analyze this cart session and generate a fixture:

Product Views:
[paste product view JSON array]

Cart Events:
[paste cart events JSON array]
```

**Check if store is ready for cart enrichment:**
```
Check if macys.com is configured for product ID extraction
```

**Review matching logic for specific data:**
```
Review how cart-enricher matching strategies apply to this session data:
[paste session data]
```

**Get improvement suggestions:**
```
Suggest improvements to cart-enricher matching logic based on this data:
[paste session data]
```

**Add session URLs to store-registry:**
```
Add these session URLs to the store-registry fixture for macys.com:
[paste session data]
```

#### Input Data Format

The tools expect raw session data in this format:

**Product Views** (`RawProductViewEvent[]`):
```typescript
{
  store_id: string;          // e.g., "1234"
  store_name: string;        // e.g., "Macy's"
  url: string;               // Product page URL
  name: string;              // Product title
  sku_list?: string[];       // Available SKUs
  image_url?: string;        // Product image
  min_price?: number;        // Price in cents
  max_price?: number;        // Price in cents
  color_list?: string[];     // Available colors
}
```

**Cart Events** (`RawCartEvent[]`):
```typescript
{
  store_id: string;
  store_name: string;
  cart_total: number;        // Total in cents
  product_list: [{
    name: string;            // Cart item name
    url?: string;            // Product URL (if available)
    image_url?: string;      // Product image
    item_price: number;      // Price in cents
    quantity: number;
  }]
}
```

#### Tips

- **Provide both product views AND cart events** - The tools need both to analyze matching potential
- **Include the full session** - All product views the user saw, and all cart snapshots
- **Use `cart_run_full_analysis` for comprehensive reports** - It orchestrates all analysis tools
- **Check store registry first** - Use `cart_check_store_registry` to verify ID extraction is set up
- **Review before generating fixtures** - Use analysis tools to understand the data before creating fixtures

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
