const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { join, basename, resolve } = require('path');
require('jspdf-autotable');
const BixolonPrinter = require('./bixolon/BixolonPrinter.js');

const app = express();

// Конфигурация приложения через переменные окружения
const PORT = process.env.PORT || 3000;
const LAYOUTS_DIR = process.env.LAYOUTS_DIR || join(__dirname, 'layouts');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Настройка CORS с возможностью конфигурации
const corsOptions = {
    origin: CORS_ORIGIN,
    credentials: true
};

app.use(cors(corsOptions));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сервим статические файлы из public
app.use(express.static('public'));

// Директория для хранения макетов
// Значение определяется через переменную окружения LAYOUTS_DIR, по умолчанию 'layouts'
// const LAYOUTS_DIR определена выше в конфигурации приложения

// Создаем директорию layouts если она не существует
if (!fs.existsSync(LAYOUTS_DIR)) {
    fs.mkdirSync(LAYOUTS_DIR, { recursive: true });
}

// Валидация имени файла (защита от path traversal)
function isValidFilename(filename) {
    // Проверяем, что имя файла содержит только допустимые символы
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/g.test(filename) && !/^[a-zA-Z0-9_-]+$/g.test(filename)) {
        return false;
    }

    // Проверяем расширение файла
    const ext = path.extname(filename).toLowerCase();
    return ext === '' || ext === '.json';
}

// Маршрут для сохранения макета
app.post('/api/layouts/save', (req, res) => {
    try {
        const { name, layoutData } = req.body;

        if (!name || !layoutData) {
            return res.status(400).json({ error: 'Отсутствуют обязательные параметры: name или layoutData' });
        }

        // Проверяем имя файла
        const filename = `${name}.json`;
        if (!isValidFilename(filename)) {
            return res.status(400).json({ error: 'Недопустимое имя файла' });
        }

        // Проверяем, является ли layoutData действительным JSON
        if (typeof layoutData !== 'object') {
            return res.status(400).json({ error: 'Данные макета должны быть объектом' });
        }

        const filepath = join(LAYOUTS_DIR, filename);

        // Записываем данные в файл
        fs.writeFileSync(filepath, JSON.stringify(layoutData, null, 2));

        res.json({ message: 'Макет успешно сохранен', filename });
    } catch (error) {
        console.error('Ошибка при сохранении макета:', error);
        res.status(500).json({ error: 'Ошибка сервера при сохранении макета' });
    }
});

// Маршрут для получения списка макетов
app.get('/api/layouts', (req, res) => {
    try {
        const files = fs.readdirSync(LAYOUTS_DIR);
        const layouts = files
            .filter(file => path.extname(file).toLowerCase() === '.json')
            .map(file => ({
                name: path.basename(file, '.json'),
                filename: file,
                createdAt: fs.statSync(join(LAYOUTS_DIR, file)).mtime
            }))
            .sort((a, b) => b.createdAt - a.createdAt); // Сортируем по дате создания (новые первыми)

        res.json(layouts);
    } catch (error) {
        console.error('Ошибка при получении списка макетов:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении списка макетов' });
    }
});

// Маршрут для загрузки макета
app.get('/api/layouts/:filename', (req, res) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({ error: 'Не указано имя файла' });
        }

        // Защита от path traversal
        const normalizedPath = resolve(LAYOUTS_DIR);
        const requestedPath = resolve(join(LAYOUTS_DIR, filename));

        if (!requestedPath.startsWith(normalizedPath)) {
            return res.status(400).json({ error: 'Недопустимый путь к файлу' });
        }

        if (!isValidFilename(filename)) {
            return res.status(400).json({ error: 'Недопустимое имя файла' });
        }

        const filepath = join(LAYOUTS_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Файл макета не найден' });
        }

        const layoutData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

        res.json(layoutData);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return res.status(400).json({ error: 'Файл макета содержит некорректный JSON' });
        }
        console.error('Ошибка при загрузке макета:', error);
        res.status(500).json({ error: 'Ошибка сервера при загрузке макета' });
    }
});

