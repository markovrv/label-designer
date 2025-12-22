/**
 * ===== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ BixolonPrinter =====
 * 
 * Node.js v14+ с установленными зависимостями:
 * npm install axios
 */

const BixolonPrinter = require('./BixolonPrinter');
const fs = require('fs');

// ===== ПРИМЕР 1: Простая печать из файла med.json =====
async function example1_SimplePrint() {
  console.log('\n📌 ПРИМЕР 1: Печать из файла med.json');
  
  const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', {
    debug: true
  });
  
  try {
    const result = await printer.printLabelFromFile('./med.json');
    console.log('✅ Результат:', result);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===== ПРИМЕР 2: Печать с заменой плейсхолдеров =====
async function example2_WithPlaceholders() {
  console.log('\n📌 ПРИМЕР 2: Печать с заменой плейсхолдеров {{sort}}, {{about}}');
  
  const printer = new BixolonPrinter('localhost', 18080);
  
  try {
    // Загружаем исходный JSON
    const medJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));
    
    // Заменяем плейсхолдеры
    const medWithData = printer.replacePlaceholders(medJson, {
      sort: 'Липовый',
      about: 'Натуральный, 500г'
    });
    
    // Печатаем
    const result = await printer.printLabel(medWithData);
    console.log('✅ Напечатана этикетка:', result.requestId);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===== ПРИМЕР 3: Печать с пользовательскими параметрами =====
async function example3_CustomSettings() {
  console.log('\n📌 ПРИМЕР 3: Печать с кастомными параметрами скорости и плотности');
  
  const printer = new BixolonPrinter('192.168.1.100', 18080);
  
  try {
    const medJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));
    
    // Переопределяем параметры печати
    const customSettings = {
      speed: 5,            // максимальная скорость
      density: 15,         // повышенная плотность для лучшего качества
      gapPercent: 0.12,    // 12% зазор вместо 10%
      orientation: 'T'     // печать сверху вниз
    };
    
    const result = await printer.printLabel(medJson, customSettings);
    console.log('✅ Напечатано с параметрами:', customSettings);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===== ПРИМЕР 4: Проверка подключения =====
async function example4_CheckConnection() {
  console.log('\n📌 ПРИМЕР 4: Проверка доступности Web Print SDK');
  
  const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', {debug: true});
  
  const isAvailable = await printer.checkConnection();
  
  if (isAvailable) {
    console.log('✅ Web Print SDK доступен');
    console.log(printer.getInfo());
  } else {
    console.log('❌ Web Print SDK недоступен на localhost:18080');
  }
}

// ===== ПРИМЕР 5: Программное создание Fabric JSON и печать =====
async function example5_ProgrammaticJSON() {
  console.log('\n📌 ПРИМЕР 5: Программное создание JSON и печать');
  
  const printer = new BixolonPrinter('localhost', 18080);
  
  try {
    // Создаём Fabric JSON вручную
    const customLabel = {
      widthMM: 100,    // этикетка шириной 100мм
      heightMM: 50,    // высотой 50мм
      createdAt: new Date().toISOString(),
      objects: [
        {
          type: 'textbox',
          left: 50,
          top: 20,
          width: 200,
          height: 50,
          fontSize: 24,
          fontWeight: 'bold',
          fontFamily: 'Arial',
          text: 'ТОВАР',
          textAlign: 'center',
          scaleX: 1.5,
          scaleY: 1.5,
          fill: '#000000'
        },
        {
          type: 'textbox',
          left: 50,
          top: 150,
          width: 200,
          height: 30,
          fontSize: 16,
          fontWeight: 'normal',
          text: 'Артикул: 12345',
          textAlign: 'center',
          scaleX: 1,
          scaleY: 1,
          fill: '#000000'
        },
        {
          type: 'rect',
          left: 10,
          top: 10,
          width: 280,
          height: 230,
          stroke: '#000000',
          scaleX: 1,
          scaleY: 1
        }
      ]
    };
    
    const result = await printer.printLabel(customLabel, {
      speed: 4,
      density: 12
    });
    
    console.log('✅ Напечатана кастомная этикетка:', result.requestId);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===== ПРИМЕР 6: Пакетная печать нескольких этикеток =====
async function example6_BatchPrint() {
  console.log('\n📌 ПРИМЕР 6: Печать нескольких этикеток (пакетная печать)');
  
  const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', {debug: true});
  
  try {
    // Данные товаров для печати
    const products = [
      { name: 'Мёд Липовый', quantity: '500г', price: '350 ₽' },
      { name: 'Мёд Гречишный', quantity: '250г', price: '200 ₽' },
      { name: 'Пыльца', quantity: '100г', price: '150 ₽' }
    ];
    
    const baseJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));
    
    // Печатаем каждый товар
    for (const product of products) {
      const labelJson = printer.replacePlaceholders(baseJson, {
        sort: product.name,
        about: `${product.quantity} - ${product.price}`
      });
      
      const result = await printer.printLabel(labelJson);
      console.log(`✅ Напечатана этикетка для: ${product.name}`);
      
      // Небольшая задержка между печатями для стабильности
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('❌ Ошибка при пакетной печати:', error.message);
  }
}

// ===== ПРИМЕР 7: Обработка ошибок и retry логика =====
async function example7_ErrorHandling() {
  console.log('\n📌 ПРИМЕР 7: Печать с обработкой ошибок и повторными попытками');
  
  const printer = new BixolonPrinter('localhost', 18080);
  const maxRetries = 3;
  
  async function printWithRetry(jsonData, retryCount = 0) {
    try {
      const result = await printer.printLabel(jsonData);
      console.log('✅ Успешно напечатано');
      return result;
    } catch (error) {
      if (retryCount < maxRetries) {
        console.warn(`⚠️  Ошибка печати, повтор ${retryCount + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // ждём 2 сек
        return printWithRetry(jsonData, retryCount + 1);
      } else {
        throw new Error(`Печать не удалась после ${maxRetries} попыток: ${error.message}`);
      }
    }
  }
  
  try {
    const medJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));
    await printWithRetry(medJson);
  } catch (error) {
    console.error('❌', error.message);
  }
}

// ===== ПРИМЕР 8: Интеграция с Express.js (веб-сервис) =====
async function example8_ExpressIntegration() {
  console.log('\n📌 ПРИМЕР 8: Интеграция с Express.js API');
  
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  const printer = new BixolonPrinter('localhost', 18080);
  
  /**
   * POST /api/print/label
   * Body: {
   *   "widthMM": 58,
   *   "heightMM": 40,
   *   "placeholders": {"sort": "Липовый", "about": "500г"},
   *   "settings": {"speed": 4, "density": 12}
   * }
   */
  app.post('/api/print/label', async (req, res) => {
    try {
      const { widthMM, heightMM, placeholders = {}, settings = {} } = req.body;
      
      // Загружаем базовый шаблон
      const baseTemplate = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));
      
      // Переопределяем размеры если указаны
      if (widthMM) baseTemplate.widthMM = widthMM;
      if (heightMM) baseTemplate.heightMM = heightMM;
      
      // Заменяем плейсхолдеры
      const labelJson = printer.replacePlaceholders(baseTemplate, placeholders);
      
      // Печатаем
      const result = await printer.printLabel(labelJson, settings);
      
      res.json({ success: true, data: result });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  /**
   * GET /api/printer/status
   * Проверка статуса принтера
   */
  app.get('/api/printer/status', async (req, res) => {
    try {
      const isAvailable = await printer.checkConnection();
      res.json({
        available: isAvailable,
        info: printer.getInfo()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // app.listen(3000, () => console.log('🚀 Server on http://localhost:3000'));
  console.log('✅ Express API готов к использованию (примерный код)');
}

// ===== ПРИМЕР 9: Конвертация размеров (справочный) =====
function example9_ConversionReference() {
  console.log('\n📌 ПРИМЕР 9: Таблица конвертации размеров');
  
  const printer = new BixolonPrinter();
  
  console.log('\n📐 Fabric pixels → Принтерные точки (203 DPI):');
  console.log('─────────────────────────────────');
  const sizes = [50, 100, 200, 500, 1000];
  sizes.forEach(px => {
    const dots = printer.pixelsToDots(px);
    console.log(`${px.toString().padStart(4)} px → ${dots.toString().padStart(4)} dots`);
  });
  
  console.log('\n📐 Миллиметры → Принтерные точки (203 DPI):');
  console.log('─────────────────────────────────');
  const mmSizes = [10, 25, 50, 58, 100, 150];
  mmSizes.forEach(mm => {
    const dots = printer.mmToDots(mm);
    console.log(`${mm.toString().padStart(3)} мм → ${dots.toString().padStart(4)} dots`);
  });
}

// ===== ПРИМЕР 10: Чтение med.json и показ информации =====
function example10_MedJsonInfo() {
  console.log('\n📌 ПРИМЕР 10: Анализ содержимого med.json');
  
  try {
    const medJson = JSON.parse(fs.readFileSync('./med.json', 'utf-8'));
    const printer = new BixolonPrinter();
    
    console.log('\n📋 Информация об этикетке:');
    console.log(`  Размер: ${medJson.widthMM}×${medJson.heightMM} мм`);
    console.log(`  В точках (203 DPI): ${printer.mmToDots(medJson.widthMM)}×${printer.mmToDots(medJson.heightMM)} точек`);
    console.log(`  Объектов: ${medJson.objects.length}`);
    console.log(`  Создано: ${medJson.createdAt || 'N/A'}`);
    
    console.log('\n📦 Объекты:');
    medJson.objects.forEach((obj, idx) => {
      console.log(`\n  [${idx}] ${obj.type.toUpperCase()}`);
      console.log(`      Позиция: (${obj.left}, ${obj.top})`);
      console.log(`      Размер: ${obj.width}×${obj.height} px`);
      console.log(`      Масштаб: ${obj.scaleX}×${obj.scaleY}`);
      if (obj.text) console.log(`      Текст: "${obj.text.substring(0, 50)}${obj.text.length > 50 ? '...' : ''}"`);
      if (obj.fontFamily) console.log(`      Шрифт: ${obj.fontFamily} ${obj.fontWeight || 'normal'} ${obj.fontSize}px`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===== ГЛАВНОЕ МЕНЮ =====
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        BixolonPrinter - Примеры использования              ║');
  console.log('║           Node.js класс для печати этикеток               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Раскомментируйте нужный пример:
  
  // await example1_SimplePrint();
  // await example2_WithPlaceholders();
  // await example3_CustomSettings();
  // await example4_CheckConnection();
  // await example5_ProgrammaticJSON();
  // await example6_BatchPrint();
  // await example7_ErrorHandling();
  // await example8_ExpressIntegration();
  example9_ConversionReference();
  example10_MedJsonInfo();
}

// Запуск при вызове как скрипт
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  example1_SimplePrint,
  example2_WithPlaceholders,
  example3_CustomSettings,
  example4_CheckConnection,
  example5_ProgrammaticJSON,
  example6_BatchPrint,
  example7_ErrorHandling,
  example8_ExpressIntegration,
  example9_ConversionReference,
  example10_MedJsonInfo
};
