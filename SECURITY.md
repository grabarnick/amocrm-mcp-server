# 🔐 Безопасность AmoCRM MCP Server

## Оглавление
- [Обзор](#обзор)
- [Bearer Token авторизация](#bearer-token-авторизация)
- [Настройка защиты](#настройка-защиты)
- [Примеры использования](#примеры-использования)
- [Рекомендации по безопасности](#рекомендации-по-безопасности)
- [Диагностика проблем](#диагностика-проблем)
- [Roadmap](#roadmap)

---

## Обзор

AmoCRM MCP Server поддерживает несколько транспортных протоколов:

| Транспорт | Безопасность | Рекомендация |
|-----------|--------------|--------------|
| **STDIO** | ✅ Безопасен по умолчанию | Для локального использования (Claude Desktop) |
| **HTTP** | ⚠️ Требует `MCP_AUTH_TOKEN` | Для внешнего доступа |
| **Streamable HTTP** | ⚠️ Требует `MCP_AUTH_TOKEN` | Для MCP клиентов с SSE |

### ⚠️ Важно для HTTP/Streamable HTTP режимов

**БЕЗ токена ваш сервер открыт для всех!** Любой пользователь, знающий URL вашего сервера, сможет:
- Читать данные из AmoCRM
- Создавать/изменять/удалять сделки, контакты, компании
- Выполнять любые операции от вашего имени

**С токеном** доступ получат только авторизованные клиенты с валидным токеном.

---

## Bearer Token авторизация

### Что это?

Bearer Token — это простой и надежный метод авторизации:
- Клиент отправляет токен в заголовке `Authorization: Bearer <token>`
- Сервер проверяет токен перед выполнением запроса
- Если токен неверный или отсутствует — возвращается `401 Unauthorized`

### Защищенные эндпоинты

Требуют токен:
- `POST /call/*` - вызов MCP инструментов (HTTP транспорт)
- `GET /mcp` - SSE подключение (Streamable HTTP)
- `POST /mcp` - отправка JSON-RPC сообщений (Streamable HTTP)
- `DELETE /mcp` - завершение сессии (Streamable HTTP)
- `GET /tools` - список доступных инструментов

Публичные (НЕ требуют токен):
- `GET /` - корневой endpoint
- `GET /health` - проверка здоровья сервера

---

## Настройка защиты

### Шаг 1: Генерация токена

**Способ 1 - OpenSSL (рекомендуется):**
```bash
openssl rand -hex 32
```

**Способ 2 - Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Способ 3 - онлайн генератор:**
```bash
# Используйте надежный генератор, например:
# https://www.random.org/strings/
```

Пример сгенерированного токена:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Шаг 2: Установка переменной окружения

#### Для локального запуска (.env файл):
```bash
# .env
MCP_AUTH_TOKEN=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

#### Для DigitalOcean App Platform:
```bash
# Через CLI
doctl apps update <app-id> --spec - <<EOF
envs:
  - key: MCP_AUTH_TOKEN
    value: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
    scope: RUN_TIME
EOF

# Или через веб-интерфейс:
# Settings → App-Level Environment Variables → Add Variable
```

#### Для Docker:
```bash
docker run -e MCP_AUTH_TOKEN="your-token" your-image
```

#### Для docker-compose.yml:
```yaml
services:
  mcp-server:
    environment:
      - MCP_AUTH_TOKEN=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Шаг 3: Запуск защищенного сервера

```bash
npm run build
npm run start:http
# или
npm run start:streamable
```

Вы увидите:
```
HTTP MCP Server running on port 8080
🔒 Authorization enabled with Bearer token
```

Если токен НЕ установлен:
```
⚠️  MCP_AUTH_TOKEN не установлен - сервер работает БЕЗ защиты!
```

---

## Примеры использования

### cURL

**Без токена (получите 401):**
```bash
curl http://localhost:8080/tools
```

Ответ:
```json
{
  "error": "Unauthorized",
  "message": "Authorization header is required"
}
```

**С токеном (успешный запрос):**
```bash
curl -H "Authorization: Bearer a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
     http://localhost:8080/tools
```

Ответ:
```json
{
  "tools": ["amocrm_listLeads", "amocrm_getLead", ...]
}
```

### JavaScript/TypeScript

**Fetch API:**
```javascript
const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';

fetch('http://localhost:8080/tools', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Axios:**
```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Authorization': `Bearer ${process.env.MCP_AUTH_TOKEN}`
  }
});

// Получить список сделок
const response = await client.post('/call/amocrm_listLeads', {
  page: 1,
  limit: 10
});
```

### Python

**requests library:**
```python
import requests
import os

token = os.environ['MCP_AUTH_TOKEN']
headers = {'Authorization': f'Bearer {token}'}

# Получить инструменты
response = requests.get('http://localhost:8080/tools', headers=headers)
print(response.json())

# Вызвать инструмент
response = requests.post(
    'http://localhost:8080/call/amocrm_listLeads',
    headers=headers,
    json={'page': 1, 'limit': 10}
)
print(response.json())
```

### SSE (Streamable HTTP)

**JavaScript EventSource:**
```javascript
const token = 'your-token-here';

const eventSource = new EventSource('http://localhost:8080/mcp', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});
```

**cURL SSE:**
```bash
curl -N -H "Accept: text/event-stream" \
     -H "Authorization: Bearer your-token" \
     http://localhost:8080/mcp
```

---

## Рекомендации по безопасности

### ✅ DO (Делайте так)

1. **Используйте сложные токены**
   - Минимум 32 символа
   - Случайно сгенерированные (криптографически стойкие)
   - Используйте `openssl rand -hex 32` или аналоги

2. **Храните токены безопасно**
   - В переменных окружения (НЕ в коде!)
   - Используйте secret managers (AWS Secrets Manager, HashiCorp Vault)
   - НЕ коммитьте токены в Git

3. **Используйте HTTPS в продакшне**
   - Bearer токены передаются в HTTP заголовках
   - Без HTTPS токены могут быть перехвачены
   - Настройте SSL/TLS сертификаты

4. **Ротируйте токены регулярно**
   - Меняйте токены каждые 3-6 месяцев
   - При подозрении на компрометацию - немедленно

5. **Мониторьте доступ**
   - Логируйте все запросы с ошибками 401
   - Настройте алерты на подозрительную активность

### ❌ DON'T (Не делайте так)

1. **НЕ используйте слабые токены**
   ```bash
   # ❌ Плохие примеры:
   MCP_AUTH_TOKEN="12345"
   MCP_AUTH_TOKEN="password"
   MCP_AUTH_TOKEN="secret"
   MCP_AUTH_TOKEN="test"
   ```

2. **НЕ храните токены в коде**
   ```javascript
   // ❌ Плохо:
   const token = 'hardcoded-token';
   
   // ✅ Хорошо:
   const token = process.env.MCP_AUTH_TOKEN;
   ```

3. **НЕ передавайте токены в URL**
   ```bash
   # ❌ Плохо:
   curl http://localhost:8080/tools?token=secret
   
   # ✅ Хорошо:
   curl -H "Authorization: Bearer secret" http://localhost:8080/tools
   ```

4. **НЕ логируйте токены**
   ```javascript
   // ❌ Плохо:
   console.log('Token:', req.headers.authorization);
   
   // ✅ Хорошо:
   console.log('Auth header present:', !!req.headers.authorization);
   ```

5. **НЕ используйте HTTP в продакшне**
   - Всегда используйте HTTPS для защиты токенов

### 🔒 Дополнительная защита

**1. Ограничение IP адресов (firewall):**
```bash
# Только для определенных IP
iptables -A INPUT -p tcp --dport 8080 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 8080 -j DROP
```

**2. Rate limiting (nginx):**
```nginx
http {
  limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;
  
  server {
    location / {
      limit_req zone=mcp_limit burst=20;
      proxy_pass http://localhost:8080;
    }
  }
}
```

**3. VPN или приватные сети:**
- Развертывайте MCP сервер в приватной сети
- Доступ только через VPN
- Используйте DigitalOcean VPC или AWS VPC

---

## Диагностика проблем

### Проблема: 401 Unauthorized

**Симптом:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

**Причины и решения:**

1. **Токен не передан в заголовке:**
   ```bash
   # Проверьте наличие заголовка
   curl -v http://localhost:8080/tools 2>&1 | grep Authorization
   ```

2. **Неверный формат токена:**
   ```bash
   # ✅ Правильно:
   Authorization: Bearer a1b2c3d4...
   
   # ❌ Неправильно:
   Authorization: a1b2c3d4...  # пропущено "Bearer"
   Authorization: Bearer: a1b2c3d4...  # лишнее двоеточие
   ```

3. **Токен не совпадает с MCP_AUTH_TOKEN:**
   ```bash
   # Проверьте установленный токен
   echo $MCP_AUTH_TOKEN
   
   # Проверьте в логах сервера
   # Должно быть: "🔒 Authorization enabled"
   # Не должно быть: "⚠️ MCP_AUTH_TOKEN не установлен"
   ```

### Проблема: Сервер работает без защиты

**Симптом:**
```
⚠️  MCP_AUTH_TOKEN не установлен - сервер работает БЕЗ защиты!
```

**Решение:**
```bash
# 1. Сгенерируйте токен
TOKEN=$(openssl rand -hex 32)

# 2. Добавьте в .env
echo "MCP_AUTH_TOKEN=$TOKEN" >> .env

# 3. Перезапустите сервер
npm run start:http
```

### Проблема: CORS ошибки

**Симптом (в браузере):**
```
Access to fetch at 'http://localhost:8080/tools' has been blocked by CORS policy
```

**Решение:**
- Сервер уже настроен на `Access-Control-Allow-Origin: *`
- Убедитесь, что заголовок `Authorization` включен в `Access-Control-Allow-Headers`
- Проверьте, что отправляется preflight запрос (OPTIONS)

---

## Roadmap

### Текущая реализация (v0.1.0)
- ✅ Bearer Token авторизация
- ✅ Публичные эндпоинты (/health, /)
- ✅ Защита HTTP и Streamable HTTP транспортов
- ✅ Совместимость с существующими клиентами

### Планируется (v0.2.0)
- 🔄 API Keys с ротацией
- 🔄 Множественные токены для разных клиентов
- 🔄 Rate limiting встроенный
- 🔄 Логирование и аудит

### Будущее (v1.0.0)
- 📋 Полная поддержка OAuth 2.1 (RFC 9728)
- 📋 Dynamic Client Registration (RFC 7591)
- 📋 Resource Indicators (RFC 8707)
- 📋 JWT токены с автоматическим refresh
- 📋 PKCE flow для публичных клиентов

---

## Связанные документы

- [README.md](./README.md) - Основная документация
- [MCP Authorization Spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) - Спецификация MCP
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13) - OAuth 2.1

---

## Поддержка

Если у вас возникли вопросы по безопасности:
1. Проверьте [Диагностику проблем](#диагностика-проблем)
2. Изучите [Примеры использования](#примеры-использования)
3. Откройте issue в репозитории

**Не публикуйте токены в issue или pull requests!**

