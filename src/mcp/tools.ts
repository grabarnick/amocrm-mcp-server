import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AmoClient } from '../amocrm/client.js';

export function registerTools(server: McpServer, amo: AmoClient) {
  server.tool(
    'amocrm_listLeads',
    'Получить список сделок amoCRM с пагинацией',
    {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Номер страницы (начиная с 1)' },
        limit: { type: 'number', description: 'Количество записей на странице (1-250)' },
      },
    },
    async (args) => {
      await amo.ensureAuth();
      const { page = 1, limit = 25 } = args ?? {};
      const offset = (page - 1) * limit;
      const data = await amo.get(`/api/v4/leads?limit=${limit}&page=${page}&with=contacts`);
      return { content: [{ type: 'text', text: JSON.stringify({ offset, page, limit, data }) }] };
    }
  );

  // ВРЕМЕННО ОТКЛЮЧЕНО: методы на запись
  // server.tool(
  //   'amocrm_createLead',
  //   'Создать новую сделку в amoCRM',
  //   {
  //     type: 'object',
  //     properties: {
  //       name: { type: 'string', description: 'Название сделки' },
  //       price: { type: 'number', description: 'Бюджет сделки' },
  //       pipeline_id: { type: 'number', description: 'ID воронки' },
  //       status_id: { type: 'number', description: 'ID статуса' },
  //     },
  //     required: ['name'],
  //   },
  //   async (args) => {
  //     await amo.ensureAuth();
  //     const payload = Array.isArray(args) ? args : [args];
  //     const data = await amo.post('/api/v4/leads', payload);
  //     return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  //   }
  // );

  server.tool(
    'amocrm_getContact',
    'Получить контакт по ID',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID контакта' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.get(`/api/v4/contacts/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_listContacts',
    'Получить список контактов amoCRM с пагинацией',
    {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Номер страницы (начиная с 1)' },
        limit: { type: 'number', description: 'Количество записей на странице (1-250)' },
      },
    },
    async (args) => {
      await amo.ensureAuth();
      const { page = 1, limit = 25 } = args ?? {};
      const data = await amo.get(`/api/v4/contacts?limit=${limit}&page=${page}`);
      return { content: [{ type: 'text', text: JSON.stringify({ page, limit, data }) }] };
    }
  );

  // ВРЕМЕННО ОТКЛЮЧЕНО: методы на запись
  // server.tool(
  //   'amocrm_createContact',
  //   'Создать новый контакт в amoCRM',
  //   {
  //     type: 'object',
  //     properties: {
  //       name: { type: 'string', description: 'Имя контакта' },
  //     },
  //     required: ['name'],
  //   },
  //   async (args) => {
  //     await amo.ensureAuth();
  //     const payload = Array.isArray(args) ? args : [args];
  //     const data = await amo.post('/api/v4/contacts', payload);
  //     return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  //   }
  // );

  // ВРЕМЕННО ОТКЛЮЧЕНО: методы на запись
  // server.tool(
  //   'amocrm_createNote',
  //   'Создать заметку для сущности (leads/contacts/companies)',
  //   {
  //     type: 'object',
  //     properties: {
  //       entity: { 
  //         type: 'string', 
  //         enum: ['leads', 'contacts', 'companies'],
  //         description: 'Тип сущности' 
  //       },
  //       payload: { 
  //         type: 'array',
  //         description: 'Массив заметок для создания'
  //       },
  //     },
  //     required: ['entity', 'payload'],
  //   },
  //   async (args) => {
  //     await amo.ensureAuth();
  //     const { entity, payload } = args;
  //     const data = await amo.post(`/api/v4/${entity}/notes`, payload);
  //     return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  //   }
  // );

  server.tool(
    'amocrm_exchangeAuthCode',
    'Обменять authorization code на токены OAuth2',
    {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Код авторизации' },
        redirect_uri: { type: 'string', description: 'Redirect URI (опционально)' },
      },
      required: ['code'],
    },
    async (args) => {
      const tokens = await amo.exchangeAuthCode(args.code, args.redirect_uri);
      return { content: [{ type: 'text', text: JSON.stringify(tokens) }] };
    }
  );
}


