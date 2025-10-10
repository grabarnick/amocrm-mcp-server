import http from 'http';

/**
 * Проверка Bearer токена для защиты HTTP эндпоинтов MCP сервера
 * @param req - HTTP запрос
 * @param res - HTTP ответ
 * @param expectedToken - Ожидаемый токен из переменной окружения
 * @returns true если токен валиден, false если нет (и отправляет 401 ответ)
 */
export function validateBearerToken(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  expectedToken?: string
): boolean {
  // Если токен не настроен, разрешаем доступ (backward compatibility)
  if (!expectedToken) {
    console.warn('⚠️  MCP_AUTH_TOKEN не установлен - сервер работает БЕЗ защиты!');
    return true;
  }

  // Получаем заголовок Authorization
  const authHeader = req.headers.authorization;

  // Проверяем наличие заголовка
  if (!authHeader) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="MCP Server", error="invalid_token", error_description="Missing Authorization header"'
    });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'Authorization header is required'
    }));
    return false;
  }

  // Проверяем формат Bearer token
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="MCP Server", error="invalid_token", error_description="Invalid token format"'
    });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected: Bearer <token>'
    }));
    return false;
  }

  const token = tokenMatch[1];

  // Проверяем токен
  if (token !== expectedToken) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="MCP Server", error="invalid_token", error_description="Invalid or expired token"'
    });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid token'
    }));
    return false;
  }

  // Токен валиден
  return true;
}

/**
 * Исключенные эндпоинты, которые не требуют авторизации
 */
export const PUBLIC_ENDPOINTS = [
  '/',
  '/health'
];

/**
 * Проверяет, является ли эндпоинт публичным
 */
export function isPublicEndpoint(url: string): boolean {
  return PUBLIC_ENDPOINTS.some(endpoint => url === endpoint || url.startsWith(endpoint + '?'));
}