// Маршрут для удаления макета
app.delete('/api/layouts/:filename', (req, res) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({ error: 'Не указано имя файла' });
        }

        // Защита от path traversal
        const normalizedPath = resolve(LAYOUTS_DIR);
        const requestedPath = resolve(join(LAYOUTS_DIR, filename));

        if (!requestedPath.startsWith(normalizedPath)) {
            return res.status(400).json({ error: 'Недопустимый путь к файлу' });
        }

        if (!isValidFilename(filename)) {
            return res.status(400).json({ error: 'Недопустимое имя файла' });
        }

        const filepath = join(LAYOUTS_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Файл макета не найден' });
        }

        fs.unlinkSync(filepath);

        res.json({ message: 'Макет успешно удален' });
    } catch (error) {
        console.error('Ошибка при удалении макета:', error);
        res.status(500).json({ error: 'Ошибка сервера при удалении макета' });
    }
});

// Создаем экземпляр принтера Bixolon с использованием переменных окружения
const bixolonPrinter = new BixolonPrinter(
    process.env.BIXOLON_HOST || 'localhost',
    parseInt(process.env.BIXOLON_PORT) || 18080,
    process.env.BIXOLON_PRINTER_NAME || 'Printer1',
    {
        timeout: parseInt(process.env.BIXOLON_TIMEOUT) || 3000,
        debug: process.env.BIXOLON_DEBUG === 'true' || false
    }
);

// Маршрут для получения информации о принтере
app.get('/api/printer-info', (req, res) => {
    try {
        const printerInfo = bixolonPrinter.getInfo();
        res.json(printerInfo);
    } catch (error) {
        console.error('Ошибка при получении информации о принтере:', error);
        res.status(500).json({ error: `Ошибка сервера при получении информации о принтере: ${error.message}` });
    }
});

// Маршрут для проверки соединения с принтером
app.get('/api/printer-connection', async (req, res) => {
    try {
        const isConnected = await bixolonPrinter.checkConnection();
        res.json({ connected: isConnected });
    } catch (error) {
        console.error('Ошибка при проверке соединения с принтером:', error);
        res.status(500).json({ error: `Ошибка сервера при проверке соединения: ${error.message}` });
    }
});

// Универсальный маршрут для печати этикетки
app.post('/api/print', async (req, res) => {
    try {
        console.log('Получен запрос на печать');
        const { template, data, layoutData, printSettings } = req.body;

        // Если указан режим печати сохраненного макета
        if (template && data) {
            // Загружаем макет из файла
            const filepath = join(LAYOUTS_DIR, `${template}.json`);

            if (!fs.existsSync(filepath)) {
                return res.status(404).json({ error: 'Макет не найден' });
            }

            const layout = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            console.log('Загружен макет:', layout);

            // Заменяем плейсхолдеры в макете на значения из data
            const processedLayout = bixolonPrinter.replacePlaceholders(layout, data);
            console.log('Обработанные данные для Bixolon:', JSON.stringify(processedLayout, null, 2));

            // Отправляем на печать
            const printResult = await bixolonPrinter.printLabel(processedLayout, printSettings);
            console.log('Результат печати:', printResult);

            res.json({
                message: 'Этикетка успешно отправлена на печать',
                result: printResult
            });
            return;
        }

        // Если указан режим печати текущего вида
        if (layoutData) {
            // Проверяем наличие layoutData
            if (!layoutData.widthMM || !layoutData.heightMM) {
                return res.status(400).json({ error: 'Данные макета должны содержать widthMM и heightMM' });
            }

            console.log('Данные для печати:', JSON.stringify(layoutData, null, 2));

            // Отправляем на печать
            const printResult = await bixolonPrinter.printLabel(layoutData, printSettings);
            console.log('Результат печати:', printResult);

            res.json({
                message: 'Этикетка успешно отправлена на печать',
                result: printResult
            });
            return;
        }

        return res.status(400).json({ error: 'Отсутствуют необходимые данные для печати' });
    } catch (error) {
        console.error('Ошибка при печати:', error);
        res.status(500).json({ error: `Ошибка сервера при печати: ${error.message}` });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});