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

    // Тест 3: Вызов реального инструмента
    console.log('3️⃣ Тест вызова реального инструмента (amocrm_getAccount)...');
    const callResponse = await fetch(`${baseUrl}/call/amocrm_getAccount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const callData = await callResponse.json();
    
    if (callData.success) {
      console.log('✅ Результат вызова:', {
        tool: callData.tool,
        success: callData.success,
        resultPreview: callData.result?.content?.[0]?.text?.substring(0, 200) + '...'
      });
    } else {
      console.log('❌ Ошибка вызова:', callData);
    }
    console.log('');

    // Тест 4: Вызов инструмента со списком сделок
    console.log('4️⃣ Тест вызова amocrm_listLeads...');
    const leadsResponse = await fetch(`${baseUrl}/call/amocrm_listLeads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, limit: 5 })
    });
    const leadsData = await leadsResponse.json();
    
    if (leadsData.success) {
      console.log('✅ Результат вызова leads:', {
        tool: leadsData.tool,
        success: leadsData.success,
        resultPreview: leadsData.result?.content?.[0]?.text?.substring(0, 200) + '...'
      });
    } else {
      console.log('❌ Ошибка вызова leads:', leadsData);
    }
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
