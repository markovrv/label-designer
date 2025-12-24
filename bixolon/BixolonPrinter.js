/**
 * BixolonPrinter - Класс для управления принтером этикеток Bixolon XD3-40d (203 DPI)
 * 
 * Конвертирует Fabric.js JSON формат (med.json) в команды Web Print SDK для печати этикеток.
 * 
 * @class BixolonPrinter
 * @version 1.0.0
 * @author Your Name
 * 
 * Зависимости:
 * - axios (для HTTP запросов к Web Print SDK)
 * - node.js 14+
 * 
 * Установка:
 * npm install axios
 * 
 * @example
 * const BixolonPrinter = require('./BixolonPrinter');
 * const printer = new BixolonPrinter('192.168.1.100', 18080);
 * printer.printLabel(medJsonData).then(result => console.log(result));
 */
const axios = require('axios');
const { calculateTextLayout } = require('./textLayoutCalculator.js');

/**
 * Конвертирует команду из формата {name, params} в формат {name: [paramArray]}
 * для совместимости с Web Print SDK.
 *
 * @function csc
 * @param {Object} command - Команда в формате {name: string, params: Object}
 * @param {string} command.name - Название команды для Web Print SDK
 * @param {Object} [command.params] - Именованные параметры команды (опционально)
 * @returns {Object} Команда в формате {name: [paramArray]} где paramArray - массив значений параметров
 *
 * @throws {Error} Если команда не является объектом или не содержит имени
 *
 * @example
 * // Вход: {name: 'setWidth', params: {width: 464}}
 * // Выход: {setWidth: [464]}
 * const cmd = csc({name: 'setWidth', params: {width: 464}});
 *
 * @example
 * // Вход: {name: 'clearBuffer'}
 * // Выход: {clearBuffer: []}
 * const cmd = csc({name: 'clearBuffer'});
 */
function csc(command) {
  if (!command || typeof command !== 'object') {
    throw new Error('Некорректный формат команды');
  }

  const { name, params } = command;

  if (!name || typeof name !== 'string') {
    throw new Error('Отсутствует или некорректное имя команды');
  }

  // Преобразуем именованные параметры в массив неименованных
  const paramArray = params ? Object.values(params) : [];

  // Создаем объект в новом формате
  const result = {};
  result[name] = paramArray;

  return result;
}

/**
 * Находит ближайший размер шрифта из доступных значений для принтера
 *
 * @function getClosestFontSize
 * @param {number} fontSize - Желаемый размер шрифта в пикселях
 * @returns {string} Ключ ближайшего размера шрифта из таблицы (от '0' до '9')
 *
 * Таблица соответствия:
 * '0': 6px, '1': 8px, '2': 10px, '3': 12px, '4': 15px,
 * '5': 20px, '6': 30px, '7': 14px, '8': 18px, '9': 24px
 *
 * @throws {Error} Если входной параметр не является числом
 *
 * @example
 * // Вход: 13 → Выход: '3' (ближайший размер 12px)
 * const fontSizeKey = getClosestFontSize(13);
 *
 * @example
 * // Вход: 22 → Выход: '9' (ближайший размер 24px)
 * const fontSizeKey = getClosestFontSize(22);
 */
function getClosestFontSize(fontSize) {
  // Таблица соответствия значений и размеров шрифта
  const fontTable = {
    '0': 6,
    '1': 8,
    '2': 10,
    '3': 12,
    '4': 15,
    '5': 20,
    '6': 30,
    '7': 14,
    '8': 18,
    '9': 24
  };

  // Проверяем, является ли входное значение числом
  if (typeof fontSize !== 'number' || isNaN(fontSize)) {
    throw new Error('Входной параметр должен быть числом');
  }

  let closestKey = '0';
  let smallestDiff = Math.abs(fontSize - fontTable['0']);

  // Ищем ближайшее значение в таблице
  for (const [key, value] of Object.entries(fontTable)) {
    const diff = Math.abs(fontSize - value);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestKey = key;
    }
  }

  return closestKey;
}

function fnum(functions) {
  return "func" + Object.keys(functions).length
}

