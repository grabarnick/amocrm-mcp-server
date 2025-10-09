# Тестирование MCP сервера

Это руководство описывает, как тестировать AmoCRM MCP сервер.

## 🔍 Методы тестирования

### Метод 1: MCP Inspector (рекомендуется)

MCP Inspector - это официальный инструмент для тестирования и отладки MCP серверов.

```bash
# Установите и запустите inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

После запуска откроется веб-интерфейс, где вы сможете:
- Просмотреть все доступные инструменты
- Тестировать вызовы инструментов
- Видеть запросы и ответы в реальном времени
- Отлаживать ошибки

### Метод 2: Claude Desktop

Подключите сервер к Claude Desktop для реального тестирования:

1. Соберите проект:
   ```bash
   npm run build
   ```

2. Откройте конфигурацию Claude Desktop:
   ```bash
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. Добавьте конфигурацию:
   ```json
   {
     "mcpServers": {
       "amocrm": {
         "command": "node",
         "args": ["/Users/agrabarnick/Desktop/WORK/dev/amo/mcp/dist/index.js"],
         "env": {
           "AMO_BASE_URL": "https://yoursubdomain.amocrm.ru",
           "AMO_CLIENT_ID": "your_client_id",
           "AMO_CLIENT_SECRET": "your_client_secret",
           "AMO_REDIRECT_URI": "your_redirect_uri",
           "AMO_ACCESS_TOKEN": "your_access_token",
           "AMO_REFRESH_TOKEN": "your_refresh_token"
         }
       }
     }
   }
   ```

4. Перезапустите Claude Desktop

5. Проверьте наличие инструментов в интерфейсе Claude

### Метод 3: Быстрая проверка запуска

Простой скрипт для проверки, что сервер запускается без ошибок:

```bash
./test-mcp-simple.sh
```

## 📋 Список инструментов MCP

После успешного запуска должны быть доступны следующие инструменты:

### 1. `amocrm.listLeads`
Получить список сделок с пагинацией

**Параметры:**
- `page` (number, опционально) - Номер страницы
- `limit` (number, опционально) - Количество записей на странице

**Пример:**
```json
{
  "page": 1,
  "limit": 10
}
```

### 2. `amocrm.createLead`
Создать новую сделку

**Параметры:**
- `name` (string, обязательный) - Название сделки
- `price` (number, опционально) - Бюджет сделки
- `pipeline_id` (number, опционально) - ID воронки
- `status_id` (number, опционально) - ID статуса

**Пример:**
```json
{
  "name": "Новая сделка",
  "price": 10000
}
```

### 3. `amocrm.getContact`
Получить контакт по ID

**Параметры:**
- `id` (number, обязательный) - ID контакта

**Пример:**
```json
{
  "id": 12345
}
```

### 4. `amocrm.listContacts`
Получить список контактов с пагинацией

**Параметры:**
- `page` (number, опционально) - Номер страницы
- `limit` (number, опционально) - Количество записей на странице

**Пример:**
```json
{
  "page": 1,
  "limit": 20
}
```

### 5. `amocrm.createContact`
Создать новый контакт

**Параметры:**
- `name` (string, обязательный) - Имя контакта

**Пример:**
```json
{
  "name": "Иван Иванов"
}
```

### 6. `amocrm.createNote`
Создать заметку для сущности

**Параметры:**
- `entity` (string, обязательный) - Тип сущности: `leads`, `contacts` или `companies`
- `payload` (array, обязательный) - Массив заметок для создания

**Пример:**
```json
{
  "entity": "leads",
  "payload": [
    {
      "entity_id": 12345,
      "note_type": "common",
      "params": {
        "text": "Текст заметки"
      }
    }
  ]
}
```

### 7. `amocrm.exchangeAuthCode`
Обменять код авторизации на токены OAuth2

**Параметры:**
- `code` (string, обязательный) - Код авторизации
- `redirect_uri` (string, опционально) - Redirect URI

**Пример:**
```json
{
  "code": "def50200abc..."
}
```

## 🔧 Отладка проблем

### Сервер не запускается

1. Проверьте, что проект собран:
   ```bash
   npm run build
   ```

2. Проверьте переменные окружения:
   ```bash
   cat .env
   ```

3. Запустите сервер напрямую и посмотрите ошибки:
   ```bash
   node dist/index.js
   ```

### Инструменты не видны в Claude Desktop

1. Проверьте пути в `claude_desktop_config.json` - они должны быть абсолютными

2. Проверьте переменные окружения в конфиге

3. Перезапустите Claude Desktop полностью

4. Проверьте логи Claude Desktop:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### Инструменты вызываются с ошибками

1. Проверьте, что токены валидны:
   ```bash
   npm run test-api account
   ```

2. Если токены истекли, обновите их:
   ```bash
   npm run test-api auth <новый_код>
   ```

3. Обновите токены в `claude_desktop_config.json`

## 🧪 Тестовые сценарии

### Сценарий 1: Проверка подключения

В MCP Inspector или Claude Desktop:

1. Вызовите `amocrm.listLeads` с параметром `{ "limit": 3 }`
2. Должны получить список сделок

### Сценарий 2: Создание сделки

1. Вызовите `amocrm.createLead`:
   ```json
   {
     "name": "Тестовая сделка от MCP",
     "price": 50000
   }
   ```

2. Должны получить ответ с ID созданной сделки

3. Проверьте в AmoCRM, что сделка создана

### Сценарий 3: Работа с контактами

1. Получите список контактов: `amocrm.listContacts`
2. Выберите ID любого контакта
3. Получите детали: `amocrm.getContact` с параметром `{ "id": ID_КОНТАКТА }`

## 📊 Проверочный чеклист

Перед деплоем убедитесь:

- [ ] `npm run build` выполняется без ошибок
- [ ] `npm run typecheck` проходит успешно  
- [ ] Все 7 инструментов видны в MCP Inspector
- [ ] Можно вызвать `amocrm.listLeads` и получить данные
- [ ] Можно создать тестовую сделку
- [ ] Токены автоматически обновляются при истечении
- [ ] Сервер корректно обрабатывает ошибки API

## 🔗 Полезные ссылки

- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [MCP SDK Documentation](https://modelcontextprotocol.io/docs)
- [Claude Desktop Configuration](https://docs.anthropic.com/claude/docs/claude-desktop)

## 📝 Логирование

Для отладки добавьте логирование в `src/mcp/tools.ts`:

```typescript
server.tool(
  'amocrm.listLeads',
  'Получить список сделок amoCRM с пагинацией',
  {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Номер страницы' },
      limit: { type: 'number', description: 'Количество записей' },
    },
  },
  async (args) => {
    console.error('DEBUG: listLeads called with', args); // stderr для логов
    await amo.ensureAuth();
    // ... rest of code
  }
);
```

Логи будут видны в stderr и в логах Claude Desktop.

