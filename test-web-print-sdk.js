const axios = require('axios');

// Тестируем подключение к Web Print SDK напрямую
async function testWebPrintSDK() {
  try {
    const host = 'localhost';
    const port = 18080;
    const serverURL = `http://${host}:${port}/WebPrintSDK`;
    
    console.log('Тестируем подключение к Web Print SDK...');
    console.log('URL:', serverURL);
    
    // Отправляем пустой POST-запрос для проверки
    try {
      const response = await axios.post(
        serverURL,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );
      console.log('✅ Сервер Web Print SDK доступен (пустой запрос)');
      console.log('Ответ:', response.data);
    } catch (getErr) {
      console.log('Пустой запрос не удался (ожидаемо), пробуем получить список принтеров...');
    }
    
    // Отправляем тестовую команду получения списка принтеров
    const printersResponse = await axios.post(
      serverURL,
      {
        id: 1,
        functions: [
          {
            name: 'getPrinterList',
            params: {}
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      }
    );
    
    console.log('✅ Команда getPrinterList выполнена успешно');
    console.log('Список принтеров:', printersResponse.data);
    
    // Пробуем получить информацию о состоянии принтера
    const statusResponse = await axios.post(
      serverURL,
      {
        id: 2,
        functions: [
          {
            name: 'getPrinterStatus',
            params: { printerName: 'Printer1' }  // Пробуем стандартное имя
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      }
    );
    
    console.log('✅ Команда getPrinterStatus выполнена успешно');
    console.log('Статус принтера:', statusResponse.data);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании Web Print SDK:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные ответа:', error.response.data);
      console.error('Заголовки:', error.response.headers);
    }
  }
}

testWebPrintSDK();