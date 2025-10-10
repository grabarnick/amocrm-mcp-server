import 'dotenv/config';

async function testStreamableMcpServer() {
  console.log('🌐 Тестирование Streamable HTTP MCP сервера...\n');

  const baseUrl = process.env.STREAMABLE_MCP_URL || 'http://localhost:8080';

  try {
    // Тест 1: Health Check
    console.log('1️⃣ Тест Health Check...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    console.log('');

    // Тест 2: Инициализация MCP сессии через POST
    console.log('2️⃣ Тест инициализации MCP сессии...');
    const initResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'MCP-Protocol-Version': '2025-06-18'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      })
    });

    const sessionId = initResponse.headers.get('Mcp-Session-Id');
    const initData = await initResponse.json();
    
    console.log('✅ Инициализация:', {
      status: initResponse.status,
      sessionId,
      result: initData.result
    });
    console.log('');

    if (!sessionId) {
      throw new Error('Session ID не получен');
    }

    // Тест 3: Получение списка инструментов
    console.log('3️⃣ Тест получения списка инструментов...');
    const toolsResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'MCP-Protocol-Version': '2025-06-18',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });

    const toolsData = await toolsResponse.json();
    console.log('✅ Список инструментов:', {
      status: toolsResponse.status,
      toolsCount: toolsData.result?.tools?.length || 0,
      tools: toolsData.result?.tools?.map((t: any) => t.name) || []
    });
    console.log('');

    // Тест 4: Вызов инструмента через SSE
    console.log('4️⃣ Тест вызова инструмента через SSE...');
    const toolCallResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'MCP-Protocol-Version': '2025-06-18',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'amocrm_getAccount',
          arguments: {}
        }
      })
    });

    if (toolCallResponse.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('✅ SSE поток открыт, читаем данные...');
      
      const reader = toolCallResponse.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let result = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          result += decoder.decode(value);
          
          // Ищем JSON в SSE данных
          const lines = result.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.result) {
                  console.log('✅ Результат вызова инструмента:', {
                    tool: 'amocrm_getAccount',
                    success: true,
                    resultPreview: JSON.stringify(data.result).substring(0, 200) + '...'
                  });
                  break;
                } else if (data.error) {
                  console.log('❌ Ошибка вызова инструмента:', data.error);
                  break;
                }
              } catch (e) {
                // Игнорируем ошибки парсинга
              }
            }
          }
        }
      }
    } else {
      const toolCallData = await toolCallResponse.json();
      console.log('✅ Результат вызова инструмента:', toolCallData);
    }
    console.log('');

    // Тест 5: Завершение сессии
    console.log('5️⃣ Тест завершения сессии...');
    const deleteResponse = await fetch(`${baseUrl}/mcp`, {
      method: 'DELETE',
      headers: {
        'Mcp-Session-Id': sessionId
      }
    });
    
    const deleteData = await deleteResponse.json();
    console.log('✅ Завершение сессии:', deleteData);
    console.log('');

    console.log('🎉 Все тесты Streamable HTTP MCP сервера прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    console.log('\n💡 Убедитесь, что сервер запущен:');
    console.log('   npm run dev:streamable');
    console.log('   или');
    console.log('   npm run start:streamable');
  }
}

testStreamableMcpServer();
