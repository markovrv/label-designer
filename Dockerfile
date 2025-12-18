FROM node:18-alpine

# Установка зависимостей для Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    fontconfig \
    dbus \
    tini

# Установка переменных окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json (если есть) для установки зависимостей
COPY package*.json ./

# Установка зависимостей npm
RUN npm ci --only=production

# Копирование остальных файлов проекта
COPY server.js ./
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
ENTRYPOINT ["tini", "--"]
CMD ["npm", "start"]