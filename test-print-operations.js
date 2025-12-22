const axios = require('axios');
const fs = require('fs');

// Тестирование операций печати
async function testPrintOperations() {
    console.log('=== Тестирование операций печати ===');
    
    const baseURL = 'http://localhost:3000';
    
    try {
        // Тест 1: Печать текста
        console.log('\n1. Тест печати текста:');
        try {
            const textPrintResponse = await axios.post(`${baseURL}/api/print`, {
                printMode: 'text',
                printData: {
                    text: 'Тестовая строка для печати',
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
        
        // Тест 2: Печать изображения
        console.log('\n2. Тест печати изображения:');
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
        
        // Тест 3: Печать сохраненного макета (если есть доступные макеты)
        console.log('\n3. Тест печати сохраненного макета:');
        try {
            // Сначала получаем список макетов
            const layoutsResponse = await axios.get(`${baseURL}/api/layouts`);
            const layouts = layoutsResponse.data;
            
            if (layouts.length > 0) {
                // Используем первый доступный макет
                const firstLayout = layouts[0];
                console.log(`Печать макета: ${firstLayout.name}`);
                
                // Создаем тестовые данные для замены переменных
                const testData = {
                    name: 'Тест',
                    value: '123',
                    date: new Date().toISOString().split('T')[0]
                };
                
                const layoutPrintResponse = await axios.post(`${baseURL}/api/print`, {
                    printMode: 'layout',
                    template: firstLayout.name,
                    data: testData
                });
                
                console.log('Результат печати макета:', layoutPrintResponse.data);
            } else {
                console.log('Нет доступных макетов для печати');
            }
        } catch (error) {
            console.error('Ошибка печати макета:', error.response?.data || error.message);
        }
        
        // Тест 4: Печать текущего вида (mock данных)
        console.log('\n4. Тест печати текущего вида:');
        try {
            const currentViewData = {
                widthMM: 58,
                heightMM: 40,
                objects: [
                    {
                        type: 'text',
                        left: 20,
                        top: 20,
                        fontSize: 16,
                        text: 'Текущий вид {{timestamp}}',
                        fontFamily: 'Arial'
                    },
                    {
                        type: 'rect',
                        left: 10,
                        top: 50,
                        width: 200,
                        height: 30,
                        strokeWidth: 2
                    }
                ],
                createdAt: new Date().toISOString()
            };
            
            const currentPrintResponse = await axios.post(`${baseURL}/api/print`, {
                printMode: 'current',
                layoutData: currentViewData,
                data: {
                    timestamp: new Date().toLocaleString()
                }
            });
            
            console.log('Результат печати текущего вида:', currentPrintResponse.data);
        } catch (error) {
            console.error('Ошибка печати текущего вида:', error.response?.data || error.message);
        }
        
        // Тест 5: Попытка печати с неполными данными
        console.log('\n5. Тест печати с неполными данными:');
        try {
            const incompletePrintResponse = await axios.post(`${baseURL}/api/print`, {
                printMode: 'text' // Нет printData
            });
            console.log('Результат печати с неполными данными:', incompletePrintResponse.data);
        } catch (error) {
            console.log('Ожидаемая ошибка при печати с неполными данными:', error.response?.data?.error || error.message);
        }
        
        // Тест 6: Печать сложного макета с различными элементами
        console.log('\n6. Тест печати сложного макета:');
        try {
            const complexLayoutData = {
                widthMM: 58,
                heightMM: 40,
                objects: [
                    {
                        type: 'text',
                        left: 10,
                        top: 10,
                        fontSize: 20,
                        text: 'Заголовок',
                        fontFamily: 'Arial',
                        fontWeight: 'bold'
                    },
                    {
                        type: 'text',
                        left: 15,
                        top: 35,
                        fontSize: 12,
                        text: 'Описание: {{description}}',
                        fontFamily: 'Arial'
                    },
                    {
                        type: 'rect',
                        left: 5,
                        top: 60,
                        width: 200,
                        height: 2,
                        strokeWidth: 1
                    },
                    {
                        type: 'circle',
                        left: 200,
                        top: 10,
                        width: 25,
                        height: 25
                    }
                ],
                createdAt: new Date().toISOString()
            };
            
            const complexPrintResponse = await axios.post(`${baseURL}/api/print`, {
                printMode: 'current',
                layoutData: complexLayoutData,
                data: {
                    description: 'Тестовое описание'
                }
            });
            
            console.log('Результат печати сложного макета:', complexPrintResponse.data);
        } catch (error) {
            console.error('Ошибка печати сложного макета:', error.response?.data || error.message);
        }
        
        // Тест 7: Печать с использованием переменных
        console.log('\n7. Тест печати с использованием переменных:');
        try {
            const variableLayoutData = {
                widthMM: 58,
                heightMM: 40,
                objects: [
                    {
                        type: 'text',
                        left: 10,
                        top: 10,
                        fontSize: 16,
                        text: 'Имя: {{name}}',
                        fontFamily: 'Arial'
                    },
                    {
                        type: 'text',
                        left: 10,
                        top: 30,
                        fontSize: 16,
                        text: 'Возраст: {{age}}',
                        fontFamily: 'Arial'
                    },
                    {
                        type: 'text',
                        left: 10,
                        top: 50,
                        fontSize: 16,
                        text: 'Город: {{city}}',
                        fontFamily: 'Arial'
                    }
                ],
                createdAt: new Date().toISOString()
            };
            
            const variablePrintResponse = await axios.post(`${baseURL}/api/print`, {
                printMode: 'current',
                layoutData: variableLayoutData,
                data: {
                    name: 'Алексей',
                    age: 30,
                    city: 'Москва'
                }
            });
            
            console.log('Результат печати с переменными:', variablePrintResponse.data);
        } catch (error) {
            console.error('Ошибка печати с переменными:', error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('Общая ошибка в тестировании операций печати:', error);
    }
    
    console.log('\n=== Тестирование операций печати завершено ===');
}

// Запуск тестов
async function runPrintOperationTests() {
    console.log('Начало тестирования операций печати...\n');
    
    // Проверяем, доступен ли сервер
    try {
        await axios.get('http://localhost:3000');
        console.log('Сервер доступен, запускаем тесты...\n');
        await testPrintOperations();
    } catch (error) {
        console.error('Сервер не запущен. Пожалуйста, запустите сервер командой "node server.js" и повторите тест.');
    }
}

// Запускаем тесты
runPrintOperationTests().catch(console.error);