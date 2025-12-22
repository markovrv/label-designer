/**
 * QUICK REFERENCE - Быстрая справка по BixolonPrinter
 * 
 * Скопируйте и используйте прямо в своих проектах!
 */

// ===== ИНИЦИАЛИЗАЦИЯ =====

const BixolonPrinter = require('./BixolonPrinter');

// Стандартная инициализация (localhost:18080)
const printer = new BixolonPrinter();

// С пользовательским хостом и debug логированием
const printer = new BixolonPrinter('192.168.1.100', 18080, 'LabelPrinter', {
  debug: true,
  timeout: 45000
});

// ===== ОСНОВНЫЕ ОПЕРАЦИИ =====

// 1️⃣ Печать из файла med.json
await printer.printLabelFromFile('./med.json');

// 2️⃣ Печать с пользовательскими параметрами
await printer.printLabel(medJson, {
  speed: 5,           // 1-5 (по умолчанию 4)
  density: 15,        // 1-30 (по умолчанию 12)
  gapPercent: 0.12,   // зазор между этикетками (по умолчанию 0.1)
  orientation: 'T'    // 'T' или 'B' (по умолчанию 'T')
});

// 3️⃣ Замена плейсхолдеров перед печатью
const updated = printer.replacePlaceholders(medJson, {
  sort: 'Липовый',
  about: '500г'
});
await printer.printLabel(updated);

// 4️⃣ Проверка подключения
const isReady = await printer.checkConnection();
console.log(isReady ? '✅ Готов' : '❌ Недоступен');

// 5️⃣ Информация о принтере
console.log(printer.getInfo());

// ===== КОНВЕРТАЦИЯ РАЗМЕРОВ =====

// Fabric pixels (72 DPI) → принтерные точки (203 DPI)
printer.pixelsToDots(100);     // → ~282 точки

// Миллиметры → точки
printer.mmToDots(58);          // → 464 точки

// Точки → миллиметры
printer.dotsToMm(464);         // → 58 мм

// ===== СТРУКТУРА FABRIC JSON =====

const medJson = {
  widthMM: 58,
  heightMM: 40,
  createdAt: new Date().toISOString(),
  objects: [
    // Текст
    {
      type: 'textbox',
      left: 25,
      top: 20,
      width: 200,
      height: 30,
      fontSize: 20,
      fontFamily: 'Arial',
      fontWeight: 'bold',         // или 'normal'
      text: 'Мёд {{sort}}',       // с плейсхолдерами
      textAlign: 'center',        // 'left', 'center', 'right'
      scaleX: 1,
      scaleY: 1,
      fill: '#000000'
    },
    
    // Рамка
    {
      type: 'rect',
      left: 10,
      top: 10,
      width: 300,
      height: 250,
      stroke: '#000000',          // цвет рамки
      scaleX: 1,
      scaleY: 1
    }
  ]
};

// ===== ПАКЕТНАЯ ПЕЧАТЬ =====

const items = [
  { name: 'Мёд Липовый', size: '500г' },
  { name: 'Мёд Гречишный', size: '250г' }
];

for (const item of items) {
  const label = printer.replacePlaceholders(medJson, {
    sort: item.name,
    about: item.size
  });
  await printer.printLabel(label);
  await new Promise(r => setTimeout(r, 500)); // пауза 500мс
}

// ===== ОБРАБОТКА ОШИБОК =====

try {
  const result = await printer.printLabelFromFile('./med.json');
  console.log('✅ Успешно:', result.requestId);
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}

// С повторными попытками
async function printWithRetry(jsonData, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await printer.printLabel(jsonData);
    } catch (error) {
      if (i < maxRetries) {
        console.warn(`Попытка ${i + 1} не удалась, повтор...`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw error;
      }
    }
  }
}

const result = await printWithRetry(medJson, 3);

// ===== EXPRESS.JS ИНТЕГРАЦИЯ =====

const express = require('express');
const app = express();
app.use(express.json());

const printer = new BixolonPrinter('localhost', 18080);

