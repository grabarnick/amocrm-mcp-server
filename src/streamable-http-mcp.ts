import 'dotenv/config';
import http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAmoClient } from './amocrm/client.js';
import { registerTools } from './mcp/tools.js';
import { loadConfig } from './config.js';
import { createTokenUpdater } from './do-env-updater.js';
import { v4 as uuidv4 } from 'uuid';

interface Session {
  id: string;
  initialized: boolean;
  streams: Set<http.ServerResponse>;
  createdAt: Date;
}

class StreamableHttpMcpServer {
  private sessions: Map<string, Session> = new Map();
  private server: http.Server;
  private amo: any;
  private mcp: McpServer;

  constructor() {
    const cfg = loadConfig();
    this.amo = createAmoClient({
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

    this.mcp = new McpServer({ name: 'amocrm-mcp-server', version: '0.1.0' });
    registerTools(this.mcp, this.amo);

    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private validateOrigin(req: http.IncomingMessage): boolean {
    const origin = req.headers.origin;
    const host = req.headers.host;
    
    // Для локального использования разрешаем localhost
    if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
      return true;
    }
    
    // Для облачного развертывания - разрешаем все запросы
    // В production здесь можно добавить проверку разрешенных доменов
    if (host?.includes('ondigitalocean.app') || host?.includes('digitalocean.com')) {
      return true;
    }
    
    // Если Origin не указан, но это не localhost - разрешаем для тестирования
    return true;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Безопасность: валидация Origin
    if (!this.validateOrigin(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Origin validation failed' }));
      return;
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    // MCP endpoint - основной endpoint для Streamable HTTP
    if (path === '/mcp') {
      await this.handleMcpRequest(req, res);
      return;
    }

    // Health check endpoint
    if (path === '/health' || path === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'amocrm-mcp-server',
        transport: 'streamable-http',
        mcpEndpoint: '/mcp',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Legacy endpoints для обратной совместимости
    if (path === '/tools') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        tools: [
          'amocrm_getAccount',
          'amocrm_listLeads',
          'amocrm_getLead',
          'amocrm_updateLead',
          'amocrm_getContact',
          'amocrm_listCompanies',
          'amocrm_getCompany'
        ]
      }));
      return;
    }

    // 404 для неизвестных маршрутов
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private async handleMcpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const sessionId = req.headers['mcp-session-id'] as string;
    const protocolVersion = req.headers['mcp-protocol-version'] as string || '2025-06-18';

    if (req.method === 'GET') {
      // Открытие SSE потока
      await this.handleGetRequest(req, res, sessionId);
    } else if (req.method === 'POST') {
      // Отправка JSON-RPC сообщения
      await this.handlePostRequest(req, res, sessionId, protocolVersion);
    } else if (req.method === 'DELETE') {
      // Завершение сессии
      await this.handleDeleteRequest(req, res, sessionId);
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  }

  private async handleGetRequest(req: http.IncomingMessage, res: http.ServerResponse, sessionId?: string) {
    const acceptHeader = req.headers.accept || '';
    
    if (!acceptHeader.includes('text/event-stream')) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Настройка SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Headers': 'Last-Event-ID'
    });

    // Получение или создание сессии
    let session = sessionId ? this.sessions.get(sessionId) : null;
    if (!session) {
      session = {
        id: uuidv4(),
        initialized: false,
        streams: new Set(),
        createdAt: new Date()
      };
      this.sessions.set(session.id, session);
    }

    // Добавляем поток к сессии
    session.streams.add(res);

    // Отправляем session ID в заголовке
    res.setHeader('Mcp-Session-Id', session.id);

    // Обработка отключения
    req.on('close', () => {
      session?.streams.delete(res);
      if (session?.streams.size === 0) {
        this.sessions.delete(session.id);
      }
    });

    // Отправляем приветственное сообщение
    this.sendSseMessage(res, {
      type: 'message',
      data: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notification/connected',
        params: {
          sessionId: session.id,
          timestamp: new Date().toISOString()
        }
      })
    });
  }

  private async handlePostRequest(req: http.IncomingMessage, res: http.ServerResponse, sessionId?: string, protocolVersion?: string) {
    const acceptHeader = req.headers.accept || '';
    
    if (!acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream')) {
      res.writeHead(406, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Accept header must include application/json or text/event-stream' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const message = JSON.parse(body);
        
        // Получение или создание сессии
        let session = sessionId ? this.sessions.get(sessionId) : null;
        if (!session) {
          session = {
            id: uuidv4(),
            initialized: false,
            streams: new Set(),
            createdAt: new Date()
          };
          this.sessions.set(session.id, session);
        }

        // Обработка JSON-RPC сообщения
        if (message.jsonrpc === '2.0') {
          if (message.method) {
            // Это запрос или уведомление
            const response = await this.handleJsonRpcRequest(message, session);
            
            if (response) {
              // Отправляем ответ через SSE или JSON
              if (acceptHeader.includes('text/event-stream')) {
                res.writeHead(200, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                  'Mcp-Session-Id': session.id
                });
                
                this.sendSseMessage(res, {
                  type: 'message',
                  data: JSON.stringify(response)
                });
                
                // Закрываем поток после отправки ответа
                setTimeout(() => {
                  res.end();
                }, 100);
              } else {
                res.writeHead(200, { 
                  'Content-Type': 'application/json',
                  'Mcp-Session-Id': session.id
                });
                res.end(JSON.stringify(response));
              }
            } else {
              // Уведомление - отвечаем 202 Accepted
              res.writeHead(202, { 'Mcp-Session-Id': session.id });
              res.end();
            }
          } else if (message.id !== undefined) {
            // Это ответ - отвечаем 202 Accepted
            res.writeHead(202, { 'Mcp-Session-Id': session.id });
            res.end();
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error' },
            id: null
          }));
        }
      } catch (error) {
        console.error('Error processing request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' },
          id: null
        }));
      }
    });
  }

  private async handleDeleteRequest(req: http.IncomingMessage, res: http.ServerResponse, sessionId?: string) {
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session ID required' }));
      return;
    }

    const session = this.sessions.get(sessionId);
    if (session) {
      // Закрываем все потоки сессии
      for (const stream of session.streams) {
        stream.end();
      }
      this.sessions.delete(sessionId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Session terminated' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
    }
  }

  private async handleJsonRpcRequest(message: any, session: Session): Promise<any> {
    try {
      switch (message.method) {
        case 'initialize':
          session.initialized = true;
          return {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion: '2025-06-18',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {}
              },
              serverInfo: {
                name: 'amocrm-mcp-server',
                version: '0.1.0'
              }
            }
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              tools: [
                {
                  name: 'amocrm_getAccount',
                  description: 'Получить информацию об аккаунте amoCRM',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'amocrm_listLeads',
                  description: 'Получить список сделок amoCRM с пагинацией',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      page: { type: 'number', description: 'Номер страницы (начиная с 1)' },
                      limit: { type: 'number', description: 'Количество записей на странице (1-250)' }
                    }
                  }
                },
                {
                  name: 'amocrm_getLead',
                  description: 'Получить сделку по ID',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', description: 'ID сделки' }
                    },
                    required: ['id']
                  }
                },
                {
                  name: 'amocrm_updateLead',
                  description: 'Обновить сделку в amoCRM',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', description: 'ID сделки' },
                      name: { type: 'string', description: 'Название сделки' },
                      price: { type: 'number', description: 'Бюджет сделки' },
                      status_id: { type: 'number', description: 'ID статуса' }
                    },
                    required: ['id']
                  }
                },
                {
                  name: 'amocrm_getContact',
                  description: 'Получить контакт по ID',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', description: 'ID контакта' }
                    },
                    required: ['id']
                  }
                },
                {
                  name: 'amocrm_listCompanies',
                  description: 'Получить список компаний amoCRM с пагинацией',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      page: { type: 'number', description: 'Номер страницы (начиная с 1)' },
                      limit: { type: 'number', description: 'Количество записей на странице (1-250)' }
                    }
                  }
                },
                {
                  name: 'amocrm_getCompany',
                  description: 'Получить компанию по ID',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', description: 'ID компании' }
                    },
                    required: ['id']
                  }
                }
              ]
            }
          };

        case 'tools/call':
          return await this.callTool(message.params, session);

        default:
          return {
            jsonrpc: '2.0',
            id: message.id,
            error: { code: -32601, message: 'Method not found' }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { 
          code: -32603, 
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async callTool(params: any, session: Session): Promise<any> {
    const { name, arguments: args } = params;
    
    try {
      await this.amo.ensureAuth();
      
      let result: any;
      
      switch (name) {
        case 'amocrm_getAccount':
          const accountData = await this.amo.get('/api/v4/account');
          result = { content: [{ type: 'text', text: JSON.stringify(accountData) }] };
          break;
          
        case 'amocrm_listLeads':
          const { page = 1, limit = 25 } = args || {};
          const offset = (page - 1) * limit;
          const leadsData = await this.amo.get(`/api/v4/leads?limit=${limit}&page=${page}&with=contacts`);
          result = { content: [{ type: 'text', text: JSON.stringify({ offset, page, limit, data: leadsData }) }] };
          break;

        case 'amocrm_getLead':
          const leadId = args?.id;
          if (!leadId) throw new Error('Lead ID is required');
          const leadData = await this.amo.get(`/api/v4/leads/${leadId}`);
          result = { content: [{ type: 'text', text: JSON.stringify(leadData) }] };
          break;

        case 'amocrm_updateLead':
          const updateLeadId = args?.id;
          if (!updateLeadId) throw new Error('Lead ID is required');
          const { id: _, ...updateData } = args;
          const updatedLeadData = await this.amo.patch(`/api/v4/leads/${updateLeadId}`, updateData);
          result = { content: [{ type: 'text', text: JSON.stringify(updatedLeadData) }] };
          break;

        case 'amocrm_getContact':
          const contactId = args?.id;
          if (!contactId) throw new Error('Contact ID is required');
          const contactData = await this.amo.get(`/api/v4/contacts/${contactId}`);
          result = { content: [{ type: 'text', text: JSON.stringify(contactData) }] };
          break;

        case 'amocrm_listCompanies':
          const companyPage = args?.page || 1;
          const companyLimit = args?.limit || 25;
          const companiesData = await this.amo.get(`/api/v4/companies?limit=${companyLimit}&page=${companyPage}`);
          result = { content: [{ type: 'text', text: JSON.stringify({ page: companyPage, limit: companyLimit, data: companiesData }) }] };
          break;

        case 'amocrm_getCompany':
          const companyId = args?.id;
          if (!companyId) throw new Error('Company ID is required');
          const companyData = await this.amo.get(`/api/v4/companies/${companyId}`);
          result = { content: [{ type: 'text', text: JSON.stringify(companyData) }] };
          break;
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      return {
        jsonrpc: '2.0',
        id: params.id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: params.id,
        error: {
          code: -32603,
          message: 'Tool execution failed',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private sendSseMessage(res: http.ServerResponse, message: { type: string; data: string; id?: string }) {
    if (message.id) {
      res.write(`id: ${message.id}\n`);
    }
    res.write(`event: ${message.type}\n`);
    res.write(`data: ${message.data}\n\n`);
  }

  async start(port: number | string = 8080) {
    const portNumber = typeof port === 'string' ? parseInt(port, 10) : port;
    return new Promise<void>((resolve) => {
      this.server.listen(portNumber, () => {
        console.log(`🚀 Streamable HTTP MCP Server running on port ${portNumber}`);
        console.log(`📡 MCP endpoint: http://localhost:${portNumber}/mcp`);
        console.log(`🏥 Health check: http://localhost:${portNumber}/health`);
        resolve();
      });
    });
  }

  async stop() {
    return new Promise<void>((resolve) => {
      this.server.close(() => {
        console.log('🛑 Streamable HTTP MCP Server stopped');
        resolve();
      });
    });
  }
}

export async function startStreamableHttpMcpServer() {
  const server = new StreamableHttpMcpServer();
  const PORT = process.env.PORT || 8080;
  await server.start(PORT);
  return server;
}
