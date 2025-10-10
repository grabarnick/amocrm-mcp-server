# Автоматическое обновление токенов в DigitalOcean App Platform

## 🎯 Проблема

Токены amoCRM `access_token` живут **1 день**, а `refresh_token` - **3 месяца**. При каждом перезапуске вашего приложения на DigitalOcean App Platform токены устаревают, и вы получаете ошибку **401 Unauthorized**.

## ✅ Решение

Мы реализовали **автоматическое обновление** токенов через DigitalOcean API. Когда токены обновляются в памяти приложения, они автоматически сохраняются в переменные окружения DigitalOcean App Platform.

## 📋 Настройка (5 минут)

### Шаг 1: Создайте DigitalOcean API Token

1. Перейдите на [https://cloud.digitalocean.com/account/api/tokens](https://cloud.digitalocean.com/account/api/tokens)
2. Нажмите **Generate New Token**
3. Настройте:
   - **Name:** `amocrm-mcp-auto-update`
   - **Scopes:** ✅ **Write** (обязательно!)
   - **Expiration:** `No expiry` (или на ваш выбор)
4. Скопируйте токен (он больше не будет показан!)

### Шаг 2: Узнайте ID вашего приложения

**Вариант 1: Через doctl** (рекомендуется)

```bash
# Установите doctl если еще не установлен
brew install doctl

# Авторизуйтесь
doctl auth init

# Получите список приложений
doctl apps list

# Скопируйте ID вашего приложения (первая колонка)
```

**Вариант 2: Через веб-интерфейс**

1. Откройте [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Откройте ваше приложение
3. ID находится в URL: `https://cloud.digitalocean.com/apps/YOUR_APP_ID`

### Шаг 3: Добавьте переменные окружения

**Вариант 1: Через веб-интерфейс** (проще)

1. Откройте ваше приложение в DigitalOcean
2. **Settings** → **App-Level Environment Variables**
3. Добавьте:
   ```
   DO_API_TOKEN = ваш_api_token_из_шага_1
   DO_APP_ID = ваш_app_id_из_шага_2
   ```
4. **Save** → Приложение перезапустится

**Вариант 2: Через doctl**

```bash
# Отредактируйте .do/app.yaml
# Замените YOUR_DO_API_TOKEN_HERE и YOUR_APP_ID_HERE на реальные значения

# Примените изменения
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

**Вариант 3: Через переменные окружения в командной строке**

```bash
# Добавьте переменные
doctl apps update YOUR_APP_ID \
  --env "DO_API_TOKEN=ваш_токен" \
  --env "DO_APP_ID=ваш_app_id"
```

### Шаг 4: Проверка

1. Дождитесь перезапуска приложения
2. Проверьте логи:
   ```bash
   doctl apps logs YOUR_APP_ID
   ```
3. Вы должны увидеть:
   ```
   🔄 Токены обновлены, сохраняем в DO App Platform...
   ✅ Токены успешно обновлены в DO App Platform
   ```

## 🔍 Как это работает

1. **Токены устаревают:** amoCRM access_token истекает через 24 часа
2. **Автоматическое обновление:** Приложение автоматически обновляет токены используя `refresh_token`
3. **Сохранение в DO:** Обновленные токены сохраняются в переменные окружения через DO API
4. **Следующий запуск:** При следующем деплое/перезапуске используются свежие токены

### Диаграмма потока

```
[amoCRM] ---(401)---> [Приложение]
                           |
                           v
                 [Обновление токенов]
                           |
                           v
              [Сохранение через DO API]
                           |
                           v
          [Обновление env в App Platform]
                           |
                           v
               [✅ Следующий запуск OK]
```

## 🔒 Безопасность

### ✅ Рекомендации:

1. **Ограничьте scopes токена:** Используйте токен только с **write** доступом к Apps
2. **Rotate токены:** Периодически пересоздавайте DO API токен
3. **Не коммитьте:** Никогда не добавляйте токены в git (используйте `.env` или DO UI)

### ⚠️ Важно:

- DO API токен имеет **полный доступ** к вашим приложениям в DigitalOcean
- Храните его в безопасности
- Используйте Environment Variables в DO, не храните в коде

## 🛠 Без DO API (альтернатива)

Если вы не хотите использовать DO API, есть альтернативные варианты:

### Вариант 1: Ручное обновление

```bash
# 1. Получите новые токены локально
npm run test-api account

# 2. Обновите в DO через веб-интерфейс
# Settings → Environment Variables → Update AMO_ACCESS_TOKEN и AMO_REFRESH_TOKEN

# 3. Перезапустите приложение
```

### Вариант 2: Использование Spaces (S3)

Храните токены в DigitalOcean Spaces (платно, ~$5/мес):

```typescript
// В do-env-updater.ts
// Вместо DO API используйте AWS SDK для Spaces
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey: process.env.SPACES_SECRET
});

