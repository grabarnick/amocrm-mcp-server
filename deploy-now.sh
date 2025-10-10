#!/bin/bash
# Быстрый деплой AmoCRM MCP на DigitalOcean

echo "🚀 Деплой AmoCRM MCP на DigitalOcean App Platform"
echo "================================================="

# Проверяем наличие конфигурации
if [ ! -f ".do/app.yaml" ]; then
    echo "❌ .do/app.yaml не найден!"
    echo "   Создайте его на основе .do/app.yaml.template"
    exit 1
fi

echo "✅ Конфигурация найдена"

# Проверяем doctl
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl не установлен!"
    echo "   Установите: brew install doctl"
    exit 1
fi

echo "✅ doctl установлен"

# Проверяем авторизацию
if ! doctl account get &> /dev/null; then
    echo "❌ Не авторизованы в DigitalOcean!"
    echo ""
    echo "🔑 Выполните авторизацию:"
    echo "   1. Получите токен: https://cloud.digitalocean.com/account/api/tokens"
    echo "   2. Выполните: export DIGITALOCEAN_ACCESS_TOKEN=ваш_токен"
    echo "   3. Выполните: doctl auth init"
    exit 1
fi

echo "✅ Авторизованы в DigitalOcean"

# Проверяем git статус
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Есть несохраненные изменения в git!"
    echo "   Сохраните изменения перед деплоем"
    exit 1
fi

echo "✅ Git чистый"

# Пушим в GitHub если нужно
if [ "$(git rev-list HEAD origin/main..HEAD)" ]; then
    echo "📤 Пушим изменения в GitHub..."
    git push origin main
else
    echo "✅ GitHub актуален"
fi

# Создаем app
echo ""
echo "🚀 Создаем приложение на DigitalOcean..."

APP_ID=$(doctl apps create --spec .do/app.yaml --format ID --no-header)
echo "✅ Приложение создано! ID: $APP_ID"

echo ""
echo "📊 Статус деплоя:"
doctl apps list --format ID,Name,Spec.Name,DefaultIngress

echo ""
echo "⏳ Деплой займет 5-10 минут..."
echo "📋 Для просмотра логов:"
echo "   doctl apps logs $APP_ID --follow"

echo ""
echo "🌐 URL приложения будет доступен через несколько минут"
echo "   Проверьте в DigitalOcean Control Panel → Apps"

