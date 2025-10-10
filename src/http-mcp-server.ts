import 'dotenv/config';
import http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAmoClient } from './amocrm/client.js';
import { registerTools } from './mcp/tools.js';
import { loadConfig } from './config.js';
import { createTokenUpdater } from './do-env-updater.js';

// Функция для вызова MCP инструментов
async function callMcpTool(toolName: string, args: any, amo: any) {
  await amo.ensureAuth();
  
  switch (toolName) {
    case 'amocrm_getAccount':
      const accountData = await amo.get('/api/v4/account');
      return { content: [{ type: 'text', text: JSON.stringify(accountData) }] };
      
    case 'amocrm_listLeads':
      const { page = 1, limit = 25 } = args;
      const offset = (page - 1) * limit;
      const leadsData = await amo.get(`/api/v4/leads?limit=${limit}&page=${page}&with=contacts`);
      return { content: [{ type: 'text', text: JSON.stringify({ offset, page, limit, data: leadsData }) }] };
      
    case 'amocrm_getLead':
      const { id } = args;
      if (!id) throw new Error('ID сделки обязателен');
      const leadData = await amo.get(`/api/v4/leads/${id}?with=contacts,companies`);
      return { content: [{ type: 'text', text: JSON.stringify(leadData) }] };
      
    case 'amocrm_createLead':
      const leadPayload = args;
      const createdLead = await amo.post('/api/v4/leads', [leadPayload]);
      return { content: [{ type: 'text', text: JSON.stringify(createdLead) }] };
      
    case 'amocrm_updateLead':
      const { id: leadId, ...updateData } = args;
      if (!leadId) throw new Error('ID сделки обязателен');
      const updatedLead = await amo.patch(`/api/v4/leads/${leadId}`, updateData);
      return { content: [{ type: 'text', text: JSON.stringify(updatedLead) }] };
      
    case 'amocrm_deleteLead':
      const { id: deleteLeadId } = args;
      if (!deleteLeadId) throw new Error('ID сделки обязателен');
      await amo.delete(`/api/v4/leads/${deleteLeadId}`);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Сделка удалена' }) }] };
      
    case 'amocrm_listContacts':
      const { page: contactPage = 1, limit: contactLimit = 25 } = args;
      const contactOffset = (contactPage - 1) * contactLimit;
      const contactsData = await amo.get(`/api/v4/contacts?limit=${contactLimit}&page=${contactPage}&with=leads,companies`);
      return { content: [{ type: 'text', text: JSON.stringify({ offset: contactOffset, page: contactPage, limit: contactLimit, data: contactsData }) }] };
      
    case 'amocrm_getContact':
      const { id: contactId } = args;
      if (!contactId) throw new Error('ID контакта обязателен');
      const contactData = await amo.get(`/api/v4/contacts/${contactId}?with=leads,companies`);
      return { content: [{ type: 'text', text: JSON.stringify(contactData) }] };
      
    case 'amocrm_createContact':
      const contactPayload = args;
      const createdContact = await amo.post('/api/v4/contacts', [contactPayload]);
      return { content: [{ type: 'text', text: JSON.stringify(createdContact) }] };
      
    case 'amocrm_updateContact':
      const { id: updateContactId, ...contactUpdateData } = args;
      if (!updateContactId) throw new Error('ID контакта обязателен');
      const updatedContact = await amo.patch(`/api/v4/contacts/${updateContactId}`, contactUpdateData);
      return { content: [{ type: 'text', text: JSON.stringify(updatedContact) }] };
      
    case 'amocrm_deleteContact':
      const { id: deleteContactId } = args;
      if (!deleteContactId) throw new Error('ID контакта обязателен');
      await amo.delete(`/api/v4/contacts/${deleteContactId}`);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Контакт удален' }) }] };
      
    case 'amocrm_listCompanies':
      const { page: companyPage = 1, limit: companyLimit = 25 } = args;
      const companyOffset = (companyPage - 1) * companyLimit;
      const companiesData = await amo.get(`/api/v4/companies?limit=${companyLimit}&page=${companyPage}&with=leads,contacts`);
      return { content: [{ type: 'text', text: JSON.stringify({ offset: companyOffset, page: companyPage, limit: companyLimit, data: companiesData }) }] };
      
    case 'amocrm_getCompany':
      const { id: companyId } = args;
      if (!companyId) throw new Error('ID компании обязателен');
      const companyData = await amo.get(`/api/v4/companies/${companyId}?with=leads,contacts`);
      return { content: [{ type: 'text', text: JSON.stringify(companyData) }] };
      
    case 'amocrm_createCompany':
      const companyPayload = args;
      const createdCompany = await amo.post('/api/v4/companies', [companyPayload]);
      return { content: [{ type: 'text', text: JSON.stringify(createdCompany) }] };
      
    case 'amocrm_updateCompany':
      const { id: updateCompanyId, ...companyUpdateData } = args;
      if (!updateCompanyId) throw new Error('ID компании обязателен');
      const updatedCompany = await amo.patch(`/api/v4/companies/${updateCompanyId}`, companyUpdateData);
      return { content: [{ type: 'text', text: JSON.stringify(updatedCompany) }] };
      
    case 'amocrm_deleteCompany':
      const { id: deleteCompanyId } = args;
      if (!deleteCompanyId) throw new Error('ID компании обязателен');
      await amo.delete(`/api/v4/companies/${deleteCompanyId}`);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Компания удалена' }) }] };
      
    case 'amocrm_getUsers':
      const usersData = await amo.get('/api/v4/users');
      return { content: [{ type: 'text', text: JSON.stringify(usersData) }] };
      
    case 'amocrm_getPipelines':
      const pipelinesData = await amo.get('/api/v4/leads/pipelines');
      return { content: [{ type: 'text', text: JSON.stringify(pipelinesData) }] };
      
    default:
      throw new Error(`Неизвестный инструмент: ${toolName}`);
  }
}

async function createHttpMcpServer() {
  const cfg = loadConfig();
  const amo = createAmoClient({
    baseUrl: cfg.AMO_BASE_URL,
    clientId: cfg.AMO_CLIENT_ID,
    clientSecret: cfg.AMO_CLIENT_SECRET,
    redirectUri: cfg.AMO_REDIRECT_URI,
    accessToken: cfg.AMO_ACCESS_TOKEN,
    refreshToken: cfg.AMO_REFRESH_TOKEN,
    // Автоматическое обновление токенов в DO App Platform
    onTokensUpdated: async (tokens) => {
      console.log('🔄 Токены обновлены, сохраняем в DO App Platform...');
      await createTokenUpdater(tokens);
    }
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
          
          // Вызываем реальный MCP инструмент
          const result = await callMcpTool(toolName, args, amo);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            tool: toolName,
            args,
            result,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`Error calling tool ${toolName}:`, error);
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
