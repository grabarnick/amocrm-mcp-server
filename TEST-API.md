# Тестирование AmoCRM API

Этот документ описывает, как тестировать методы работы с AmoCRM API отдельно от MCP сервера.

## Подготовка

1. Убедитесь, что у вас есть файл `.env` с необходимыми переменными:

```bash
AMO_BASE_URL=https://yoursubdomain.amocrm.ru
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret
AMO_REDIRECT_URI=https://yourapp.com/oauth/callback
```

2. Для первичной авторизации выполните OAuth2 flow:

```bash
# 1. Откройте в браузере URL для авторизации:
#    https://yoursubdomain.amocrm.ru/oauth?client_id=YOUR_CLIENT_ID&mode=post_message

# 2. После авторизации скопируйте код из URL

# 3. Обменяйте код на токены:
npm run test-api auth YOUR_AUTH_CODE
```

Токены будут автоматически сохранены в файл `.amo-tokens.json` и будут использоваться при последующих запросах.

## Доступные команды

### Информация об аккаунте

```bash
npm run test-api account
```

Получает информацию о текущем аккаунте AmoCRM.

### Работа со сделками (leads)

#### Получить список сделок

```bash
# Получить 10 сделок (по умолчанию)
npm run test-api leads

# Получить 5 сделок
npm run test-api leads 5
```

#### Получить одну сделку по ID

```bash
npm run test-api lead 12345
```

#### Создать новую сделку

```bash
npm run test-api create-lead "Название сделки"
```

### Работа с контактами (contacts)

#### Получить список контактов

```bash
# Получить 10 контактов (по умолчанию)
npm run test-api contacts

# Получить 20 контактов
npm run test-api contacts 20
```

#### Получить один контакт по ID

```bash
npm run test-api contact 67890
```

## Примеры использования

### Полный workflow авторизации и работы с API

```bash
# 1. Первичная авторизация (только один раз)
npm run test-api auth def50200...

# 2. Проверка подключения
npm run test-api account

# 3. Получение списка сделок
npm run test-api leads 5

# 4. Создание тестовой сделки
npm run test-api create-lead "Тестовая сделка"

# 5. Просмотр созданной сделки
npm run test-api lead 12345

# 6. Работа с контактами
npm run test-api contacts 10
```

## Автоматическое обновление токенов

Клиент автоматически обновляет access_token с помощью refresh_token когда это необходимо. Обновленные токены сохраняются в `.amo-tokens.json`.

## Структура сохраненных токенов

Файл `.amo-tokens.json` имеет следующую структуру:

```json
{
  "access_token": "eyJ0...",
  "refresh_token": "def502...",
  "expires_in": 86400,
  "updated_at": "2025-10-09T12:00:00.000Z"
}
```

## Расширение тестового скрипта

Вы можете легко добавить новые тесты в файл `test-api.ts`:

```typescript
// Добавьте новую команду в switch:
case 'my-test':
  await testMyFeature(client, args[1]);
  break;

// Добавьте функцию теста:
async function testMyFeature(client: any, param?: string) {
  try {
    console.log('🧪 Тестируем функцию...');
    const response = await client.get('/api/v4/your-endpoint');
    console.log('✅ Успешно!');
    console.log(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}
```

## Отладка

Если возникают проблемы:

1. Проверьте, что все переменные окружения заданы корректно в `.env`
2. Убедитесь, что токены валидны (проверьте `.amo-tokens.json`)
3. Проверьте, что ваше приложение активировано в AmoCRM
4. Для детальной отладки можете добавить `console.log` в файл `src/amocrm/client.ts`

## Полезные ссылки

- [Документация AmoCRM API](https://www.amocrm.ru/developers/content/crm_platform/api-reference)
- [OAuth 2.0 в AmoCRM](https://www.amocrm.ru/developers/content/oauth/step-by-step)

