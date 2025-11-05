import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AmoClient } from '../amocrm/client.js';

export function registerTools(server: McpServer, amo: AmoClient) {
  server.tool(
    'amocrm_getAccount',
    'Получить информацию об аккаунте amoCRM',
    {
      type: 'object',
      properties: {},
    },
    async (args) => {
      await amo.ensureAuth();
      const data = await amo.get('/api/v4/account');
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

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

  server.tool(
    'amocrm_createLead',
    'Создать новую сделку в amoCRM',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название сделки' },
        price: { type: 'number', description: 'Бюджет сделки' },
        pipeline_id: { type: 'number', description: 'ID воронки' },
        status_id: { type: 'number', description: 'ID статуса' },
      },
      required: ['name'],
    },
    async (args) => {
      await amo.ensureAuth();
      const payload = Array.isArray(args) ? args : [args];
      const data = await amo.post('/api/v4/leads', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

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

  server.tool(
    'amocrm_createContact',
    'Создать новый контакт в amoCRM',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Имя контакта' },
      },
      required: ['name'],
    },
    async (args) => {
      await amo.ensureAuth();
      const payload = Array.isArray(args) ? args : [args];
      const data = await amo.post('/api/v4/contacts', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_createNote',
    'Создать заметку для сущности (leads/contacts/companies)',
    {
      type: 'object',
      properties: {
        entity: { 
          type: 'string', 
          enum: ['leads', 'contacts', 'companies'],
          description: 'Тип сущности' 
        },
        payload: { 
          type: 'array',
          description: 'Массив заметок для создания'
        },
      },
      required: ['entity', 'payload'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { entity, payload } = args;
      const data = await amo.post(`/api/v4/${entity}/notes`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

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

  // ========== РАСШИРЕННАЯ РАБОТА СО СДЕЛКАМИ ==========

  server.tool(
    'amocrm_getLead',
    'Получить конкретную сделку по ID',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID сделки' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.get(`/api/v4/leads/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_updateLead',
    'Обновить существующую сделку',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID сделки' },
        name: { type: 'string', description: 'Название сделки' },
        price: { type: 'number', description: 'Бюджет сделки' },
        pipeline_id: { type: 'number', description: 'ID воронки' },
        status_id: { type: 'number', description: 'ID статуса' },
        responsible_user_id: { type: 'number', description: 'ID ответственного пользователя' },
        custom_fields_values: { type: 'array', description: 'Массив кастомных полей' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id, ...updateData } = args;
      const payload = [{ id, ...updateData }];
      const data = await amo.patch('/api/v4/leads', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_deleteLead',
    'Удалить сделку',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID сделки' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.delete(`/api/v4/leads/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_searchLeads',
    'Поиск сделок по фильтрам',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Поисковый запрос' },
        status_id: { type: 'number', description: 'ID статуса' },
        pipeline_id: { type: 'number', description: 'ID воронки' },
        responsible_user_id: { type: 'number', description: 'ID ответственного' },
        limit: { type: 'number', description: 'Количество результатов (1-250)' },
      },
    },
    async (args) => {
      await amo.ensureAuth();
      const { query, status_id, pipeline_id, responsible_user_id, limit = 25 } = args;
      let url = `/api/v4/leads?limit=${limit}`;
      if (query) url += `&query=${encodeURIComponent(query)}`;
      if (status_id) url += `&filter[statuses][]=${status_id}`;
      if (pipeline_id) url += `&filter[pipelines][]=${pipeline_id}`;
      if (responsible_user_id) url += `&filter[responsible_user_id]=${responsible_user_id}`;
      const data = await amo.get(url);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_linkLeadToContact',
    'Связать сделку с контактом',
    {
      type: 'object',
      properties: {
        lead_id: { type: 'number', description: 'ID сделки' },
        contact_id: { type: 'number', description: 'ID контакта' },
      },
      required: ['lead_id', 'contact_id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { lead_id, contact_id } = args;
      const data = await amo.post(`/api/v4/leads/${lead_id}/link`, [{
        to_entity_id: contact_id,
        to_entity_type: 'contacts'
      }]);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_linkLeadToCompany',
    'Связать сделку с компанией',
    {
      type: 'object',
      properties: {
        lead_id: { type: 'number', description: 'ID сделки' },
        company_id: { type: 'number', description: 'ID компании' },
      },
      required: ['lead_id', 'company_id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { lead_id, company_id } = args;
      const data = await amo.post(`/api/v4/leads/${lead_id}/link`, [{
        to_entity_id: company_id,
        to_entity_type: 'companies'
      }]);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ========== ВОРОНКИ И ЭТАПЫ ==========

  server.tool(
    'amocrm_listPipelines',
    'Получить список всех воронок',
    {
      type: 'object',
      properties: {},
    },
    async (args) => {
      await amo.ensureAuth();
      const data = await amo.get('/api/v4/leads/pipelines');
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_getPipeline',
    'Получить конкретную воронку с этапами',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID воронки' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.get(`/api/v4/leads/pipelines/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_moveLeadToStatus',
    'Переместить сделку в другой статус',
    {
      type: 'object',
      properties: {
        lead_id: { type: 'number', description: 'ID сделки' },
        status_id: { type: 'number', description: 'ID нового статуса' },
        pipeline_id: { type: 'number', description: 'ID воронки (если меняется воронка)' },
      },
      required: ['lead_id', 'status_id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { lead_id, status_id, pipeline_id } = args;
      const updateData: any = { id: lead_id, status_id };
      if (pipeline_id) updateData.pipeline_id = pipeline_id;
      const data = await amo.patch('/api/v4/leads', [updateData]);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ========== КОМПАНИИ ==========

  server.tool(
    'amocrm_listCompanies',
    'Получить список компаний с пагинацией',
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
      const data = await amo.get(`/api/v4/companies?limit=${limit}&page=${page}`);
      return { content: [{ type: 'text', text: JSON.stringify({ page, limit, data }) }] };
    }
  );

  server.tool(
    'amocrm_getCompany',
    'Получить компанию по ID',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID компании' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.get(`/api/v4/companies/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_createCompany',
    'Создать новую компанию',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название компании' },
        custom_fields_values: { type: 'array', description: 'Массив кастомных полей' },
      },
      required: ['name'],
    },
    async (args) => {
      await amo.ensureAuth();
      const payload = Array.isArray(args) ? args : [args];
      const data = await amo.post('/api/v4/companies', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_updateCompany',
    'Обновить существующую компанию',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID компании' },
        name: { type: 'string', description: 'Название компании' },
        custom_fields_values: { type: 'array', description: 'Массив кастомных полей' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id, ...updateData } = args;
      const payload = [{ id, ...updateData }];
      const data = await amo.patch('/api/v4/companies', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_deleteCompany',
    'Удалить компанию',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID компании' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.delete(`/api/v4/companies/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_searchCompanies',
    'Поиск компаний',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Поисковый запрос' },
        limit: { type: 'number', description: 'Количество результатов (1-250)' },
      },
    },
    async (args) => {
      await amo.ensureAuth();
      const { query, limit = 25 } = args;
      let url = `/api/v4/companies?limit=${limit}`;
      if (query) url += `&query=${encodeURIComponent(query)}`;
      const data = await amo.get(url);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ========== ЗАДАЧИ ==========

  server.tool(
    'amocrm_listTasks',
    'Получить список задач',
    {
      type: 'object',
      properties: {
        entity_type: { 
          type: 'string', 
          enum: ['leads', 'contacts', 'companies', 'customers'],
          description: 'Тип сущности' 
        },
        entity_id: { type: 'number', description: 'ID сущности' },
        responsible_user_id: { type: 'number', description: 'ID ответственного пользователя' },
        is_completed: { type: 'boolean', description: 'Фильтр по статусу выполнения' },
        limit: { type: 'number', description: 'Количество результатов (1-250)' },
      },
    },
    async (args) => {
      await amo.ensureAuth();
      const { entity_type, entity_id, responsible_user_id, is_completed, limit = 25 } = args ?? {};
      let url = `/api/v4/tasks?limit=${limit}`;
      if (entity_type) url += `&filter[entity_type]=${entity_type}`;
      if (entity_id) url += `&filter[entity_id]=${entity_id}`;
      if (responsible_user_id) url += `&filter[responsible_user_id]=${responsible_user_id}`;
      if (is_completed !== undefined) url += `&filter[is_completed]=${is_completed}`;
      const data = await amo.get(url);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_createTask',
    'Создать новую задачу',
    {
      type: 'object',
      properties: {
        entity_type: { 
          type: 'string', 
          enum: ['leads', 'contacts', 'companies', 'customers'],
          description: 'Тип сущности' 
        },
        entity_id: { type: 'number', description: 'ID сущности' },
        text: { type: 'string', description: 'Текст задачи' },
        complete_till_at: { type: 'number', description: 'Время выполнения (unix timestamp)' },
        responsible_user_id: { type: 'number', description: 'ID ответственного пользователя' },
        task_type_id: { type: 'number', description: 'ID типа задачи' },
      },
      required: ['entity_type', 'entity_id', 'text', 'complete_till_at'],
    },
    async (args) => {
      await amo.ensureAuth();
      const payload = Array.isArray(args) ? args : [args];
      const data = await amo.post('/api/v4/tasks', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_updateTask',
    'Обновить задачу',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID задачи' },
        text: { type: 'string', description: 'Текст задачи' },
        complete_till_at: { type: 'number', description: 'Время выполнения (unix timestamp)' },
        is_completed: { type: 'boolean', description: 'Статус выполнения' },
        responsible_user_id: { type: 'number', description: 'ID ответственного пользователя' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id, ...updateData } = args;
      const payload = [{ id, ...updateData }];
      const data = await amo.patch('/api/v4/tasks', payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_completeTask',
    'Отметить задачу как выполненную',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID задачи' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.patch('/api/v4/tasks', [{ id, is_completed: true }]);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ========== ПОЛЬЗОВАТЕЛИ ==========

  server.tool(
    'amocrm_listUsers',
    'Получить список пользователей аккаунта',
    {
      type: 'object',
      properties: {},
    },
    async (args) => {
      await amo.ensureAuth();
      const data = await amo.get('/api/v4/users');
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_getUser',
    'Получить пользователя по ID',
    {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID пользователя' },
      },
      required: ['id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { id } = args;
      const data = await amo.get(`/api/v4/users/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  // ========== ПОЛЯ (Custom Fields) ==========

  server.tool(
    'amocrm_listCustomFields',
    'Получить список кастомных полей для сущности',
    {
      type: 'object',
      properties: {
        entity_type: { 
          type: 'string', 
          enum: ['leads', 'contacts', 'companies', 'customers'],
          description: 'Тип сущности (leads, contacts, companies, customers)' 
        },
      },
      required: ['entity_type'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { entity_type } = args;
      const data = await amo.get(`/api/v4/${entity_type}/custom_fields`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_getCustomField',
    'Получить конкретное кастомное поле по ID',
    {
      type: 'object',
      properties: {
        entity_type: { 
          type: 'string', 
          enum: ['leads', 'contacts', 'companies', 'customers'],
          description: 'Тип сущности (leads, contacts, companies, customers)' 
        },
        id: { type: 'number', description: 'ID кастомного поля' },
      },
      required: ['entity_type', 'id'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { entity_type, id } = args;
      const data = await amo.get(`/api/v4/${entity_type}/custom_fields/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    'amocrm_createCustomField',
    'Создать новое кастомное поле для сущности',
    {
      type: 'object',
      properties: {
        entity_type: { 
          type: 'string', 
          enum: ['leads', 'contacts', 'companies', 'customers'],
          description: 'Тип сущности (leads, contacts, companies, customers)' 
        },
        name: { type: 'string', description: 'Название поля' },
        type: { 
          type: 'string', 
          enum: ['text', 'numeric', 'checkbox', 'select', 'multiselect', 'date', 'url', 'textarea', 'radiobutton', 'streetaddress', 'date_time', 'price', 'category', 'linked_entity', 'file', 'tracking_data'],
          description: 'Тип поля (text, numeric, checkbox, select, multiselect, date, url, textarea, radiobutton, streetaddress, date_time, price, category, linked_entity, file, tracking_data)' 
        },
        code: { type: 'string', description: 'Код поля (опционально, для уникальной идентификации)' },
        is_api_only: { type: 'boolean', description: 'Доступно только через API (по умолчанию false)' },
        enums: { 
          type: 'array', 
          description: 'Массив значений для полей типа select/multiselect/radiobutton (опционально)' 
        },
      },
      required: ['entity_type', 'name', 'type'],
    },
    async (args) => {
      await amo.ensureAuth();
      const { entity_type, ...fieldData } = args;
      const payload = Array.isArray(fieldData) ? fieldData : [fieldData];
      const data = await amo.post(`/api/v4/${entity_type}/custom_fields`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(data) }] };
    }
  );
}


