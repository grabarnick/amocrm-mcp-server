import { startHttpMcpServer } from './http-mcp-server.js';

async function main() {
  try {
    await startHttpMcpServer();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
