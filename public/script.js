// Инициализация Fabric.js canvas
const canvas = new fabric.Canvas('labelCanvas', {
    selection: true,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    renderOnAddRemove: true,
    skipOffscreen: false,
    enableRetinaScaling: true,
    imageSmoothingEnabled: true
});

// Установка высокого качества рендеринга
canvas.enableRetinaScaling = true;
canvas.imageSmoothingEnabled = true;

// Размеры по умолчанию в пикселях (58x40 мм при ~200 DPI для высокого качества)
const MM_TO_PX = 7.874; // 20 DPI ~ 7.874 пикселей на мм

// Проверяем, есть ли сохраненные размеры в sessionStorage
let widthMM = 58;
let heightMM = 40;

if (sessionStorage.getItem('labelWidthMM') && sessionStorage.getItem('labelHeightMM')) {
    widthMM = parseFloat(sessionStorage.getItem('labelWidthMM'));
    heightMM = parseFloat(sessionStorage.getItem('labelHeightMM'));
}

let labelWidth = widthMM * MM_TO_PX;
let labelHeight = heightMM * MM_TO_PX;

// Установка размеров холста
canvas.setWidth(labelWidth);
canvas.setHeight(labelHeight);

// Установка высокого качества рендеринга
canvas.enableRetinaScaling = true;

// Функция добавления текста
function addText() {
    const fontSize = parseInt(document.getElementById('fontSizeSelector').value);
    const textColor = document.getElementById('textColorPicker').value;
    const fontFamily = document.getElementById('fontFamilySelector').value;
    
    const text = new fabric.Textbox('Новый текст', {
        left: 50,
        top: 50,
        fontSize: fontSize,
        fill: textColor,
        width: 200,
        fontFamily: fontFamily,
        padding: 5,
        borderColor: '#4a6fa5',
        cornerColor: '#4a6fa5',
        cornerSize: 6,
        transparentCorners: false,
        objectCaching: false, // Отключаем кэширование для лучшего качества
        noScaleCache: true,   // Отключаем кэширование при изменении размера
        stroke: 'transparent' // Отключаем обводку для лучшего качества текста
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
}

// Функция добавления изображения
function addImage() {
    // Открываем диалог загрузки изображения
    document.getElementById('imageUpload').click();
}

// Обработка загрузки изображения
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(f) {
        const imgElement = new Image();
        imgElement.src = f.target.result;
        
        imgElement.onload = function() {
            const imgInstance = new fabric.Image(imgElement, {
                left: 100,
                top: 10,
                originX: 'left',
                originY: 'top',
                selectable: true,
                borderColor: '#4a6fa5',
                cornerColor: '#4a6fa5',
                cornerSize: 6,
                transparentCorners: false,
                objectCaching: false, // Отключаем кэширование для лучшего качества
                noScaleCache: true,   // Отключаем кэширование при изменении размера
                stroke: 'transparent' // Отключаем обводку для лучшего качества
            });
            
            canvas.add(imgInstance);
            canvas.setActiveObject(imgInstance);
            canvas.requestRenderAll();
        };
    };
    reader.readAsDataURL(file);
});

// Обработка импорта макета
document.getElementById('layoutImport').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(f) {
        try {
            const layoutData = JSON.parse(f.target.result);
            loadLayoutData(layoutData);
        } catch (error) {
            alert('Ошибка при чтении файла макета: ' + error.message);
        }
    };
    reader.readAsText(file);
});

// Экспорт в PDF
function exportToPDF() {
    // Получаем размеры холста в миллиметрах
    const widthMM = parseFloat(document.getElementById('widthInput').value);
    const heightMM = parseFloat(document.getElementById('heightInput').value);
    
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
    
    // Сохраняем PDF с именем, отражающим размеры этикетки
    const fileName = `etiketka_${widthMM}x${heightMM}mm.pdf`;
    pdf.save(fileName);
}

// Изменение размера холста
function resizeCanvas() {
    const widthMM = parseFloat(document.getElementById('widthInput').value);
    const heightMM = parseFloat(document.getElementById('heightInput').value);
    
    if (isNaN(widthMM) || isNaN(heightMM) || widthMM <= 0 || heightMM <= 0) {
        alert('Пожалуйста, введите корректные значения размеров');
        return;
    }
    
    // Сохраняем новые размеры в sessionStorage
    sessionStorage.setItem('labelWidthMM', widthMM);
    sessionStorage.setItem('labelHeightMM', heightMM);
    
    // Перезагружаем страницу для переинициализации приложения с новыми размерами
    location.reload();
}

