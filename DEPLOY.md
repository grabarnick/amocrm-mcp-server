# Деплой AmoCRM MCP сервера на DigitalOcean

Это руководство описывает, как развернуть AmoCRM MCP сервер на DigitalOcean App Platform.

## 🎯 Варианты деплоя

### Вариант 1: DigitalOcean App Platform (рекомендуется)

Самый простой способ - использовать App Platform для автоматического деплоя из GitHub.

### Вариант 2: Docker на Droplet

Развертывание на виртуальной машине с Docker.

### Вариант 3: Container Registry + App Platform

Использование Container Registry для хранения образов.

---

## 🚀 Вариант 1: DigitalOcean App Platform

### Шаг 1: Подготовка репозитория

1. Убедитесь, что код загружен в GitHub:
   ```bash
   git push origin main
   ```

2. Проверьте, что токены не попали в репозиторий:
   ```bash
   git log --name-only | grep -E "\.env|tokens" || echo "✅ Токены не в git"
   ```

### Шаг 2: Создание App в DigitalOcean

1. Войдите в [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
2. Перейдите в **Apps** → **Create App**
3. Выберите **GitHub** как источник
4. Подключите ваш репозиторий
5. Выберите ветку `main`

### Шаг 3: Настройка App

1. **Build Settings:**
   - Build Command: `npm run build`
   - Run Command: `node dist/index.js`
   - Environment: `Node.js`

2. **Environment Variables:**
   Добавьте все необходимые переменные:
   ```
   AMO_BASE_URL=https://yoursubdomain.amocrm.ru
   AMO_CLIENT_ID=your_client_id
   AMO_CLIENT_SECRET=your_client_secret
   AMO_REDIRECT_URI=https://your-app-url.com/callback
   AMO_ACCESS_TOKEN=your_access_token
   AMO_REFRESH_TOKEN=your_refresh_token
   ```

3. **Scaling:**
   - Plan: Basic ($5/month)
   - Instances: 1
   - CPU: Shared
   - Memory: 512 MB

### Шаг 4: Деплой

1. Нажмите **Create Resources**
2. Дождитесь завершения деплоя (5-10 минут)
3. Проверьте логи в разделе **Runtime Logs**

---

## 🐳 Вариант 2: Docker на Droplet

### Шаг 1: Создание Droplet

1. Создайте новый Droplet:
   - Image: Ubuntu 22.04
   - Size: Basic ($6/month)
   - Region: ближайший к вам

2. Подключитесь к серверу:
   ```bash
   ssh root@your-droplet-ip
   ```

### Шаг 2: Установка Docker

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Устанавливаем Docker Compose
apt install docker-compose -y

# Проверяем установку
docker --version
docker-compose --version
```

### Шаг 3: Клонирование репозитория

```bash
# Клонируем репозиторий
git clone https://github.com/YOUR_USERNAME/amocrm-mcp-server.git
cd amocrm-mcp-server

# Создаем .env файл
cat > .env << EOF
AMO_BASE_URL=https://yoursubdomain.amocrm.ru
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret
AMO_REDIRECT_URI=https://your-domain.com/callback
AMO_ACCESS_TOKEN=your_access_token
AMO_REFRESH_TOKEN=your_refresh_token
EOF
```

### Шаг 4: Запуск с Docker Compose

```bash
# Запускаем сервис
docker-compose up -d

# Проверяем статус
docker-compose ps
docker-compose logs -f
```

### Шаг 5: Настройка автозапуска

```bash
# Создаем systemd сервис
cat > /etc/systemd/system/amocrm-mcp.service << EOF
[Unit]
Description=AmoCRM MCP Server
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/amocrm-mcp-server
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Включаем автозапуск
systemctl enable amocrm-mcp.service
systemctl start amocrm-mcp.service
```

---

## 📦 Вариант 3: Container Registry

### Шаг 1: Создание Registry

1. В DigitalOcean Control Panel:
   - Go to **Container Registry**
   - Create Registry
   - Name: `amocrm-mcp`

### Шаг 2: Сборка и загрузка образа

```bash
# Логинимся в registry
doctl registry login

# Собираем образ
docker build -t amocrm-mcp-server .

# Тегируем для registry
docker tag amocrm-mcp-server registry.digitalocean.com/amocrm-mcp/amocrm-mcp-server

# Загружаем в registry
docker push registry.digitalocean.com/amocrm-mcp/amocrm-mcp-server
```

### Шаг 3: Создание App из Registry

1. В App Platform выберите **Container Registry**
2. Выберите ваш registry и образ
3. Настройте переменные окружения
4. Деплойте

---

## 🔧 Настройка переменных окружения

### Обязательные переменные:

```bash
AMO_BASE_URL=https://yoursubdomain.amocrm.ru
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret
```

### Опциональные переменные:

```bash
AMO_REDIRECT_URI=https://your-app-url.com/callback
AMO_ACCESS_TOKEN=your_access_token
AMO_REFRESH_TOKEN=your_refresh_token
```

### Получение токенов:

1. Получите код авторизации:
   ```
   https://yoursubdomain.amocrm.ru/oauth?client_id=YOUR_CLIENT_ID&mode=post_message
   ```

2. Обменяйте на токены (локально):
   ```bash
   npm run test-api auth YOUR_CODE
   ```

3. Скопируйте токены в переменные окружения

---

## 🔍 Мониторинг и логи

### DigitalOcean App Platform:

1. **Runtime Logs:** Просмотр логов приложения
2. **Metrics:** Мониторинг CPU, памяти, запросов
3. **Alerts:** Настройка уведомлений

### Docker на Droplet:

```bash
# Просмотр логов
docker-compose logs -f

# Статус контейнеров
docker-compose ps

# Перезапуск сервиса
docker-compose restart
```

---

## 🛠 Обслуживание

### Обновление приложения:

1. **App Platform:**
   - Push изменений в GitHub
   - App автоматически пересоберется и перезапустится

2. **Docker на Droplet:**
   ```bash
   cd /root/amocrm-mcp-server
   git pull origin main
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

### Обновление токенов:

1. Получите новые токены локально
2. Обновите переменные окружения в DigitalOcean
3. Перезапустите приложение

---

## 💰 Стоимость

### DigitalOcean App Platform:
- **Basic:** $5/месяц (512 MB RAM, 1 vCPU)
- **Professional:** $12/месяц (1 GB RAM, 1 vCPU)

### Droplet:
- **Basic:** $6/месяц (1 GB RAM, 1 vCPU)

### Container Registry:
- **Storage:** $5/месяц за 100 GB

---

## 🆘 Устранение неполадок

### Проблема: App не запускается

1. Проверьте логи в Runtime Logs
2. Убедитесь, что все переменные окружения заданы
3. Проверьте, что токены валидны

### Проблема: Ошибки 401

1. Проверьте токены:
   ```bash
   # Локально
   npm run test-api account
   ```

2. Обновите токены в переменных окружения

### Проблема: Высокое использование ресурсов

1. Увеличьте план в App Platform
2. Или создайте более мощный Droplet

---

## 📚 Полезные ссылки

- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [DigitalOcean Container Registry](https://docs.digitalocean.com/products/container-registry/)
- [Docker Documentation](https://docs.docker.com/)

---

## 🎯 Рекомендации

1. **Для разработки:** Используйте App Platform (проще настройка)
2. **Для продакшена:** Рассмотрите Droplet с Docker (больше контроля)
3. **Для масштабирования:** Container Registry + App Platform

Начните с App Platform - это самый простой способ запустить ваш MCP сервер в облаке!
