# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY src/ ./src/
COPY tsconfig.json ./

# Собираем TypeScript
RUN npm run build

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
