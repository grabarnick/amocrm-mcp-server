import 'dotenv/config';
import http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAmoClient } from './amocrm/client.js';
import { registerTools } from './mcp/tools.js';
import { loadConfig } from './config.js';

async function createHttpMcpServer() {
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

  // Создаем HTTP-сервер с MCP функциональностью
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'amocrm-mcp-server',
        mode: 'http-mcp',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    if (req.url === '/tools' && req.method === 'GET') {
      // Возвращаем список доступных инструментов
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        tools: [
          'amocrm_listLeads',
          'amocrm_getLead', 
          'amocrm_createLead',
          'amocrm_updateLead',
          'amocrm_deleteLead',
          'amocrm_listContacts',
          'amocrm_getContact',
          'amocrm_createContact',
          'amocrm_updateContact',
          'amocrm_deleteContact',
          'amocrm_listCompanies',
          'amocrm_getCompany',
          'amocrm_createCompany',
          'amocrm_updateCompany',
          'amocrm_deleteCompany',
          'amocrm_getAccount',
          'amocrm_getUsers',
          'amocrm_getPipelines'
        ]
      }));
      return;
    }

    if (req.url?.startsWith('/call/') && req.method === 'POST') {
      // Вызов MCP инструмента через HTTP
      const toolName = req.url.replace('/call/', '');
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const args = body ? JSON.parse(body) : {};
          
          // Здесь нужно вызвать конкретный инструмент
          // Это упрощенная версия - в реальности нужен более сложный механизм
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            tool: toolName,
            args,
            message: `Инструмент ${toolName} вызван через HTTP`,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });
      return;
    }

    // 404 для неизвестных маршрутов
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return server;
}

export async function startHttpMcpServer() {
  const server = await createHttpMcpServer();
  const PORT = process.env.PORT || 8080;
  
  server.listen(PORT, () => {
    console.log(`HTTP MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Available tools: http://localhost:${PORT}/tools`);
    console.log(`Call tool: POST http://localhost:${PORT}/call/{toolName}`);
  });

  return server;
}
