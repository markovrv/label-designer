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

// Функция для отображения уведомлений
function showNotification(message, type = 'info') {
    // Создаем контейнер для уведомлений, если его еще нет
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Создаем содержимое уведомления
    const content = document.createElement('div');
    content.className = 'notification-content';
    content.textContent = message;
    
    // Создаем кнопку закрытия
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function() {
        closeNotification(notification);
    };
    
    // Добавляем содержимое и кнопку закрытия в уведомление
    notification.appendChild(content);
    notification.appendChild(closeBtn);
    
    // Добавляем уведомление в контейнер
    container.appendChild(notification);
    
    // Автоматически удаляем уведомление через 5 секунд (если не было закрыто вручную)
    setTimeout(() => {
        closeNotification(notification);
    }, 5000);
}

// Функция для закрытия уведомления
function closeNotification(notification) {
    if (notification) {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

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

// Функция открытия модального окна "Сохранить макет"
document.getElementById('saveLayoutBtn').addEventListener('click', function() {
    loadLayoutsListModal();
    document.getElementById('saveLayoutModal').style.display = 'block';
});

// Функция открытия модального окна "Открыть макет"
document.getElementById('importLayoutBtn').addEventListener('click', function() {
    loadLayoutsListOpenModal();
    document.getElementById('openLayoutModal').style.display = 'block';
});

// Функция закрытия модального окна "Сохранить макет"
document.getElementById('closeSaveModal').addEventListener('click', function() {
    document.getElementById('saveLayoutModal').style.display = 'none';
});

// Функция закрытия модального окна "Открыть макет"
document.getElementById('closeOpenModal').addEventListener('click', function() {
    document.getElementById('openLayoutModal').style.display = 'none';
});

// Закрытие модальных окон при клике вне их области
window.addEventListener('click', function(event) {
    const saveModal = document.getElementById('saveLayoutModal');
    const openModal = document.getElementById('openLayoutModal');
    
    if (event.target === saveModal) {
        saveModal.style.display = 'none';
    }
    
    if (event.target === openModal) {
        openModal.style.display = 'none';
    }
});

// Обработчик кнопки сохранения макета в модальном окне
document.getElementById('saveLayoutModalBtn').addEventListener('click', async function() {
    const layoutNameInput = document.getElementById('layoutNameInputModal');
    const layoutName = layoutNameInput.value.trim();
    
    if (!layoutName) {
        showNotification('Пожалуйста, введите имя макета', 'error');
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
            showNotification('Макет успешно сохранен', 'success');
            layoutNameInput.value = ''; // Очищаем поле ввода
            document.getElementById('saveLayoutModal').style.display = 'none'; // Закрываем модальное окно
            
            // Обновляем список макетов
            loadLayoutsList();
        } else {
            showNotification('Ошибка при сохранении макета: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка при сохранении макета:', error);
        showNotification('Ошибка при сохранении макета', 'error');
    }
});

// Обработчик кнопки импорта макета в модальном окне
document.getElementById('importLayoutModalBtn').addEventListener('click', function() {
    document.getElementById('layoutImportModal').click();
});

// Обработка загрузки файла макета
document.getElementById('layoutImportModal').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(f) {
        try {
            const layoutData = JSON.parse(f.target.result);
            loadLayoutData(layoutData);
            document.getElementById('openLayoutModal').style.display = 'none'; // Закрываем модальное окно
            showNotification('Макет успешно загружен', 'success');
        } catch (error) {
            showNotification('Ошибка при чтении файла макета: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
});

// Функция для загрузки списка макетов в модальное окно "Сохранить макет"
async function loadLayoutsListModal() {
    try {
        const response = await fetch('/api/layouts');
        const layouts = await response.json();
        
        if (response.ok) {
            const layoutsList = document.getElementById('layoutsListModal');
            layoutsList.innerHTML = '';
            
            if (layouts.length === 0) {
                layoutsList.innerHTML = '<p>Нет сохраненных макетов</p>';
                return;
            }
            
            layouts.forEach(layout => {
                const layoutItem = document.createElement('div');
                layoutItem.className = 'layout-item-modal';
                layoutItem.innerHTML = `
                    <div class="layout-item-name-modal" data-name="${layout.name}">${layout.name}</div>
                    <div class="layout-item-actions-modal">
                        <button class="load-layout load-layout-btn-modal" data-filename="${layout.filename}">Загрузить</button>
                        <button class="download-layout-btn-modal" data-filename="${layout.filename}">Скачать</button>
                        <button class="delete-layout-btn-modal" data-filename="${layout.filename}">Удалить</button>
                    </div>
                `;
                layoutsList.appendChild(layoutItem);
            });
            
            // Добавляем обработчики для клика по названию макета (вставляет имя в поле ввода)
            document.querySelectorAll('.layout-item-name-modal').forEach(nameElement => {
                nameElement.addEventListener('click', function() {
                    const layoutName = this.getAttribute('data-name');
                    document.getElementById('layoutNameInputModal').value = layoutName;
                });
            });
            
            // Добавляем обработчики для кнопок загрузки
            document.querySelectorAll('.load-layout-btn-modal').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const filename = this.getAttribute('data-filename');
                    try {
                        const response = await fetch(`/api/layouts/${filename}`);
                        const layoutData = await response.json();
                        
                        if (response.ok) {
                            loadLayoutData(layoutData);
                            document.getElementById('saveLayoutModal').style.display = 'none'; // Закрываем модальное окно
                        } else {
                            showNotification('Ошибка при загрузке макета: ' + layoutData.error, 'error');
                        }
                    } catch (error) {
                        console.error('Ошибка при загрузке макета:', error);
                        showNotification('Ошибка при загрузке макета', 'error');
                    }
                });
            });
            
            // Добавляем обработчики для кнопок скачивания
            document.querySelectorAll('.download-layout-btn-modal').forEach(btn => {
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
            document.querySelectorAll('.delete-layout-btn-modal').forEach(btn => {
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
                                showNotification('Макет успешно удален', 'success');
                                // Обновляем список макетов
                                loadLayoutsListModal();
                                loadLayoutsList(); // Обновляем и основной список
                            } else {
                                showNotification('Ошибка при удалении макета: ' + result.error, 'error');
                            }
                        } catch (error) {
                            console.error('Ошибка при удалении макета:', error);
                            showNotification('Ошибка при удалении макета', 'error');
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

// Функция для загрузки списка макетов в модальное окно "Открыть макет"
async function loadLayoutsListOpenModal() {
    try {
        const response = await fetch('/api/layouts');
        const layouts = await response.json();
        
        if (response.ok) {
            const layoutsList = document.getElementById('layoutsListOpenModal');
            layoutsList.innerHTML = '';
            
            if (layouts.length === 0) {
                layoutsList.innerHTML = '<p>Нет сохраненных макетов</p>';
                return;
            }
            
            layouts.forEach(layout => {
                const layoutItem = document.createElement('div');
                layoutItem.className = 'layout-item-modal';
                layoutItem.innerHTML = `
                    <div class="layout-item-name-modal load-layout" data-filename="${layout.filename}">${layout.name}</div>
                    <div class="layout-item-actions-modal">
                        <button class="load-layout load-layout-btn-modal" data-filename="${layout.filename}">Загрузить</button>
                        <button class="download-layout-btn-modal" data-filename="${layout.filename}">Скачать</button>
                        <button class="delete-layout-btn-modal" data-filename="${layout.filename}">Удалить</button>
                    </div>
                `;
                layoutsList.appendChild(layoutItem);
            });
            
            // Добавляем обработчики для кнопок загрузки
            document.querySelectorAll('.load-layout').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const filename = this.getAttribute('data-filename');
                    try {
                        const response = await fetch(`/api/layouts/${filename}`);
                        const layoutData = await response.json();
                        
                        if (response.ok) {
                            loadLayoutData(layoutData);
                            document.getElementById('openLayoutModal').style.display = 'none'; // Закрываем модальное окно
                        } else {
                            showNotification('Ошибка при загрузке макета: ' + layoutData.error, 'error');
                        }
                    } catch (error) {
                        console.error('Ошибка при загрузке макета:', error);
                        showNotification('Ошибка при загрузке макета', 'error');
                    }
                });
            });
            
            // Добавляем обработчики для кнопок скачивания
            document.querySelectorAll('.download-layout-btn-modal').forEach(btn => {
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
            document.querySelectorAll('.delete-layout-btn-modal').forEach(btn => {
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
                                showNotification('Макет успешно удален', 'success');
                                // Обновляем список макетов
                                loadLayoutsListOpenModal();
                                loadLayoutsList(); // Обновляем и основной список
                            } else {
                                showNotification('Ошибка при удалении макета: ' + result.error, 'error');
                            }
                        } catch (error) {
                            console.error('Ошибка при удалении макета:', error);
                            showNotification('Ошибка при удалении макета', 'error');
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

// Обработчик кнопки обновления списка макетов в модальном окне "Открыть макет"
document.getElementById('refreshLayoutsBtn').addEventListener('click', function() {
    loadLayoutsListOpenModal();
});

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
            showNotification('Ошибка при чтении файла макета: ' + error.message, 'error');
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
        showNotification('Пожалуйста, введите корректные значения размеров', 'error');
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

// Добавляем обработчик для кнопки импорта макета (обновлен для использования модального окна)
// document.getElementById('importLayoutBtn').addEventListener('click', function() {
//     document.getElementById('layoutImport').click();
// });

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

// Функция стандартной печати
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

// Функция печати Bixolon
document.getElementById('bixolonPrintBtn').addEventListener('click', async function() {
    try {
        // Сначала проверяем соединение с принтером
        const connectionStatus = await getPrinterConnectionStatus();
        
        if (!connectionStatus.isConnected) {
            showNotification('Принтер не подключен к серверу печати. Печать невозможна.', 'error');
            return;
        }
        
        // Получаем выбранный режим печати
        const printMode = document.getElementById('printModeSelect') ? document.getElementById('printModeSelect').value : 'current';
        
        let requestBody = {};
        
        if (printMode === 'current') {
            // Режим печати текущего вида
            const layoutData = getLayoutData();
            requestBody = {
                layoutData: layoutData
            };
        } else {
            return ;
        }
        
        // Отправляем данные на сервер для печати на Bixolon
        const response = await fetch('/api/print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Макет отправлен на печать Bixolon', 'success');
        } else {
            showNotification('Ошибка при печати Bixolon: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка при отправке данных на печать Bixolon:', error);
        showNotification('Ошибка при отправке данных на печать Bixolon', 'error');
    }
});



// не отображать список режимов, печати, если режим один
window.addEventListener('load', function() {
    var printModeSelect = document.getElementById('printModeSelect');
    if (printModeSelect.options.length === 1) {
        printModeSelect.style.display = 'none'; // Скрываем выпадающий список
    }
    
    // Инициализация отображения статуса соединения с принтером
    updatePrinterStatusDisplay();
});

// Функция обновления отображения статуса принтера
async function updatePrinterStatusDisplay() {
    const status = await getPrinterConnectionStatus();
    const statusElement = document.getElementById('printerStatus');
    if (statusElement) {
        if (status.isConnected) {
            statusElement.textContent = 'Принтер подключен';
            statusElement.className = 'printer-status connected';
        } else {
            statusElement.textContent = 'Принтер не подключен';
            statusElement.className = 'printer-status disconnected';
        }
    }
}

// Функция получения статуса соединения с принтером
async function getPrinterConnectionStatus() {
    try {
        const response = await fetch('/api/printer-connection', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        return {
            isConnected: response.ok && result.connected && result.connected !== "not found match device",
            details: result
        };
    } catch (error) {
        console.error('Ошибка при проверке статуса принтера:', error);
        return {
            isConnected: false,
            details: null
        };
    }
}

// Обновляем статус принтера каждые 10 секунд
setInterval(updatePrinterStatusDisplay, 10000);

// функция для обновления интерфейса в зависимости от выбранного режима печати
function updatePrintModeUI() {
    const printModeSelect = document.getElementById('printModeSelect');
    if (!printModeSelect) return;
    
    const selectedMode = printModeSelect.value;
    console.log('Выбран режим печати:', selectedMode);
}

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

// Обработчик кнопки сохранения макета (обновлен для использования модального окна)
// document.getElementById('saveLayoutBtn').addEventListener('click', function() {
//     // Показываем поле ввода имени макета и кнопку подтверждения
//     document.querySelector('.layout-actions').style.display = 'flex';
// });

// Обработчик кнопки подтверждения сохранения
document.getElementById('saveLayoutConfirmBtn').addEventListener('click', async function() {
    const layoutNameInput = document.getElementById('layoutNameInput');
    const layoutName = layoutNameInput.value.trim();
    
    if (!layoutName) {
        showNotification('Пожалуйста, введите имя макета', 'error');
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
            showNotification('Макет успешно сохранен', 'success');
            layoutNameInput.value = ''; // Очищаем поле ввода
            document.querySelector('.layout-actions').style.display = 'none'; // Скрываем форму
            
            // Обновляем список макетов
            loadLayoutsList();
        } else {
            showNotification('Ошибка при сохранении макета: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка при сохранении макета:', error);
        showNotification('Ошибка при сохранении макета', 'error');
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
                            showNotification('Ошибка при загрузке макета: ' + layoutData.error, 'error');
                        }
                    } catch (error) {
                        console.error('Ошибка при загрузке макета:', error);
                        showNotification('Ошибка при загрузке макета', 'error');
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
                                showNotification('Макет успешно удален', 'success');
                                // Обновляем список макетов
                                loadLayoutsList();
                            } else {
                                showNotification('Ошибка при удалении макета: ' + result.error, 'error');
                            }
                        } catch (error) {
                            console.error('Ошибка при удалении макета:', error);
                            showNotification('Ошибка при удалении макета', 'error');
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
                showNotification('Ошибка при загрузке макета: ' + error.message, 'error');
            });
    }
});
