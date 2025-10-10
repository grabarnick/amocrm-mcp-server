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
- amocrm.listLeads({ page?: number, limit?: number })
- amocrm.createLead({ name, price?, pipeline_id?, status_id? } | Array<...>)
- amocrm.getContact({ id })
- amocrm.listContacts({ page?: number, limit?: number })
- amocrm.createContact({ name } | Array<...>)
- amocrm.createNote({ entity: 'leads'|'contacts'|'companies', payload: [...] })
- amocrm.exchangeAuthCode({ code, redirect_uri? })

### Примеры
- Получить сделки:
```json
{
  "tool": "amocrm.listLeads",
  "arguments": { "page": 1, "limit": 25 }
}
```
- Создать сделку:
```json
{
  "tool": "amocrm.createLead",
  "arguments": { "name": "Новая сделка", "price": 10000 }
}
```
- Получить контакт:
```json
{
  "tool": "amocrm.getContact",
  "arguments": { "id": 123456 }
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