// POST /api/print
app.post('/api/print', async (req, res) => {
  try {
    const { jsonData, settings } = req.body;
    const result = await printer.printLabel(jsonData, settings);
    res.json({ success: true, requestId: result.requestId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/status
app.get('/api/status', async (req, res) => {
  const available = await printer.checkConnection();
  res.json({
    available,
    info: printer.getInfo()
  });
});

// ===== ПАРАМЕТРЫ ПЕЧАТИ: РЕКОМЕНДАЦИИ =====

// Для обычной печати
{ speed: 4, density: 12 }

// Для высокого качества (медленнее)
{ speed: 2, density: 18 }

// Для максимальной скорости (ниже качество)
{ speed: 5, density: 10 }

// Для этикеток с чёрной меткой вместо gap
{ speed: 4, density: 12, mediaType: 'B' }

// Для сплошной ленты
{ speed: 4, density: 12, mediaType: 'C' }

// ===== ТАБЛИЦА DPI КОНВЕРТАЦИИ (203 DPI) =====

/*
Fabric pixels    →    Точки принтера    →    мм
───────────────────────────────────────────────
50 px            →    ~141 dots         →    18 мм
100 px           →    ~282 dots         →    36 мм
200 px           →    ~564 dots         →    71 мм
400 px           →    ~1127 dots        →    143 мм

Миллиметры       →    Точки
─────────────────────────────
10 мм            →    79 dots
25 мм            →    197 dots
50 мм            →    394 dots
58 мм            →    464 dots
100 мм           →    787 dots
150 мм           →    1181 dots
*/

// ===== ПЛЕЙСХОЛДЕРЫ =====

// В med.json можно использовать любые {{название}}
{
  type: 'textbox',
  text: 'Товар: {{product}} | Цена: {{price}} | {{date}}'
}

// Потом заменить на реальные значения
printer.replacePlaceholders(medJson, {
  product: 'Мёд Липовый',
  price: '350₽',
  date: '2025-12-22'
});

// ===== DEBUG И ОТЛАДКА =====

// Включить все логи
const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', {
  debug: true
});

// Получить wygenerowane команды без печати
const commands = printer._buildPrintCommands(medJson);
console.log(JSON.stringify(commands, null, 2));

// Проверить размеры
console.log('Размеры:');
console.log(`  ${medJson.widthMM}×${medJson.heightMM} мм`);
console.log(`  → ${printer.mmToDots(medJson.widthMM)}×${printer.mmToDots(medJson.heightMM)} точек`);

// ===== ПОЛЕЗНЫЕ КОМАНДЫ (в терминале) =====

// Проверить подключение
npm run check-connection

// Запустить примеры
npm start

// Запустить в dev режиме
npm run dev

// Запустить тесты
npm test

// ===== ТИПИЧНЫЕ ПРОБЛЕМЫ =====

// ❌ ОШИБКА: Cannot find module 'axios'
// ✅ РЕШЕНИЕ: npm install axios

// ❌ ОШИБКА: Web Print SDK недоступен
// ✅ РЕШЕНИЕ:
//   1. Проверить IP адрес и порт
//   2. Убедиться что Web Print SDK запущен на компьютере
//   3. Проверить файрвол

// ❌ ОШИБКА: widthMM/heightMM не найдены
// ✅ РЕШЕНИЕ: Убедиться что JSON содержит эти поля

// ❌ ОШИБКА: Текст не печатается
// ✅ РЕШЕНИЕ:
//   1. Проверить что type: 'textbox'
//   2. Проверить координаты (left, top)
//   3. Увеличить fontSize и scaleX/scaleY

// ===== ЦЕПОЧКА МЕТОДОВ (если нужна) =====

class BixolonPrinterFluent extends BixolonPrinter {
  setSpeed(speed) {
    this.defaultPrintSettings.speed = speed;
    return this;
  }
  
  setDensity(density) {
    this.defaultPrintSettings.density = density;
    return this;
  }
  
  async printFile(filePath) {
    return this.printLabelFromFile(filePath, this.defaultPrintSettings);
  }
}

// Использование:
const fluentPrinter = new BixolonPrinterFluent();
await fluentPrinter
  .setSpeed(5)
  .setDensity(15)
  .printFile('./med.json');

// ===== МОДЕЛИРОВАНИЕ БЕЗ ПРИНТЕРА =====

// Для тестирования без подключения к Web Print SDK
class MockPrinter extends BixolonPrinter {
  async _sendPrintRequest(commands) {
    console.log('MOCK: Команды для печати:');
    console.log(JSON.stringify(commands, null, 2));
    
    return {
      success: true,
      requestId: Math.floor(Math.random() * 1000000),
      response: 'MOCK_RESPONSE',
      timestamp: new Date().toISOString()
    };
  }
}

// Использование:
const mockPrinter = new MockPrinter('localhost', 18080);
await mockPrinter.printLabelFromFile('./med.json');

// ===== ЭКСПОРТИРОВАНИЕ В ДРУГИЕ ФОРМАТЫ (TODO) =====

// В будущих версиях планируется поддержка:
// - Прямого экспорта в PDF (для тестирования)
// - Сохранение команд в файл
// - Конвертация в ESC/P формат для других принтеров

// ===== ПОЛЕЗНЫЕ ССЫЛКИ =====

// Документация Bixolon:
// https://www.bixolon.com/

// Fabric.js JSON структура:
// https://fabricjs.com/docs/

// Web Print SDK API:
// см. Manual_Web_Print_SDK_API_Reference_Guide_ENG_V1.28.pdf

// ===== ВЕРСИЯ И ИНФОРМАЦИЯ =====

const pkg = require('./package.json');
console.log(`BixolonPrinter v${pkg.version}`);
console.log(`Для Node.js ${pkg.engines.node}`);
console.log(`Лицензия: ${pkg.license}`);

// ═════════════════════════════════════════════════════════════
// Готово к использованию! Удачи с печатью этикеток! 🎉
// ═════════════════════════════════════════════════════════════
