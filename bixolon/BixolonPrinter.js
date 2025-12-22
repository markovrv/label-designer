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
    this.pixelsPerDot = this.DPI / 72;
    
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
  pixelsToDots(pixels) {
    return Math.round(pixels * this.pixelsPerDot);
  }
  
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
  mmToDots(mm) {
    return Math.round((mm / this.mmPerInch) * this.DPI);
  }
  
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
  dotsToMm(dots) {
    return (dots * this.mmPerInch) / this.DPI;
  }
  
  /**
   * Генерация JSON команды для вывода текста (Device Font)
   * 
   * Device Font - встроенные шрифты принтера, работают быстрее Vector Font.
   * 
   * @private
   * @param {Object} obj - Объект Fabric.js типа textbox или text
   * @returns {Object} JSON команда для bxllabel.js drawDeviceFont()
   * 
   * Поля:
   * - name: 'drawDeviceFont'
   * - params: {text, x, y, fontType, widthEnlarge, heightEnlarge, rotation, invert, bold, alignment}
   * 
   * @example
   * const cmd = this._createDrawTextCommand({
   *   text: 'Мёд Липовый',
   *   left: 50,
   *   top: 100,
   *   fontSize: 20,
   *   scaleX: 2,
   *   scaleY: 2,
   *   fontWeight: 'bold',
   *   textAlign: 'center'
   * });
   */
  _createDrawTextCommand(obj) {
    const x = this.pixelsToDots(obj.left);
    const y = this.pixelsToDots(obj.top);
    const widthEnlarge = Math.max(1, Math.round(obj.scaleX || 1));
    const heightEnlarge = Math.max(1, Math.round(obj.scaleY || 1));
    const bold = obj.fontWeight === 'bold' ? 1 : 0;
    const alignment = obj.textAlign === 'center' ? 1 : (obj.textAlign === 'right' ? 2 : 0);
    
    return {
      name: 'drawDeviceFont',
      params: {
        text: obj.text,
        x: x,
        y: y,
        fontType: 0,              // 0=стандартный шрифт принтера
        widthEnlarge: widthEnlarge,
        heightEnlarge: heightEnlarge,
        rotation: 0,              // 0°
        invert: 0,                // нет инверсии
        bold: bold,
        alignment: alignment      // 0=left, 1=center, 2=right
      }
    };
  }
  
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
  _createDrawBitmapCommand(obj, base64Data) {
    const x = this.pixelsToDots(obj.left);
    const y = this.pixelsToDots(obj.top);
    const width = this.pixelsToDots(obj.width * (obj.scaleX || 1));
    
    return {
      name: 'drawBitmap',
      params: {
        data: base64Data,
        x: x,
        y: y,
        width: width,
        dither: 0  // 0=off, 1=on для лучшего качества (медленнее)
      }
    };
  }
  
  /**
   * Генерация JSON команды для вывода 1D штрихкода
   * 
   * @private
   * @param {string} data - Данные штрихкода
   * @param {number} x - X координата (в Fabric pixels)
   * @param {number} y - Y координата (в Fabric pixels)
   * @param {string} [symbol='CODE128'] - Тип штрихкода (CODE128, CODE39, EAN13, UPC_A и т.д.)
   * @param {Object} [options={}] - Опции штрихкода
   * @param {number} [options.height=80] - Высота штрихкода (в точках принтера)
   * @param {number} [options.narrowBar=2] - Ширина узкой полосы (точки)
   * @param {number} [options.wideBar=5] - Ширина широкой полосы (точки)
   * @param {number} [options.hriPosition=3] - Позиция HRI текста (0=none, 1=above, 2=below, 3=both)
   * @returns {Object} JSON команда для bxllabel.js draw1DBarcode()
   * 
   * Поддерживаемые типы: CODE128, CODE39, CODE93, CODABAR, EAN13, EAN8, UPC_A, UPC_E, ITF
   * 
   * @example
   * const cmd = this._createBarcodeCommand('123456789012', 50, 200, 'CODE128', {height: 80});
   */
  _createBarcodeCommand(data, x, y, symbol = 'CODE128', options = {}) {
    const symbolMap = {
      'UPC_A': 0,
      'UPC_E': 1,
      'EAN8': 2,
      'EAN13': 3,
      'CODE39': 4,
      'ITF': 5,
      'CODABAR': 6,
      'CODE93': 7,
      'CODE128': 8
    };
    
    const symbolCode = symbolMap[symbol] || 8; // по умолчанию CODE128
    
    return {
      name: 'draw1DBarcode',
      params: {
        data: data,
        x: this.pixelsToDots(x),
        y: this.pixelsToDots(y),
        symbol: symbolCode,
        narrowbar: options.narrowBar || 2,
        widebar: options.wideBar || 5,
        height: options.height || 80,
        rotation: 0,
        hriPosition: options.hriPosition || 3  // 0=none, 1=above, 2=below, 3=both
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
        x: this.pixelsToDots(x),
        y: this.pixelsToDots(y),
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
    const x = this.pixelsToDots(obj.left);
    const y = this.pixelsToDots(obj.top);
    const w = this.pixelsToDots(obj.width * (obj.scaleX || 1));
    const h = this.pixelsToDots(obj.height * (obj.scaleY || 1));
    
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
    
    const functions = [];
    
    // 1. Инициализация и настройка
    functions.push({
      name: 'clearBuffer',
      params: {}
    });
    
    functions.push({
      name: 'setWidth',
      params: { width: labelWidthDots }
    });
    
    functions.push({
      name: 'setLength',
      params: {
        labelLength: labelHeightDots,
        gapLength: gapDots,
        mediaType: settings.mediaType,
        offset: 0
      }
    });
    
    functions.push({
      name: 'setOrientation',
      params: { direction: settings.orientation }
    });
    
    functions.push({
      name: 'setSpeed',
      params: { speed: settings.speed }
    });
    
    functions.push({
      name: 'setDensity',
      params: { density: settings.density }
    });
    
    functions.push({
      name: 'setMargin',
      params: {
        h: settings.marginH,
        v: settings.marginV
      }
    });
    
    // 2. Отрисовка объектов
    if (jsonData.objects && Array.isArray(jsonData.objects)) {
      jsonData.objects.forEach((obj, idx) => {
        try {
          let cmd = null;
          
          switch (obj.type) {
            case 'textbox':
            case 'text':
              cmd = this._createDrawTextCommand(obj);
              this._log(`📝 Text [${idx}]`, { text: obj.text.substring(0, 50), x: obj.left, y: obj.top });
              break;
              
            case 'rect':
              cmd = this._createDrawRectCommand(obj);
              this._log(`📦 Rect [${idx}]`, { x: obj.left, y: obj.top, w: obj.width, h: obj.height });
              break;
              
            case 'image':
              this._log(`⚠️  Image [${idx}] - требуется base64 данные`, { x: obj.left, y: obj.top });
              // cmd = this._createDrawBitmapCommand(obj, base64Data);
              break;
              
            default:
              this._log(`⚠️  Объект типа '${obj.type}' не поддерживается`, { idx });
          }
          
          if (cmd) {
            functions.push(cmd);
          }
        } catch (e) {
          this._log(`❌ Ошибка при обработке объекта [${idx}]`, e.message);
        }
      });
    }
    
    // 3. Печать (с автопротяжкой)
    functions.push({
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
      this._log('📋 Команды для отправки', requestData);
      
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
      
      this._log('🖨️  Начало печати этикетки', {
        width: fabricJsonData.widthMM,
        height: fabricJsonData.heightMM,
        objectsCount: fabricJsonData.objects?.length || 0
      });
      
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
      const response = await axios.get(`${this.serverURL}/${this.printerName}/checkStatus`, { timeout: 5000 });
      this._log('✅ Соединение с Web Print SDK установлено');
      return response.data.Result;
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
