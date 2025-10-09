# Руководство по тестированию AmoCRM API

## 🎯 Цель

Этот набор инструментов позволяет тестировать AmoCRM API **независимо от MCP сервера**. Вы можете быстро проверять endpoints, отлаживать проблемы и экспериментировать с API.

## 🚀 Быстрый старт

### Вариант 1: npm скрипт (рекомендуется)

```bash
npm run test-api <команда> [параметры]
```

### Вариант 2: bash скрипт

```bash
./api-test.sh <команда> [параметры]
```

## 📚 Доступные инструменты

### 1. Базовый тестовый CLI (`test-api.ts`)

Интерактивный инструмент командной строки для быстрого тестирования:

```bash
# Показать все команды
npm run test-api

# Авторизация (первый раз)
npm run test-api auth <код>

# Проверка подключения
npm run test-api account

# Работа со сделками
npm run test-api leads 10
npm run test-api lead 12345
npm run test-api create-lead "Новая сделка"

# Работа с контактами
npm run test-api contacts 20
npm run test-api contact 67890
```

**Особенности:**
- ✅ Автоматическое сохранение токенов в `.amo-tokens.json`
- ✅ Автоматическое обновление токенов
- ✅ Понятный вывод с эмодзи
- ✅ Обработка ошибок

### 2. Продвинутые примеры (`examples/advanced-test.ts`)

Демонстрирует сложные сценарии:

```bash
node --loader ts-node/esm examples/advanced-test.ts
```

**Что включено:**
- 📝 Создание сделки с контактом
- 🔍 Поиск сделок по фильтру
- ✏️ Обновление сделки
- 📌 Добавление примечаний
- 👥 Получение пользователей

### 3. Bash скрипт (`api-test.sh`)

Удобная обертка для быстрого запуска:

```bash
chmod +x api-test.sh
./api-test.sh account
```

## 🔐 Настройка авторизации

### Шаг 1: Создайте `.env` файл

```bash
AMO_BASE_URL=https://yoursubdomain.amocrm.ru
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret
AMO_REDIRECT_URI=https://yourapp.com/oauth/callback
```

### Шаг 2: Получите токены

```bash
# 1. Откройте URL в браузере
https://yoursubdomain.amocrm.ru/oauth?client_id=YOUR_CLIENT_ID&mode=post_message

# 2. Скопируйте код из URL после авторизации

# 3. Обменяйте код на токены
npm run test-api auth YOUR_CODE
```

### Шаг 3: Токены сохранены!

Токены автоматически сохраняются в `.amo-tokens.json` и обновляются при необходимости.

## 📖 Документация

- **[TEST-API.md](./TEST-API.md)** - Подробная документация по всем командам
- **[examples/README.md](./examples/README.md)** - Руководство по продвинутым примерам
- **[README.md](./README.md)** - Основная документация проекта

## 💡 Примеры использования

### Сценарий 1: Проверка подключения

```bash
npm run test-api account
```

### Сценарий 2: Просмотр последних сделок

```bash
npm run test-api leads 5
```

### Сценарий 3: Создание тестовой сделки

```bash
npm run test-api create-lead "Тестовая сделка $(date +%s)"
```

### Сценарий 4: Комплексное тестирование

```bash
# Проверка подключения
npm run test-api account

# Просмотр сделок
npm run test-api leads 3

# Создание сделки
npm run test-api create-lead "Новая сделка"

# Просмотр контактов
npm run test-api contacts 5
```

## 🛠 Разработка собственных тестов

### Минимальный пример

```typescript
import { createAmoClient } from './src/amocrm/client.js';
import { loadConfig } from './src/config.js';
import dotenv from 'dotenv';

dotenv.config();

const config = loadConfig();
const client = createAmoClient({
  baseUrl: config.AMO_BASE_URL,
  clientId: config.AMO_CLIENT_ID,
  clientSecret: config.AMO_CLIENT_SECRET,
  accessToken: config.AMO_ACCESS_TOKEN,
  refreshToken: config.AMO_REFRESH_TOKEN,
});

// Ваш код
const result = await client.get('/api/v4/leads?limit=5');
console.log(result);
```

### Расширение test-api.ts

Добавьте новую команду в файл `test-api.ts`:

```typescript
// В функции main():
case 'my-command':
  await testMyFeature(client, args[1]);
  break;

// Добавьте функцию:
async function testMyFeature(client: any, param?: string) {
  try {
    console.log('🧪 Тестируем...');
    const result = await client.get('/api/v4/endpoint');
    console.log('✅ Успешно!', result);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}
```

## 🔍 Отладка

### Проблемы с авторизацией

```bash
# Проверьте, что токены существуют
cat .amo-tokens.json

# Попробуйте обновить токены
npm run test-api auth YOUR_NEW_CODE
```

### Проблемы с API

```bash
# Проверьте подключение
npm run test-api account

# Проверьте переменные окружения
cat .env
```

### Детальная отладка

Добавьте `console.log` в файл `src/amocrm/client.ts` для просмотра всех запросов.

## 📁 Структура файлов

```
mcp/
├── test-api.ts              # Основной CLI для тестирования
├── api-test.sh              # Bash скрипт-обертка
├── TEST-API.md              # Подробная документация
├── TESTING-GUIDE.md         # Это руководство
├── .amo-tokens.json         # Сохраненные токены (создается автоматически)
├── examples/
│   ├── advanced-test.ts     # Продвинутые примеры
│   └── README.md            # Документация примеров
└── src/
    └── amocrm/
        └── client.ts        # API клиент
```

## 🎓 Дополнительные ресурсы

- [AmoCRM API Reference](https://www.amocrm.ru/developers/content/crm_platform/api-reference)
- [OAuth 2.0 в AmoCRM](https://www.amocrm.ru/developers/content/oauth/step-by-step)
- [Основной README](./README.md)

## ❓ Часто задаваемые вопросы

**Q: Токены истекли, что делать?**  
A: Токены обновляются автоматически. Если что-то пошло не так, запустите `npm run test-api auth <новый_код>`.

**Q: Как добавить новый endpoint для тестирования?**  
A: Добавьте новую команду в `test-api.ts` или создайте свой скрипт в `examples/`.

**Q: Можно ли использовать это в production?**  
A: Эти инструменты предназначены для разработки и тестирования. Для production используйте MCP сервер.

**Q: Как тестировать на разных аккаунтах?**  
A: Создайте несколько `.env` файлов (`.env.account1`, `.env.account2`) и загружайте нужный перед запуском.

