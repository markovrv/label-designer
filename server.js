const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { join, basename, resolve } = require('path');
require('jspdf-autotable');
const puppeteer = require('puppeteer');
const app = express();

// Конфигурация приложения через переменные окружения
const PORT = process.env.PORT || 3000;
const LAYOUTS_DIR = process.env.LAYOUTS_DIR || join(__dirname, 'layouts');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const PUPPETEER_HEADLESS = process.env.PUPPETEER_HEADLESS !== 'false'; // по умолчанию true
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';

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

// Маршрут для генерации PDF по шаблону
app.post('/api/generate-pdf', async (req, res) => {
    let browser = null;
    try {
        const { template, data } = req.body;

        if (!template) {
            return res.status(400).json({ error: 'Отсутствует имя шаблона' });
        }

        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Данные должны быть объектом' });
        }

        // Проверяем имя шаблона
        if (!isValidFilename(template)) {
            return res.status(400).json({ error: 'Недопустимое имя шаблона' });
        }

        // Запускаем Puppeteer для открытия веб-интерфейса
                browser = await puppeteer.launch({
                    headless: PUPPETEER_HEADLESS,
                    protocolTimeout: 60000, // Увеличиваем таймаут до 60 секунд
                    args: [
                        '--no-sandbox', // Необходимо для работы в Docker
                        '--disable-setuid-sandbox', // Дополнительная защита в контейнере
                        '--disable-dev-shm-usage', // Используем больше RAM вместо /dev/shm
                        '--disable-accelerated-2d-canvas', // Отключаем ускорение 2D Canvas
                        '--no-first-run', // Пропускаем первый запуск браузера
                        '--no-zygote', // Отключаем zygote процесс
                        '--disable-gpu', // Отключаем GPU процессы
                        '--disable-web-security', // Отключаем безопасность для локальных файлов
                        '--disable-features=VizDisplayCompositor', // Отключаем композитор отображения
                        '--disable-background-timer-throttling', // Отключаем ограничение фоновых таймеров
                        '--disable-renderer-backgrounding', // Отключаем фоновый рендеринг
                        '--disable-backgrounding-occluded-windows', // Отключаем фоновые окна
                        '--disable-ipc-flooding-protection', // Отключаем защиту от переполнения IPC
                        '--export-tagged-pdf' // Экспортируем тегированный PDF
                    ]
                });
        const page = await browser.newPage();

        // Устанавливаем размер окна для правильной отрисовки
        await page.setViewport({ width: 800, height: 600 });

        // Переходим на главную страницу приложения
                await page.goto(`http://${SERVER_HOST}:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });

        // Читаем макет напрямую из локального файла
        const filepath = join(LAYOUTS_DIR, `${template}.json`);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Макет не найден' });
        }

        const layoutData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

        // Загружаем макет в холст и заменяем переменные через UI
        await page.evaluate((layoutData, data) => {
            // Загружаем макет в холст
            canvas.loadFromJSON(layoutData, function () {
                // После загрузки макета заменяем переменные в текстовых объектах
                canvas.getObjects().forEach(obj => {
                    if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
                        if (obj.text && typeof obj.text === 'string') {
                            let newText = obj.text;
                            for (const [key, value] of Object.entries(data)) {
                                // Заменяем все вхождения {{key}} на значение
                                const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                                newText = newText.replace(regex, value);
                            }
                            obj.set('text', newText);
                            obj.setCoords(); // Обновляем координаты объекта после изменения текста
                        }
                    }
                });

                // Перерисовываем холст
                canvas.renderAll();
                
                // Добавляем маркер на страницу после завершения рендеринга
                const renderCompleteMarker = document.createElement('div');
                renderCompleteMarker.id = 'render-complete-marker';
                renderCompleteMarker.style.display = 'none';
                renderCompleteMarker.textContent = 'render-complete';
                document.body.appendChild(renderCompleteMarker);
            });
        }, layoutData, data);

        // Ждем появления маркера завершения рендеринга
        await page.waitForSelector('#render-complete-marker', { timeout: 10000 });

        // Выполняем экспорт в PDF как в функции exportToPDF
        const pdfDataUrl = await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                try {
                    // Получаем размеры холста из sessionStorage или используем значения из макета
                    const widthMM = parseFloat(document.getElementById('widthInput').value) || 58;
                    const heightMM = parseFloat(document.getElementById('heightInput').value) || 40;

                    // Получаем данные холста в формате base64 с высоким качеством
                    const dataURL = canvas.toDataURL({
                        format: 'png',
                        quality: 1,
                        multiplier: 2 // Удваиваем разрешение для высокого качества
                    });

                    // Создаем PDF документ с точными размерами этикетки
                    const { jsPDF } = window.jspdf;

                    const pdf = new jsPDF({
                        orientation: widthMM > heightMM ? 'landscape' : 'portrait',
                        unit: 'mm',
                        format: [widthMM, heightMM]
                    });

                    // Добавляем изображение на PDF с учетом точных размеров
                    // Учитываем, что изображение теперь в 2 раза больше по разрешению
                    pdf.addImage(dataURL, 'PNG', 0, 0, widthMM, heightMM);

                    // Возвращаем PDF как Data URL
                    const pdfDataUrl = pdf.output('datauristring');
                    resolve(pdfDataUrl);
                } catch (error) {
                    reject(error);
                }
            });
        });

        // Извлекаем base64 часть из data URL
        const base64Data = pdfDataUrl.split(',')[1];
        const pdfBuffer = Buffer.from(base64Data, 'base64');

        // Отправляем PDF клиенту
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${template}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Ошибка при генерации PDF:', error);
        res.status(500).json({ error: `Ошибка сервера при генерации PDF: ${error.message}` });
    } finally {
        if (browser) {
            await browser.close();
        }
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

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});