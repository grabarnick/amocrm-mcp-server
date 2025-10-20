# AmoCRM MCP Server

Минимальный MCP-сервер для интеграции с amoCRM (API v4): сделки, контакты, заметки, OAuth2.

## Требования
- Node.js >= 18.17
- Аккаунт amoCRM и данные интеграции (client_id, client_secret, redirect_uri)

## Установка
```bash
npm install
```

## Переменные окружения
Создайте файл `.env` в корне проекта и задайте значения:

### AmoCRM настройки
- `AMO_BASE_URL` — базовый URL аккаунта, например `https://example.amocrm.ru`
- `AMO_CLIENT_ID` — client_id интеграции
- `AMO_CLIENT_SECRET` — client_secret интеграции
- `AMO_REDIRECT_URI` — redirect URI, если используете Authorization Code Flow
- `AMO_ACCESS_TOKEN` — access token (после первичного обмена)
- `AMO_REFRESH_TOKEN` — refresh token (после первичного обмена)
- `AMO_LONG_TERM_TOKEN` — долгосрочный токен amoCRM (до 5 лет, **рекомендуется**)

> 💡 **Совет:** Используйте [долгосрочные токены](./LONG-TERM-TOKEN.md) для упрощения интеграции!

### 🔐 Безопасность HTTP эндпоинтов (опционально)
- `MCP_AUTH_TOKEN` — Bearer токен для защиты HTTP/Streamable эндпоинтов

> ⚠️ **Важно:** Если вы используете HTTP или Streamable HTTP транспорты, настоятельно рекомендуется установить `MCP_AUTH_TOKEN` для защиты ваших данных от несанкционированного доступа!

**Пример генерации безопасного токена:**
```bash
# Linux/macOS
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Подробнее: [SECURITY.md](./SECURITY.md)

## Запуск

### STDIO транспорт (для Claude Desktop)
```bash
# Разработка
npm run dev

# Продакшн
npm run build
npm run start
```

### HTTP транспорт (для внешнего доступа)
```bash
# Разработка
npm run dev:http

# Продакшн
npm run build
npm run start:http
```

**Пример использования с токеном:**
```bash
# Установка токена
export MCP_AUTH_TOKEN="your-secret-token-here"

# Запуск сервера
npm run start:http

# Тестирование
curl -H "Authorization: Bearer your-secret-token-here" \
     http://localhost:8080/tools
```

### Streamable HTTP транспорт (для MCP клиентов с SSE)
```bash
# Разработка
npm run dev:streamable

# Продакшн
npm run build
npm run start:streamable
```

**Пример использования с токеном:**
```bash
# SSE подключение
curl -H "Accept: text/event-stream" \
     -H "Authorization: Bearer your-secret-token-here" \
     http://localhost:8080/mcp
