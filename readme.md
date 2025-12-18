# Label Designer - Визуальный редактор этикеток для печати на термопринтере

## Repository overview

Этот репозиторий содержит веб-приложение для создания и редактирования дизайна этикеток с возможностью экспорта в PDF. Приложение представляет собой визуальный редактор, позволяющий создавать макеты этикеток с текстовыми полями, изображениями и другими элементами, а затем сохранять их и использовать для генерации PDF-файлов с данными.

### Основные возможности

- **Визуальный редактор макетов**: Интерактивный интерфейс для создания дизайна этикеток
- **Сохранение и загрузка макетов**: Возможность сохранять созданные макеты и загружать их для дальнейшего использования
- **Генерация PDF**: Преобразование макетов в PDF-файлы с подстановкой данных
- **Шаблонизация**: Использование переменных в макетах (например, `{{variableName}}`) для подстановки данных при генерации PDF
- **Поддержка различных форматов**: Настройка размеров этикеток в миллиметрах
- **Docker поддержка**: Готовые образы для легкого развертывания

### Структура проекта

- `server.js` - основной серверный код приложения (Express)
- `public/` - клиентские файлы (HTML, CSS, JavaScript)
  - `index.html` - основной интерфейс редактора
  - `print-info.html` - страница для генерации печати
  - `style.css` - стили приложения
  - `script.js` - клиентский JavaScript код
- `layouts/` - директория для хранения сохраненных макетов
- `Dockerfile` - инструкции для создания Docker-образа
- `docker-compose.yml` - конфигурация для запуска с помощью Docker Compose
- `package.json` - зависимости и скрипты проекта

### Технологии

Приложение поддерживает следующие переменные окружения для гибкой настройки:

- `PORT` - порт, на котором запускается сервер (по умолчанию 3000)
- `CORS_ORIGIN` - настройка политики CORS (по умолчанию "*")
- `PUPPETEER_HEADLESS` - режим запуска Puppeteer (по умолчанию true)
- `SERVER_HOST` - хост сервера (по умолчанию localhost)
- `LAYOUTS_DIR` - директория для хранения макетов (по умолчанию ./layouts)

### Установка и запуск

#### Локальный запуск:
1. Установите Node.js
2. Выполните `npm install` для установки зависимостей
3. Запустите сервер командой `npm start`
4. Откройте браузер по адресу http://localhost:3000

#### Запуск через Docker:
```bash
docker build -t label-designer .
docker run -p 3000:3000 label-designer
```

## 1. Создание аккаунта в Docker Hub

1. Перейдите на сайт https://hub.docker.com
2. Нажмите кнопку "Sign Up"
3. Заполните форму регистрации (имя пользователя, email, пароль)
4. Подтвердите email, перейдя по ссылке из письма
5. После подтверждения аккаунт будет готов к использованию

## 2. Создание репозитория в Docker Hub

1. Войдите в свой аккаунт Docker Hub
2. Нажмите кнопку "Create Repository"
3. Выберите владельца репозитория (обычно это ваш аккаунт)
4. Введите имя репозитория (например, `label-designer`)
5. Выберите тип репозитория:
   - **Public** (публичный) - виден всем
   - **Private** (приватный) - виден только вам и приглашенным пользователям
6. Нажмите "Create"

## 3. Логин в Docker CLI

1. Откройте терминал или командную строку
2. Выполните команду:
   ```bash
   docker login
   ```
3. Введите свои учетные данные Docker Hub (имя пользователя и пароль)
4. При успешной аутентификации вы получите сообщение "Login Succeeded"

Альтернативно, можно использовать токен вместо пароля:

```bash
echo "<ваш_токен>" | docker login -u "<имя_пользователя>" --password-stdin
```

## 4. Сборка Docker-образа с тегом

Для сборки Docker-образа с тегом выполните следующую команду в директории с Dockerfile:

```bash
docker build -t markovrv/label-designer:latest .
```

Для создания образа с конкретной версией:

```bash
docker build -t markovrv/label-designer:v1.0.0 .
```

Для нашего приложения `label-designer` также можно использовать другие теги:

```bash
docker build -t markovrv/label-designer:1.0.0 .
```

## 5. Пуш образа в Docker Hub

После успешной сборки образа выполните команду для отправки его в Docker Hub:

```bash
docker push markovrv/label-designer:latest
```

Если вы использовали тег с версией:

```bash
docker push markovrv/label-designer:v1.0.0
```

Или для конкретной версии:

```bash
docker push markovrv/label-designer:1.0.0
```

## 6. Тестирование образа перед публикацией

Перед публикацией рекомендуется протестировать образ локально:

1. Запустите контейнер с образом:
   ```bash
   docker run -p 3000:3000 markovrv/label-designer:latest
   ```
2. Откройте браузер и перейдите по адресу http://localhost:3000
3. Проверьте основные функции приложения:
   - Загрузку главной страницы
   - Сохранение и загрузку макетов
   - Генерацию PDF
   - Работу всех интерфейсов
4. Остановите контейнер нажатием `Ctrl+C`

Также можно протестировать с различными портами:

```bash
docker run -p 8080:3000 markovrv/label-designer:latest
```

Или с различными переменными окружения:

```bash
docker run -p 3000:3000 -e PORT=8080 -e CORS_ORIGIN=http://example.com markovrv/label-designer:latest
```

## 7. Примеры команд для запуска опубликованного образа

