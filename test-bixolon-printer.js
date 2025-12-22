const BixolonPrinter = require('./bixolon/BixolonPrinter.js');

// Тестирование основных функций BixolonPrinter
async function testBixolonPrinter() {
    console.log('=== Тестирование BixolonPrinter ===');
    
    // Создаем экземпляр принтера с тестовыми параметрами
    const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', { debug: true });
    
    try {
        // Тест 1: Получение информации о принтере
        console.log('\n1. Тест получения информации о принтере:');
        const printerInfo = printer.getInfo();
        console.log('Информация о принтере:', printerInfo);
        
        // Тест 2: Проверка соединения
        console.log('\n2. Тест проверки соединения:');
        const isConnected = await printer.checkConnection();
        console.log('Соединение с принтером:', isConnected);
        
        // Тест 3: Печать тестовой этикетки с плейсхолдерами
        console.log('\n3. Тест печати этикетки с плейсхолдерами:');
        try {
            const testLabelData = {
                widthMM: 58,
                heightMM: 40,
                objects: [
                    {
                        type: 'textbox',
                        left: 20,
                        top: 20,
                        fontSize: 16,
                        text: 'Тестовая этикетка {{test_number}}',
                        fontFamily: 'Arial'
                    },
                    {
                        type: 'textbox',
                        left: 20,
                        top: 60,
                        fontSize: 12,
                        text: 'Дата: {{date}}',
                        fontFamily: 'Arial'
                    }
                ]
            };
            
            // Заменяем плейсхолдеры тестовыми значениями
            const processedLabelData = printer.replacePlaceholders(testLabelData, {
                test_number: '1',
                date: new Date().toISOString().split('T')[0]
            });
            
            console.log('Обработанные данные этикетки:', JSON.stringify(processedLabelData, null, 2));
        } catch (error) {
            console.error('Ошибка при обработке этикетки:', error.message);
        }
        
    } catch (error) {
        console.error('Общая ошибка в тестировании BixolonPrinter:', error);
    }
}

// Тестирование функций замены плейсхолдеров
function testPlaceholderReplacement() {
    console.log('\n=== Тестирование замены плейсхолдеров ===');
    
    const printer = new BixolonPrinter();
    
    const testLayout = {
        widthMM: 58,
        heightMM: 40,
        objects: [
            {
                type: 'textbox',
                left: 10,
                top: 10,
                fontSize: 16,
                text: 'Имя: {{name}}, Возраст: {{age}}',
                fontFamily: 'Arial'
            },
            {
                type: 'textbox',
                left: 10,
                top: 40,
                fontSize: 14,
                text: 'Продукт: {{product}}',
                fontFamily: 'Arial'
            }
        ]
    };
    
    const testData = {
        name: 'Алексей',
        age: 25,
        product: 'Мёд липовый'
    };
    
    const result = printer.replacePlaceholders(testLayout, testData);
    console.log('Оригинальные данные:', JSON.stringify(testLayout, null, 2));
    console.log('Данные для замены:', testData);
    console.log('Результат замены:', JSON.stringify(result, null, 2));
    
    // Проверяем, что плейсхолдеры были заменены
    const hasReplacedVariables = JSON.stringify(result).includes('Алексей') && 
                                 JSON.stringify(result).includes('25') &&
                                 JSON.stringify(result).includes('Мёд липовый');
    console.log('Плейсхолдеры успешно заменены:', hasReplacedVariables);
}

// Тестирование конвертации единиц измерения
function testUnitConversion() {
    console.log('\n=== Тестирование конвертации единиц измерения ===');
    
    const printer = new BixolonPrinter();
    
    // Тест конвертации пикселей в точки
    const pixels = 100;
    const dots = printer.pixelsToDots(pixels);
    console.log(`${pixels} пикселей = ${dots} точек (203 DPI)`);
    
    // Тест конвертации мм в точки
    const mm = 58;
    const dotsFromMm = printer.mmToDots(mm);
    console.log(`${mm} мм = ${dotsFromMm} точек (203 DPI)`);
    
    // Тест обратной конвертации
    const mmFromDots = printer.dotsToMm(dotsFromMm);
    console.log(`${dotsFromMm} точек = ${mmFromDots} мм`);
}

// Запуск всех тестов
async function runAllTests() {
    console.log('Начало тестирования BixolonPrinter...\n');
    
    await testBixolonPrinter();
    testPlaceholderReplacement();
    testUnitConversion();
    
    console.log('\n=== Тестирование завершено ===');
}

// Запускаем тесты
runAllTests().catch(console.error);