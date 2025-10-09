#!/bin/bash
# Скрипт для деплоя на DigitalOcean через doctl

set -e

echo "🚀 Деплой AmoCRM MCP на DigitalOcean App Platform"
echo "================================================="

# Проверяем наличие doctl
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl не установлен!"
    echo ""
    echo "📥 Установите doctl:"
    echo "   macOS: brew install doctl"
    echo "   Linux: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Проверяем авторизацию
if ! doctl account get &> /dev/null; then
    echo "❌ Не авторизованы в DigitalOcean!"
    echo ""
    echo "🔑 Выполните авторизацию:"
    echo "   doctl auth init"
    exit 1
fi

echo "✅ doctl настроен и авторизован"

# Проверяем наличие app.yaml
if [ ! -f ".do/app.yaml" ]; then
    echo "❌ .do/app.yaml не найден!"
    echo "   Создайте файл конфигурации для DigitalOcean App Platform"
    exit 1
fi

# Проверяем переменные окружения
echo ""
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

# Проверяем, что код в git
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Есть несохраненные изменения в git!"
    echo "   Сохраните изменения перед деплоем:"
    echo "   git add . && git commit -m 'Update for deploy'"
    read -p "Продолжить деплой? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Пушим в GitHub (если нужно)
echo ""
echo "📤 Проверка GitHub..."
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "⚠️  Вы не на ветке main. Переключитесь:"
    echo "   git checkout main"
    exit 1
fi

# Проверяем, нужно ли пушить
if [ "$(git rev-list HEAD origin/main..HEAD)" ]; then
    echo "📤 Пушим изменения в GitHub..."
    git push origin main
else
    echo "✅ GitHub актуален"
fi

# Создаем/обновляем app
echo ""
echo "🚀 Деплой на DigitalOcean App Platform..."

# Проверяем, существует ли уже app
if doctl apps list | grep -q "amocrm-mcp-server"; then
    echo "🔄 Обновляем существующее приложение..."
    doctl apps update $(doctl apps list --format ID,Name | grep "amocrm-mcp-server" | awk '{print $1}') --spec .do/app.yaml
else
    echo "🆕 Создаем новое приложение..."
    doctl apps create --spec .do/app.yaml
fi

echo ""
echo "✅ Деплой запущен!"
echo ""
echo "📊 Статус деплоя:"
echo "   doctl apps list"
echo ""
echo "📋 Логи приложения:"
echo "   doctl apps logs $(doctl apps list --format ID,Name | grep 'amocrm-mcp-server' | awk '{print $1}')"
echo ""
echo "🌐 URL приложения будет доступен через несколько минут"
echo "   Проверьте в DigitalOcean Control Panel → Apps"
