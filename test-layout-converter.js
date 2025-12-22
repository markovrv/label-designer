// Удалено, так как файл converter больше не используется

// Тестирование различных типов объектов в макетах
function testLayoutConversion() {
    console.log('=== Тестирование преобразования макетов в формат Bixolon ===');
    
    // Тест 1: Преобразование текстового объекта
    console.log('\n1. Тест преобразования текстового объекта:');
    const textObject = {
        type: 'text',
        left: 20,
        top: 30,
        fontSize: 24,
        text: 'Тестовый текст',
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic'
    };
    
    const textConverted = LayoutToBixolonConverter.convertFabricObject(textObject, {}, 0);
    console.log('Текстовый объект преобразован в:', textConverted);
    
    // Тест 2: Преобразование прямоугольника
    console.log('\n2. Тест преобразования прямоугольника:');
    const rectObject = {
        type: 'rect',
        left: 50,
        top: 60,
        width: 100,
        height: 50,
        strokeWidth: 2
    };
    
    const rectConverted = LayoutToBixolonConverter.convertFabricObject(rectObject, {}, 0);
    console.log('Прямоугольник преобразован в:', rectConverted);
    
    // Тест 3: Преобразование окружности
    console.log('\n3. Тест преобразования окружности:');
    const circleObject = {
        type: 'circle',
        left: 100,
        top: 100,
        width: 80,
        height: 80
    };
    
    const circleConverted = LayoutToBixolonConverter.convertFabricObject(circleObject, {}, 0);
    console.log('Окружность преобразована в:', circleConverted);
    
    // Тест 4: Преобразование линии
    console.log('\n4. Тест преобразования линии:');
    const lineObject = {
        type: 'line',
        left: 10,
        top: 10,
        width: 100,
        height: 5,
        strokeWidth: 1
    };
    
    const lineConverted = LayoutToBixolonConverter.convertFabricObject(lineObject, {}, 0);
    console.log('Линия преобразована в:', lineConverted);
    
    // Тест 5: Преобразование изображения
    console.log('\n5. Тест преобразования изображения:');
    const imageObject = {
        type: 'image',
        left: 20,
        top: 20,
        width: 50,
        height: 50,
        src: '/uploads/test-image.png'
    };
    
    const imageConverted = LayoutToBixolonConverter.convertFabricObject(imageObject, {}, 0);
    console.log('Изображение преобразовано в:', imageConverted);
    
    // Тест 6: Преобразование сложного макета
    console.log('\n6. Тест преобразования сложного макета:');
    const complexLayout = {
        width: 58,  // ширина в мм
        height: 40, // высота в мм
        objects: [
            {
                type: 'text',
                left: 10,
                top: 10,
                fontSize: 16,
                text: 'Заголовок: {{title}}',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            },
            {
                type: 'rect',
                left: 5,
                top: 35,
                width: 200,
                height: 2,
                strokeWidth: 1
            },
            {
                type: 'text',
                left: 15,
                top: 45,
                fontSize: 12,
                text: 'Описание: {{description}}',
                fontFamily: 'Arial'
            },
            {
                type: 'circle',
                left: 200,
                top: 10,
                width: 30,
                height: 30
            }
        ]
    };
    
    const complexData = {
        title: 'Тестовый заголовок',
        description: 'Тестовое описание'
    };
    
    // Удалено, так как файл converter больше не используется
    console.log('Сложный макет (без преобразования):', JSON.stringify(complexLayout, null, 2));
    
    // Тест 7: Проверка функции замены переменных
    console.log('\n7. Тест функции замены переменных:');
    const originalText = 'Имя: {{name}}, Возраст: {{age}}, Город: {{city}}, Дата: {{date}}';
    const variables = {
        name: 'Александр',
        age: 35,
        city: 'Санкт-Петербург',
        date: '2023-12-19'
    };
    
    const replacedText = LayoutToBixolonConverter.replaceVariables(originalText, variables);
    console.log('Оригинальный текст:', originalText);
    console.log('Переменные:', variables);
    console.log('Результат замены:', replacedText);
    
    // Проверяем правильность замены
    const expectedText = 'Имя: Александр, Возраст: 35, Город: Санкт-Петербург, Дата: 2023-12-19';
    const isCorrect = replacedText === expectedText;
    console.log('Замена переменных корректна:', isCorrect);
    
    // Тест 8: Преобразование textbox (тип текстового объекта в Fabric.js)
    console.log('\n8. Тест преобразования textbox:');
    const textboxObject = {
        type: 'textbox',
        left: 30,
        top: 40,
        fontSize: 14,
        text: 'Текст в textbox',
        fontFamily: 'Times New Roman',
        scaleX: 1.2,
        scaleY: 1.2
    };
    
    const textboxConverted = LayoutToBixolonConverter.convertFabricObject(textboxObject, {}, 0);
    console.log('Textbox преобразован в:', textboxConverted);
    
    console.log('\n=== Тестирование преобразования макетов завершено ===');
}

// Запуск тестов
testLayoutConversion();