class BixolonPrinter {
  /**
   * Инициализация принтера Bixolon XD3-40d
   * 
   * @constructor
   * @param {string} [host='localhost'] - IP адрес или хостнейм компьютера с Web Print SDK
   * @param {number} [port=18080] - TCP порт Web Print SDK сервера (по умолчанию 18080)
   * @param {string} [printerName='LabelPrinter'] - Имя принтера в Web Print SDK
   * @param {Object} [options={}] - Дополнительные опции
   * @param {number} [options.timeout=30000] - Timeout для HTTP запросов (мс)
   * @param {boolean} [options.debug=false] - Выводить отладочную информацию
   * 
   * @throws {Error} Если переданы неверные параметры
   * 
   * @example
   * const printer = new BixolonPrinter('localhost', 18080, 'LabelPrinter', { debug: true });
   */
  constructor(host = 'localhost', port = 18080, printerName = 'Printer1', options = {}) {
    // ===== Параметры подключения =====
    this.host = host;
    this.port = port;
    this.printerName = printerName;
    this.serverURL = `http://${host}:${port}/WebPrintSDK`;
    this.timeout = options.timeout || 30000;
    this.debug = options.debug || false;

    // ===== Параметры принтера XD3-40d =====
    /** @type {number} Разрешение принтера в DPI (dots per inch) */
    this.DPI = 203;

    /** @type {number} Конверсионный коэффициент: мм → дюймы */
    this.mmPerInch = 25.4;

    /** @type {number} Коэффициент конвертации: Fabric pixels (72 DPI) → принтерные точки (203 DPI) */
    this.pixelsPerDot = this.DPI / (72 * 2);
    this.pixelsPerDotX = this.DPI / (72 * 3);
    this.pixelsPerDotY = this.DPI / (72 * 2.8);

    // ===== Состояние =====
    /** @type {number} Счётчик ID заданий для защиты от дублирования */
    this.issueID = Math.floor(Date.now() / 1000) % 1000000;

    /** @type {Array} Буфер команд печати (не используется в Node.js версии, но оставлен для совместимости) */
    this.commandBuffer = [];

    // ===== Конфигурация по умолчанию =====
    /** @type {Object} Параметры печати по умолчанию */
    this.defaultPrintSettings = {
      speed: 4,           // скорость печати (1-5, где 5 - максимальная)
      density: 12,        // плотность печати (1-30, стандарт 12)
      orientation: 'T',   // ориентация (T=сверху вниз, B=снизу вверх)
      marginH: 10,        // горизонтальное поле (точки)
      marginV: 10,        // вертикальное поле (точки)
      gapPercent: 0.1,    // зазор между этикетками от высоты (10%)
      mediaType: 'G'      // тип носителя (G=gap, B=black mark, C=continuous)
    };

    this._log('✅ BixolonPrinter инициализирован', { host, port, printerName });
  }

