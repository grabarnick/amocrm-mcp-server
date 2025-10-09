# Примеры использования AmoCRM API

В этой директории находятся продвинутые примеры использования AmoCRM API клиента.

## Запуск примеров

Все примеры требуют настроенного файла `.env` с корректными переменными окружения.

### advanced-test.ts

Комплексный пример, демонстрирующий различные сценарии работы с API:

```bash
npm run build
node --loader ts-node/esm examples/advanced-test.ts
```

Или запустите напрямую:

```bash
node --loader ts-node/esm examples/advanced-test.ts
```

#### Что включено:

1. **Создание сделки с контактом** - показывает, как создать контакт и привязать его к сделке
2. **Поиск сделок по фильтру** - демонстрирует использование параметров фильтрации
3. **Обновление сделки** - обновление существующей сделки
4. **Добавление примечания** - добавление текстового примечания к сделке
5. **Получение пользователей** - получение списка пользователей системы

## Создание своих примеров

Используйте `advanced-test.ts` как шаблон:

```typescript
import { createAmoClient } from '../src/amocrm/client.js';
import { loadConfig } from '../src/config.js';
import dotenv from 'dotenv';

dotenv.config();

async function myCustomTest() {
  const config = loadConfig();
  
  const client = createAmoClient({
    baseUrl: config.AMO_BASE_URL,
    clientId: config.AMO_CLIENT_ID,
    clientSecret: config.AMO_CLIENT_SECRET,
    accessToken: config.AMO_ACCESS_TOKEN,
    refreshToken: config.AMO_REFRESH_TOKEN,
  });

  // Ваш код здесь
  const result = await client.get('/api/v4/your-endpoint');
  console.log(result);
}

myCustomTest();
```

## Полезные endpoints AmoCRM API v4

- `/api/v4/account` - информация об аккаунте
- `/api/v4/leads` - работа со сделками
- `/api/v4/contacts` - работа с контактами
- `/api/v4/companies` - работа с компаниями
- `/api/v4/tasks` - работа с задачами
- `/api/v4/users` - пользователи системы
- `/api/v4/pipelines` - воронки продаж
- `/api/v4/leads/{id}/notes` - примечания к сделке
- `/api/v4/custom_fields` - пользовательские поля

## Документация

- [AmoCRM API Reference](https://www.amocrm.ru/developers/content/crm_platform/api-reference)
- [OAuth 2.0 в AmoCRM](https://www.amocrm.ru/developers/content/oauth/step-by-step)

