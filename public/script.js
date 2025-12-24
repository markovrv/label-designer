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
    closeBtn.onclick = function () {
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
document.getElementById('saveLayoutBtn').addEventListener('click', function () {
    loadLayoutsListModal();
    document.getElementById('saveLayoutModal').style.display = 'block';
});

// Функция открытия модального окна "Открыть макет"
document.getElementById('importLayoutBtn').addEventListener('click', function () {
    loadLayoutsListOpenModal();
    document.getElementById('openLayoutModal').style.display = 'block';
});

// Функция закрытия модального окна "Сохранить макет"
document.getElementById('closeSaveModal').addEventListener('click', function () {
    document.getElementById('saveLayoutModal').style.display = 'none';
});

// Функция закрытия модального окна "Открыть макет"
document.getElementById('closeOpenModal').addEventListener('click', function () {
    document.getElementById('openLayoutModal').style.display = 'none';
});

// Закрытие модальных окон при клике вне их области
window.addEventListener('click', function (event) {
    const saveModal = document.getElementById('saveLayoutModal');
    const openModal = document.getElementById('openLayoutModal');
    if (event.target === saveModal) saveModal.style.display = 'none';
    if (event.target === openModal) openModal.style.display = 'none';
});

// Обработчик кнопки сохранения макета в модальном окне
document.getElementById('saveLayoutModalBtn').addEventListener('click', async function () {
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
        } else {
            showNotification('Ошибка при сохранении макета: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Ошибка при сохранении макета:', error);
        showNotification('Ошибка при сохранении макета', 'error');
    }
});

// Обработчик кнопки импорта макета в модальном окне
document.getElementById('importLayoutModalBtn').addEventListener('click', function () {
    document.getElementById('layoutImportModal').click();
});

