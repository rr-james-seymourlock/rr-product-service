#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerPRDTools } from './tools/prd-manager';
import { registerStoreOnboardingTools } from './tools/store-onboarding';
import { registerTaskTools } from './tools/task-manager';

async function main() {
  // Create server instance
  const server = new McpServer({
    name: 'rr-product-service',
    version: '1.0.0',
  });

  const transport = new StdioServerTransport();

  // Register all tools
  registerPRDTools(server);
  registerTaskTools(server);
  registerStoreOnboardingTools(server);

  await server.connect(transport);

  console.error('RR Product Service MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