// Обработчики событий
document.getElementById('addTextBtn').addEventListener('click', addText);
document.getElementById('addImageBtn').addEventListener('click', addImage);
document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
document.getElementById('resizeCanvasBtn').addEventListener('click', resizeCanvas);

// Добавляем обработчик для кнопки импорта макета
document.getElementById('importLayoutBtn').addEventListener('click', function() {
    document.getElementById('layoutImport').click();
});

// Дополнительные возможности редактирования
canvas.on('selection:created', function(e) {
    console.log('Объект выбран', e.selected[0]);
});

canvas.on('object:modified', function(e) {
    console.log('Объект изменен', e.target);
});

// Обработка изменения цвета текста
document.getElementById('textColorPicker').addEventListener('change', function(e) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('fill', e.target.value);
        canvas.requestRenderAll();
    }
});

// Установка значений размеров из sessionStorage при загрузке
window.addEventListener('load', function() {
    if (sessionStorage.getItem('labelWidthMM') && sessionStorage.getItem('labelHeightMM')) {
        document.getElementById('widthInput').value = parseFloat(sessionStorage.getItem('labelWidthMM'));
        document.getElementById('heightInput').value = parseFloat(sessionStorage.getItem('labelHeightMM'));
    }
});

// Обработка изменения размера шрифта
document.getElementById('fontSizeSelector').addEventListener('change', function(e) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('fontSize', parseInt(e.target.value));
        canvas.requestRenderAll();
    }
});

// Управление клавиатурой
document.addEventListener('keydown', function(e) {
    // Проверяем, находится ли фокус на элементе ввода (input, textarea, contenteditable)
    const activeElement = document.activeElement;
    const isInputElement = activeElement.tagName === 'INPUT' ||
                          activeElement.tagName === 'TEXTAREA' ||
                          activeElement.contentEditable === 'true';
    
    // Удаление выделенного объекта при нажатии Delete или Backspace только если фокус не на текстовом элементе
    if ((e.keyCode === 46 || e.keyCode === 8) && canvas.getActiveObject() && !isInputElement) {
        e.preventDefault();
        canvas.remove(canvas.getActiveObject());
    }
});

// Функция печати
document.getElementById('printBtn').addEventListener('click', function() {
    // Экспортируем холст в изображение с высоким качеством
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2 // Удваиваем разрешение для высокого качества
    });
    
    // Создаем новое окно для печати
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Печать этикетки</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .print-container {
                        border: 1px solid #ccc;
                        padding: 10px;
                        display: inline-block;
                    }
                    img {
                        display: block;
                    }
                    @media print {
                        body { margin: 0; padding: 0; }
                        .print-container { border: none; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <img src="${dataURL}" alt="Этикетка для печати" />
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    
    // После загрузки изображения вызываем диалог печати
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
});

// Функции форматирования текста
document.getElementById('boldBtn').addEventListener('click', function() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        const isBold = activeObject.get('fontWeight') === 'bold';
        activeObject.set('fontWeight', isBold ? 'normal' : 'bold');
        canvas.requestRenderAll();
    }
});

document.getElementById('italicBtn').addEventListener('click', function() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        const isItalic = activeObject.get('fontStyle') === 'italic';
        activeObject.set('fontStyle', isItalic ? 'normal' : 'italic');
        canvas.requestRenderAll();
    }
});

document.getElementById('alignLeftBtn').addEventListener('click', function() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('textAlign', 'left');
        canvas.requestRenderAll();
    }
});

document.getElementById('alignCenterBtn').addEventListener('click', function() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('textAlign', 'center');
        canvas.requestRenderAll();
    }
});

document.getElementById('alignRightBtn').addEventListener('click', function() {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('textAlign', 'right');
        canvas.requestRenderAll();
    }
});

// Обработка изменения шрифта
document.getElementById('fontFamilySelector').addEventListener('change', function(e) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('fontFamily', e.target.value);
        canvas.requestRenderAll();
    }
});


