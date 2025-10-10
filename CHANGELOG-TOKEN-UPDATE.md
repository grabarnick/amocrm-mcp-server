# Changelog: Автоматическое обновление токенов amoCRM

## 🎯 Проблема (было)

**Ошибка 401 Unauthorized** при каждом перезапуске сервера на DigitalOcean App Platform:

1. ❌ Токены amoCRM `access_token` живут только **24 часа**
2. ❌ При перезапуске приложения загружались **старые токены** из переменных окружения
3. ❌ Требовалось **ручное обновление** токенов в DO App Platform
4. ❌ Приложение падало с **401** до обновления токенов

## ✅ Решение (стало)

**Автоматическое обновление токенов** через DigitalOcean App Platform API:

1. ✅ Токены **автоматически обновляются** каждые 24 часа
2. ✅ **Сохраняются в переменные окружения** DO App Platform через API
3. ✅ При следующем перезапуске загружаются **свежие токены**
4. ✅ **Никаких ошибок 401** - всё работает автоматически!

## 📝 Что изменилось

### Новые файлы

1. **`src/do-env-updater.ts`** - модуль для обновления переменных окружения через DO API
2. **`DO-TOKEN-AUTO-UPDATE.md`** - подробная документация по настройке
3. **`SETUP-DO-AUTO-UPDATE.md`** - краткая инструкция (3 шага)

### Изменённые файлы

1. **`src/index.ts`** - добавлен callback `onTokensUpdated`
2. **`src/http-mcp-server.ts`** - добавлен callback `onTokensUpdated`
3. **`src/streamable-http-mcp.ts`** - добавлен callback `onTokensUpdated`
4. **`src/config.ts`** - добавлены опциональные переменные `DO_API_TOKEN` и `DO_APP_ID`
5. **`.do/app.yaml`** - добавлены переменные окружения для DO API
6. **`README.md`** - добавлена ссылка на новую документацию
7. **`TROUBLESHOOTING.md`** - добавлен раздел об автообновлении

### Новые зависимости

Нет - используем уже установленный `axios`

## 🔧 Как это работает

```
1. [amoCRM API] 
      ↓ (access_token истекает через 24ч)
2. [Приложение обнаруживает устаревший токен]
      ↓
3. [Автоматическое обновление через refresh_token]
      ↓
4. [Callback onTokensUpdated вызывается]
      ↓
5. [DO API: обновление переменных окружения]
      ↓
6. [✅ Токены сохранены в DO App Platform]
      ↓
7. [При следующем перезапуске: свежие токены загружаются]
```

## 📦 Что нужно настроить

### Обязательные переменные окружения

```bash
# Уже были
AMO_BASE_URL=https://yoursubdomain.amocrm.ru
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret
AMO_ACCESS_TOKEN=your_access_token
AMO_REFRESH_TOKEN=your_refresh_token

# НОВЫЕ (для автообновления)
DO_API_TOKEN=your_digitalocean_api_token  # с write доступом!
DO_APP_ID=your_app_id
```

### Получение значений

1. **DO_API_TOKEN:**
   - Создайте на https://cloud.digitalocean.com/account/api/tokens
   - **ВАЖНО:** Выберите **Write** scopes!

2. **DO_APP_ID:**
   - `doctl apps list` (первая колонка)
   - Или из URL: `https://cloud.digitalocean.com/apps/<APP_ID>`

## 🚀 Деплой изменений

### Вариант 1: Автоматический (рекомендуется)

```bash
# 1. Закоммитьте изменения
git add .
git commit -m "feat: добавлено автообновление токенов через DO API"
git push origin main

# 2. DO App Platform автоматически пересоберет приложение

# 3. Добавьте переменные окружения в DO UI или:
doctl apps update <APP_ID> \
  --env "DO_API_TOKEN=<ваш_токен>" \
  --env "DO_APP_ID=<ваш_app_id>"
```

### Вариант 2: Через веб-интерфейс

1. Push изменений в GitHub
2. Откройте https://cloud.digitalocean.com/apps
3. **Settings** → **App-Level Environment Variables**
4. Добавьте `DO_API_TOKEN` и `DO_APP_ID`
5. **Save** (приложение перезапустится)

## ✅ Проверка работы

```bash
# Смотрим логи
doctl apps logs <APP_ID> --follow

# Должны увидеть:
# 🔄 Токены обновлены, сохраняем в DO App Platform...
# ✅ Токены успешно обновлены в DO App Platform
```

## 📊 Поведение

### С DO API (production)

✅ Токены обновляются **автоматически** и сохраняются в DO App Platform

### Без DO API (development/local)

⚠️ Токены обновляются в памяти, но **не сохраняются** в файлы  
💡 Используйте `npm run test-api account && ./update-env-tokens.sh`

## 🔒 Безопасность

### ✅ Что безопасно

- ✅ DO API токен хранится в Environment Variables (не в коде)
- ✅ Токен имеет ограниченные права (только Apps write)
- ✅ Токены amoCRM обновляются автоматически
- ✅ Логи не содержат чувствительных данных

### ⚠️ Важные замечания

- DO API токен имеет доступ к вашим приложениям в DO
- Периодически пересоздавайте DO API токен (rotation)
- Не коммитьте токены в git (используйте `.env` для local)

## 📚 Документация

- **[SETUP-DO-AUTO-UPDATE.md](./SETUP-DO-AUTO-UPDATE.md)** - Быстрая настройка (3 шага)
- **[DO-TOKEN-AUTO-UPDATE.md](./DO-TOKEN-AUTO-UPDATE.md)** - Подробная документация
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Решение проблем

## 🐛 Известные проблемы

### Не обновляется → Проверьте:

1. ❓ `DO_API_TOKEN` и `DO_APP_ID` установлены?
   ```bash
   doctl apps list-envs <APP_ID> | grep DO_
   ```

2. ❓ DO API токен имеет **write** права?
   ```bash
   curl -H "Authorization: Bearer $DO_API_TOKEN" \
     https://api.digitalocean.com/v2/account
   ```

3. ❓ Правильный `DO_APP_ID`?
   ```bash
   doctl apps list
   ```

## 🎉 Результат

### До

```
[Деплой] → [Старые токены из env] → [401 Error] → [Ручное обновление] 😩
```

### После

```
[Деплой] → [Свежие токены из env] → [✅ Работает] → [Автообновление] 🎉
```

---

**Готово!** Больше никаких ручных обновлений токенов! 🚀