// Обработка загрузки файла макета
document.getElementById('layoutImportModal').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (f) {
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
                nameElement.addEventListener('click', function () {
                    const layoutName = this.getAttribute('data-name');
                    document.getElementById('layoutNameInputModal').value = layoutName;
                });
            });

            // Добавляем обработчики для кнопок загрузки
            document.querySelectorAll('.load-layout-btn-modal').forEach(btn => {
                btn.addEventListener('click', async function () {
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
                btn.addEventListener('click', function () {
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
                btn.addEventListener('click', async function () {
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
                btn.addEventListener('click', async function () {
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
                btn.addEventListener('click', function () {
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
                btn.addEventListener('click', async function () {
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
document.getElementById('refreshLayoutsBtn').addEventListener('click', function () {
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

// Функция добавления штрихкода
async function addBarcode() {
    // Создаем объект штрихкода как изображение с начальными параметрами
    const barcode = new fabric.Image(null, {
        left: 40,
        top: 55,
        width: 200,
        height: 80,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockUniScaling: false,
        objectCaching: false,
        noScaleCache: true,
        type: 'barcode',
        symbol: 'EAN13',
        data: '{{ean}}',
        narrowBar: 2,
        wideBar: 5,
        hriPosition: 3,
        includetext: true
    });

    canvas.add(barcode);
    canvas.setActiveObject(barcode);
    canvas.requestRenderAll();

    // Загружаем изображение штрихкода и устанавливаем его
    await setBarcodeImage(barcode, barcode.data, barcode.symbol);
}

async function setBarcodeImage(barcodeObj, data, symbol, noscale = false) {
    try {
        // Заменяем плейсхолдеры на пример данных для отображения
        let barcodeData = data;
        if (data.includes('{{') && data.includes('}}')) {
            // Если это плейсхолдер, используем пример данных в зависимости от типа штрихкода
            if (symbol === 'EAN13') {
                barcodeData = '123456789012'; // 12 цифр для EAN13 (последняя цифра - контрольная)
            } else if (symbol === 'EAN8') {
                barcodeData = '1234567'; // 7 цифр для EAN8 (последняя цифра - контрольная)
            }
        }

        // Создаем URL для API генерации штрихкода
        const includeTextValue = barcodeObj.includetext !== undefined ? barcodeObj.includetext : true;
        const height = barcodeObj.bcheight !== undefined ? barcodeObj.bcheight : false;
        const width = barcodeObj.bcwidth !== undefined ? barcodeObj.bcwidth : false;
        const apiUrl = `../get-barcode/?bcid=${symbol.toLowerCase()}&text=${barcodeData}${includeTextValue ? '&includetext=true' : ''}${height ? '&height=' + height : ''}${width ? '&width=' + width : ''}`;

        // Загружаем изображение штрихкода
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Ошибка при генерации штрихкода: ${response.status}`);
        }
        // Создаем объект Fabric.Image из URL изображения
        fabric.Image.fromURL(apiUrl, function (img) {
            if (img) {
                // Устанавливаем изображение как элемент для текущего объекта
                barcodeObj.setElement(img.getElement());

                // Устанавливаем размеры изображения штрихкода равными размерам объекта
                if (!noscale) {
                    // Рассчитываем масштаб для заполнения области объекта
                    const scaleX = barcodeObj.width / img.width;
                    const scaleY = barcodeObj.height / img.height;
                    barcodeObj.set({
                        scaleX: scaleX,
                        scaleY: scaleY
                    });
                }

                barcodeObj.set({
                    type: 'barcode',
                    symbol: barcodeObj.symbol,
                    data: barcodeObj.data,
                    narrowBar: barcodeObj.narrowBar,
                    wideBar: barcodeObj.wideBar,
                    hriPosition: barcodeObj.hriPosition
                });

                // Обновляем холст
                canvas.requestRenderAll();
            }
        }, {
            crossOrigin: 'anonymous'
        });

        // Обновляем холст
        canvas.requestRenderAll();
    } catch (error) {
        console.error('Ошибка при установке изображения штрихкода:', error);
        showNotification('Ошибка при загрузке изображения штрихкода: ' + error.message, 'error');
    }
}
function openBarcodeModal(barcodeObj) {
    // Устанавливаем текущие значения в поля формы
    document.getElementById('barcodeType').value = barcodeObj.symbol || 'EAN13';
    document.getElementById('barcodeData').value = barcodeObj.data || '';
    document.getElementById('barcodeIncludeText').checked = barcodeObj.includetext !== undefined ? barcodeObj.includetext : true;

    // Сохраняем ссылку на редактируемый объект
    window.currentBarcodeObj = barcodeObj;

    // Показываем модальное окно
    document.getElementById('barcodeModal').style.display = 'block';
}

// Добавляем обработчик двойного клика для штрихкодов
canvas.on('mouse:dblclick', function (options) {
    if (options.target && options.target.type === 'barcode') {
        // Открываем модальное окно для редактирования штрихкода
        openBarcodeModal(options.target);
    }
});

// Функция для открытия модального окна редактирования штрихкода
function openBarcodeModal(barcodeObj) {
    // Устанавливаем текущие значения в поля формы
    document.getElementById('barcodeType').value = barcodeObj.symbol || 'EAN13';
    document.getElementById('barcodeData').value = barcodeObj.data || '';
    document.getElementById('barcodeHeight').value = barcodeObj.bcheight || '';
    document.getElementById('barcodeWidth').value = barcodeObj.bcwidth || '';

    // Сохраняем ссылку на редактируемый объект
    window.currentBarcodeObj = barcodeObj;

    // Показываем модальное окно
    document.getElementById('barcodeModal').style.display = 'block';
}

// Закрываем модальное окно при клике на крестик
document.getElementById('closeBarcodeModal').addEventListener('click', () => {
    document.getElementById('barcodeModal').style.display = 'none';
});

// Закрываем модальное окно при клике вне его области
window.addEventListener('click', event => {
    const modal = document.getElementById('barcodeModal');
    if (event.target === modal) modal.style.display = 'none';
});

// Обработчик кнопки сохранения изменений штрих-кода
document.getElementById('saveBarcodeBtn').addEventListener('click', async () => {
    if (window.currentBarcodeObj) {
        // Получаем новые значения из формы
        const newSymbol = document.getElementById('barcodeType').value;
        const newData = document.getElementById('barcodeData').value;
        const bcheight = document.getElementById('barcodeHeight').value;
        const bcwidth = document.getElementById('barcodeWidth').value;
        const includeText = document.getElementById('barcodeIncludeText').checked;

        if (!newData) {
            showNotification('Принтер не подключен к серверу печати. Печать невозможна.', 'error');
            throw new Error(`Ошибка при генерации штрихкода: Текст штрихкода не может быть пустым`);
        }


        // Обновляем свойства объекта штрихкода
        window.currentBarcodeObj.set({
            symbol: newSymbol,
            data: newData,
            includetext: includeText,
            bcheight: bcheight || false,
            bcwidth: bcwidth || false,
        });

        // Обновляем изображение штрихкода
        await setBarcodeImage(window.currentBarcodeObj, newData, newSymbol, true);

        // Обновляем холст
        canvas.requestRenderAll();

        // Закрываем модальное окно
        document.getElementById('barcodeModal').style.display = 'none';
    }
});

// Обработчик кнопки отмены
document.getElementById('cancelBarcodeBtn').addEventListener('click', () => {
    document.getElementById('barcodeModal').style.display = 'none';
});

// Обработка загрузки изображения
document.getElementById('imageUpload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (f) {
        const imgElement = new Image();
        imgElement.src = f.target.result;

        imgElement.onload = function () {
            const imgInstance = new fabric.Image(imgElement, {
                left: 100,
                top: 10,
                originX: 'left',
                originY: 'top',
                selectable: true,
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
document.getElementById('layoutImport').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (f) {
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

    // Создаем временный холст для рендеринга с штрихкодами
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Устанавливаем размеры временного холста в пикселях (с учетом DPI)
    const DPI = 600; // Используем 200 DPI для высокого качества
    const widthPX = Math.round(widthMM * DPI / 25.4);  // Перевод мм в пиксели
    const heightPX = Math.round(heightMM * DPI / 25.4);

    tempCanvas.width = widthPX;
    tempCanvas.height = heightPX;

    // Масштабируем коэффициенты для перевода координат
    const scaleX = widthPX / canvas.width;
    const scaleY = heightPX / canvas.height;

    // Рисуем все объекты на временном холсте
    canvas.getObjects().forEach(obj => {

        // работаем со штрих-кодами, как с картинками
        if (obj.type === 'barcode') obj.type === 'image';

        // Для других объектов используем рендеринг Fabric.js
        // Создаем временный холст для каждого объекта
        const objCanvas = obj.toCanvasElement();
        const objWidth = objCanvas.width * scaleX;
        const objHeight = objCanvas.height * scaleY;

        // Фактический размер с учётом scaleX/scaleY
        const realWidth = obj.width * obj.scaleX * scaleX;
        const realHeight = obj.height * obj.scaleY * scaleY;

        // Базовая точка (left/top в сцене)
        let baseX = obj.left * scaleX;
        let baseY = obj.top * scaleY;

        // Смещения по originX/originY
        let offsetX = 0;
        let offsetY = 0;

        if (obj.originX === 'center') offsetX = realWidth / 2;
        else if (obj.originX === 'right') offsetX = realWidth;

        if (obj.originY === 'center') offsetY = realHeight / 2;
        else if (obj.originY === 'bottom') offsetY = realHeight;

        // Левый верхний угол для PDF‑канваса
        const x = baseX - offsetX;
        const y = baseY - offsetY;

        tempCtx.drawImage(objCanvas, x, y, objWidth, objHeight);
    });

    // Получаем данные временного холста
    const dataURL = tempCanvas.toDataURL('image/png', 1.0);

    // Создаем PDF документ с точными размерами этикетки
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: widthMM > heightMM ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMM, heightMM]
    });

    // Добавляем изображение на PDF с учетом точных размеров
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
    window.location.replace(window.location.origin + window.location.pathname);
}

// Обработчики событий
document.getElementById('addTextBtn').addEventListener('click', addText);
document.getElementById('addImageBtn').addEventListener('click', addImage);
document.getElementById('addBarcodeBtn').addEventListener('click', addBarcode);
document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
document.getElementById('resizeCanvasBtn').addEventListener('click', resizeCanvas);

// Функция для обновления интерфейса свойств объекта при его выборе
function updateObjectPropertiesUI(obj) {
    // Сначала сбрасываем все стили кнопок, чтобы они не были подсвечены, если не выбран текстовый объект
    const boldBtn = document.getElementById('boldBtn');
    const italicBtn = document.getElementById('italicBtn');
    const alignLeftBtn = document.getElementById('alignLeftBtn');
    const alignCenterBtn = document.getElementById('alignCenterBtn');
    const alignRightBtn = document.getElementById('alignRightBtn');
    
    // Сбрасываем стили всех кнопок
    boldBtn.style.backgroundColor = '';
    boldBtn.style.color = '';
    italicBtn.style.backgroundColor = '';
    italicBtn.style.color = '';
    [alignLeftBtn, alignCenterBtn, alignRightBtn].forEach(btn => {
        btn.style.backgroundColor = '';
        btn.style.color = '';
    });
    
    if (!obj) return;
    
    // Обновляем интерфейс в зависимости от типа объекта
    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        // Обновляем цвет текста
        if (obj.fill) {
            document.getElementById('textColorPicker').value = obj.fill;
        }
        
        // Обновляем размер шрифта
        if (obj.fontSize) {
            const fontSizeSelector = document.getElementById('fontSizeSelector');
            fontSizeSelector.value = obj.fontSize;
        }
        
        // Обновляем тип шрифта
        if (obj.fontFamily) {
            const fontFamilySelector = document.getElementById('fontFamilySelector');
            fontFamilySelector.value = obj.fontFamily;
        }
        
        // Обновляем состояние жирного начертания
        if (obj.fontWeight) {
            boldBtn.style.backgroundColor = obj.fontWeight === 'bold' ? '#007bff' : '';
            boldBtn.style.color = obj.fontWeight === 'bold' ? 'white' : '';
        }
        
        // Обновляем состояние курсива
        if (obj.fontStyle) {
            italicBtn.style.backgroundColor = obj.fontStyle === 'italic' ? '#007bff' : '';
            italicBtn.style.color = obj.fontStyle === 'italic' ? 'white' : '';
        }
        
        // Обновляем выравнивание текста
        if (obj.textAlign) {
            // Сбрасываем стили всех кнопок выравнивания
            [alignLeftBtn, alignCenterBtn, alignRightBtn].forEach(btn => {
                btn.style.backgroundColor = '';
                btn.style.color = '';
            });
            
            // Устанавливаем активное состояние для соответствующей кнопки
            switch (obj.textAlign) {
                case 'left':
                    alignLeftBtn.style.backgroundColor = '#007bff';
                    alignLeftBtn.style.color = 'white';
                    break;
                case 'center':
                    alignCenterBtn.style.backgroundColor = '#007bff';
                    alignCenterBtn.style.color = 'white';
                    break;
                case 'right':
                    alignRightBtn.style.backgroundColor = '#007bff';
                    alignRightBtn.style.color = 'white';
                    break;
            }
        }
    }
}

// Дополнительные возможности редактирования
canvas.on('selection:created', function (e) {
    console.log('Объект выбран', e.selected[0]);
    // Обновляем интерфейс свойств выбранного объекта
    if (e.selected && e.selected[0]) {
        updateObjectPropertiesUI(e.selected[0]);
    }
});

canvas.on('selection:updated', function (e) {
    console.log('Объект переназначен', e.selected[0]);
    // Обновляем интерфейс свойств нового выбранного объекта
    if (e.selected && e.selected[0]) {
        updateObjectPropertiesUI(e.selected[0]);
    }
});

canvas.on('selection:cleared', function (e) {
    console.log('Выбор объекта снят');
    // Сбрасываем интерфейс свойств, передавая null
    updateObjectPropertiesUI(null);
});

// Обработчик двойного клика на объекте
canvas.on('mouse:dblclick', function (options) {
    if (options.target) {
        // Устанавливаем scaleX и scaleY в 1, angle в 0 для дважды кликнутого объекта
        options.target.set({
            scaleX: 1,
            scaleY: 1,
            angle: 0
        });
        
        // Перерисовываем холст
        canvas.requestRenderAll();
    }
});

canvas.on('object:modified', function (e) {
    console.log('Объект изменен', e.target);
    // Обновляем интерфейс свойств измененного объекта
    updateObjectPropertiesUI(e.target);
});

// Обработка изменения цвета текста
document.getElementById('textColorPicker').addEventListener('change', function (e) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('fill', e.target.value);
        canvas.requestRenderAll();
    }
});

// Установка значений размеров из sessionStorage при загрузке
window.addEventListener('load', function () {
    if (sessionStorage.getItem('labelWidthMM') && sessionStorage.getItem('labelHeightMM')) {
        document.getElementById('widthInput').value = parseFloat(sessionStorage.getItem('labelWidthMM'));
        document.getElementById('heightInput').value = parseFloat(sessionStorage.getItem('labelHeightMM'));
    }
});

// Обработка изменения размера шрифта
document.getElementById('fontSizeSelector').addEventListener('change', function (e) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
        activeObject.set('fontSize', parseInt(e.target.value));
        canvas.requestRenderAll();
    }
});

// Управление клавиатурой
document.addEventListener('keydown', function (e) {
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

// Функция преобразования в картинку
document.getElementById('label2img').addEventListener('click', function () {
    // Экспортируем холст в изображение с высоким качеством
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
    });

    fabric.Image.fromURL(dataURL, (imgInstance) => {
        imgInstance.set({
            left: 0,
            top: 0,
            originX: 'left',
            originY: 'top',
            selectable: true,
            objectCaching: false,
            noScaleCache: true,
            //stroke: 'transparent'
        });

        canvas.clear();
        canvas.add(imgInstance);
        canvas.setActiveObject(imgInstance);
        canvas.requestRenderAll();

    }, { crossOrigin: 'anonymous' }); 

});


// Функция стандартной печати
document.getElementById('printBtn').addEventListener('click', function () {
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
    printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
    };
});

// Функция печати Bixolon
document.getElementById('bixolonPrintBtn').addEventListener('click', async function () {
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
            return;
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
window.addEventListener('load', function () {
    var printModeSelect = document.getElementById('printModeSelect');
    if (printModeSelect.options.length === 1) {
        printModeSelect.style.display = 'none'; // Скрываем выпадающий список
    }

    // отображение статуса соединения с принтером
    updatePrinterStatusDisplay();
});

// Функция обновления отображения статуса принтера
async function updatePrinterStatusDisplay() {
    const status = await getPrinterConnectionStatus();
    const statusElement = document.getElementById('printerStatus');
    if (statusElement) {
        if (status.isConnected) {
            statusElement.textContent = '✓';
            statusElement.className = 'printer-status connected';
        } else {
            statusElement.textContent = '✕';
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
            isConnected: response.ok && result.connected
        };
    } catch (error) {
        console.error('Ошибка при проверке статуса принтера:', error);
        return {
            isConnected: false,
            details: null
        };
    }
}


// функция для обновления интерфейса в зависимости от выбранного режима печати
function updatePrintModeUI() {
    const printModeSelect = document.getElementById('printModeSelect');
    if (!printModeSelect) return;

    const selectedMode = printModeSelect.value;
    console.log('Выбран режим печати:', selectedMode);
}

// Функции форматирования текста
document.getElementById('boldBtn').addEventListener('click', function () {
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text')) {
        const isBold = activeObject.get('fontWeight') === 'bold';
        activeObject.set('fontWeight', isBold ? 'normal' : 'bold');
        
        // Обновляем визуальное состояние кнопки
        this.style.backgroundColor = isBold ? '' : '#007bff';
        this.style.color = isBold ? '' : 'white';
        
        canvas.requestRenderAll();
        
        // Обновляем интерфейс свойств объекта
        updateObjectPropertiesUI(activeObject);
    }
});

document.getElementById('italicBtn').addEventListener('click', function () {
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text')) {
        const isItalic = activeObject.get('fontStyle') === 'italic';
        activeObject.set('fontStyle', isItalic ? 'normal' : 'italic');
        
        // Обновляем визуальное состояние кнопки
        this.style.backgroundColor = isItalic ? '' : '#007bff';
        this.style.color = isItalic ? '' : 'white';
        
        canvas.requestRenderAll();
        
        // Обновляем интерфейс свойств объекта
        updateObjectPropertiesUI(activeObject);
    }
});

document.getElementById('alignLeftBtn').addEventListener('click', function () {
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text')) {
        activeObject.set('textAlign', 'left');
        
        // Обновляем визуальное состояние кнопок выравнивания
        document.getElementById('alignLeftBtn').style.backgroundColor = '#007bff';
        document.getElementById('alignLeftBtn').style.color = 'white';
        document.getElementById('alignCenterBtn').style.backgroundColor = '';
        document.getElementById('alignCenterBtn').style.color = '';
        document.getElementById('alignRightBtn').style.backgroundColor = '';
        document.getElementById('alignRightBtn').style.color = '';
        
        canvas.requestRenderAll();
        
        // Обновляем интерфейс свойств объекта
        updateObjectPropertiesUI(activeObject);
    }
});

document.getElementById('alignCenterBtn').addEventListener('click', function () {
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text')) {
        activeObject.set('textAlign', 'center');
        
        // Обновляем визуальное состояние кнопок выравнивания
        document.getElementById('alignLeftBtn').style.backgroundColor = '';
        document.getElementById('alignLeftBtn').style.color = '';
        document.getElementById('alignCenterBtn').style.backgroundColor = '#007bff';
        document.getElementById('alignCenterBtn').style.color = 'white';
        document.getElementById('alignRightBtn').style.backgroundColor = '';
        document.getElementById('alignRightBtn').style.color = '';
        
        canvas.requestRenderAll();
        
        // Обновляем интерфейс свойств объекта
        updateObjectPropertiesUI(activeObject);
    }
});

document.getElementById('alignRightBtn').addEventListener('click', function () {
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text')) {
        activeObject.set('textAlign', 'right');
        
        // Обновляем визуальное состояние кнопок выравнивания
        document.getElementById('alignLeftBtn').style.backgroundColor = '';
        document.getElementById('alignLeftBtn').style.color = '';
        document.getElementById('alignCenterBtn').style.backgroundColor = '';
        document.getElementById('alignCenterBtn').style.color = '';
        document.getElementById('alignRightBtn').style.backgroundColor = '#007bff';
        document.getElementById('alignRightBtn').style.color = 'white';
        
        canvas.requestRenderAll();
        
        // Обновляем интерфейс свойств объекта
        updateObjectPropertiesUI(activeObject);
    }
});

// Обработка изменения шрифта
document.getElementById('fontFamilySelector').addEventListener('change', function (e) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text' || activeObject.type === 'text')) {
        activeObject.set('fontFamily', e.target.value);
        canvas.requestRenderAll();
        
        // Обновляем интерфейс свойств объекта
        updateObjectPropertiesUI(activeObject);
    }
});


// Функция для получения данных макета
function getLayoutData() {
    // Получаем размеры холста в миллиметрах
    const widthMM = parseFloat(sessionStorage.getItem('labelWidthMM')) || 58;
    const heightMM = parseFloat(sessionStorage.getItem('labelHeightMM')) || 40;

    // Получаем все объекты на холсте
    const objects = canvas.getObjects().map(obj => {
        // Для штрихкодов сохраняем дополнительные свойства
        if (obj.type === 'barcode') {
            return {
                type: 'barcode',
                symbol: obj.symbol || 'EAN13',
                data: obj.data || '{{ean}}',
                left: obj.left,
                top: obj.top,
                width: obj.width,
                height: obj.height,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                bcheight: obj.bcheight || null,
                bcwidth: obj.bcwidth || null,
                narrowBar: obj.narrowBar || 2,
                wideBar: obj.wideBar || 5,
                hriPosition: obj.hriPosition || 3,
                includetext: obj.includetext ?? true
            };
        }
        return obj.toJSON();
    });

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
        // Если это штрихкод, создаем специальный объект
        if (objData.type === 'barcode') {
            const barcode = new fabric.Image(null, {
                left: objData.left,
                top: objData.top,
                width: objData.width,
                height: objData.height,
                scaleX: objData.scaleX || 1,
                scaleY: objData.scaleY || 1,
                objectCaching: false,
                noScaleCache: true,
                type: 'barcode',
                symbol: objData.symbol || 'EAN13',
                data: objData.data || '{{ean}}',
                narrowBar: objData.narrowBar || 2,
                wideBar: objData.wideBar || 5,
                hriPosition: objData.hriPosition || 3,
                includetext: objData.includetext || true,
                bcheight: objData.bcheight || null,
                bcwidth: objData.bcwidth || null,
            });

            canvas.add(barcode);

            // Загружаем изображение штрихкода из API
            setBarcodeImage(barcode, objData.data || '{{ean}}', objData.symbol || 'EAN13', true);
        } else {
            // Для остальных объектов используем стандартный метод
            fabric.util.enlivenObjects([objData], (enlivenedObjects) => {
                enlivenedObjects.forEach(obj => {
                    canvas.add(obj);
                });
                canvas.renderAll();
            });
        }
    });
}

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
window.addEventListener('load', function () {

    // Получаем GET параметры
    const queryParams = getQueryParams();

    // Если есть параметр template, загружаем указанный макет
    if (queryParams.template) {
        const templateName = queryParams.template;

        // Загружаем макет по имени
        fetch(`/api/layouts/${templateName}.json`).then(response => {
                if (!response.ok) throw new Error('Макет не найден');
                return response.json();
            }).then(layoutData => {
                // Удаляем параметр template из объекта, так как он используется для загрузки макета
                const variables = { ...queryParams };
                delete variables.template;

                // Заменяем переменные в JSON-макете ДО загрузки на холст
                if (variables && Object.keys(variables).length > 0) layoutData = replaceVariablesInLayout(layoutData, variables);

                // Загружаем макет в холст
                loadLayoutData(layoutData);
            })
            .catch(error => {
                console.error('Ошибка при загрузке макета:', error);
                showNotification('Ошибка при загрузке макета: ' + error.message, 'error');
            });
    }
});

// Функция для замены переменных в JSON-макете
function replaceVariablesInLayout(layoutData, variables) {
    if (Array.isArray(layoutData.objects)) layoutData.objects.forEach(obj => processObject(obj));
    function processObject(obj) {
        if (!obj || typeof obj !== 'object') return;
        if ((obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') && obj.text)
            for (const [key, value] of Object.entries(variables)) obj.text = obj.text.replace(`{{${key}}}`, value);
        if (obj.type === 'barcode' && obj.data)
            for (const [key, value] of Object.entries(variables)) obj.data = obj.data.replace(`{{${key}}}`, value);
    }
    
    return layoutData;
}
