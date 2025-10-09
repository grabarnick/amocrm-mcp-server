#!/bin/bash
# Простой тест MCP сервера

echo "🧪 Тестирование MCP сервера"
echo "============================"
echo ""

echo "1️⃣  Проверка сборки..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ dist/index.js не найден. Запустите: npm run build"
    exit 1
fi
echo "✅ dist/index.js найден"
echo ""

echo "2️⃣  Проверка переменных окружения..."
if [ ! -f ".env" ]; then
    echo "❌ .env файл не найден"
    exit 1
fi
echo "✅ .env найден"
echo ""

echo "3️⃣  Запуск сервера на 3 секунды..."
echo "   (сервер должен запуститься без ошибок и ждать ввода)"
echo ""

# Запускаем сервер с таймаутом
timeout 3s node dist/index.js <<< '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' 2>&1 | head -20 &
SERVER_PID=$!

sleep 2

# Проверяем, запущен ли процесс
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Сервер запустился успешно"
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ Сервер завершился с ошибкой"
    exit 1
fi

echo ""
echo "============================"
echo "✅ Базовые проверки пройдены!"
echo ""
echo "📚 Для полного тестирования используйте:"
echo "   - Подключите сервер к Claude Desktop"
echo "   - Или используйте MCP Inspector:"
echo "     npx @modelcontextprotocol/inspector node dist/index.js"
echo ""

