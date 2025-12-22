FROM node:18-alpine


# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json (если есть) для установки зависимостей
COPY package*.json ./

# Установка зависимостей npm
RUN npm ci --only=production

# Копирование остальных файлов проекта
COPY server.js ./
# Убираем строку, так как папки server/ не существует
COPY bixolon/ ./bixolon/
COPY public/ ./public/
COPY layouts/ ./layouts/

# Установка прав доступа для директории layouts
RUN chmod -R 755 layouts/

# Установка точки монтирования для сохранения макетов
VOLUME ["/app/layouts"]

# Установка переменной PORT для гибкой настройки порта при запуске
ENV PORT=3000

# Открытие порта
EXPOSE $PORT

# Запуск приложения
CMD ["npm", "start"]