// Функция для получения данных макета
function getLayoutData() {
    // Получаем размеры холста в миллиметрах
    const widthMM = parseFloat(sessionStorage.getItem('labelWidthMM')) || 58;
    const heightMM = parseFloat(sessionStorage.getItem('labelHeightMM')) || 40;
    
    // Получаем все объекты на холсте
    const objects = canvas.getObjects().map(obj => obj.toJSON());
    
    // Возвращаем полные данные макета
    return {
        widthMM,
        heightMM,
        objects,
        createdAt: new Date().toISOString()
    };
}

// Функция для восстановления макета из данных
function loadLayoutData(layoutData) {
    if (!layoutData || !layoutData.objects) {
        console.error('Некорректные данные макета');
        return;
    }
    
    // Очищаем текущий холст
    canvas.clear();
    
    // Устанавливаем размеры холста из макета
    const widthMM = layoutData.widthMM || 58;
    const heightMM = layoutData.heightMM || 40;
    const MM_TO_PX = 7.874; // 20 DPI ~ 7.874 пикселей на мм
    const canvasWidth = widthMM * MM_TO_PX;
    const canvasHeight = heightMM * MM_TO_PX;
    
    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);
    
    // Сохраняем размеры в sessionStorage
    sessionStorage.setItem('labelWidthMM', widthMM);
    sessionStorage.setItem('labelHeightMM', heightMM);
    
    // Обновляем значения в интерфейсе
    document.getElementById('widthInput').value = widthMM;
    document.getElementById('heightInput').value = heightMM;
    
    // Добавляем объекты на холст
    layoutData.objects.forEach(objData => {
        // Создаем объект с помощью fabric.util.object.cloneDeep или вручную
        fabric.util.enlivenObjects([objData], (enlivenedObjects) => {
            enlivenedObjects.forEach(obj => {
                canvas.add(obj);
            });
            canvas.renderAll();
        });
    });
}

// Обработчик кнопки сохранения макета
document.getElementById('saveLayoutBtn').addEventListener('click', function() {
    // Показываем поле ввода имени макета и кнопку подтверждения
    document.querySelector('.layout-actions').style.display = 'flex';
});

// Обработчик кнопки подтверждения сохранения
document.getElementById('saveLayoutConfirmBtn').addEventListener('click', async function() {
    const layoutNameInput = document.getElementById('layoutNameInput');
    const layoutName = layoutNameInput.value.trim();
    
    if (!layoutName) {
        alert('Пожалуйста, введите имя макета');
        return;
    }
    
    try {
        // Получаем данные текущего макета
        const layoutData = getLayoutData();
        
        // Отправляем данные на сервер
        const response = await fetch('/api/layouts/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: layoutName,
                layoutData: layoutData
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Макет успешно сохранен');
            layoutNameInput.value = ''; // Очищаем поле ввода
            document.querySelector('.layout-actions').style.display = 'none'; // Скрываем форму
            
            // Обновляем список макетов
            loadLayoutsList();
        } else {
            alert('Ошибка при сохранении макета: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка при сохранении макета:', error);
        alert('Ошибка при сохранении макета');
    }
});

// Функция для загрузки списка макетов
async function loadLayoutsList() {
    try {
        const response = await fetch('/api/layouts');
        const layouts = await response.json();
        
        if (response.ok) {
            const layoutsList = document.getElementById('layoutsList');
            layoutsList.innerHTML = '';
            
            if (layouts.length === 0) {
                layoutsList.innerHTML = '<p>Нет сохраненных макетов</p>';
                return;
            }
            
            layouts.forEach(layout => {
                const layoutItem = document.createElement('div');
                layoutItem.className = 'layout-item';
                layoutItem.innerHTML = `
                    <div class="layout-item-name">${layout.name}</div>
                    <div class="layout-item-actions">
                        <button class="load-layout-btn" data-filename="${layout.filename}">Загрузить</button>
                        <button class="download-layout-btn" data-filename="${layout.filename}">Скачать</button>
                        <button class="delete-layout-btn" data-filename="${layout.filename}">Удалить</button>
                    </div>
                `;
                layoutsList.appendChild(layoutItem);
            });
            
            // Добавляем обработчики для кнопок загрузки
            document.querySelectorAll('.load-layout-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const filename = this.getAttribute('data-filename');
                    try {
                        const response = await fetch(`/api/layouts/${filename}`);
                        const layoutData = await response.json();
                        
                        if (response.ok) {
                            loadLayoutData(layoutData);
                        } else {
                            alert('Ошибка при загрузке макета: ' + layoutData.error);
                        }
                    } catch (error) {
                        console.error('Ошибка при загрузке макета:', error);
                        alert('Ошибка при загрузке макета');
                    }
                });
            });
            
            // Добавляем обработчики для кнопок скачивания
            document.querySelectorAll('.download-layout-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const filename = this.getAttribute('data-filename');
                    // Создаем ссылку для скачивания файла
                    const link = document.createElement('a');
                    link.href = `/api/layouts/${filename}`;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            });
            
            // Добавляем обработчики для кнопок удаления
            document.querySelectorAll('.delete-layout-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const filename = this.getAttribute('data-filename');
                    const layoutName = filename.replace('.json', '');
                    
                    if (confirm(`Вы уверены, что хотите удалить макет "${layoutName}"?`)) {
                        try {
                            const response = await fetch(`/api/layouts/${filename}`, {
                                method: 'DELETE'
                            });
                            const result = await response.json();
                            
                            if (response.ok) {
                                alert('Макет успешно удален');
                                // Обновляем список макетов
                                loadLayoutsList();
                            } else {
                                alert('Ошибка при удалении макета: ' + result.error);
                            }
                        } catch (error) {
                            console.error('Ошибка при удалении макета:', error);
                            alert('Ошибка при удалении макета');
                        }
                    }
                });
            });
        } else {
            console.error('Ошибка при получении списка макетов:', layouts.error);
        }
    } catch (error) {
        console.error('Ошибка при получении списка макетов:', error);
    }
}

