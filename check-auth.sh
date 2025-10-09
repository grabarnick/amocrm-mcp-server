#!/bin/bash
# Скрипт для проверки настроек OAuth

echo "🔍 Проверка настроек OAuth AmoCRM"
echo "=================================="
echo ""

# Проверка .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "   Создайте файл .env на основе .env.example"
    exit 1
fi

echo "✅ Файл .env найден"
echo ""

# Загружаем переменные
source .env 2>/dev/null

# Проверка обязательных переменных
echo "📋 Проверка переменных окружения:"
echo ""

check_var() {
    local var_name=$1
    local var_value=${!var_name}
    local is_required=$2
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = "required" ]; then
            echo "❌ $var_name - НЕ ЗАДАНА (обязательна)"
        else
            echo "⚠️  $var_name - не задана (опциональна)"
        fi
        return 1
    else
        # Скрываем чувствительные данные
        if [[ "$var_name" == *"SECRET"* ]] || [[ "$var_name" == *"TOKEN"* ]]; then
            echo "✅ $var_name - задана (${var_value:0:10}...)"
        else
            echo "✅ $var_name - $var_value"
        fi
        return 0
    fi
}

check_var "AMO_BASE_URL" "required"
check_var "AMO_CLIENT_ID" "required"
check_var "AMO_CLIENT_SECRET" "required"
check_var "AMO_REDIRECT_URI" "optional"
check_var "AMO_ACCESS_TOKEN" "optional"
check_var "AMO_REFRESH_TOKEN" "optional"

echo ""
echo "=================================="
echo ""

# Проверка redirect_uri
if [ -n "$AMO_REDIRECT_URI" ]; then
    if [[ "$AMO_REDIRECT_URI" == *"your.app"* ]] || [[ "$AMO_REDIRECT_URI" == *"example"* ]]; then
        echo "⚠️  ВНИМАНИЕ: AMO_REDIRECT_URI похож на шаблонный!"
        echo "   Текущее значение: $AMO_REDIRECT_URI"
        echo ""
        echo "   Это может вызвать ошибку 'Redirect URI is not associated'"
        echo ""
        echo "   Что делать:"
        echo "   1. Откройте настройки интеграции в AmoCRM"
        echo "   2. Скопируйте правильный Redirect URI"
        echo "   3. Обновите AMO_REDIRECT_URI в файле .env"
        echo ""
    fi
fi

# Проверка токенов
if [ -n "$AMO_ACCESS_TOKEN" ] && [ -n "$AMO_REFRESH_TOKEN" ]; then
    echo "ℹ️  У вас есть сохраненные токены в .env"
    echo "   Попробуйте проверить их работоспособность:"
    echo "   npm run test-api account"
    echo ""
fi

# Проверка файла с токенами
if [ -f .amo-tokens.json ]; then
    echo "✅ Найден файл .amo-tokens.json"
    echo "   Токены из этого файла будут использоваться в первую очередь"
    echo ""
else
    echo "ℹ️  Файл .amo-tokens.json не найден"
    echo "   Он будет создан после успешной авторизации"
    echo ""
fi

# Генерация URL для авторизации
if [ -n "$AMO_BASE_URL" ] && [ -n "$AMO_CLIENT_ID" ]; then
    echo "🔗 URL для авторизации (mode=post_message):"
    echo "   ${AMO_BASE_URL}/oauth?client_id=${AMO_CLIENT_ID}&mode=post_message"
    echo ""
    
    if [ -n "$AMO_REDIRECT_URI" ]; then
        echo "🔗 URL для авторизации (стандартный OAuth):"
        echo "   ${AMO_BASE_URL}/oauth?client_id=${AMO_CLIENT_ID}&redirect_uri=${AMO_REDIRECT_URI}&response_type=code&state=test"
        echo ""
    fi
fi

echo "=================================="
echo "📚 Полезные команды:"
echo ""
echo "   npm run test-api                 - показать все команды"
echo "   npm run test-api account         - проверить подключение"
echo "   npm run test-api auth <код>      - обменять код на токены"
echo ""
echo "📖 Подробная документация:"
echo "   cat OAUTH-GUIDE.md"
echo ""

