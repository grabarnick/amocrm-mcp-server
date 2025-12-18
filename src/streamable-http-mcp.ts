import 'dotenv/config';
import http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAmoClient } from './amocrm/client.js';
import { registerTools } from './mcp/tools.js';
import { loadConfig } from './config.js';
import { createTokenUpdater } from './do-env-updater.js';
import { v4 as uuidv4 } from 'uuid';
import { validateBearerToken, isPublicEndpoint } from './auth.js';

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
  private authToken?: string;

  constructor() {
    const cfg = loadConfig();
    this.authToken = cfg.MCP_AUTH_TOKEN;

    // Определяем тип токена: долгосрочный или обычный
    const isLongTermToken = !!cfg.AMO_LONG_TERM_TOKEN;
    const accessToken = isLongTermToken ? cfg.AMO_LONG_TERM_TOKEN : cfg.AMO_ACCESS_TOKEN;

    this.amo = createAmoClient({
      baseUrl: cfg.AMO_BASE_URL,
      clientId: cfg.AMO_CLIENT_ID,
      clientSecret: cfg.AMO_CLIENT_SECRET,
      redirectUri: cfg.AMO_REDIRECT_URI,
      accessToken: accessToken,
      refreshToken: cfg.AMO_REFRESH_TOKEN,
      isLongTermToken: isLongTermToken,
      // Автоматическое обновление токенов в DO App Platform (только для обычных токенов)
      onTokensUpdated: isLongTermToken ? undefined : async (tokens) => {
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Проверка авторизации для защищенных эндпоинтов
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    if (!isPublicEndpoint(path)) {
      if (!validateBearerToken(req, res, this.authToken)) {
        return; // validateBearerToken уже отправил 401 ответ
      }
    }

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
          'amocrm_createLead',
          'amocrm_getContact',
          'amocrm_listContacts',
          'amocrm_createContact',
          'amocrm_createNote',
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
                  name: 'amocrm_createLead',
                  description: 'Создать новую сделку в amoCRM',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Название сделки' },
                      price: { type: 'number', description: 'Бюджет сделки' },
                      pipeline_id: { type: 'number', description: 'ID воронки' },
                      status_id: { type: 'number', description: 'ID статуса' }
                    },
                    required: ['name']
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
                  name: 'amocrm_listContacts',
                  description: 'Получить список контактов amoCRM с пагинацией',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      page: { type: 'number', description: 'Номер страницы (начиная с 1)' },
                      limit: { type: 'number', description: 'Количество записей на странице (1-250)' }
                    }
                  }
                },
                {
                  name: 'amocrm_createContact',
                  description: 'Создать новый контакт в amoCRM',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Имя контакта' }
                    },
                    required: ['name']
                  }
                },
                {
                  name: 'amocrm_createNote',
                  description: 'Создать заметку для сущности',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      entity_type: {
                        type: 'string',
                        enum: ['leads', 'contacts', 'companies'],
                        description: 'Тип сущности'
                      },
                      entity_id: {
                        type: 'number',
                        description: 'ID сущности'
                      },
                      note_type: {
                        type: 'string',
                        description: 'Тип заметки (common, call_in, call_out, etc). По умолчанию: common'
                      },
                      text: {
                        type: 'string',
                        description: 'Текст заметки'
                      },
                      params: {
                        type: 'object',
                        description: 'Дополнительные параметры'
                      }
                    },
                    required: ['entity_type', 'entity_id', 'text']
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
                },
                // Дополнительно зарегистрированные инструменты
                { name: 'amocrm_updateLead', description: 'Обновить существующую сделку', inputSchema: { type: 'object', properties: { id: { type: 'number' }, name: { type: 'string' }, price: { type: 'number' }, pipeline_id: { type: 'number' }, status_id: { type: 'number' }, responsible_user_id: { type: 'number' }, custom_fields_values: { type: 'array' } }, required: ['id'] } },
                { name: 'amocrm_deleteLead', description: 'Удалить сделку', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
                { name: 'amocrm_searchLeads', description: 'Поиск сделок по фильтрам', inputSchema: { type: 'object', properties: { query: { type: 'string' }, status_id: { type: 'number' }, pipeline_id: { type: 'number' }, responsible_user_id: { type: 'number' }, limit: { type: 'number' } } } },
                { name: 'amocrm_linkLeadToContact', description: 'Связать сделку с контактом', inputSchema: { type: 'object', properties: { lead_id: { type: 'number' }, contact_id: { type: 'number' } }, required: ['lead_id', 'contact_id'] } },
                { name: 'amocrm_linkLeadToCompany', description: 'Связать сделку с компанией', inputSchema: { type: 'object', properties: { lead_id: { type: 'number' }, company_id: { type: 'number' } }, required: ['lead_id', 'company_id'] } },
                { name: 'amocrm_listPipelines', description: 'Получить список всех воронок', inputSchema: { type: 'object', properties: {} } },
                { name: 'amocrm_getPipeline', description: 'Получить конкретную воронку с этапами', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
                { name: 'amocrm_moveLeadToStatus', description: 'Переместить сделку в другой статус', inputSchema: { type: 'object', properties: { lead_id: { type: 'number' }, status_id: { type: 'number' }, pipeline_id: { type: 'number' } }, required: ['lead_id', 'status_id'] } },
                { name: 'amocrm_createCompany', description: 'Создать новую компанию', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Название компании' }, custom_fields_values: { type: 'array', description: 'Массив кастомных полей компании' } }, required: ['name'] } },
                { name: 'amocrm_updateCompany', description: 'Обновить существующую компанию', inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID компании' }, name: { type: 'string', description: 'Название компании' }, custom_fields_values: { type: 'array', description: 'Массив кастомных полей компании' } }, required: ['id'] } },
                { name: 'amocrm_deleteCompany', description: 'Удалить компанию', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
                { name: 'amocrm_searchCompanies', description: 'Поиск компаний', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } } } },
                { name: 'amocrm_listTasks', description: 'Получить список задач', inputSchema: { type: 'object', properties: { entity_type: { type: 'string', enum: ['leads', 'contacts', 'companies', 'customers'] }, entity_id: { type: 'number' }, responsible_user_id: { type: 'number' }, is_completed: { type: 'boolean' }, limit: { type: 'number' } } } },
                { name: 'amocrm_createTask', description: 'Создать новую задачу', inputSchema: { type: 'object', properties: { entity_type: { type: 'string', enum: ['leads', 'contacts', 'companies', 'customers'] }, entity_id: { type: 'number' }, text: { type: 'string' }, complete_till_at: { type: 'number' }, responsible_user_id: { type: 'number' }, task_type_id: { type: 'number' } }, required: ['entity_type', 'entity_id', 'text', 'complete_till_at'] } },
                { name: 'amocrm_updateTask', description: 'Обновить задачу', inputSchema: { type: 'object', properties: { id: { type: 'number' }, text: { type: 'string' }, complete_till_at: { type: 'number' }, is_completed: { type: 'boolean' }, responsible_user_id: { type: 'number' } }, required: ['id'] } },
                { name: 'amocrm_completeTask', description: 'Отметить задачу как выполненную', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
                { name: 'amocrm_listUsers', description: 'Получить список пользователей аккаунта', inputSchema: { type: 'object', properties: {} } },
                { name: 'amocrm_getUser', description: 'Получить пользователя по ID', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
                { name: 'amocrm_listCustomFields', description: 'Получить список кастомных полей для сущности', inputSchema: { type: 'object', properties: { entity_type: { type: 'string', enum: ['leads', 'contacts', 'companies', 'customers'] } }, required: ['entity_type'] } },
                { name: 'amocrm_getCustomField', description: 'Получить конкретное кастомное поле по ID', inputSchema: { type: 'object', properties: { entity_type: { type: 'string', enum: ['leads', 'contacts', 'companies', 'customers'] }, id: { type: 'number' } }, required: ['entity_type', 'id'] } },
                { name: 'amocrm_createCustomField', description: 'Создать новое кастомное поле для сущности', inputSchema: { type: 'object', properties: { entity_type: { type: 'string', enum: ['leads', 'contacts', 'companies', 'customers'] }, name: { type: 'string' }, type: { type: 'string', enum: ['text', 'numeric', 'checkbox', 'select', 'multiselect', 'date', 'url', 'textarea', 'radiobutton', 'streetaddress', 'date_time', 'price', 'category', 'linked_entity', 'file', 'tracking_data'] }, code: { type: 'string' }, is_api_only: { type: 'boolean' }, enums: { type: 'array' } }, required: ['entity_type', 'name', 'type'] } },
                { name: 'amocrm_exchangeAuthCode', description: 'Обменять authorization code на токены OAuth2', inputSchema: { type: 'object', properties: { code: { type: 'string' }, redirect_uri: { type: 'string' } }, required: ['code'] } }
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

        case 'amocrm_createLead':
          const createLeadPayload = Array.isArray(args) ? args : [args];
          const createLeadData = await this.amo.post('/api/v4/leads', createLeadPayload);
          result = { content: [{ type: 'text', text: JSON.stringify(createLeadData) }] };
          break;

        case 'amocrm_getContact':
          const contactId = args?.id;
          if (!contactId) throw new Error('Contact ID is required');
          const contactData = await this.amo.get(`/api/v4/contacts/${contactId}`);
          result = { content: [{ type: 'text', text: JSON.stringify(contactData) }] };
          break;

        case 'amocrm_listContacts':
          const contactPage = args?.page || 1;
          const contactLimit = args?.limit || 25;
          const contactsListData = await this.amo.get(`/api/v4/contacts?limit=${contactLimit}&page=${contactPage}`);
          result = { content: [{ type: 'text', text: JSON.stringify({ page: contactPage, limit: contactLimit, data: contactsListData }) }] };
          break;

        case 'amocrm_createContact':
          const createContactPayload = Array.isArray(args) ? args : [args];
          const createContactData = await this.amo.post('/api/v4/contacts', createContactPayload);
          result = { content: [{ type: 'text', text: JSON.stringify(createContactData) }] };
          break;

        case 'amocrm_createNote':
          const { entity_type, entity_id, note_type = 'common', text, params } = args || {};
          if (!entity_type || !entity_id || !text) throw new Error('entity_type, entity_id and text are required');

          const noteParams = params || { text };
          const notePayload = [{
            entity_id,
            note_type,
            params: noteParams
          }];

          const noteData = await this.amo.post(`/api/v4/${entity_type}/notes`, notePayload);
          result = { content: [{ type: 'text', text: JSON.stringify(noteData) }] };
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

        case 'amocrm_updateLead': {
          const { id, ...updateData } = args || {};
          if (!id) throw new Error('Lead ID is required');
          const payload = [{ id, ...updateData }];
          const data = await this.amo.patch('/api/v4/leads', payload);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_deleteLead': {
          const { id } = args || {};
          if (!id) throw new Error('Lead ID is required');
          const data = await this.amo.delete(`/api/v4/leads/${id}`);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_searchLeads': {
          const { query, status_id, pipeline_id, responsible_user_id, limit = 25 } = args || {};
          let url = `/api/v4/leads?limit=${limit}`;
          if (query) url += `&query=${encodeURIComponent(query)}`;
          if (status_id) url += `&filter[statuses][]=${status_id}`;
          if (pipeline_id) url += `&filter[pipelines][]=${pipeline_id}`;
          if (responsible_user_id) url += `&filter[responsible_user_id]=${responsible_user_id}`;
          const data = await this.amo.get(url);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_linkLeadToContact': {
          const { lead_id, contact_id } = args || {};
          if (!lead_id || !contact_id) throw new Error('lead_id and contact_id are required');
          const data = await this.amo.post(`/api/v4/leads/${lead_id}/link`, [{ to_entity_id: contact_id, to_entity_type: 'contacts' }]);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_linkLeadToCompany': {
          const { lead_id, company_id } = args || {};
          if (!lead_id || !company_id) throw new Error('lead_id and company_id are required');
          const data = await this.amo.post(`/api/v4/leads/${lead_id}/link`, [{ to_entity_id: company_id, to_entity_type: 'companies' }]);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_listPipelines': {
          const data = await this.amo.get('/api/v4/leads/pipelines');
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_getPipeline': {
          const { id } = args || {};
          if (!id) throw new Error('Pipeline ID is required');
          const data = await this.amo.get(`/api/v4/leads/pipelines/${id}`);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_moveLeadToStatus': {
          const { lead_id, status_id, pipeline_id } = args || {};
          if (!lead_id || !status_id) throw new Error('lead_id and status_id are required');
          const payload: any = { id: lead_id, status_id };
          if (pipeline_id) payload.pipeline_id = pipeline_id;
          const data = await this.amo.patch('/api/v4/leads', [payload]);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_createCompany': {
          const payload = Array.isArray(args) ? args : [args];
          const data = await this.amo.post('/api/v4/companies', payload);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_updateCompany': {
          const { id, ...updateData } = args || {};
          if (!id) throw new Error('Company ID is required');
          const payload = [{ id, ...updateData }];
          const data = await this.amo.patch('/api/v4/companies', payload);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_deleteCompany': {
          const { id } = args || {};
          if (!id) throw new Error('Company ID is required');
          const data = await this.amo.delete(`/api/v4/companies/${id}`);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_searchCompanies': {
          const { query, limit = 25 } = args || {};
          let url = `/api/v4/companies?limit=${limit}`;
          if (query) url += `&query=${encodeURIComponent(query)}`;
          const data = await this.amo.get(url);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_listTasks': {
          const { entity_type, entity_id, responsible_user_id, is_completed, limit = 25 } = args || {};
          let url = `/api/v4/tasks?limit=${limit}`;
          if (entity_type) url += `&filter[entity_type]=${entity_type}`;
          if (entity_id) url += `&filter[entity_id]=${entity_id}`;
          if (responsible_user_id) url += `&filter[responsible_user_id]=${responsible_user_id}`;
          if (is_completed !== undefined) url += `&filter[is_completed]=${is_completed}`;
          const data = await this.amo.get(url);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_createTask': {
          const payload = Array.isArray(args) ? args : [args];
          const data = await this.amo.post('/api/v4/tasks', payload);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_updateTask': {
          const { id, ...updateData } = args || {};
          if (!id) throw new Error('Task ID is required');
          const payload = [{ id, ...updateData }];
          const data = await this.amo.patch('/api/v4/tasks', payload);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_completeTask': {
          const { id } = args || {};
          if (!id) throw new Error('Task ID is required');
          const data = await this.amo.patch('/api/v4/tasks', [{ id, is_completed: true }]);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_listUsers': {
          const data = await this.amo.get('/api/v4/users');
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_getUser': {
          const { id } = args || {};
          if (!id) throw new Error('User ID is required');
          const data = await this.amo.get(`/api/v4/users/${id}`);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_listCustomFields': {
          const { entity_type } = args || {};
          if (!entity_type) throw new Error('entity_type is required');
          const data = await this.amo.get(`/api/v4/${entity_type}/custom_fields`);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_getCustomField': {
          const { entity_type, id } = args || {};
          if (!entity_type) throw new Error('entity_type is required');
          if (!id) throw new Error('Field ID is required');
          const data = await this.amo.get(`/api/v4/${entity_type}/custom_fields/${id}`);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_createCustomField': {
          const { entity_type, ...fieldData } = args || {};
          if (!entity_type) throw new Error('entity_type is required');
          if (!fieldData.name) throw new Error('Field name is required');
          if (!fieldData.type) throw new Error('Field type is required');
          const payload = [fieldData];
          const data = await this.amo.post(`/api/v4/${entity_type}/custom_fields`, payload);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }] };
          break;
        }
        case 'amocrm_exchangeAuthCode': {
          const { code, redirect_uri } = args || {};
          if (!code) throw new Error('code is required');
          const tokens = await this.amo.exchangeAuthCode(code, redirect_uri);
          result = { content: [{ type: 'text', text: JSON.stringify(tokens) }] };
          break;
        }

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
