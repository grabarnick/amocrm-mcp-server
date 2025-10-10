# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для сборки)
RUN npm ci

# Копируем исходный код
COPY src/ ./src/
COPY tsconfig.json ./

# Собираем TypeScript
RUN npm run build

# Удаляем dev-зависимости для уменьшения размера образа
RUN npm ci --only=production && npm cache clean --force

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# Меняем владельца файлов
RUN chown -R mcp:nodejs /app
USER mcp

# Открываем порт (если понадобится для health checks)
EXPOSE 3000

# Команда запуска
CMD ["node", "dist/index.js"]