```

## Подключение MCP-клиента
### Claude Desktop (macOS)
1) Откройте `~/Library/Application Support/Claude/claude_desktop_config.json`
2) Добавьте секцию:
```json
{
  "mcpServers": {
    "amocrm": {
      "command": "node",
      "args": ["/Users/agrabarnick/Desktop/WORK/dev/amo/mcp/dist/index.js"],
      "env": {
        "AMO_BASE_URL": "https://example.amocrm.ru",
        "AMO_CLIENT_ID": "<client_id>",
        "AMO_CLIENT_SECRET": "<client_secret>",
        "AMO_REDIRECT_URI": "https://your.app/oauth/callback",
        "AMO_ACCESS_TOKEN": "",
        "AMO_REFRESH_TOKEN": ""
      }
    }
  }
}
```
Примечание: для разработки можно указать запуск через `npm run dev`, если клиент позволяет задать команду/аргументы.

## OAuth2 (получение токенов)
1) Получите authorization code согласно документации amoCRM (через браузерный flow вашей интеграции).
2) В клиенте MCP вызовите инструмент `amocrm.exchangeAuthCode` с параметрами:
```json
{
  "code": "<authorization_code>",
  "redirect_uri": "https://your.app/oauth/callback"
}
```
3) В ответе придут `access_token`, `refresh_token`, `expires_in`. Сохраните их в `.env`.
4) Далее сервер автоматически обновляет `access_token` по `refresh_token`.

## Доступные инструменты

### 🔐 OAuth авторизация
- `amocrm.exchangeAuthCode({ code, redirect_uri? })` - Обменять authorization code на токены OAuth2

### 📋 Сделки (Leads)
- `amocrm.listLeads({ page?, limit? })` - Получить список сделок с пагинацией
- `amocrm.getLead({ id })` - Получить конкретную сделку по ID
- `amocrm.createLead({ name, price?, pipeline_id?, status_id? } | Array<...>)` - Создать новую сделку
- `amocrm.updateLead({ id, name?, price?, pipeline_id?, status_id?, responsible_user_id?, custom_fields_values? })` - Обновить существующую сделку
- `amocrm.deleteLead({ id })` - Удалить сделку
- `amocrm.searchLeads({ query?, status_id?, pipeline_id?, responsible_user_id?, limit? })` - Поиск сделок по фильтрам
- `amocrm.linkLeadToContact({ lead_id, contact_id })` - Связать сделку с контактом
- `amocrm.linkLeadToCompany({ lead_id, company_id })` - Связать сделку с компанией

### 🎯 Воронки и этапы (Pipelines)
- `amocrm.listPipelines()` - Получить список всех воронок
- `amocrm.getPipeline({ id })` - Получить конкретную воронку с этапами
- `amocrm.moveLeadToStatus({ lead_id, status_id, pipeline_id? })` - Переместить сделку в другой статус

### 🏢 Компании (Companies)
- `amocrm.listCompanies({ page?, limit? })` - Получить список компаний с пагинацией
- `amocrm.getCompany({ id })` - Получить компанию по ID
- `amocrm.createCompany({ name, custom_fields_values? } | Array<...>)` - Создать новую компанию
- `amocrm.updateCompany({ id, name?, custom_fields_values? })` - Обновить существующую компанию
- `amocrm.deleteCompany({ id })` - Удалить компанию
- `amocrm.searchCompanies({ query?, limit? })` - Поиск компаний

### 👥 Контакты (Contacts)
- `amocrm.listContacts({ page?, limit? })` - Получить список контактов
- `amocrm.getContact({ id })` - Получить контакт по ID
- `amocrm.createContact({ name } | Array<...>)` - Создать новый контакт

### ✅ Задачи (Tasks)
- `amocrm.listTasks({ entity_type?, entity_id?, responsible_user_id?, is_completed?, limit? })` - Получить список задач
- `amocrm.createTask({ entity_type, entity_id, text, complete_till_at, responsible_user_id?, task_type_id? } | Array<...>)` - Создать новую задачу
- `amocrm.updateTask({ id, text?, complete_till_at?, is_completed?, responsible_user_id? })` - Обновить задачу
- `amocrm.completeTask({ id })` - Отметить задачу как выполненную

### 👤 Пользователи (Users)
- `amocrm.listUsers()` - Получить список пользователей аккаунта
- `amocrm.getUser({ id })` - Получить пользователя по ID

### 📝 Заметки (Notes)
- `amocrm.createNote({ entity: 'leads'|'contacts'|'companies', payload: [...] })` - Создать заметку для сущности

### Примеры использования

#### Сделки
```json
// Получить список сделок
{
  "tool": "amocrm.listLeads",
  "arguments": { "page": 1, "limit": 25 }
}

// Получить конкретную сделку
{
  "tool": "amocrm.getLead",
  "arguments": { "id": 123456 }
}

// Создать сделку
{
  "tool": "amocrm.createLead",
  "arguments": { 
    "name": "Новая сделка", 
    "price": 10000,
    "pipeline_id": 123,
    "status_id": 456
  }
}

