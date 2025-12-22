# BixolonPrinter 🖨️

Node.js класс для управления принтером этикеток **Bixolon XD3-40d** (203 DPI). Конвертирует **Fabric.js JSON** формат (med.json) в команды **Bixolon Web Print SDK** для печати этикеток.

## ✨ Возможности

- ✅ Полная конвертация Fabric.js JSON → Web Print SDK команды
- ✅ Автоматическая конвертация размеров (мм → точки @ 203 DPI)
- ✅ Поддержка текста (Device Font), изображений, штрихкодов, QR-кодов
- ✅ Замена плейсхолдеров ({{variable}}) перед печатью
- ✅ Пакетная печать нескольких этикеток
- ✅ Управление параметрами печати (скорость, плотность, ориентация)
- ✅ Проверка подключения к Web Print SDK
- ✅ Подробное debug логирование
- ✅ 100% документирован (JSDoc)

## 📋 Требования

- **Node.js** 14+
- **npm** или yarn
- **Компьютер с Bixolon Web Print SDK** (на том же сегменте сети или localhost)
- **Принтер Bixolon XD3-40d** (или совместимый: XD3-40t, XD5-40d, XD5-43d и т.д.)

## 🚀 Быстрый старт

### Установка

```bash
npm install axios
```

### Подключение класса

```javascript
const BixolonPrinter = require('./BixolonPrinter');

// Инициализация принтера
const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', {
  debug: true  // выводить логи
});

// Печать файла med.json
const result = await printer.printLabelFromFile('./med.json');
console.log('Напечатано:', result.requestId);
```

## 💡 Примеры использования

### Пример 1: Простая печать

```javascript
const printer = new BixolonPrinter();

const medJson = {
  widthMM: 58,
  heightMM: 40,
  objects: [
    {
      type: 'textbox',
      left: 25,
      top: 20,
      text: 'Мёд Липовый',
      fontSize: 20,
      fontWeight: 'bold',
      scaleX: 2,
      scaleY: 2
    }
  ]
};

await printer.printLabel(medJson);
```

### Пример 2: С заменой плейсхолдеров

```javascript
const medJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));

// Заменяем {{sort}} и {{about}} на реальные данные
const updated = printer.replacePlaceholders(medJson, {
  sort: 'Липовый',
  about: 'Натуральный, 500г, органический'
});

const result = await printer.printLabel(updated, {
  speed: 5,      // максимальная скорость
  density: 15    // повышенная плотность
});
```

### Пример 3: Пакетная печать

```javascript
const products = [
  { name: 'Мёд Липовый', size: '500г' },
  { name: 'Мёд Гречишный', size: '250г' },
  { name: 'Пыльца', size: '100г' }
];

const baseJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));

for (const product of products) {
  const labelJson = printer.replacePlaceholders(baseJson, {
    sort: product.name,
    about: product.size
  });
  
  await printer.printLabel(labelJson);
  
  // Небольшая задержка между печатями
  await new Promise(r => setTimeout(r, 500));
}
```

### Пример 4: С проверкой подключения

```javascript
const isAvailable = await printer.checkConnection();

if (isAvailable) {
  console.log('✅ Принтер готов');
  console.log(printer.getInfo());
  
  const result = await printer.printLabelFromFile('./med.json');
} else {
  console.log('❌ Web Print SDK недоступен на localhost:18080');
}
```

## 📖 API Справочник

### Конструктор

```javascript
const printer = new BixolonPrinter(
  host = 'localhost',                    // IP или имя хоста
  port = 18080,                          // TCP порт Web Print SDK
  printerName = 'LabelPrinter',          // Имя принтера в SDK
  options = {
    timeout: 30000,                      // HTTP timeout (мс)
    debug: false                         // Включить логирование
  }
);
```

### Публичные методы

#### `async printLabel(fabricJsonData, printSettings)`
Печать этикетки из Fabric.js JSON.

```javascript
const result = await printer.printLabel(medJson, {
  speed: 4,           // 1-5 (где 5 = максимум)
  density: 12,        // 1-30 (стандарт 12)
  gapPercent: 0.1,    // 10% зазора между этикетками
  orientation: 'T'    // T (top-down) или B (bottom-up)
});

console.log(result);
// {
//   success: true,
//   requestId: 123456,
//   response: {...},
//   timestamp: "2025-12-22T11:00:00.000Z"
// }
```

#### `async printLabelFromFile(filePath, printSettings)`
Печать из файла med.json.

```javascript
const result = await printer.printLabelFromFile('./med.json', {
  speed: 5,
  density: 15
});
```

#### `replacePlaceholders(fabricJsonData, placeholders)`
Замена {{key}} на значения перед печатью.

```javascript
const updated = printer.replacePlaceholders(medJson, {
  sort: 'Липовый',
  about: '500г',
  price: '350₽'
});
```

#### `async checkConnection()`
Проверка доступности Web Print SDK.

```javascript
const isAvailable = await printer.checkConnection();
console.log(isAvailable); // true или false
```

#### `getInfo()`
Информация о конфигурации принтера.

```javascript
console.log(printer.getInfo());
// {
//   model: 'Bixolon XD3-40d',
//   dpi: 203,
//   host: 'localhost',
//   port: 18080,
//   pixelsPerDot: '2.82',
//   serverURL: 'http://localhost:18080/WebPrintSDK'
// }
```

### Утилиты конвертации

