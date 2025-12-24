require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { join, basename, resolve } = require('path');
require('jspdf-autotable');
const BixolonPrinter = require('./bixolon/BixolonPrinter.js');

// Импортируем модуль для генерации штрих-кодов
const bwipjs = require('bwip-js');

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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

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
        var data = await bixolonPrinter.checkConnection();
        res.json({ connected: data?.Result });
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


// Вспомогательные функции для вычисления контрольных цифр EAN
function calculateEAN8CheckDigit(code) {
    if (code.length !== 7) throw new Error('Для вычисления контрольной цифры EAN-8 необходимо 7 цифр');
    const digits = code.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 7; i++) if ((7 - i) % 2 === 1) sum += digits[i] * 3;else sum += digits[i];
    return (10 - sum % 10) % 10;
}

function calculateEAN13CheckDigit(code) {
    if (code.length !== 12) throw new Error('Для вычисления контрольной цифры EAN-13 необходимо 12 цифр');
    const digits = code.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) if ((12 - i) % 2 === 1) sum += digits[i] * 3; else sum += digits[i];
    return (10 - sum % 10) % 10;
}

// Маршрут для генерации штрих-кода
app.get('/get-barcode', async (req, res) => {
    try {
        const { includetext, text, bcid, width, height} = req.query;
        
        // Проверяем параметры
        if (!text) return res.status(400).json({ error: 'Параметр text обязателен' });
        if (!bcid) return res.status(400).json({ error: 'Параметр bcid обязателен' });
        if (bcid !== 'ean8' && bcid !== 'ean13') return res.status(400).json({ error: 'Параметр bcid должен быть ean8 или ean13' });
        if (!/^\d+$/.test(text)) return res.status(400).json({ error: 'Параметр text должен содержать только цифры' });
        if (width && !/^\d+$/.test(width)) return res.status(400).json({ error: 'Параметр width должен содержать только цифры' });
        if (height && !/^\d+$/.test(height)) return res.status(400).json({ error: 'Параметр height должен содержать только цифры' });

        // Определяем требуемую длину кода
        const requiredLength = bcid === 'ean8' ? 8 : 13;
        let code = text;

        // Если длина кода меньше требуемой, вычисляем контрольные цифры
        if (code.length === 7 && bcid === 'ean8') {
            // Добавляем контрольную цифру для EAN-8
            const checksum = calculateEAN8CheckDigit(code);
            code = code + checksum;
        } else if (code.length === 12 && bcid === 'ean13') {
            // Добавляем контрольную цифру для EAN-13
            const checksum = calculateEAN13CheckDigit(code);
            code = code + checksum;
        } else if (code.length === 6 && bcid === 'ean8') {
            // Добавляем недостающие цифры и контрольную цифру для EAN-8
            code = code + '0'; // добавляем один ноль для получения 7 цифр
            const checksum = calculateEAN8CheckDigit(code);
            code = code + checksum;
        } else if (code.length === 11 && bcid === 'ean13') {
            // Добавляем недостающие цифры и контрольную цифру для EAN-13
            code = code + '0'; // добавляем один ноль для получения 12 цифр
            const checksum = calculateEAN13CheckDigit(code);
            code = code + checksum;
        } else if (code.length === requiredLength) {
            // Если длина уже правильная, проверяем контрольную цифру
            if (bcid === 'ean8') {
                const expectedCheckDigit = calculateEAN8CheckDigit(code.substring(0, 7));
                if (parseInt(code[7]) !== expectedCheckDigit) {
                    return res.status(400).json({ error: `Неверная контрольная цифра для EAN-8. Ожидалась: ${expectedCheckDigit}, получена: ${code[7]}` });
                }
            } else if (bcid === 'ean13') {
                const expectedCheckDigit = calculateEAN13CheckDigit(code.substring(0, 12));
                if (parseInt(code[12]) !== expectedCheckDigit) {
                    return res.status(400).json({ error: `Неверная контрольная цифра для EAN-13. Ожидалась: ${expectedCheckDigit}, получена: ${code[12]}` });
                }
            }
        } else {
            return res.status(400).json({ error: `Параметр text должен содержать ${requiredLength} или ${requiredLength-1} цифр для ${bcid}` });
        }

        // Проверяем, что итоговая длина соответствует ожидаемой
        if (code.length !== requiredLength) {
            return res.status(400).json({ error: `Параметр text должен содержать ${requiredLength} или ${requiredLength-1} цифр для ${bcid}` });
        }

        // Проверяем, что код имеет правильный формат
        if (bcid === 'ean8' && code.length !== 8) {
            return res.status(400).json({ error: 'Для EAN-8 код должен содержать 8 цифр' });
        }
        if (bcid === 'ean13' && code.length !== 13) {
            return res.status(400).json({ error: 'Для EAN-13 код должен содержать 13 цифр' });
        }

        // Настройки для генерации штрих-кода с помощью bwip-js
        const options = {
            bcid: bcid, // ean8 или ean13
            text: code,
            scaleX: 4, // масштабирование по X
            scaleY: 4, // масштабирование по Y
            includetext: !!includetext, // отображать текст под штрих-кодом, если includetext присутствует
            textxalign: 'center', // выравнивание текста
            height: height || 15, // высота штрих-кода
        };
        if (width > 0) options.width = width; // устанавливаем ширину, если она указана

        // Генерируем изображение штрих-кода
        const png = await bwipjs.toBuffer(options);

        // Устанавливаем заголовки для ответа
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'no-cache');
        res.send(png);
    } catch (error) {
        console.error('Ошибка при генерации штрих-кода:', error);
        res.status(500).json({ error: `Ошибка сервера при генерации штрих-кода: ${error.message}` });
    }
});