// Загружаем список макетов при загрузке страницы
window.addEventListener('load', function() {
    loadLayoutsList();
    
    // Проверяем, есть ли параметры от сервера для загрузки макета
    if (window.serverParams) {
        const { templateName, variables, layoutData } = window.serverParams;
        
        // Загружаем макет из переданных данных
        loadLayoutData(layoutData);
        
        // Заменяем переменные в макете на значения из GET параметров
        if (variables && Object.keys(variables).length > 0) {
            // Проходим по всем объектам на холсте
            canvas.getObjects().forEach(obj => {
                if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
                    if (obj.text && typeof obj.text === 'string') {
                        let newText = obj.text;
                        
                        // Заменяем все вхождения переменных на их значения
                        for (const [key, value] of Object.entries(variables)) {
                            // Заменяем все вхождения {{key}} на значение
                            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                            newText = newText.replace(regex, value);
                        }
                        
                        // Обновляем текст объекта
                        obj.set('text', newText);
                        obj.setCoords(); // Обновляем координаты объекта после изменения текста
                    }
                }
            });
            
            // Перерисовываем холст
            canvas.renderAll();
        }
    }
});

// Функция для получения GET параметров из URL
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');

    pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    });

    return params;
}

// При загрузке страницы проверяем GET параметры
window.addEventListener('load', function() {
    // Загружаем список макетов
    loadLayoutsList();

    // Получаем GET параметры
    const queryParams = getQueryParams();

    // Если есть параметр template, загружаем указанный макет
    if (queryParams.template) {
        const templateName = queryParams.template;

        // Загружаем макет по имени
        fetch(`/api/layouts/${templateName}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Макет не найден');
                }
                return response.json();
            })
            .then(layoutData => {
                // Загружаем макет в холст
                loadLayoutData(layoutData);

                // Удаляем параметр template из объекта, так как он используется для загрузки макета
                const variables = { ...queryParams };
                delete variables.template;

                // Заменяем переменные в макете на значения из GET параметров
                if (variables && Object.keys(variables).length > 0) {
                    // Проходим по всем объектам на холсте
                    canvas.getObjects().forEach(obj => {
                        if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
                            if (obj.text && typeof obj.text === 'string') {
                                let newText = obj.text;

                                // Заменяем все вхождения переменных на их значения
                                for (const [key, value] of Object.entries(variables)) {
                                    // Заменяем все вхождения {{key}} на значение
                                    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                                    newText = newText.replace(regex, value);
                                }

                                // Обновляем текст объекта
                                obj.set('text', newText);
                                obj.setCoords(); // Обновляем координаты объекта после изменения текста
                            }
                        }
                    });

                    // Перерисовываем холст
                    canvas.renderAll();
                }
            })
            .catch(error => {
                console.error('Ошибка при загрузке макета:', error);
                alert('Ошибка при загрузке макета: ' + error.message);
            });
    }
});
