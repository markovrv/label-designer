# BixolonPrinter - Документация для разработки

## 📋 Содержание
1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [API Справочник](#api-справочник)
4. [Расширение класса](#расширение-класса)
5. [Интеграция с системами](#интеграция-с-системами)
6. [Отладка](#отладка)
7. [Тестирование](#тестирование)

---

## Обзор

**BixolonPrinter** - это Node.js класс для управления принтером этикеток **Bixolon XD3-40d** (203 DPI).

### Основные возможности:
- ✅ Конвертация Fabric.js JSON в команды Web Print SDK
- ✅ Автоматическая конвертация размеров (мм → точки)
- ✅ Замена плейсхолдеров ({{variable}})
- ✅ Пакетная печать этикеток
- ✅ Поддержка текста, изображений, штрихкодов, QR-кодов
- ✅ Управление параметрами печати (скорость, плотность)
- ✅ Проверка подключения к Web Print SDK

### Требования:
- Node.js 14+
- Npm пакет `axios`
- Компьютер с установленным Bixolon Web Print SDK
- Локальная сеть или прямое подключение к принтеру

### Установка:
```bash
npm install axios
```

---

## Архитектура

### Общая схема работы:

```
[Fabric.js JSON]
      ↓
[BixolonPrinter class]
      ↓
    [Internal methods]
    - _createDrawTextCommand()
    - _createDrawBitmapCommand()
    - _createBarcodeCommand()
    - _buildPrintCommands()
      ↓
[JSON для Web Print SDK]
      ↓
[HTTP POST к Web Print SDK]
      ↓
[XD3-40d принтер]
      ↓
[Напечатанная этикетка]
```

### Структура класса:

```
class BixolonPrinter
├── Constructor(host, port, printerName, options)
│
├── PUBLIC METHODS (для пользователя)
│   ├── printLabel(fabricJsonData, printSettings)         [async]
│   ├── printLabelFromFile(filePath, printSettings)       [async]
│   ├── replacePlaceholders(fabricJsonData, placeholders)
│   ├── checkConnection()                                  [async]
│   └── getInfo()
│
├── PRIVATE METHODS (для внутреннего использования)
│   ├── pixelsToDots(pixels)
│   ├── mmToDots(mm)
│   ├── dotsToMm(dots)
│   ├── _createDrawTextCommand(obj)
│   ├── _createDrawBitmapCommand(obj, base64Data)
│   ├── _createBarcodeCommand(data, x, y, symbol, options)
│   ├── _createQRCodeCommand(data, x, y, options)
│   ├── _createDrawRectCommand(obj)
│   ├── _buildPrintCommands(jsonData, printSettings)
│   ├── _sendPrintRequest(commands)                        [async]
│   └── _log(message, data)
│
└── PROPERTIES
    ├── host, port, printerName
    ├── serverURL, timeout, debug
    ├── DPI, mmPerInch, pixelsPerDot
    ├── issueID
    ├── defaultPrintSettings
    └── commandBuffer
```

---

## API Справочник

### Основные методы

#### `constructor(host, port, printerName, options)`

Инициализация принтера.

**Параметры:**
- `host` (string): IP адрес или имя хоста (по умолчанию 'localhost')
- `port` (number): TCP порт Web Print SDK (по умолчанию 18080)
- `printerName` (string): Имя принтера в Web Print SDK (по умолчанию 'LabelPrinter')
- `options` (object):
  - `timeout` (number): Timeout для HTTP запросов в мс (по умолчанию 30000)
  - `debug` (boolean): Включить debug логирование (по умолчанию false)

**Пример:**
```javascript
const printer = new BixolonPrinter(
  '192.168.1.100',
  18080,
  'LabelPrinter',
  { timeout: 45000, debug: true }
);
```

---

#### `async printLabel(fabricJsonData, printSettings)`

Основной метод печати этикетки из Fabric.js JSON.

**Параметры:**
- `fabricJsonData` (object): Объект с полями:
  - `widthMM` (number): Ширина этикетки в мм
  - `heightMM` (number): Высота этикетки в мм
  - `objects` (array): Массив объектов Fabric.js
  - `createdAt` (string, optional): ISO дата создания

- `printSettings` (object, optional): Параметры печати:
  - `speed` (1-5, default 4): Скорость печати
  - `density` (1-30, default 12): Плотность печати
  - `gapPercent` (0-1, default 0.1): Зазор между этикетками
  - `orientation` ('T'|'B', default 'T'): Направление печати
  - `mediaType` ('G'|'B'|'C', default 'G'): Тип носителя

**Возвращает:** Promise<Object>
```javascript
{
  success: true,
  requestId: 123456,
  response: {...},
  timestamp: "2025-12-22T11:00:00.000Z"
}
```

**Пример:**
```javascript
const result = await printer.printLabel(medJson, {
  speed: 5,
  density: 15,
  gapPercent: 0.12
});
console.log('ID задания:', result.requestId);
```

---

#### `async printLabelFromFile(filePath, printSettings)`

Удобный метод для печати из файла med.json.

**Параметры:**
- `filePath` (string): Путь к файлу med.json
- `printSettings` (object, optional): Параметры печати (см. выше)

**Пример:**
```javascript
const result = await printer.printLabelFromFile('./med.json', {
  speed: 4,
  density: 12
});
```

---

#### `replacePlaceholders(fabricJsonData, placeholders)`

Замена плейсхолдеров {{key}} на значения перед печатью.

**Параметры:**
- `fabricJsonData` (object): Исходный Fabric JSON
- `placeholders` (object): Объект вида {key: value, ...}

**Возвращает:** Object (новый JSON с заменами)

**Пример:**
```javascript
const medJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));

const updated = printer.replacePlaceholders(medJson, {
  sort: 'Липовый',
  about: '500г',
  price: '350 ₽'
});

const result = await printer.printLabel(updated);
```

---

#### `async checkConnection()`

Проверка доступности Web Print SDK на хосте.

**Возвращает:** Promise<boolean>

**Пример:**
```javascript
const isAvailable = await printer.checkConnection();
if (isAvailable) {
  console.log('✅ Можно печатать');
} else {
  console.log('❌ Принтер недоступен');
}
```

---

#### `getInfo()`

Получение информации о конфигурации принтера.

**Возвращает:** Object
```javascript
{
  model: 'Bixolon XD3-40d',
  dpi: 203,
  host: 'localhost',
  port: 18080,
  printerName: 'LabelPrinter',
  pixelsPerDot: '2.82',
  defaultSettings: {...},
  serverURL: 'http://localhost:18080/WebPrintSDK'
}
```

---

### Вспомогательные методы

#### `pixelsToDots(pixels)`
Конвертация Fabric пиксели → принтерные точки (203 DPI)
```javascript
const dots = printer.pixelsToDots(100);  // ~282 dots
```

#### `mmToDots(mm)`
Конвертация миллиметры → принтерные точки
```javascript
const dots = printer.mmToDots(58);  // 464 dots
```

#### `dotsToMm(dots)`
Конвертация точки → миллиметры (обратная)
```javascript
const mm = printer.dotsToMm(464);  // 58 мм
```

---

## Расширение класса

### Добавление поддержки новых объектов Fabric.js

**Задача:** Добавить поддержку объектов типа `circle`.

**Шаг 1:** Создать приватный метод `_createDrawCircleCommand`:

```javascript
_createDrawCircleCommand(obj) {
  const x = this.pixelsToDots(obj.left + obj.radius * (obj.scaleX || 1));
  const y = this.pixelsToDots(obj.top + obj.radius * (obj.scaleY || 1));
  const radius = this.pixelsToDots(obj.radius * Math.max(obj.scaleX, obj.scaleY));
  
  return {
    name: 'drawCircle',
    params: {
      x: x,
      y: y,
      radius: radius,
      color: obj.fill || '#000000',
      lineWidth: obj.strokeWidth || 1
    }
  };
}
```

**Шаг 2:** Добавить в метод `renderFabricObjects`:

```javascript
// В switch блоке внутри renderFabricObjects
case 'circle':
  cmd = this._createDrawCircleCommand(obj);
  this._log(`⭕ Circle [${idx}]`, { x: obj.left, y: obj.top, radius: obj.radius });
  break;
```

**Шаг 3:** Протестировать:

```javascript
const labelJson = {
  widthMM: 58,
  heightMM: 40,
  objects: [
    {
      type: 'circle',
      left: 100,
      top: 100,
      radius: 50,
      fill: '#000000',
      scaleX: 1,
      scaleY: 1
    }
  ]
};

await printer.printLabel(labelJson);
```

---

### Добавление поддержки новых штрихкодов

Bixolon Web Print SDK поддерживает множество типов штрихкодов. Чтобы добавить новый:

**Пример: Добавление поддержки PDF417**

```javascript
_createPDF417Command(data, x, y, options = {}) {
  return {
    name: 'drawPDF417',
    params: {
      data: data,
      x: this.pixelsToDots(x),
      y: this.pixelsToDots(y),
      columnNumber: options.columns || 20,
      rowNumber: options.rows || 3,
      moduleWidth: options.moduleWidth || 1,
      moduleHeight: options.moduleHeight || 2,
      eccLevel: options.eccLevel || 4
    }
  };
}
```

---

### Кастомные параметры принтера

Если нужны параметры, специфичные для вашего принтера:

```javascript
class BixolonXD3Customized extends BixolonPrinter {
  constructor(host, port, printerName, options) {
    super(host, port, printerName, options);
    
    // Добавляем кастомные параметры
    this.customSettings = {
      autoResolution: false,
      cutterMode: 'auto',
      temperatureSensor: true
    };
  }
  
  setCustomSettings(settings) {
    this.customSettings = { ...this.customSettings, ...settings };
  }
}
```

---

## Интеграция с системами

### Express.js REST API

```javascript
const express = require('express');
const BixolonPrinter = require('./BixolonPrinter');

const app = express();
app.use(express.json());

const printer = new BixolonPrinter('localhost', 18080);

// Печать этикетки по API
app.post('/api/print', async (req, res) => {
  try {
    const { jsonData, settings } = req.body;
    const result = await printer.printLabel(jsonData, settings);
    res.json({ success: true, requestId: result.requestId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Проверка статуса
app.get('/api/status', async (req, res) => {
  const isAvailable = await printer.checkConnection();
  res.json({ available: isAvailable });
});

app.listen(3000);
```

### PostgreSQL интеграция

```javascript
const { Pool } = require('pg');
const BixolonPrinter = require('./BixolonPrinter');

const pool = new Pool({ connectionString: 'postgres://...' });
const printer = new BixolonPrinter();

async function printProductLabel(productId) {
  // Получаем данные из БД
  const result = await pool.query(
    'SELECT name, sku, price, json_data FROM products WHERE id = $1',
    [productId]
  );
  
  if (result.rows.length === 0) throw new Error('Product not found');
  
  const { name, sku, price, json_data } = result.rows[0];
  
  // Заменяем плейсхолдеры
  const labelJson = printer.replacePlaceholders(JSON.parse(json_data), {
    name: name,
    sku: sku,
    price: price
  });
  
  // Печатаем
  const printResult = await printer.printLabel(labelJson);
  
  // Сохраняем информацию о печати
  await pool.query(
    'INSERT INTO print_log (product_id, request_id, printed_at) VALUES ($1, $2, $3)',
    [productId, printResult.requestId, new Date()]
  );
}

// Использование:
await printProductLabel(123);
```

---

## Отладка

### Включение debug логирования

```javascript
const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', {
  debug: true
});

// Теперь все операции будут логироваться с timestamp
// [2025-12-22T11:00:00.000Z] 🖨️  Начало печати этикетки {...}
```

### Проверка генерируемых команд

```javascript
const printer = new BixolonPrinter();

const medJson = {
  widthMM: 58,
  heightMM: 40,
  objects: [...]
};

// Получить команды без отправки
const commands = printer._buildPrintCommands(medJson);
console.log(JSON.stringify(commands, null, 2));
```

### Проверка конвертации размеров

```javascript
const printer = new BixolonPrinter();

console.log('Fabric pixels → dots:');
[10, 50, 100, 200].forEach(px => {
  console.log(`${px}px = ${printer.pixelsToDots(px)} dots`);
});

console.log('mm → dots:');
[10, 25, 50, 58].forEach(mm => {
  console.log(`${mm}mm = ${printer.mmToDots(mm)} dots`);
});
```

### Изоляция проблем

```javascript
// 1. Проверить подключение
const available = await printer.checkConnection();
console.log('Подключение:', available ? '✅' : '❌');

// 2. Проверить конвертацию размеров
console.log('Размеры:', printer.getInfo());

// 3. Проверить JSON структуру
console.log('Команды:', JSON.stringify(commands, null, 2));

// 4. Проверить ошибку сети
try {
  await printer._sendPrintRequest(commands);
} catch (error) {
  console.error('Ошибка сети:', error.message);
}
```

---

## Тестирование

### Unit тесты (примерный код с Jest)

```javascript
describe('BixolonPrinter', () => {
  let printer;
  
  beforeEach(() => {
    printer = new BixolonPrinter('localhost', 18080);
  });
  
  test('pixelsToDots должен конвертировать корректно', () => {
    expect(printer.pixelsToDots(72)).toBe(203); // 72 px * (203/72) ≈ 203
  });
  
  test('mmToDots должен конвертировать корректно', () => {
    expect(printer.mmToDots(25.4)).toBe(203); // 25.4 мм = 1 дюйм = 203 точки
  });
  
  test('replacePlaceholders должен заменять {{key}}', () => {
    const json = {
      widthMM: 58,
      heightMM: 40,
      objects: [{type: 'text', text: 'Hello {{name}}'}]
    };
    
    const result = printer.replacePlaceholders(json, {name: 'World'});
    expect(result.objects[0].text).toBe('Hello World');
  });
  
  test('printLabel должен выбросить ошибку при отсутствии widthMM', async () => {
    await expect(printer.printLabel({heightMM: 40}))
      .rejects
      .toThrow('должен содержать widthMM и heightMM');
  });
});
```

---

## История изменений

### v1.0.0 (2025-12-22)
- ✅初始版本
- ✅ Поддержка textbox, rect объектов
- ✅ Конвертация мм → точки
- ✅ Замена плейсхолдеров
- ✅ Пакетная печать

### Планируется:
- [ ] Поддержка Vector Font и TrueType Font
- [ ] Полная поддержка Image (с конвертацией в base64)
- [ ] Интеграция RFID для XD5/BT5 моделей
- [ ] Поддержка Path объектов Fabric
- [ ] Кэширование команд
- [ ] WebSocket поддержка для real-time печати

---

## Лицензия и контакты

MIT License - свободно используйте и модифицируйте код.

Вопросы и предложения приветствуются!
