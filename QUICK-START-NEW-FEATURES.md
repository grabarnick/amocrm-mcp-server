# 🚀 Быстрый старт с новыми возможностями

## Что нового?

Добавлено **21 новый инструмент** для работы с AmoCRM! Теперь вы можете полноценно работать со сделками, воронками, компаниями, задачами и пользователями.

---

## 📦 Быстрая установка

Проект уже собран и готов к использованию. Если вы обновили код, выполните:

```bash
npm run build
```

---

## 🎯 Самые полезные новые инструменты

### 1️⃣ Работа с воронками

```bash
# Получить все воронки
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "amocrm_listPipelines",
      "arguments": {}
    }
  }'
```

### 2️⃣ Поиск и обновление сделок

```bash
# Найти сделки
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "amocrm_searchLeads",
      "arguments": {
        "query": "важн",
        "limit": 50
      }
    }
  }'

# Обновить сделку
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "amocrm_updateLead",
      "arguments": {
        "id": 123456,
        "price": 50000,
        "status_id": 789
      }
    }
  }'
```

### 3️⃣ Работа с компаниями

```bash
# Создать компанию
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "amocrm_createCompany",
      "arguments": {
        "name": "ООО Новая компания"
      }
    }
  }'

# Связать сделку с компанией
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "amocrm_linkLeadToCompany",
      "arguments": {
        "lead_id": 123456,
        "company_id": 789012
      }
    }
  }'
```

### 4️⃣ Управление задачами

```bash
# Создать задачу
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "amocrm_createTask",
      "arguments": {
        "entity_type": "leads",
        "entity_id": 123456,
        "text": "Позвонить клиенту",
        "complete_till_at": 1704067200
      }
    }
  }'

# Отметить задачу выполненной
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "amocrm_completeTask",
      "arguments": {
        "id": 789012
      }
    }
  }'
```

---

## 📚 Документация

### Основные файлы
- **[README.md](./README.md)** - Полная документация проекта
- **[NEW-FEATURES.md](./NEW-FEATURES.md)** - Подробное описание новых возможностей
- **[CHANGELOG.md](./CHANGELOG.md)** - История изменений

### Примеры использования
- **[examples/advanced-test.ts](./examples/advanced-test.ts)** - Продвинутые примеры

---

## 🔧 Тестирование

### MCP Inspector (рекомендуется)
```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

### Claude Desktop
Обновите конфигурацию в `~/Library/Application Support/Claude/claude_desktop_config.json`:

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
        "AMO_ACCESS_TOKEN": "<access_token>",
        "AMO_REFRESH_TOKEN": "<refresh_token>"
      }
    }
  }
}
```

---

## 💡 Типичные сценарии

### Сценарий 1: Переместить сделку по воронке
```json
{
  "tool": "amocrm.moveLeadToStatus",
  "arguments": {
    "lead_id": 123456,
    "status_id": 789
  }
}
```

### Сценарий 2: Найти и обновить сделку
```json
// 1. Найти
{
  "tool": "amocrm.searchLeads",
  "arguments": { "query": "важн", "limit": 10 }
}

// 2. Обновить
{
  "tool": "amocrm.updateLead",
  "arguments": { "id": 123456, "price": 100000 }
}
```

### Сценарий 3: Создать компанию и связать со сделкой
```json
// 1. Создать компанию
{
  "tool": "amocrm.createCompany",
  "arguments": { "name": "ООО Новая компания" }
}

// 2. Связать со сделкой
{
  "tool": "amocrm.linkLeadToCompany",
  "arguments": { "lead_id": 123456, "company_id": 789012 }
}
```

---

## 📊 Полный список новых инструментов

### Сделки (6 новых)
- `getLead` - Получить сделку по ID
- `updateLead` - Обновить сделку
- `deleteLead` - Удалить сделку
- `searchLeads` - Поиск сделок
- `linkLeadToContact` - Связать с контактом
- `linkLeadToCompany` - Связать с компанией

### Воронки (3 новых)
- `listPipelines` - Список воронок
- `getPipeline` - Получить воронку
- `moveLeadToStatus` - Переместить по этапам

### Компании (6 новых)
- `listCompanies` - Список компаний
- `getCompany` - Получить компанию
- `createCompany` - Создать компанию
- `updateCompany` - Обновить компанию
- `deleteCompany` - Удалить компанию
- `searchCompanies` - Поиск компаний

### Задачи (4 новых)
- `listTasks` - Список задач
- `createTask` - Создать задачу
- `updateTask` - Обновить задачу
- `completeTask` - Выполнить задачу

### Пользователи (2 новых)
- `listUsers` - Список пользователей
- `getUser` - Получить пользователя

---

## 🎉 Готово!

Теперь у вас есть полноценный доступ к AmoCRM API v4 через MCP протокол!

**Всего инструментов:** 28 (было 7)

---

## 📞 Поддержка

Если у вас возникли вопросы:
1. Проверьте [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Посмотрите [TESTING-GUIDE.md](./TESTING-GUIDE.md)
3. Изучите [NEW-FEATURES.md](./NEW-FEATURES.md)

---

**Приятной работы с AmoCRM! 🚀**

