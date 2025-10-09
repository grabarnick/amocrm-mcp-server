# Руководство по OAuth авторизации AmoCRM

## Проблема: "Redirect URI is not associated with client"

Эта ошибка означает, что `redirect_uri` в вашем запросе не совпадает с `redirect_uri`, зарегистрированным в интеграции AmoCRM.

## 🔍 Как узнать правильный redirect_uri

### Способ 1: Проверить настройки интеграции

1. Войдите в AmoCRM
2. Перейдите в **Настройки** → **Интеграции**
3. Найдите вашу интеграцию
4. Скопируйте значение **Redirect URI**

### Способ 2: Посмотреть в документации интеграции

Если вы создавали интеграцию, redirect_uri должен быть указан в её настройках.

## ✅ Решения

### Вариант 1: Обновить .env файл

Откройте файл `.env` и замените шаблонный redirect_uri на реальный:

```bash
# Было:
AMO_REDIRECT_URI=https://your.app/oauth/callback

# Стало (пример):
AMO_REDIRECT_URI=https://example.com/oauth/callback
```

### Вариант 2: Использовать без redirect_uri (для некоторых типов интеграций)

Если вы используете `mode=post_message`, можете попробовать без redirect_uri:

1. Откройте `.env`
2. Закомментируйте или удалите строку `AMO_REDIRECT_URI`:

```bash
# AMO_REDIRECT_URI=https://your.app/oauth/callback
```

3. Попробуйте снова получить код авторизации

### Вариант 3: Использовать правильный redirect_uri при авторизации

При получении кода авторизации используйте ТОЧНО ТОТ ЖЕ redirect_uri, который указан в .env:

```
https://ВАША_ИНТЕГРАЦИЯ.amocrm.ru/oauth?
  client_id=ВАШ_CLIENT_ID&
  redirect_uri=ТОЧНО_ТАКОЙ_ЖЕ_КАК_В_ENV&
  response_type=code&
  state=random_string
```

## 📝 Пошаговая инструкция: Полная авторизация

### Шаг 1: Подготовка

Убедитесь, что в `.env` указаны правильные данные:

```bash
AMO_BASE_URL=https://yoursubdomain.amocrm.ru
AMO_CLIENT_ID=ваш-client-id
AMO_CLIENT_SECRET=ваш-client-secret
AMO_REDIRECT_URI=ваш-redirect-uri  # ВАЖНО: точное значение из настроек интеграции
```

### Шаг 2: Получить код авторизации

#### Метод A: Через браузер (рекомендуется для тестирования)

1. Откройте в браузере:
   ```
   https://yoursubdomain.amocrm.ru/oauth?client_id=ВАШ_CLIENT_ID&mode=post_message
   ```

2. Авторизуйтесь в AmoCRM, если требуется

3. После успешной авторизации:
   - Если используется `mode=post_message`, код появится в pop-up окне
   - Если обычный режим, вы будете перенаправлены на redirect_uri с кодом в параметрах

4. Скопируйте код (часть после `code=` в URL)

#### Метод B: Стандартный OAuth flow

1. Откройте в браузере:
   ```
   https://yoursubdomain.amocrm.ru/oauth?
     client_id=ВАШ_CLIENT_ID&
     redirect_uri=ВАШ_REDIRECT_URI&
     response_type=code&
     state=any_random_string
   ```

2. После авторизации вы будете перенаправлены на:
   ```
   ВАШ_REDIRECT_URI?code=def50200abc...&state=any_random_string&referer=...
   ```

3. Скопируйте значение параметра `code`

### Шаг 3: Обменять код на токены

```bash
npm run test-api auth def50200abc...
```

Если всё настроено правильно, вы увидите:
```
✅ Токены получены и сохранены
   Access Token: eyJ0eXAiOiJKV1QiLCJ...
   Refresh Token: def50200...
   Expires In: 86400 секунд
```

### Шаг 4: Сохранить токены

Токены автоматически сохраняются в `.amo-tokens.json`, но также рекомендуется добавить их в `.env`:

```bash
AMO_ACCESS_TOKEN=скопированный-access-token
AMO_REFRESH_TOKEN=скопированный-refresh-token
```

### Шаг 5: Проверить работу

```bash
npm run test-api account
```

Должны увидеть информацию о вашем аккаунте.

## 🐛 Частые ошибки и решения

### Ошибка: "Redirect URI is not associated with client"

**Причина:** redirect_uri не совпадает с зарегистрированным в интеграции

**Решение:**
1. Проверьте redirect_uri в настройках интеграции AmoCRM
2. Обновите `AMO_REDIRECT_URI` в `.env`
3. Убедитесь, что используете ТОЧНО такой же URI (включая протокол, порт, путь)

### Ошибка: "Invalid authorization code"

**Причина:** Код авторизации уже использован или истёк (коды одноразовые и живут ~10 минут)

**Решение:**
1. Получите новый код авторизации
2. Используйте его быстрее (в течение нескольких минут)

### Ошибка: "Invalid client"

**Причина:** Неправильный client_id или client_secret

**Решение:**
1. Проверьте `AMO_CLIENT_ID` и `AMO_CLIENT_SECRET` в `.env`
2. Убедитесь, что интеграция активна в AmoCRM

### Ошибка: "Авторизация клиента не прошла" (401)

**Причина:** Токены истекли или невалидны

**Решение:**
1. Получите новый код авторизации
2. Обменяйте его на новые токены

## 💡 Советы

1. **Храните токены в безопасности** - не коммитьте файлы `.env` и `.amo-tokens.json` в git

2. **Используйте refresh_token** - access_token живёт ограниченное время (обычно 24 часа), но refresh_token позволяет получать новые access_token автоматически

3. **Для тестирования используйте mode=post_message** - это упрощает процесс получения кода:
   ```
   https://yoursubdomain.amocrm.ru/oauth?client_id=YOUR_ID&mode=post_message
   ```

4. **Проверяйте валидность токенов** - если получаете 401 ошибку, скорее всего нужно обновить токены

## 📚 Полезные ссылки

- [Документация OAuth 2.0 AmoCRM](https://www.amocrm.ru/developers/content/oauth/step-by-step)
- [Настройка интеграций](https://www.amocrm.ru/developers/content/oauth/oauth-token)
- [API Reference](https://www.amocrm.ru/developers/content/crm_platform/api-reference)

