#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}  Тест MCP Bearer Token Authorization${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# Проверка, запущен ли сервер
SERVER_URL="${1:-http://localhost:8080}"
TEST_TOKEN="${MCP_AUTH_TOKEN:-test-secret-token}"

echo -e "${YELLOW}Сервер:${NC} $SERVER_URL"
echo -e "${YELLOW}Токен:${NC} $TEST_TOKEN\n"

# Тест 1: Health check (публичный endpoint, токен не нужен)
echo -e "${BLUE}[Тест 1]${NC} Health check (без токена):"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$SERVER_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Успех${NC} (200): $BODY\n"
else
    echo -e "${RED}✗ Ошибка${NC} ($HTTP_CODE): $BODY\n"
fi

# Тест 2: Защищенный endpoint без токена (должен вернуть 401)
echo -e "${BLUE}[Тест 2]${NC} Защищенный endpoint БЕЗ токена (должно быть 401):"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$SERVER_URL/tools")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ Правильно${NC} (401 Unauthorized): $BODY\n"
else
    echo -e "${RED}✗ Неожиданный код${NC} ($HTTP_CODE): $BODY\n"
fi

# Тест 3: Защищенный endpoint с неверным токеном (должен вернуть 401)
echo -e "${BLUE}[Тест 3]${NC} Защищенный endpoint с НЕВЕРНЫМ токеном (должно быть 401):"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer wrong-token" "$SERVER_URL/tools")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ Правильно${NC} (401 Unauthorized): $BODY\n"
else
    echo -e "${RED}✗ Неожиданный код${NC} ($HTTP_CODE): $BODY\n"
fi

# Тест 4: Защищенный endpoint с правильным токеном (должен вернуть 200)
echo -e "${BLUE}[Тест 4]${NC} Защищенный endpoint с ПРАВИЛЬНЫМ токеном (должно быть 200):"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TEST_TOKEN" "$SERVER_URL/tools")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Успех${NC} (200): $BODY\n"
else
    echo -e "${RED}✗ Ошибка${NC} ($HTTP_CODE): $BODY\n"
fi

# Тест 5: Проверка формата Bearer token (без префикса Bearer)
echo -e "${BLUE}[Тест 5]${NC} Неверный формат токена (без 'Bearer', должно быть 401):"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: $TEST_TOKEN" "$SERVER_URL/tools")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ Правильно${NC} (401 Unauthorized): $BODY\n"
else
    echo -e "${RED}✗ Неожиданный код${NC} ($HTTP_CODE): $BODY\n"
fi

# Итоговая информация
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}Тестирование завершено!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Примечания:${NC}"
echo -e "  • Публичные endpoints (/, /health) НЕ требуют токен"
echo -e "  • Защищенные endpoints (/tools, /call/*, /mcp) требуют токен"
echo -e "  • Формат токена: ${BLUE}Authorization: Bearer <token>${NC}"
echo -e "\n${YELLOW}Генерация нового токена:${NC}"
echo -e "  ${BLUE}openssl rand -hex 32${NC}\n"