await s3.putObject({
  Bucket: 'amocrm-tokens',
  Key: 'tokens.json',
  Body: JSON.stringify(tokens)
}).promise();
```

### Вариант 3: PostgreSQL/Redis

Подключите базу данных к вашему DO App и храните токены там.

## 🐛 Устранение неполадок

### Проблема: Токены не обновляются

**Проверьте:**

```bash
# 1. Проверьте, что переменные установлены
doctl apps list-envs YOUR_APP_ID | grep DO_

# 2. Проверьте логи
doctl apps logs YOUR_APP_ID | grep "обновлен"

# 3. Проверьте права DO API токена
curl -H "Authorization: Bearer $DO_API_TOKEN" \
  https://api.digitalocean.com/v2/account
```

**Возможные причины:**

1. ❌ DO_API_TOKEN или DO_APP_ID не установлены
2. ❌ DO API токен не имеет **write** доступа
3. ❌ DO API токен истек
4. ❌ Неверный APP_ID

### Проблема: 401 при обращении к DO API

```
❌ Ошибка обновления токенов в DO: Request failed with status code 401
```

**Решение:**

1. Пересоздайте DO API токен с **write** доступом
2. Обновите переменную `DO_API_TOKEN` в DO App Platform
3. Перезапустите приложение

### Проблема: 404 при обращении к DO API

```
❌ Ошибка обновления токенов в DO: Request failed with status code 404
```

**Решение:**

1. Проверьте правильность `DO_APP_ID`
2. Используйте `doctl apps list` для получения корректного ID

## 📊 Мониторинг

### Проверка автообновления

```bash
# Смотрим логи в реальном времени
doctl apps logs YOUR_APP_ID --follow

# Фильтруем только обновления токенов
doctl apps logs YOUR_APP_ID | grep "Токены обновлены"
```

### Статистика обновлений

Добавьте в код для отслеживания:

```typescript
let tokenUpdateCount = 0;

onTokensUpdated: async (tokens) => {
  tokenUpdateCount++;
  console.log(`🔄 Токены обновлены (#${tokenUpdateCount}), сохраняем в DO...`);
  await createTokenUpdater(tokens);
}
```

## ✅ Чеклист готовности

- [ ] DO API токен создан с **write** доступом
- [ ] `DO_API_TOKEN` добавлен в Environment Variables
- [ ] `DO_APP_ID` добавлен в Environment Variables
- [ ] Приложение перезапущено
- [ ] В логах видно `✅ Токены успешно обновлены в DO App Platform`
- [ ] Ошибки 401 исчезли

## 📚 Ссылки

- [DigitalOcean API Tokens](https://cloud.digitalocean.com/account/api/tokens)
- [DigitalOcean Apps API Reference](https://docs.digitalocean.com/reference/api/api-reference/#tag/Apps)
- [doctl Apps Documentation](https://docs.digitalocean.com/reference/doctl/reference/apps/)
- [amoCRM OAuth2 Documentation](https://www.amocrm.ru/developers/content/oauth/step-by-step)

## 🆘 Нужна помощь?

1. Проверьте логи: `doctl apps logs YOUR_APP_ID`
2. Проверьте переменные: `doctl apps list-envs YOUR_APP_ID`
3. Откройте issue на GitHub с логами

---

**Готово!** 🎉 Теперь ваши токены будут автоматически обновляться, и ошибки 401 исчезнут навсегда!

