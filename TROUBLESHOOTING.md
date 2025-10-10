# Решение проблем AmoCRM MCP сервера

## ❌ Ошибка 401 в MCP Inspector

### Проблема
```
Request failed with status code 401
```

### Причина
Токены в файле `.env` устарели или не синхронизированы с `.amo-tokens.json`.

### Решение

#### Способ 1: Автоматическое обновление (рекомендуется)

```bash
./update-env-tokens.sh
```

Этот скрипт автоматически копирует актуальные токены из `.amo-tokens.json` в `.env`.

#### Способ 2: Получить новые токены

```bash
# 1. Получите новый код авторизации в браузере:
#    https://mcptest.amocrm.ru/oauth?client_id=ВАШ_CLIENT_ID&mode=post_message

# 2. Обменяйте код на токены:
npm run test-api auth <скопированный_код>

# 3. Обновите .env:
./update-env-tokens.sh
```

#### Способ 3: Ручное обновление

1. Откройте `.amo-tokens.json` и скопируйте токены
2. Откройте `.env` и замените значения:
   ```bash
   AMO_ACCESS_TOKEN=<скопированный_access_token>
   AMO_REFRESH_TOKEN=<скопированный_refresh_token>
   ```

### После обновления токенов

1. Перезапустите MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector node dist/index.js
   ```

2. Или перезапустите Claude Desktop (если используете его)

---

## ❌ Токены постоянно устаревают

### Проблема
Каждый раз нужно обновлять токены вручную.

### Решение

**Для DigitalOcean App Platform (Production):**
✨ **Автоматическое обновление через DO API** - токены обновляются автоматически!

📖 **См. полную инструкцию:** [DO-TOKEN-AUTO-UPDATE.md](./DO-TOKEN-AUTO-UPDATE.md)

Быстрая настройка:
1. Создайте DO API токен (с write доступом)
2. Добавьте `DO_API_TOKEN` и `DO_APP_ID` в переменные окружения
3. Токены будут автоматически обновляться! 🎉

**Для MCP Inspector и тестирования (Development):**
Всегда используйте `update-env-tokens.sh` после команд `test-api`:

```bash
npm run test-api account  # Это обновит .amo-tokens.json
./update-env-tokens.sh    # Это синхронизирует с .env
```

**Для Claude Desktop:**
Токены обновляются автоматически, но изменения не сохраняются в файлы. Если получаете 401:

1. Получите новые токены:
   ```bash
   npm run test-api auth <код>
   ```

2. Обновите конфигурацию Claude Desktop:
   ```bash
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. Вставьте новые токены из `.amo-tokens.json`

4. Перезапустите Claude Desktop (⌘+Q, затем запустите снова)

---

## ❌ "Redirect URI is not associated"

### Проблема
Ошибка при попытке получить токены через `npm run test-api auth <код>`.

### Решение

См. детальное руководство: [OAUTH-GUIDE.md](./OAUTH-GUIDE.md)

Быстрое решение:

1. Откройте настройки интеграции в AmoCRM
2. Скопируйте правильный Redirect URI
3. Обновите в `.env`:
   ```bash
   AMO_REDIRECT_URI=правильный_redirect_uri
   ```

Или попробуйте без redirect_uri:
```bash
# Закомментируйте в .env:
# AMO_REDIRECT_URI=...
```

---

## ❌ Инструменты не видны в Claude Desktop

### Проблема
После подключения MCP сервера инструменты не появляются в Claude.

### Проверка

1. Убедитесь, что проект собран:
   ```bash
   npm run build
   ```

2. Проверьте путь в конфигурации (должен быть абсолютным):
   ```json
   {
     "mcpServers": {
       "amocrm": {
         "command": "node",
         "args": ["/Users/agrabarnick/Desktop/WORK/dev/amo/mcp/dist/index.js"]
       }
     }
   }
   ```

3. Проверьте логи Claude Desktop:
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### Решение

1. Используйте абсолютные пути
2. Обновите токены в конфигурации
3. Полностью перезапустите Claude Desktop (⌘+Q, не просто закрыть окно)
4. Проверьте, что все переменные окружения заданы

---

## ❌ MCP Inspector не запускается

### Проблема
Ошибка при запуске `npx @modelcontextprotocol/inspector`.

### Решение

1. Убедитесь, что проект собран:
   ```bash
   npm run build
   ```

2. Проверьте, что `dist/index.js` существует:
   ```bash
   ls -la dist/index.js
   ```

3. Запустите напрямую для проверки ошибок:
   ```bash
   node dist/index.js
   ```
   (Нажмите Ctrl+C для выхода)

4. Если есть ошибки TypeScript:
   ```bash
   npm run typecheck
   ```

---

## ❌ "Cannot find module"

### Проблема
Ошибки импорта при запуске сервера.

### Решение

1. Переустановите зависимости:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Пересоберите проект:
   ```bash
   npm run build
   ```

---

## 🔍 Диагностика

### Универсальный чеклист

Выполните по порядку:

```bash
# 1. Проверка переменных окружения
./check-auth.sh

# 2. Проверка API напрямую
npm run test-api account

# 3. Обновление токенов в .env
./update-env-tokens.sh

# 4. Сборка проекта
npm run build

# 5. Проверка TypeScript
npm run typecheck

# 6. Тестирование MCP
npx @modelcontextprotocol/inspector node dist/index.js
```

### Логи и отладка

**Для MCP сервера:**
```bash
# Запустите с выводом отладочной информации
DEBUG=* node dist/index.js
```

**Для Claude Desktop:**
```bash
# Смотрите логи в реальном времени
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Для API тестов:**
```bash
# Все тесты пишут в stdout/stderr
npm run test-api account 2>&1 | tee api-test.log
```

---

## 📋 Быстрые команды

### Обновление токенов
```bash
npm run test-api account && ./update-env-tokens.sh
```

### Полная проверка
```bash
npm run build && npx @modelcontextprotocol/inspector node dist/index.js
```

### Получение новых токенов
```bash
npm run test-api auth <код> && ./update-env-tokens.sh
```

---

## 🆘 Если ничего не помогло

1. Проверьте, что интеграция активна в AmoCRM
2. Проверьте, что все переменные в `.env` корректны
3. Попробуйте получить новый код авторизации
4. Создайте новую интеграцию в AmoCRM (в крайнем случае)

## 📚 Дополнительные ресурсы

- [QUICK-START.md](./QUICK-START.md) - Быстрый старт
- [OAUTH-GUIDE.md](./OAUTH-GUIDE.md) - OAuth проблемы
- [TEST-MCP.md](./TEST-MCP.md) - Тестирование MCP
- [TEST-API.md](./TEST-API.md) - Тестирование API

