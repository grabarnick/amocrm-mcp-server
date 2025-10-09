#!/bin/bash
# Обновляет токены в .env из .amo-tokens.json

if [ ! -f .amo-tokens.json ]; then
    echo "❌ Файл .amo-tokens.json не найден"
    exit 1
fi

ACCESS_TOKEN=$(cat .amo-tokens.json | grep -o '"access_token": *"[^"]*"' | sed 's/"access_token": *"\(.*\)"/\1/')
REFRESH_TOKEN=$(cat .amo-tokens.json | grep -o '"refresh_token": *"[^"]*"' | sed 's/"refresh_token": *"\(.*\)"/\1/')

echo "🔄 Обновляем токены в .env..."

# Создаем резервную копию
cp .env .env.backup

# Обновляем токены
sed -i.tmp "s|^AMO_ACCESS_TOKEN=.*|AMO_ACCESS_TOKEN=$ACCESS_TOKEN|" .env
sed -i.tmp "s|^AMO_REFRESH_TOKEN=.*|AMO_REFRESH_TOKEN=$REFRESH_TOKEN|" .env
rm -f .env.tmp

echo "✅ Токены обновлены!"
echo "   Резервная копия: .env.backup"
