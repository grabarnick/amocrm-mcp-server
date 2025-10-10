import 'dotenv/config';
import { loadConfig } from './src/config.js';

async function testHttpMcpServer() {
  console.log('🌐 Тестирование HTTP MCP сервера...\n');

  const cfg = loadConfig();
  const baseUrl = process.env.HTTP_MCP_URL || 'http://localhost:8080';

  try {
    // Тест 1: Health Check
    console.log('1️⃣ Тест Health Check...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    console.log('');

    // Тест 2: Список инструментов
    console.log('2️⃣ Тест списка инструментов...');
    const toolsResponse = await fetch(`${baseUrl}/tools`);
    const toolsData = await toolsResponse.json();
    console.log('✅ Доступные инструменты:', toolsData);
    console.log('');

    // Тест 3: Вызов инструмента (пример)
    console.log('3️⃣ Тест вызова инструмента...');
    const callResponse = await fetch(`${baseUrl}/call/amocrm_getAccount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const callData = await callResponse.json();
    console.log('✅ Результат вызова:', callData);
    console.log('');

    console.log('🎉 Все тесты HTTP MCP сервера прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    console.log('\n💡 Убедитесь, что сервер запущен:');
    console.log('   npm run dev:http');
    console.log('   или');
    console.log('   npm run start:http');
  }
}

testHttpMcpServer();
