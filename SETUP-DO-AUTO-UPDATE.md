# 🚀 Быстрая настройка автообновления токенов

## Что было реализовано

✅ **Автоматическое обновление токенов amoCRM** через DigitalOcean App Platform API

Теперь когда токены обновляются в памяти приложения, они **автоматически сохраняются** в переменные окружения вашего DO приложения!

## ⚡ Быстрая настройка (3 шага)

### 1️⃣ Создайте DigitalOcean API Token

```bash
# Откройте в браузере:
https://cloud.digitalocean.com/account/api/tokens

# Создайте токен с настройками:
# - Name: amocrm-mcp-auto-update
# - Scopes: ✅ Write (обязательно!)
# - Expiration: No expiry

# Скопируйте токен!
```

### 2️⃣ Узнайте ID приложения

```bash
# Установите doctl (если еще нет)
brew install doctl

# Авторизуйтесь
doctl auth init

# Получите ID приложения
doctl apps list
# Скопируйте первую колонку (ID)
```

### 3️⃣ Добавьте переменные окружения

**Через веб-интерфейс DigitalOcean:**

1. Откройте ваше приложение: https://cloud.digitalocean.com/apps
2. **Settings** → **App-Level Environment Variables**
3. Добавьте:
   ```
   DO_API_TOKEN = <ваш_токен_из_шага_1>
   DO_APP_ID = <ваш_app_id_из_шага_2>
   ```
4. **Save** → Приложение перезапустится

**Или через doctl:**

```bash
# Замените значения в .do/app.yaml
# DO_API_TOKEN: YOUR_DO_API_TOKEN_HERE → ваш реальный токен
# DO_APP_ID: YOUR_APP_ID_HERE → ваш реальный app_id

# Примените изменения
doctl apps update <APP_ID> --spec .do/app.yaml
```

## ✅ Проверка

```bash
# Смотрим логи
doctl apps logs <APP_ID> --follow

# Ищем сообщение:
# 🔄 Токены обновлены, сохраняем в DO App Platform...
# ✅ Токены успешно обновлены в DO App Platform
```

## 🎉 Готово!

Теперь:
- ✅ Токены обновляются автоматически каждые 24 часа
- ✅ Сохраняются в переменные окружения DO App Platform
- ✅ Больше никаких ошибок 401 при перезапуске!

## 📚 Подробная документация

См. полное руководство: **[DO-TOKEN-AUTO-UPDATE.md](./DO-TOKEN-AUTO-UPDATE.md)**

## 🐛 Проблемы?

1. Проверьте логи: `doctl apps logs <APP_ID>`
2. Проверьте переменные: `doctl apps list-envs <APP_ID> | grep DO_`
3. См. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

