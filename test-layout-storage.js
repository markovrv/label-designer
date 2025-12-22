const axios = require('axios');

// Тестирование сохранения и загрузки макетов
async function testLayoutStorage() {
    console.log('=== Тестирование сохранения и загрузки макетов ===');
    
    const baseURL = 'http://localhost:3000';
    
    try {
        // Тест 1: Получение списка макетов
        console.log('\n1. Тест получения списка макетов:');
        try {
            const layoutsResponse = await axios.get(`${baseURL}/api/layouts`);
            console.log('Список макетов:', layoutsResponse.data);
        } catch (error) {
            console.error('Ошибка получения списка макетов:', error.response?.data || error.message);
        }
        
        // Тест 2: Создание и сохранение нового макета
        console.log('\n2. Тест сохранения нового макета:');
        const layoutName = `test-layout-${Date.now()}`;
        const layoutData = {
            widthMM: 58,
            heightMM: 40,
            objects: [
                {
                    type: 'text',
                    left: 20,
                    top: 20,
                    fontSize: 16,
                    text: 'Тестовый макет {{timestamp}}',
                    fontFamily: 'Arial',
                    id: 'text-1'
                },
                {
                    type: 'rect',
                    left: 10,
                    top: 50,
                    width: 200,
                    height: 30,
                    strokeWidth: 2,
                    id: 'rect-1'
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        try {
            const saveResponse = await axios.post(`${baseURL}/api/layouts/save`, {
                name: layoutName,
                layoutData: layoutData
            });
            console.log('Макет успешно сохранен:', saveResponse.data);
        } catch (error) {
            console.error('Ошибка сохранения макета:', error.response?.data || error.message);
        }
        
        // Тест 3: Загрузка сохраненного макета
        console.log('\n3. Тест загрузки сохраненного макета:');
        try {
            const loadResponse = await axios.get(`${baseURL}/api/layouts/${layoutName}.json`);
            console.log('Загруженный макет:', JSON.stringify(loadResponse.data, null, 2));
            
            // Проверяем, что загруженные данные соответствуют сохраненным
            const isDataCorrect = loadResponse.data.widthMM === layoutData.widthMM &&
                                loadResponse.data.heightMM === layoutData.heightMM &&
                                loadResponse.data.objects.length === layoutData.objects.length;
            console.log('Данные макета корректно загружены:', isDataCorrect);
        } catch (error) {
            console.error('Ошибка загрузки макета:', error.response?.data || error.message);
        }
        
        // Тест 4: Попытка загрузки несуществующего макета
        console.log('\n4. Тест загрузки несуществующего макета:');
        try {
            const nonExistentResponse = await axios.get(`${baseURL}/api/layouts/non-existent-layout.json`);
            console.log('Ответ для несуществующего макета:', nonExistentResponse.data);
        } catch (error) {
            console.log('Ожидаемая ошибка при загрузке несуществующего макета:', error.response?.data?.error || error.message);
        }
        
        // Тест 5: Попытка сохранить макет с недопустимым именем
        console.log('\n5. Тест сохранения макета с недопустимым именем:');
        try {
            const invalidSaveResponse = await axios.post(`${baseURL}/api/layouts/save`, {
                name: '../invalid-name',
                layoutData: layoutData
            });
            console.log('Результат сохранения с недопустимым именем:', invalidSaveResponse.data);
        } catch (error) {
            console.log('Ожидаемая ошибка при сохранении с недопустимым именем:', error.response?.data?.error || error.message);
        }
        
        // Тест 6: Удаление тестового макета
        console.log('\n6. Тест удаления тестового макета:');
        try {
            const deleteResponse = await axios.delete(`${baseURL}/api/layouts/${layoutName}.json`);
            console.log('Макет успешно удален:', deleteResponse.data);
        } catch (error) {
            console.error('Ошибка удаления макета:', error.response?.data || error.message);
        }
        
        // Тест 7: Проверка, что макет действительно удален
        console.log('\n7. Проверка удаления макета:');
        try {
            const checkResponse = await axios.get(`${baseURL}/api/layouts/${layoutName}.json`);
            console.log('Макет все еще доступен после удаления:', checkResponse.data);
        } catch (error) {
            console.log('Макет успешно удален (ожидаемая ошибка при попытке загрузки):', error.response?.data?.error || error.message);
        }
        
        // Тест 8: Тест с переменными в макете
        console.log('\n8. Тест сохранения макета с переменными:');
        const layoutWithVariables = {
            widthMM: 58,
            heightMM: 40,
            objects: [
                {
                    type: 'text',
                    left: 10,
                    top: 10,
                    fontSize: 16,
                    text: 'Имя: {{name}}, Возраст: {{age}}',
                    fontFamily: 'Arial'
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        const variableLayoutName = `variable-layout-${Date.now()}`;
        
        try {
            const variableSaveResponse = await axios.post(`${baseURL}/api/layouts/save`, {
                name: variableLayoutName,
                layoutData: layoutWithVariables
            });
            console.log('Макет с переменными успешно сохранен:', variableSaveResponse.data);
            
            // Загружаем и проверяем
            const variableLoadResponse = await axios.get(`${baseURL}/api/layouts/${variableLayoutName}.json`);
            console.log('Макет с переменными загружен корректно:', variableLoadResponse.data.objects[0].text === 'Имя: {{name}}, Возраст: {{age}}');
            
            // Удаляем тестовый макет
            await axios.delete(`${baseURL}/api/layouts/${variableLayoutName}.json`);
            console.log('Макет с переменными удален');
        } catch (error) {
            console.error('Ошибка при работе с макетом с переменными:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('Общая ошибка в тестировании сохранения и загрузки макетов:', error);
    }
    
    console.log('\n=== Тестирование сохранения и загрузки макетов завершено ===');
}

// Запуск тестов
async function runLayoutStorageTests() {
    console.log('Начало тестирования сохранения и загрузки макетов...\n');
    
    // Проверяем, доступен ли сервер
    try {
        await axios.get('http://localhost:3000');
        console.log('Сервер доступен, запускаем тесты...\n');
        await testLayoutStorage();
    } catch (error) {
        console.error('Сервер не запущен. Пожалуйста, запустите сервер командой "node server.js" и повторите тест.');
    }
}

// Запускаем тесты
runLayoutStorageTests().catch(console.error);