// Обновить сделку
{
  "tool": "amocrm.updateLead",
  "arguments": { 
    "id": 123456,
    "price": 15000,
    "status_id": 789
  }
}

// Поиск сделок
{
  "tool": "amocrm.searchLeads",
  "arguments": { 
    "query": "важн",
    "pipeline_id": 123,
    "limit": 50
  }
}

// Связать сделку с контактом
{
  "tool": "amocrm.linkLeadToContact",
  "arguments": { 
    "lead_id": 123456,
    "contact_id": 789012
  }
}
```

#### Воронки
```json
// Получить все воронки
{
  "tool": "amocrm.listPipelines",
  "arguments": {}
}

// Получить конкретную воронку
{
  "tool": "amocrm.getPipeline",
  "arguments": { "id": 123 }
}

// Переместить сделку в другой статус
{
  "tool": "amocrm.moveLeadToStatus",
  "arguments": { 
    "lead_id": 123456,
    "status_id": 789
  }
}
```

#### Компании
```json
// Получить список компаний
{
  "tool": "amocrm.listCompanies",
  "arguments": { "page": 1, "limit": 25 }
}

// Создать компанию
{
  "tool": "amocrm.createCompany",
  "arguments": { "name": "ООО Рога и Копыта" }
}

// Поиск компаний
{
  "tool": "amocrm.searchCompanies",
  "arguments": { "query": "рога" }
}
```

#### Задачи
```json
// Создать задачу для сделки
{
  "tool": "amocrm.createTask",
  "arguments": {
    "entity_type": "leads",
    "entity_id": 123456,
    "text": "Позвонить клиенту",
    "complete_till_at": 1704067200
  }
}

// Получить задачи для сделки
{
  "tool": "amocrm.listTasks",
  "arguments": {
    "entity_type": "leads",
    "entity_id": 123456,
    "is_completed": false
  }
}

// Отметить задачу как выполненную
{
  "tool": "amocrm.completeTask",
  "arguments": { "id": 789012 }
}
```

## Тестирование

### Тестирование MCP сервера

После сборки вы можете протестировать MCP сервер несколькими способами:

#### Метод 1: MCP Inspector (рекомендуется)

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Inspector откроет веб-интерфейс, где вы сможете:
- Просмотреть все инструменты
- Тестировать вызовы
- Отлаживать ошибки

#### Метод 2: Claude Desktop

Подключите сервер к Claude Desktop (см. раздел "Подключение MCP-клиента" выше).

Подробнее: [TEST-MCP.md](./TEST-MCP.md)

### Тестирование API отдельно от MCP

Вы можете тестировать методы работы с AmoCRM API независимо от MCP сервера:

```bash
# Показать справку
npm run test-api

# Получить информацию об аккаунте
npm run test-api account

# Получить список сделок
npm run test-api leads 10

# Создать сделку
npm run test-api create-lead "Тестовая сделка"
```

Или используйте удобный скрипт:

```bash
./api-test.sh account
./api-test.sh leads 5
```

#### Подробная документация по тестированию

- **[TEST-MCP.md](./TEST-MCP.md)** - Тестирование MCP сервера
- **[TEST-API.md](./TEST-API.md)** - Тестирование AmoCRM API
- **[OAUTH-GUIDE.md](./OAUTH-GUIDE.md)** - Руководство по OAuth авторизации
- **[DO-TOKEN-AUTO-UPDATE.md](./DO-TOKEN-AUTO-UPDATE.md)** - 🆕 Автообновление токенов на DigitalOcean
- **[TESTING-GUIDE.md](./TESTING-GUIDE.md)** - Полное руководство по тестированию

#### Продвинутые примеры

В директории `examples/` находятся примеры для специфических сценариев:
- `advanced-test.ts` - создание сделок с контактами, поиск, обновление, добавление примечаний

## Ссылки
- Документация amoCRM (возможности и API): https://www.amocrm.ru/developers/content/crm_platform/platform-abilities