```javascript
printer.pixelsToDots(100);   // Fabric pixels → точки (203 DPI)
printer.mmToDots(58);        // мм → точки
printer.dotsToMm(464);       // точки → мм
```

## 📐 Таблица конвертации размеров

Для принтера **Bixolon XD3-40d (203 DPI)**:

| Fabric pixels | Точки | мм |
|---|---|---|
| 50 | 141 | 18 |
| 100 | 282 | 36 |
| 200 | 564 | 71 |
| 400 | 1127 | 143 |

## 🛠 Структура Fabric.js JSON для med.json

```javascript
{
  "widthMM": 58,           // Ширина этикетки в мм
  "heightMM": 40,          // Высота этикетки в мм
  "createdAt": "ISO date", // Когда создан (опционально)
  
  "objects": [
    {
      "type": "textbox",              // текст
      "left": 25,                     // координата X (pixels)
      "top": 23,                      // координата Y (pixels)
      "width": 200,                   // ширина (pixels)
      "height": 50,                   // высота (pixels)
      "fontSize": 20,                 // размер шрифта (pixels)
      "fontFamily": "Arial",
      "fontWeight": "bold",           // "normal" или "bold"
      "text": "Мёд {{sort}}",         // текст с плейсхолдерами
      "textAlign": "center",          // "left", "center", "right"
      "scaleX": 2,                    // масштаб по X
      "scaleY": 2,                    // масштаб по Y
      "fill": "#000000"               // цвет текста
    },
    {
      "type": "rect",
      "left": 10,
      "top": 10,
      "width": 300,
      "height": 250,
      "stroke": "#000000",
      "scaleX": 1,
      "scaleY": 1
    }
  ]
}
```

## 🔧 Поддерживаемые типы объектов Fabric.js

| Тип | Поддержка | Примечание |
|---|---|---|
| `textbox` | ✅ | Device Font, масштаб, жирность |
| `text` | ✅ | Текстовые объекты |
| `rect` | ✅ | Рамки и блоки |
| `image` | ⚠️ | Требуется base64 кодирование |
| `circle` | ⚠️ | Планируется в v1.1 |
| `path` | ❌ | Сложные пути - требует доработки |

## 📚 Документация для разработки

Подробная документация для разширения и интеграции класса находится в файле **DEVELOPMENT.md**:

- Архитектура класса
- Как добавить поддержку новых объектов
- Интеграция с Express.js, PostgreSQL, и т.д.
- Отладка и тестирование
- Примеры расширения функциональности

## 🌐 Интеграция с веб-фреймворками

### Express.js

```javascript
const express = require('express');
const printer = new BixolonPrinter('localhost', 18080);

app.post('/api/print/label', async (req, res) => {
  try {
    const result = await printer.printLabel(req.body.jsonData);
    res.json({ success: true, requestId: result.requestId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Nest.js

```javascript
import { Injectable } from '@nestjs/common';
import BixolonPrinter from './BixolonPrinter';

@Injectable()
export class PrinterService {
  private printer = new BixolonPrinter('localhost', 18080);
  
  async printLabel(fabricJson: any) {
    return this.printer.printLabel(fabricJson);
  }
}
```

## ⚙️ Конфигурация принтера

### Параметры печати

**speed** (1-5, default 4)
- 1 = медленная (качество лучше)
- 5 = максимальная (скорость важнее)

**density** (1-30, default 12)
- 1 = светлая (энергосбережение)
- 30 = тёмная (высокое качество)
- Рекомендация: 12-15 для большинства случаев

**orientation** (T|B, default T)
- `T` = сверху вниз (обычная)
- `B` = снизу вверх (для специальных лент)

**mediaType** (G|B|C, default G)
- `G` = gap (зазор между этикетками)
- `B` = black mark (чёрная метка)
- `C` = continuous (сплошная лента)

## 🐛 Отладка

### Включить debug логирование

```javascript
const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', {
  debug: true
});

// Теперь все операции будут логироваться
// [2025-12-22T11:00:00.000Z] ✅ BixolonPrinter инициализирован
// [2025-12-22T11:00:01.000Z] 🖨️  Начало печати этикетки
```

### Проверить размеры и команды

```javascript
const commands = printer._buildPrintCommands(medJson);
console.log(JSON.stringify(commands, null, 2));
```

## 📦 Структура проекта

```
.
├── BixolonPrinter.js        # Основной класс (1400+ строк, полная документация)
├── examples.js              # 10 примеров использования
├── DEVELOPMENT.md           # Документация для разработки
├── package.json             # Зависимости
├── med.json                 # Пример данных этикетки
└── README.md               # Этот файл
```

## 🎯 Работает с

- ✅ Bixolon XD3-40d (203 DPI)
- ✅ Bixolon XD3-40t
- ✅ Bixolon XD5-40d, XD5-43d
- ✅ Bixolon XT5-40RFID, XT5-43RFID
- ✅ Другие модели с Web Print SDK (требуется проверка параметров DPI)

## 📄 Лицензия

MIT License - свободно используйте и модифицируйте код.

## 🤝 Контрибьютинг

Улучшения приветствуются! Создавайте Issues и Pull Requests.

## 📞 Поддержка

Документация: см. DEVELOPMENT.md и комментарии в коде (JSDoc)

Вопросы по Bixolon Web Print SDK: https://www.bixolon.com/

---

**Последнее обновление:** 22 декабря 2025 г.  
**Версия:** 1.0.0  
**Статус:** Готов к использованию в production ✅
