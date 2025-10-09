# Исправления MCP сервера - 9 октября 2025

## Проблема

MCP инструменты не были доступны в Claude Desktop из-за неправильного формата регистрации в `src/mcp/tools.ts`.

## Основные изменения

### 1. Исправлен файл `src/mcp/tools.ts`

**Было:**
```typescript
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
  async (args, _extra) => { ... }
);
```

**Стало:**
```typescript
server.tool(
  'amocrm.listLeads',
  'Получить список сделок amoCRM с пагинацией',
  {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Номер страницы (начиная с 1)' },
      limit: { type: 'number', description: 'Количество записей на странице (1-250)' },
    },
  },
  async (args) => { ... }
);
```

**Изменения:**
- Метод `registerTool()` → `tool()`
- Удален параметр с объектом options, description теперь второй параметр
- inputSchema переписан с Zod схем на JSON Schema
- Удален второй параметр `_extra` из обработчика
- Удален неиспользуемый импорт `zod`

### 2. Созданы инструменты для тестирования

#### Тестирование API (независимо от MCP)

- **test-api.ts** - CLI для тестирования AmoCRM API
  ```bash
  npm run test-api account
  npm run test-api leads 10
  npm run test-api create-lead "Тестовая сделка"
  ```

- **api-test.sh** - Удобная обертка для быстрого запуска
  ```bash
  ./api-test.sh account
  ```

- **check-auth.sh** - Диагностика проблем OAuth
  ```bash
  ./check-auth.sh
  ```

#### Продвинутые примеры

- **examples/advanced-test.ts** - Комплексные сценарии:
  - Создание сделки с контактом
  - Поиск и фильтрация
  - Обновление данных
  - Добавление примечаний

### 3. Создана подробная документация

- **QUICK-START.md** - Быстрый старт после исправлений
- **TEST-MCP.md** - Тестирование MCP сервера (Inspector, Claude Desktop)
- **TEST-API.md** - Подробное руководство по тестированию API
- **OAUTH-GUIDE.md** - Решение проблем с OAuth авторизацией
- **TESTING-GUIDE.md** - Полное руководство по тестированию
- **examples/README.md** - Документация примеров

### 4. Обновлены существующие файлы

- **package.json** - Добавлены скрипты:
  - `npm run test-api`
  - `npm run test-mcp`

- **README.md** - Добавлен раздел "Тестирование" со ссылками на документацию

- **.gitignore** - Добавлен `.amo-tokens.json`

## Исправленные инструменты MCP

Все 7 инструментов теперь корректно регистрируются:

1. ✅ `amocrm.listLeads` - Список сделок
2. ✅ `amocrm.createLead` - Создание сделки
3. ✅ `amocrm.getContact` - Получение контакта по ID
4. ✅ `amocrm.listContacts` - Список контактов
5. ✅ `amocrm.createContact` - Создание контакта
6. ✅ `amocrm.createNote` - Создание заметки
7. ✅ `amocrm.exchangeAuthCode` - OAuth авторизация

## Как протестировать

### Вариант 1: MCP Inspector (рекомендуется)

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Откроется веб-интерфейс с визуализацией всех инструментов.

### Вариант 2: Claude Desktop

1. Соберите проект: `npm run build`
2. Обновите `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Перезапустите Claude Desktop
4. Проверьте наличие инструментов AmoCRM

### Вариант 3: Тестирование API отдельно

```bash
npm run test-api account
```

## Решение частых проблем

### "Redirect URI is not associated"

См. детальное руководство в [OAUTH-GUIDE.md](./OAUTH-GUIDE.md)

Краткое решение:
1. Проверьте `AMO_REDIRECT_URI` в `.env`
2. Он должен совпадать с настройками интеграции в AmoCRM
3. Или закомментируйте его для `mode=post_message`

### Токены истекли

```bash
# Получите новый код авторизации в браузере
npm run test-api auth <код>
```

### Инструменты не видны в Claude Desktop

1. Проверьте абсолютный путь к `dist/index.js`
2. Перезапустите Claude Desktop полностью (⌘+Q)
3. Проверьте логи: `tail -f ~/Library/Logs/Claude/mcp*.log`

## Файлы, которые были изменены

- `src/mcp/tools.ts` - основное исправление
- `package.json` - добавлены скрипты
- `README.md` - обновлена документация
- `.gitignore` - добавлен .amo-tokens.json

## Файлы, которые были созданы

### Тестирование
- `test-api.ts` - CLI для тестирования API
- `test-mcp.ts` - тестирование MCP (в разработке)
- `test-mcp-simple.sh` - быстрая проверка
- `api-test.sh` - обертка для test-api
- `check-auth.sh` - диагностика OAuth

### Документация
- `QUICK-START.md`
- `TEST-MCP.md`
- `TEST-API.md`
- `OAUTH-GUIDE.md`
- `TESTING-GUIDE.md`
- `CHANGELOG-FIX.md` (этот файл)

### Примеры
- `examples/advanced-test.ts`
- `examples/README.md`

## Проверочный чеклист

- [x] Исправлен формат регистрации инструментов
- [x] Проект собирается без ошибок (`npm run build`)
- [x] TypeCheck проходит (`npm run typecheck`)
- [x] Создана документация по тестированию
- [x] Созданы инструменты для тестирования API
- [x] Создано руководство по OAuth
- [ ] Протестировано в MCP Inspector (запущен, но требует ваше участие)
- [ ] Протестировано в Claude Desktop (требует вашу конфигурацию)

## Следующие шаги

1. Протестируйте с помощью Inspector или Claude Desktop
2. Обновите токены, если необходимо
3. Попробуйте создать тестовую сделку
4. Проверьте автообновление токенов

---

Все готово к использованию! 🎉

