# 🚀 Быстрый старт с авторизацией

## За 5 минут: Защищенный MCP сервер

### Шаг 1: Генерация токена (30 секунд)

```bash
# Генерируем безопасный токен
openssl rand -hex 32
```

Скопируйте полученный токен (например: `a1b2c3d4e5f6...`)

### Шаг 2: Установка токена (1 минута)

**Вариант A - Через .env файл:**
```bash
echo "MCP_AUTH_TOKEN=<ваш-токен>" >> .env
```

**Вариант B - Через переменную окружения:**
```bash
export MCP_AUTH_TOKEN="<ваш-токен>"
```

**Вариант C - Для DigitalOcean:**
```bash
# Через веб-интерфейс:
# Settings → Environment Variables → Add:
# MCP_AUTH_TOKEN = <ваш-токен>
```

### Шаг 3: Запуск сервера (1 минута)

```bash
# Соберите проект
npm run build

# Запустите HTTP сервер
npm run start:http

# Или Streamable HTTP сервер
npm run start:streamable
```

Вы увидите:
```
🔒 Authorization enabled with Bearer token
HTTP MCP Server running on port 8080
```

### Шаг 4: Тестирование (2 минуты)

**Без токена (должна быть ошибка):**
```bash
curl http://localhost:8080/tools
# Результат: {"error":"Unauthorized","message":"Authorization header is required"}
```

**С токеном (должно работать):**
```bash
curl -H "Authorization: Bearer <ваш-токен>" http://localhost:8080/tools
# Результат: {"tools":["amocrm_listLeads","amocrm_getLead",...]}
```

**Автоматическое тестирование:**
```bash
# Установите токен и запустите тесты
export MCP_AUTH_TOKEN="<ваш-токен>"
./test-auth.sh
```

---

## Использование в коде

### JavaScript/TypeScript

```javascript
const token = process.env.MCP_AUTH_TOKEN;

// Fetch API
const response = await fetch('http://localhost:8080/call/amocrm_listLeads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ page: 1, limit: 10 })
});

const data = await response.json();
console.log(data);
```

### Python

```python
import os
import requests

token = os.environ['MCP_AUTH_TOKEN']
headers = {'Authorization': f'Bearer {token}'}

response = requests.post(
    'http://localhost:8080/call/amocrm_listLeads',
    headers=headers,
    json={'page': 1, 'limit': 10}
)

print(response.json())
```

### cURL

```bash
# Сохраните токен в переменную
TOKEN="<ваш-токен>"

# Список инструментов
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/tools

# Получить сделки
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"page":1,"limit":10}' \
     http://localhost:8080/call/amocrm_listLeads

# Получить информацию об аккаунте
curl -H "Authorization: Bearer $TOKEN" \
     -X POST \
     http://localhost:8080/call/amocrm_getAccount
```

---

## Важные моменты

### ✅ Что защищено

- `/tools` - список инструментов
- `/call/*` - вызов MCP инструментов  
- `/mcp` - Streamable HTTP endpoint

### 🔓 Что НЕ защищено (публичные)

- `/` - корневой endpoint
- `/health` - проверка здоровья

### ⚠️ Безопасность

1. **ВСЕГДА используйте HTTPS в продакшне**
2. **НЕ коммитьте токены в Git**
3. **Храните токены в переменных окружения**
4. **Меняйте токены каждые 3-6 месяцев**

---

## Troubleshooting

### Проблема: "MCP_AUTH_TOKEN не установлен"

**Причина:** Переменная окружения не установлена

**Решение:**
```bash
# Проверьте наличие токена
echo $MCP_AUTH_TOKEN

# Если пусто, установите
export MCP_AUTH_TOKEN="<ваш-токен>"
```

### Проблема: 401 Unauthorized

**Причина 1:** Забыли добавить заголовок Authorization
```bash
# ❌ Неправильно
curl http://localhost:8080/tools

# ✅ Правильно
curl -H "Authorization: Bearer <токен>" http://localhost:8080/tools
```

**Причина 2:** Неверный формат токена
```bash
# ❌ Неправильно
Authorization: <токен>

# ✅ Правильно
Authorization: Bearer <токен>
```

**Причина 3:** Неверный токен
```bash
# Проверьте, что токен совпадает с MCP_AUTH_TOKEN
echo $MCP_AUTH_TOKEN
```

---

## Полная документация

Для подробной информации см.:
- [SECURITY.md](./SECURITY.md) - Полное руководство по безопасности
- [README.md](./README.md) - Основная документация

---

## Генерация безопасного токена

### Метод 1: OpenSSL (рекомендуется)
```bash
openssl rand -hex 32
```

### Метод 2: Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Метод 3: Python
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Токен должен быть:
- ✅ Минимум 32 символа
- ✅ Случайно сгенерирован
- ✅ Уникален для каждого проекта

Токен НЕ должен быть:
- ❌ "password", "secret", "12345"
- ❌ Ваш email или имя
- ❌ Легко угадываемым

