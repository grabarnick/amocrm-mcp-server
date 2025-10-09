# Быстрый деплой на DigitalOcean

## 🚀 За 5 минут

### Шаг 1: Подготовка

```bash
# 1. Установите doctl (если не установлен)
brew install doctl

# 2. Авторизуйтесь в DigitalOcean
doctl auth init

# 3. Установите переменные окружения
export AMO_BASE_URL=https://yoursubdomain.amocrm.ru
export AMO_CLIENT_ID=your_client_id
export AMO_CLIENT_SECRET=your_client_secret
export AMO_REDIRECT_URI=https://your-app-url.com/callback
export AMO_ACCESS_TOKEN=your_access_token
export AMO_REFRESH_TOKEN=your_refresh_token
```

### Шаг 2: Обновите конфигурацию

Отредактируйте `.do/app.yaml`:
- Замените `YOUR_USERNAME` на ваш GitHub username
- Укажите правильные значения переменных окружения

### Шаг 3: Деплой

```bash
# Автоматический деплой
./deploy-digitalocean.sh
```

### Шаг 4: Проверка

```bash
# Статус приложения
doctl apps list

# Логи
doctl apps logs <APP_ID>
```

---

## 🎯 Альтернатива: Через веб-интерфейс

1. Идите на [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. **Create App** → **GitHub**
3. Выберите ваш репозиторий
4. Настройте:
   - Build Command: `npm run build`
   - Run Command: `node dist/index.js`
5. Добавьте переменные окружения
6. **Create Resources**

---

## 💰 Стоимость: $5/месяц

- Basic план
- 512 MB RAM
- Автоматический деплой из GitHub
- SSL сертификат включен

---

## 🔧 Обновление токенов

Когда токены истекут:

```bash
# 1. Получите новые токены локально
npm run test-api auth <новый_код>

# 2. Обновите переменные в DigitalOcean
# Control Panel → Apps → Your App → Settings → App-Level Environment Variables

# 3. Или через doctl
doctl apps update <APP_ID> --spec .do/app.yaml
```

---

## 📊 Мониторинг

- **Логи:** DigitalOcean Control Panel → Apps → Your App → Runtime Logs
- **Метрики:** CPU, память, запросы в реальном времени
- **Алерты:** Настройте уведомления о проблемах

---

## 🆘 Если что-то не работает

1. Проверьте логи в DigitalOcean Control Panel
2. Убедитесь, что все переменные окружения заданы
3. Проверьте токены локально: `npm run test-api account`
4. Перезапустите приложение в Control Panel

---

**Готово!** Ваш MCP сервер теперь работает в облаке! 🎉
