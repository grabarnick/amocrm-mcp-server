import { startStreamableHttpMcpServer } from './streamable-http-mcp.js';

async function main() {
  try {
    console.log('🚀 Starting Streamable HTTP MCP Server...');
    await startStreamableHttpMcpServer();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
