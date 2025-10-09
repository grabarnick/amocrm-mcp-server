# AmoCRM MCP Server - Быстрый старт

## 🚀 Что было исправлено

### Проблема
MCP инструменты не были доступны из-за неправильного формата регистрации в `src/mcp/tools.ts`.

### Решение
Исправлен формат регистрации инструментов:
- Заменено `server.registerTool()` на `server.tool()`
- Переписаны inputSchema с Zod на JSON Schema формат
- Все 7 инструментов теперь корректно регистрируются

## ✅ Проверка исправлений

### Шаг 1: Пересоберите проект

```bash
npm run build
```

### Шаг 2: Протестируйте MCP сервер

**Вариант A: MCP Inspector (рекомендуется)**

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Откроется веб-интерфейс (обычно http://localhost:5173), где вы увидите все 7 инструментов:
1. amocrm.listLeads
2. amocrm.createLead
3. amocrm.getContact
4. amocrm.listContacts
5. amocrm.createContact
6. amocrm.createNote
7. amocrm.exchangeAuthCode

**Вариант B: Claude Desktop**

1. Обновите конфигурацию (если ещё не сделали):
   ```bash
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Убедитесь, что путь указывает на собранный файл:
   ```json
   {
     "mcpServers": {
       "amocrm": {
         "command": "node",
         "args": ["/Users/agrabarnick/Desktop/WORK/dev/amo/mcp/dist/index.js"],
         "env": {
           "AMO_BASE_URL": "https://mcptest.amocrm.ru",
           "AMO_CLIENT_ID": "...",
           "AMO_CLIENT_SECRET": "...",
           "AMO_REDIRECT_URI": "...",
           "AMO_ACCESS_TOKEN": "...",
           "AMO_REFRESH_TOKEN": "..."
         }
       }
     }
   }
   ```

3. Перезапустите Claude Desktop

4. Проверьте наличие инструментов AmoCRM в интерфейсе

### Шаг 3: Тестовый вызов

В MCP Inspector или через Claude попробуйте вызвать:

```json
Инструмент: amocrm.listLeads
Параметры: {"limit": 3}
```

Должны получить список сделок из вашего AmoCRM.

## 🔧 Если что-то не работает

### Проблема: Токены истекли (401 ошибка)

```bash
# Способ 1: Обновить существующие токены
npm run test-api account      # Обновит .amo-tokens.json
./update-env-tokens.sh         # Синхронизирует с .env

# Способ 2: Получить новые токены
# 1. Откройте в браузере (замените на ваши данные):
https://mcptest.amocrm.ru/oauth?client_id=ВАШ_CLIENT_ID&mode=post_message

# 2. Скопируйте код
# 3. Обменяйте на токены:
npm run test-api auth СКОПИРОВАННЫЙ_КОД
./update-env-tokens.sh         # Обновите .env

# 4. Для Claude Desktop обновите также claude_desktop_config.json
```

Подробнее: [OAUTH-GUIDE.md](./OAUTH-GUIDE.md)

### Проблема: Инструменты не видны в Claude Desktop

1. Проверьте пути - они должны быть абсолютными
2. Проверьте, что dist/index.js существует (запустите `npm run build`)
3. Перезапустите Claude Desktop полностью (⌘+Q, затем запустите снова)
4. Проверьте логи:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### Проблема: Redirect URI ошибка

См. детальное руководство: [OAUTH-GUIDE.md](./OAUTH-GUIDE.md#проблема-redirect-uri-is-not-associated-with-client)

## 📚 Документация

- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** ⭐ - Решение проблем (401, токены, и т.д.)
- **[README.md](./README.md)** - Основная документация
- **[TEST-MCP.md](./TEST-MCP.md)** - Тестирование MCP сервера  
- **[TEST-API.md](./TEST-API.md)** - Тестирование AmoCRM API отдельно
- **[OAUTH-GUIDE.md](./OAUTH-GUIDE.md)** - OAuth авторизация
- **[TESTING-GUIDE.md](./TESTING-GUIDE.md)** - Полное руководство по тестированию

## 🎯 Следующие шаги

1. ✅ Убедитесь, что все инструменты видны в Inspector/Claude
2. ✅ Протестируйте базовые операции (list, get, create)
3. ✅ Настройте автообновление токенов (уже работает автоматически)
4. 📖 Изучите примеры в `examples/advanced-test.ts`
5. 🚀 Начните использовать MCP сервер в работе!

## 🆘 Поддержка

Если возникли проблемы:

1. Проверьте переменные окружения: `cat .env`
2. Проверьте сборку: `npm run build`
3. Проверьте API напрямую: `npm run test-api account`
4. Проверьте MCP сервер: `npx @modelcontextprotocol/inspector node dist/index.js`
5. Проверьте логи Claude Desktop

Все основные проблемы и их решения описаны в соответствующих MD файлах.

