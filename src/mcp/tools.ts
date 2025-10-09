import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AmoClient } from '../amocrm/client.js';

export function registerTools(server: McpServer, amo: AmoClient) {
  server.registerTool(
    'amocrm.listLeads',
    {
      title: 'Список сделок',
      description: 'Получить список сделок amoCRM с пагинацией',
      inputSchema: {
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(250).optional(),
      },
    },
    async (args, _extra) => {
      await amo.ensureAuth();
      const { page = 1, limit = 25 } = args ?? {};
      const offset = (page - 1) * limit;
      const data = await amo.get(`/api/v4/leads?limit=${limit}&page=${page}&with=contacts`);
      return { content: [{ type: 'text', text: JSON.stringify({ offset, page, limit, data }) }] };
    }
  );

  server.registerTool(
    'amocrm.createLead',
    {
      title: 'Создать сделку',
      description: 'Создать новую сделку в amoCRM',
      inputSchema: {
        name: z.string(),
        price: z.number().optional(),
        pipeline_id: z.number().optional(),
        status_id: z.number().optional(),
      },
    },
    async (args, _extra) => {
      await amo.ensureAuth();
      const payload = Array.isArray(args) ? args : [args];
      const data = await amo.post('/api/v4/leads', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.registerTool(
    'amocrm.getContact',
    {
      title: 'Контакт по ID',
      description: 'Получить контакт по ID',
      inputSchema: { id: z.number().int().positive() },
    },
    async (args, _extra) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.get(`/api/v4/contacts/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.registerTool(
    'amocrm.listContacts',
    {
      title: 'Список контактов',
      description: 'Получить список контактов amoCRM с пагинацией',
      inputSchema: {
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(250).optional(),
      },
    },
    async (args, _extra) => {
      await amo.ensureAuth();
      const { page = 1, limit = 25 } = args ?? {};
      const data = await amo.get(`/api/v4/contacts?limit=${limit}&page=${page}`);
      return { content: [{ type: 'text', text: JSON.stringify({ page, limit, data }) }] };
    }
  );

  server.registerTool(
    'amocrm.createContact',
    {
      title: 'Создать контакт',
      description: 'Создать новый контакт в amoCRM',
      inputSchema: { name: z.string() },
    },
    async (args, _extra) => {
      await amo.ensureAuth();
      const payload = Array.isArray(args) ? args : [args];
      const data = await amo.post('/api/v4/contacts', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.registerTool(
    'amocrm.createNote',
    {
      title: 'Создать заметку',
      description: 'Создать заметку для сущности (leads/contacts/companies).',
      inputSchema: {
        entity: z.enum(['leads', 'contacts', 'companies']),
        payload: z.array(z.unknown()),
      },
    },
    async (args, _extra) => {
      await amo.ensureAuth();
      const { entity, payload } = args;
      const data = await amo.post(`/api/v4/${entity}/notes`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.registerTool(
    'amocrm.exchangeAuthCode',
    {
      title: 'OAuth2 обмен кода',
      description: 'Обменять authorization code на токены и сохранить их через колбэк клиента',
      inputSchema: { code: z.string(), redirect_uri: z.string().url().optional() },
    },
    async (args, _extra) => {
      const tokens = await amo.exchangeAuthCode(args.code, args.redirect_uri);
      return { content: [{ type: 'text', text: JSON.stringify(tokens) }] };
    }
  );
}


