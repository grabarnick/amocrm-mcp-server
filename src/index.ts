import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAmoClient } from './amocrm/client.js';
import { registerTools } from './mcp/tools.js';
import { loadConfig } from './config.js';

async function main() {
  const cfg = loadConfig();
  const amo = createAmoClient({
    baseUrl: cfg.AMO_BASE_URL,
    clientId: cfg.AMO_CLIENT_ID,
    clientSecret: cfg.AMO_CLIENT_SECRET,
    redirectUri: cfg.AMO_REDIRECT_URI,
    accessToken: cfg.AMO_ACCESS_TOKEN,
    refreshToken: cfg.AMO_REFRESH_TOKEN,
  });

  const mcp = new McpServer({ name: 'amocrm-mcp-server', version: '0.1.0' });
  registerTools(mcp, amo);
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', err);
  process.exit(1);
});