  /**
   * Логирование (только если debug=true)
   * @private
   * @param {string} message - Сообщение для логирования
   * @param {*} [data] - Дополнительные данные
   */
  _log(message, data = null) {
    if (this.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`, data || '');
    }
  }

  /**
   * Конвертация Fabric.js пикселей в принтерные точки (203 DPI)
   * 
   * Fabric.js использует логические пиксели с разрешением 72 DPI (CSS стандарт).
   * XD3-40d работает с физическими точками при 203 DPI.
   * Формула: dots = pixels * (203 / 72) ≈ pixels * 2.82
   * 
   * @public
   * @param {number} pixels - Размер в Fabric.js пиксельях
   * @returns {number} Размер в принтерных точках (203 DPI), округлённый до целого числа
   * 
   * @example
   * const dots = printer.pixelsToDots(100);  // 100 pixels → ~282 dots
   */
  pixelsToDots = pixels => (Math.round(pixels * this.pixelsPerDot));
  pixelsToDotsX = pixels => (Math.round(pixels * this.pixelsPerDotX));
  pixelsToDotsY = pixels => (Math.round(pixels * this.pixelsPerDotY));

  /**
   * Конвертация миллиметров в принтерные точки (203 DPI)
   * 
   * Формула: dots = (mm / 25.4) * 203
   * 
   * @public
   * @param {number} mm - Размер в миллиметрах
   * @returns {number} Размер в принтерных точках (203 DPI), округлённый до целого числа
   * 
   * @example
   * const dots = printer.mmToDots(58);  // 58 мм → 464 dots
   */
  mmToDots = mm => (Math.round((mm / this.mmPerInch) * this.DPI));

  /**
   * Конвертация принтерных точек в миллиметры (обратная операция)
   * 
   * @public
   * @param {number} dots - Размер в принтерных точках
   * @returns {number} Размер в миллиметрах
   * 
   * @example
   * const mm = printer.dotsToMm(464);  // 464 dots → 58 мм
   */
  dotsToMm = dots => ((dots * this.mmPerInch) / this.DPI);

  /**
   * Генерация JSON команды для вывода текста (TrueType Font)
   *
   * Использует TrueType шрифты для более качественного отображения текста на этикетке.
   *
   * @private
   * @param {Object} obj - Объект Fabric.js типа textbox или text
   * @param {string} obj.text - Текст для вывода
   * @param {number} obj.left - X координата (в пикселях Fabric)
   * @param {number} obj.top - Y координата (в пикселях Fabric)
   * @param {number} obj.fontSize - Размер шрифта
   * @param {string} obj.fontFamily - Название шрифта
   * @param {number} [obj.scaleX=1] - Масштаб по оси X
   * @param {number} [obj.scaleY=1] - Масштаб по оси Y
   * @param {string} [obj.fontWeight='normal'] - Жирность шрифта ('normal', 'bold')
   * @returns {Object} JSON команда для Web Print SDK drawTrueTypeFont()
   *
   * Поля результата:
   * - name: 'drawTrueTypeFont'
   * - params: {text, x, y, fontType, fontsize, rotation, italic, bold, underline, what}
   *
   */
  _createDrawTrueTypeFont = obj => ({
    name: 'drawTrueTypeFont',
    params: {
      text: obj.text,
      x: this.pixelsToDotsX(obj.left),
      y: this.pixelsToDotsY(obj.top),
      fontType: obj.fontFamily,
      fontsize: Math.floor(obj.fontSize * obj.scaleX * 0.85),
      rotation: 0,
      italic: obj.fontStyle === 'italic' ? true : false,
      bold: obj.fontWeight === 'bold' ? true : false,
      underline: false,
      what: false
    }
  });

  /**
   * Генерация JSON команды для вывода текста (Device Font)
   *
   * Использует встроенные шрифты принтера (Device Font) для быстрой печати текста.
   * Device Font - встроенные шрифты принтера, работают быстрее TrueType Font.
   *
   * @private
   * @param {Object} obj - Объект Fabric.js типа textbox или text
   * @param {string} obj.text - Текст для вывода
   * @param {number} obj.left - X координата (в пикселях Fabric)
   * @param {number} obj.top - Y координата (в пикселях Fabric)
   * @param {string} [obj.fontWeight='normal'] - Жирность шрифта ('normal', 'bold')
   * @returns {Object} JSON команда для Web Print SDK drawDeviceFont()
   *
   * Поля результата:
   * - name: 'drawDeviceFont'
   * - params: {text, x, y, fontType, widthEnlarge, heightEnlarge, rotation, invert, bold, alignment}
   */
  _createDrawDeviceFont = obj => ({
    name: 'drawDeviceFont',
    params: {
      text: obj.text,
      x: this.pixelsToDotsX(obj.left),
      y: this.pixelsToDotsY(obj.top),
      fontType: getClosestFontSize(Math.floor(obj.fontSize * obj.scaleX)),
      widthEnlarge: 1,
      heightEnlarge: 1,
      rotation: 0,
      invert: false,
      bold: obj.fontWeight === 'bold' ? true : false,
      alignment: 0
    }
  });

  /**
   * Генерация JSON команды для вывода изображения (Bitmap)
   * 
   * @private
   * @param {Object} obj - Объект Fabric.js типа image
   * @param {string} [base64Data] - Base64 кодированное изображение (data:image/...)
   * @returns {Object} JSON команда для bxllabel.js drawBitmap()
   * 
   * Поля:
   * - name: 'drawBitmap'
   * - params: {data, x, y, width, dither}
   * 
   * @note Для получения base64 из Fabric canvas используйте canvas.toDataURL('image/png')
   * 
   * @example
   * const cmd = this._createDrawBitmapCommand(obj, 'data:image/png;base64,...');
   */
  _createDrawBitmapCommand(obj) {
    const x = this.pixelsToDotsX(obj.left);
    const y = this.pixelsToDotsY(obj.top);
    const width = this.pixelsToDotsX(obj.width * (obj.scaleX || 1));

    return {
      name: 'drawBitmap',
      params: {
        data: obj.src,
        x,
        y,
        width,
        dither: 1  // 0=off, 1=on для лучшего качества (медленнее)
      }
    };
  }

  /**
   * Генерация JSON команды для вывода 1D штрихкода
   * 
   * @private
   * @param {string} barcode - объект штрихкода
   * @returns {Object} JSON команда для bxllabel.js draw1DBarcode()
   * 
   * Поддерживаемые типы: CODE128, CODE39, CODE93, CODABAR, EAN13, EAN8, UPC_A, UPC_E, ITF
   * 
   * @example
   * const cmd = this._createBarcodeCommand(barcode);
   */
  _createBarcodeCommand(barcode) {
    const symbolMap = {
      'Code39': 0,
      'Code128': 1,
      'I2OF5': 2,
      'Codabar': 3,
      'Code93': 4,
      'UPC-A': 5,
      'UPC-E': 6,
      'EAN13': 7,
      'EAN8': 8,
      'EAN128': 9
    };

    const symbol = symbolMap[barcode.symbol] || 7; // по умолчанию EAN13
    const data = (barcode.data && barcode.data !== "{{ean}}") ? barcode.data : "000000000000"; // по умолчанию EAN13
    const x = this.pixelsToDotsX(barcode.left);
    const y = this.pixelsToDotsX(barcode.top);
    const width = Math.floor(this.pixelsToDotsX(barcode.width * barcode.scaleX) / 100) + 1;
    const height = Math.floor(this.pixelsToDotsY(barcode.height * barcode.scaleY));
    const hriPosition = (barcode.includetext) ? 1 : 0;


    return {
      name: 'draw1DBarcode',
      params: {
        data,
        x,
        y,
        symbol,
        width,
        wide: this.pixelsToDotsX(barcode.width * barcode.scaleX),
        height,
        rotation: 0,
        hriPosition
      }
    };
  }

  /**
   * Генерация JSON команды для вывода QR кода
   * 
   * @private
   * @param {string} data - Данные для QR кода (URL, контакты и т.д.)
   * @param {number} x - X координата (в Fabric pixels)
   * @param {number} y - Y координата (в Fabric pixels)
   * @param {Object} [options={}] - Опции QR кода
   * @param {number} [options.size=5] - Размер модуля QR (точки, 1-7)
   * @param {string} [options.eccLevel='M'] - Уровень коррекции ошибок (L, M, Q, H)
   * @returns {Object} JSON команда для bxllabel.js drawQRCode()
   * 
   * Уровни коррекции ошибок:
   * - L (7%) - для простых данных
   * - M (15%) - стандартный выбор
   * - Q (25%) - для данных средней сложности
   * - H (30%) - для критичных данных
   * 
   * @example
   * const cmd = this._createQRCodeCommand('https://example.com', 50, 200, {size: 5, eccLevel: 'M'});
   */
  _createQRCodeCommand(data, x, y, options = {}) {
    const eccLevelMap = { 'L': 7, 'M': 15, 'Q': 25, 'H': 30 };

    return {
      name: 'drawQRCode',
      params: {
        data: data,
        x: this.pixelsToDotsX(x),
        y: this.pixelsToDotsY(y),
        model: 1,  // Model 2 (стандартный QR)
        alignment: 0,  // left-align
        moduleSize: options.size || 5,
        eccLevel: eccLevelMap[options.eccLevel] || 15  // M по умолчанию
      }
    };
  }

  /**
   * Генерация JSON команды для вывода прямоугольника/рамки
   * 
   * @private
   * @param {Object} obj - Объект Fabric.js типа rect
   * @returns {Object} JSON команда для bxllabel.js drawBlock()
   * 
   * @example
   * const cmd = this._createDrawRectCommand({
   *   left: 100,
   *   top: 100,
   *   width: 200,
   *   height: 50,
   *   stroke: '#000000',
   *   scaleX: 1,
   *   scaleY: 1
   * });
   */
  _createDrawRectCommand(obj) {
    const x = this.pixelsToDotsX(obj.left);
    const y = this.pixelsToDotsY(obj.top);
    const w = this.pixelsToDotsX(obj.width * (obj.scaleX || 1));
    const h = this.pixelsToDotsY(obj.height * (obj.scaleY || 1));

    return {
      name: 'drawBlock',
      params: {
        x: x,
        y: y,
        width: w,
        height: h,
        lineWidth: 1,
        color: obj.stroke || '#000000'
      }
    };
  }

  /**
   * Построение полной последовательности команд печати для Web Print SDK
   * 
   * @private
   * @param {Object} jsonData - Parsed med.json или Fabric.js JSON с объектами
   * @param {Object} [printSettings] - Переопределяемые параметры печати
   * @returns {Object} JSON объект с id, version и функциями для Web Print SDK
   * 
   * Структура JSON:
   * {
   *   "id": 123456,
   *   "functions": [
   *     {"name": "setWidth", "params": {"width": 464}},
   *     {"name": "setLength", "params": {...}},
   *     {"name": "clearBuffer", "params": {}},
   *     {"name": "drawDeviceFont", "params": {...}},
   *     {"name": "printBuffer", "params": {}}
   *   ]
   * }
   * 
   * @example
   * const commands = this._buildPrintCommands(medJsonData, {speed: 5, density: 15});
   */
  _buildPrintCommands(jsonData, printSettings = {}) {
    const settings = { ...this.defaultPrintSettings, ...printSettings };

    // Размеры в точках
    const labelWidthDots = this.mmToDots(jsonData.widthMM);
    const labelHeightDots = this.mmToDots(jsonData.heightMM);
    const gapDots = Math.round(labelHeightDots * settings.gapPercent);

    this._log('📐 Размеры этикетки', {
      mm: `${jsonData.widthMM}×${jsonData.heightMM}`,
      dots: `${labelWidthDots}×${labelHeightDots}`,
      gap: `${gapDots} dots`
    });

    // Буфер команд
    const functions = {};

    // 1. Инициализация и настройка
    functions[fnum(functions)] = csc({
      name: 'clearBuffer',
      params: {}
    });

    functions[fnum(functions)] = csc({
      name: 'setWidth',
      params: { width: labelWidthDots }
    });

    // 2. Отрисовка объектов
    if (jsonData.objects && Array.isArray(jsonData.objects)) {
      jsonData.objects.forEach((obj, idx) => {
        try {
          let cmd = null;

          switch (obj.type) {
            case 'textbox':
              cmd = this._createDrawTrueTypeFont(obj);
              this._log(`📝 Text [${idx}]`, { text: obj.text.substring(0, 50), x: obj.left, y: obj.top });
              break;

            // case 'rect':
            //   cmd = this._createDrawRectCommand(obj);
            //   this._log(`📦 Rect [${idx}]`, { x: obj.left, y: obj.top, w: obj.width, h: obj.height });
            //   break;

            case 'barcode':
              this._log(`🏁 Barcode [${idx}]`, { data: obj.data });
              cmd = this._createBarcodeCommand(obj);
              break;

            case 'image':
              this._log(`🌄  Image [${idx}] - требуется base64 данные`, { x: obj.left, y: obj.top });
              cmd = this._createDrawBitmapCommand(obj);
              break;

            default:
              this._log(`⚠️  Объект типа '${obj.type}' не поддерживается`, { idx });
          }

          if (cmd) {
            functions[fnum(functions)] = csc(cmd);
          }
        } catch (e) {
          this._log(`❌ Ошибка при обработке объекта [${idx}]`, e.message);
        }
      });
    }

    // 3. Печать
    functions[fnum(functions)] = csc({
      name: 'printBuffer',
      params: {}
    });

    return {
      id: this.issueID,
      functions: functions
    };
  }

  /**
   * Отправка команд печати в Web Print SDK через HTTP POST
   * 
   * @private
   * @param {Object} commands - Объект с функциями для печати (результат _buildPrintCommands)
   * @returns {Promise<Object>} Результат печати {success: boolean, requestId: string, ...}
   * 
   * @throws {Error} Если сервер не отвечает или возвращает ошибку
   * 
   * @example
   * const result = await this._sendPrintRequest(commands);
   * console.log(result); // {success: true, requestId: '123', ...}
   */
  async _sendPrintRequest(commands) {
    try {
      // Добавляем имя принтера к командам
      const requestData = {
        ...commands,
        printer: this.printerName
      };

      this._log('📤 Отправка команд в Web Print SDK', { url: this.serverURL, id: commands.id, printer: this.printerName });
      this._log('📋 Команды для отправки', JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        `${this.serverURL}/${this.printerName}`,
        requestData,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this._log('✅ Ответ от SDK', response.data);

      return {
        success: true,
        requestId: commands.id,
        response: response.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      const errorStatus = error.response?.status || 'unknown';
      const errorHeaders = error.response?.headers || {};

      this._log('❌ Ошибка отправки', {
        status: errorStatus,
        data: errorMsg,
        headers: errorHeaders,
        config: error.config ? {
          method: error.config.method,
          url: error.config.url,
          data: error.config.data
        } : undefined
      });

      throw new Error(`Ошибка печати на ${this.host}:${this.port} - Request failed with status code ${errorStatus}, details: ${JSON.stringify(errorMsg)}`);
    }
  }

  /**
   * Главный метод: печать Fabric.js этикетки
   * 
   * Последовательность:
   * 1. Валидация входных данных
   * 2. Конвертация Fabric размеров в принтерные точки
   * 3. Построение JSON команд для Web Print SDK
   * 4. Отправка команд на печать
   * 5. Возврат результата
   * 
   * @public
   * @async
   * @param {Object} fabricJsonData - Объект Fabric.js с полями:
   *   - {number} widthMM - ширина этикетки в мм
   *   - {number} heightMM - высота этикетки в мм
   *   - {Array} objects - массив Fabric объектов (textbox, rect, image и т.д.)
   *   - {string} [createdAt] - ISO дата создания (опционально)
   * @param {Object} [printSettings] - Переопределить параметры печати:
   *   - {number} [speed=4] - скорость печати (1-5)
   *   - {number} [density=12] - плотность (1-30)
   *   - {number} [gapPercent=0.1] - зазор между этикетками (10% от высоты)
   *   - {string} [orientation='T'] - T (top-to-bottom) или B (bottom-to-top)
   * @returns {Promise<Object>} Результат печати:
   *   - {boolean} success - успешно ли отправлено на печать
   *   - {string} requestId - ID задания
   *   - {*} response - ответ от SDK
   *   - {string} timestamp - время выполнения
   * 
   * @throws {Error} Если отсутствуют widthMM/heightMM или ошибка сети
   * 
   * @example
   * const medJson = {
   *   widthMM: 58,
   *   heightMM: 40,
   *   objects: [
   *     {type: 'textbox', left: 25, top: 23, text: 'Мёд {{sort}}', ...}
   *   ]
   * };
   * 
   * const result = await printer.printLabel(medJson);
   * console.log('✅ Напечатано:', result);
   */
  async printLabel(fabricJsonData, printSettings = {}) {
    try {
      // Валидация
      if (!fabricJsonData.widthMM || !fabricJsonData.heightMM) {
        throw new Error('Ошибка: JSON должен содержать поля widthMM и heightMM');
      }

      this._log('🖨️ Начало печати этикетки', {
        width: fabricJsonData.widthMM,
        height: fabricJsonData.heightMM,
        objectsCount: fabricJsonData.objects?.length || 0
      });

      // доработка текстовых полей: многострочный текст, центрирование
      for (let i = 0; i < fabricJsonData.objects.length; i++) {
        if ((fabricJsonData.objects[i].type === 'text' || fabricJsonData.objects[i].type === 'textbox') && fabricJsonData.objects[i].text) {
          const obj = fabricJsonData.objects[i];
          const fontSize = Math.floor(obj.fontSize * obj.scaleX) || 12;
          const fontFamily = obj.fontFamily || 'Arial';
          const isBold = obj.fontWeight === 'bold' ? true : false;
          const isItalic = obj.fontStyle === 'italic';
          const isCentered = obj.textAlign === 'center';
          const isRighted = obj.textAlign === 'right';
          // Определяем ширину блока для текста в точках (используя DPI 203)
          // Предполагаем, что ширина текстового блока ограничена шириной этикетки за вычетом полей
          const labelWidthDots = Math.floor(obj.width * obj.scaleX);
          const margin = 0; // отступ в точках
          const blockWidth = labelWidthDots - (2 * margin); // ширина блока в точках

          try {
            // Вызываем calculateTextLayout для разбиения текста
            const layout = await calculateTextLayout(obj.text,fontSize,blockWidth,isBold,isItalic,isCentered,fontFamily,true,isRighted);

            // создаем отдельные текстовые объекты для каждой строки
            if (layout.lines && layout.lines.length >= 1) {
              // Удаляем исходный текстовый объект
              fabricJsonData.objects.splice(i, 1);
              // Добавляем новые текстовые объекты для каждой строки
              for (let j = 0; j < layout.lines.length; j++) {
                const lineY = obj.top + (j * layout.lineHeight); // позиция по Y для текущей строки
                const newTextNode = {
                  ...obj, // копируем все свойства исходного объекта
                  text: layout.lines[j], // текст для текущей строки
                  top: lineY // обновляем позицию по Y
                };
                // Вставляем новый текстовый объект в массив
                fabricJsonData.objects.splice(i + j, 0, newTextNode);
              }

              // Корректируем индекс i, чтобы не пропустить следующий элемент
              i += layout.lines.length - 1;
            }
          } catch (error) {
            this._log(`⚠️  Ошибка при обработке текста в объекте [${i}]`, error.message);
            // Если произошла ошибка, продолжаем с исходным текстом без изменений
          }
        }
      }

      // Построение команд
      const commands = this._buildPrintCommands(fabricJsonData, printSettings);

      // Проверка соединения перед печатью
      this._log('🔌 Проверка соединения с Web Print SDK...');
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error(`Web Print SDK недоступен по адресу ${this.serverURL}`);
      }

      // Отправка на печать
      const result = await this._sendPrintRequest(commands);

      this._log('✅ Этикетка успешно отправлена на печать', result);
      return result;

    } catch (error) {
      this._log('❌ Ошибка печати', error.message);
      throw error;
    }
  }

  /**
   * Печать из файла med.json
   * 
   * @public
   * @async
   * @param {string} filePath - Путь к файлу med.json
   * @param {Object} [printSettings] - Параметры печати (см. printLabel)
   * @returns {Promise<Object>} Результат печати
   * 
   * @throws {Error} Если файл не найден или невозможно его прочитать
   * 
   * @example
   * const result = await printer.printLabelFromFile('./med.json');
   */
  async printLabelFromFile(filePath, printSettings = {}) {
    try {
      const fs = require('fs');
      this._log('📂 Чтение файла', filePath);

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fabricJsonData = JSON.parse(fileContent);

      return await this.printLabel(fabricJsonData, printSettings);

    } catch (error) {
      this._log('❌ Ошибка чтения файла', error.message);
      throw new Error(`Ошибка при чтении файла ${filePath}: ${error.message}`);
    }
  }

  /**
   * Замена плейсхолдеров в JSON перед печатью
   * 
   * Находит все вхождения {{placeholder}} и заменяет на значения из объекта.
   * 
   * @public
   * @param {Object} fabricJsonData - JSON данные
   * @param {Object} placeholders - Объект с заменами, например {sort: 'Липовый', about: '500г'}
   * @returns {Object} JSON с замещёнными плейсхолдерами
   * 
   * @example
   * const medWithData = printer.replacePlaceholders(medJson, {
   *   sort: 'Липовый',
   *   about: '500г, органический'
   * });
   */
  replacePlaceholders(fabricJsonData, placeholders) {
    const copy = JSON.parse(JSON.stringify(fabricJsonData)); // глубокая копия

    if (!copy.objects) return copy;

    copy.objects.forEach(obj => {
      if (obj.text && typeof obj.text === 'string') {
        let text = obj.text;

        for (const [key, value] of Object.entries(placeholders)) {
          text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }

        obj.text = text;
      }
    });

    this._log('🔄 Плейсхолдеры заменены', placeholders);
    return copy;
  }

  /**
   * Проверка подключения к Web Print SDK
   * 
   * @public
   * @async
   * @returns {Promise<boolean>} true если сервер доступен, иначе false
   * 
   * @example
   * const isAvailable = await printer.checkConnection();
   * console.log(isAvailable ? '✅ Доступен' : '❌ Недоступен');
   */
  async checkConnection() {
    try {
      var response = await axios.get(`${this.serverURL}/${this.printerName}/checkStatus`, { timeout: 5000 });
      this._log('✅ Соединение с Web Print SDK установлено');
      return response.data;
    } catch (error) {
      this._log('❌ Web Print SDK недоступен', `${this.host}:${this.port}`);
      return false;
    }
  }

  /**
   * Получение информации о конфигурации принтера
   * 
   * @public
   * @returns {Object} Информация о принтере
   * 
   * @example
   * console.log(printer.getInfo());
   */
  getInfo() {
    return {
      model: 'Bixolon XD3-40d',
      dpi: this.DPI,
      host: this.host,
      port: this.port,
      printerName: this.printerName,
      pixelsPerDot: this.pixelsPerDot.toFixed(2),
      defaultSettings: this.defaultPrintSettings,
      serverURL: this.serverURL
    };
  }
}

// ===== ЭКСПОРТ =====
module.exports = BixolonPrinter;
