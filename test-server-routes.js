const axios = require('axios');

// Тестирование маршрутов сервера
async function testServerRoutes() {
    console.log('=== Тестирование маршрутов сервера ===');
    
    const baseURL = 'http://localhost:3000';
    
    try {
        // Тест 1: Получение списка принтеров через API
        console.log('\n1. Тест получения списка принтеров через API:');
        try {
            const printersResponse = await axios.get(`${baseURL}/api/printers`);
            console.log('Список принтеров:', printersResponse.data);
        } catch (error) {
            console.error('Ошибка получения списка принтеров:', error.response?.data || error.message);
        }
        
        // Тест 2: Печать текста через API
        console.log('\n2. Тест печати текста через API:');
        try {
            const textPrintResponse = await axios.post(`${baseURL}/api/print`, {
                printMode: 'text',
                printData: {
                    text: 'Тестовый текст через API',
                    options: {
                        x: 10,
                        y: 10,
                        fontSize: 20,
                        bold: true
                    }
                }
            });
            console.log('Результат печати текста:', textPrintResponse.data);
        } catch (error) {
            console.error('Ошибка печати текста:', error.response?.data || error.message);
        }
        
        // Тест 3: Печать изображения через API
        console.log('\n3. Тест печати изображения через API:');
        try {
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
            const imagePrintResponse = await axios.post(`${baseURL}/api/print`, {
                printMode: 'image',
                printData: {
                    image: testImage,
                    options: {
                        x: 0,
                        y: 0,
                        width: 50
                    }
                }
            });
            console.log('Результат печати изображения:', imagePrintResponse.data);
        } catch (error) {
            console.error('Ошибка печати изображения:', error.response?.data || error.message);
        }
        
        // Тест 4: Попытка получить список макетов
        console.log('\n4. Тест получения списка макетов:');
        try {
            const layoutsResponse = await axios.get(`${baseURL}/api/layouts`);
            console.log('Список макетов:', layoutsResponse.data);
        } catch (error) {
            console.error('Ошибка получения списка макетов:', error.response?.data || error.message);
        }
        
        // Тест 5: Тест сохранения макета
        console.log('\n5. Тест сохранения макета:');
        try {
            const layoutData = {
                widthMM: 58,
                heightMM: 40,
                objects: [
                    {
                        type: 'text',
                        left: 10,
                        top: 10,
                        fontSize: 16,
                        text: 'Тестовый макет',
                        fontFamily: 'Arial'
                    }
                ],
                createdAt: new Date().toISOString()
            };
            
            const saveResponse = await axios.post(`${baseURL}/api/layouts/save`, {
                name: 'test-layout-' + Date.now(),
                layoutData: layoutData
            });
            console.log('Результат сохранения макета:', saveResponse.data);
        } catch (error) {
            console.error('Ошибка сохранения макета:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('Общая ошибка в тестировании маршрутов сервера:', error);
    }
}

// Запуск тестов маршрутов
async function runServerRouteTests() {
    console.log('Начало тестирования маршрутов сервера...\n');
    
    // Проверяем, запущен ли сервер
    try {
        await axios.get('http://localhost:3000');
        console.log('Сервер доступен, запускаем тесты...\n');
        await testServerRoutes();
    } catch (error) {
        console.error('Сервер не запущен. Пожалуйста, запустите сервер командой "node server.js" и повторите тест.');
        console.log('Для запуска сервера выполните: node server.js');
    }
    
    console.log('\n=== Тестирование маршрутов сервера завершено ===');
}

// Запускаем тесты
runServerRouteTests().catch(console.error);