#!/bin/bash
# Скрипт для деплоя AmoCRM MCP сервера на DigitalOcean

set -e

echo "🚀 Деплой AmoCRM MCP сервера на DigitalOcean"
echo "=============================================="

# Проверяем наличие необходимых файлов
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile не найден!"
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml не найден!"
    exit 1
fi

# Проверяем переменные окружения
echo "📋 Проверка переменных окружения..."
required_vars=("AMO_BASE_URL" "AMO_CLIENT_ID" "AMO_CLIENT_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Отсутствуют обязательные переменные окружения:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo ""
    echo "💡 Установите их перед деплоем:"
    echo "   export AMO_BASE_URL=https://yoursubdomain.amocrm.ru"
    echo "   export AMO_CLIENT_ID=your_client_id"
    echo "   export AMO_CLIENT_SECRET=your_client_secret"
    exit 1
fi

echo "✅ Все переменные окружения настроены"

# Собираем проект
echo ""
echo "🔨 Сборка проекта..."
npm run build

# Собираем Docker образ
echo ""
echo "🐳 Сборка Docker образа..."
docker build -t amocrm-mcp-server .

echo ""
echo "✅ Готово к деплою!"
echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Загрузите образ на DigitalOcean:"
echo "   docker tag amocrm-mcp-server registry.digitalocean.com/YOUR_REGISTRY/amocrm-mcp-server"
echo "   docker push registry.digitalocean.com/YOUR_REGISTRY/amocrm-mcp-server"
echo ""
echo "2. Или используйте docker-compose:"
echo "   docker-compose up -d"
echo ""
echo "3. Для DigitalOcean App Platform:"
echo "   - Создайте App в DigitalOcean"
echo "   - Подключите GitHub репозиторий"
echo "   - Укажите Dockerfile как источник"
echo "   - Настройте переменные окружения"
echo ""
echo "📚 Подробная инструкция в DEPLOY.md"