### Базовый запуск:
```bash
docker run -p 3000:3000 markovrv/label-designer:latest
```

### Запуск с изменением порта:
```bash
docker run -p 8080:8080 -e PORT=8080 markovrv/label-designer:latest
```

### Запуск с монтированием внешней директории для макетов:
```bash
docker run -p 3000:3000 -v /path/to/local/layouts:/app/layouts markovrv/label-designer:latest
```

### Запуск с настройками CORS:
```bash
docker run -p 3000:3000 -e CORS_ORIGIN=https://mydomain.com markovrv/label-designer:latest
```

### Запуск с отключенным headless режимом Puppeteer:
```bash
docker run -p 3000:3000 -e PUPPETEER_HEADLESS=false markovrv/label-designer:latest
```

### Запуск с указанием хоста сервера:
```bash
docker run -p 3000:3000 -e SERVER_HOST=localhost markovrv/label-designer:latest
```

### Запуск в detached режиме:
```bash
docker run -d -p 3000:3000 --name label-designer markovrv/label-designer:latest
```

### Запуск с комплексной настройкой:
```bash
docker run -d \
  -p 3000:3000 \
  --name label-designer \
  -v /home/user/label-layouts:/app/layouts \
  -e PORT=3000 \
  -e CORS_ORIGIN=* \
  -e PUPPETEER_HEADLESS=true \
  -e SERVER_HOST=localhost \
  -e LAYOUTS_DIR=/app/layouts \
  markovrv/label-designer:latest
```

## 8. Рекомендации по версионированию образов

Используйте семантическое версионирование (SemVer): MAJOR.MINOR.PATCH (например, 1.2.3)

- Для основных изменений увеличивайте MAJOR: 1.x.x → 2.x.x
- Для обратно совместимых изменений увеличивайте MINOR: 1.1.x → 1.2.x
- Для исправлений ошибок увеличивайте PATCH: 1.1.1 → 1.1.2
- Используйте тег `latest` для последней стабильной версии
- Храните тег `latest` параллельно с версионным тегом:

```bash
docker build -t markovrv/label-designer:v1.2.0 -t markovrv/label-designer:latest .
```

Для экспериментальных версий используйте теги вроде:
- `alpha`, `beta`, `rc1`, `rc2`
- `feature/new-feature`
- `dev`, `staging`

Пример стратегии версионирования:
- `v1.0.0` - первая стабильная версия
- `v1.0.1` - исправление багов
- `v1.1.0` - добавление новых функций
- `v2.0.0` - критические изменения API
- `v1.1.0-beta` - предварительная версия

## 9. Как обновлять образы

1. Внесите необходимые изменения в код приложения
2. Обновите версию в `package.json` при необходимости
3. Соберите новый образ с новым тегом:

   ```bash
   docker build -t markovrv/label-designer:v1.1.0 .
   ```
4. Протестируйте новый образ локально
5. Опубликуйте новый образ:

   ```bash
   docker push markovrv/label-designer:v1.1.0
   ```
6. При необходимости обновите тег `latest`:

   ```bash
   docker tag markovrv/label-designer:v1.1.0 markovrv/label-designer:latest
   docker push markovrv/label-designer:latest
   ```

### Для обновления работающего контейнера:

```bash
# Остановите старый контейнер
docker stop label-designer

# Удалите старый контейнер
docker rm label-designer

# Скачайте обновленный образ
docker pull markovrv/label-designer:latest

# Запустите новый контейнер
docker run -d -p 3000:3000 --name label-designer markovrv/label-designer:latest
```

## 10. Как использовать .env файлы с опубликованным образом

### Создание .env файла:

Создайте файл `.env` с переменными окружения:

```
PORT=3000
CORS_ORIGIN=*
PUPPETEER_HEADLESS=true
SERVER_HOST=localhost
LAYOUTS_DIR=/app/layouts
```

### Запуск с .env файлом:

```bash
docker run -p 3000:3000 --env-file ./.env markovrv/label-designer:latest
```

### Использование docker-compose.yml:

Создайте файл `docker-compose.yml`:

```yaml
version: '3.8'
services:
  label-designer:
    image: markovrv/label-designer:latest
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - CORS_ORIGIN=*
      - PUPPETEER_HEADLESS=true
      - SERVER_HOST=localhost
    volumes:
      - ./layouts:/app/layouts
    env_file:
      - .env
```

### Запуск с помощью docker-compose:

```bash
docker-compose up -d
```

## Учет изменяемых портов и адресов

Наше приложение `label-designer` поддерживает гибкую настройку портов и адресов через переменные окружения:

### Порты:
- По умолчанию приложение использует порт 3000 (задается через переменную `PORT`)
- Можно изменить порт при запуске: `-e PORT=8080`
- При этом нужно соответствующим образом настроить проброс портов: `-p 8080:8080`

### Внешние адреса:
- Переменная `SERVER_HOST` определяет хост, который используется внутри контейнера для обращения к самому себе
- Переменная `CORS_ORIGIN` управляет политикой CORS для безопасности
- Переменная `LAYOUTS_DIR` позволяет изменить директорию для хранения макетов

### Пример гибкой настройки:

```bash
# Запуск на порту 8080 с внешним доступом только с определенного домена
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e SERVER_HOST=localhost \
  -e CORS_ORIGIN=https://mydomain.com \
  markovrv/label-designer:latest
```

Эти параметры позволяют адаптировать приложение под различные среды развертывания без изменения кода.