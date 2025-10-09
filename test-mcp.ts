#!/usr/bin/env node --loader ts-node/esm
/**
 * Тестовый скрипт для проверки MCP сервера
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMcpServer() {
  console.log('🧪 Тестирование MCP сервера\n');

  // Создаем транспорт для общения с сервером
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: process.env,
  });

  // Создаем клиент
  const client = new Client(
    {
      name: 'test-mcp-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    console.log('🔌 Подключаемся к MCP серверу...');
    await client.connect(transport);
    console.log('✅ Подключение установлено\n');

    // Получаем список инструментов
    console.log('📋 Получаем список доступных инструментов...');
    const tools = await client.listTools();
    
    console.log(`\n✅ Найдено инструментов: ${tools.tools.length}\n`);
    
    tools.tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      console.log(`   ${tool.description}`);
      if (tool.inputSchema) {
        const schema = tool.inputSchema as any;
        if (schema.properties) {
          console.log(`   Параметры:`);
          Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
            const required = schema.required?.includes(key) ? ' (обязательный)' : '';
            console.log(`     - ${key}: ${value.type}${required} - ${value.description || ''}`);
          });
        }
      }
      console.log();
    });

    // Проверяем наличие всех ожидаемых инструментов
    const expectedTools = [
      'amocrm.listLeads',
      'amocrm.createLead',
      'amocrm.getContact',
      'amocrm.listContacts',
      'amocrm.createContact',
      'amocrm.createNote',
      'amocrm.exchangeAuthCode',
    ];

    console.log('🔍 Проверка наличия инструментов:');
    const foundTools = tools.tools.map(t => t.name);
    let allFound = true;

    expectedTools.forEach(toolName => {
      if (foundTools.includes(toolName)) {
        console.log(`   ✅ ${toolName}`);
      } else {
        console.log(`   ❌ ${toolName} - НЕ НАЙДЕН`);
        allFound = false;
      }
    });

    console.log();

    if (allFound) {
      console.log('🎉 Все инструменты успешно зарегистрированы!');
    } else {
      console.log('⚠️  Некоторые инструменты не найдены');
    }

    // Тестируем вызов инструмента (если есть токены)
    if (process.env.AMO_ACCESS_TOKEN && process.env.AMO_REFRESH_TOKEN) {
      console.log('\n🧪 Тестируем вызов инструмента amocrm.listLeads...');
      try {
        const result = await client.callTool({
          name: 'amocrm.listLeads',
          arguments: { limit: 3 },
        });
        console.log('✅ Инструмент успешно вызван!');
        console.log('Ответ:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
      } catch (error: any) {
        console.log('❌ Ошибка при вызове:', error.message);
      }
    } else {
      console.log('\n⚠️  Для тестирования вызовов инструментов нужны токены в .env');
      console.log('   Добавьте AMO_ACCESS_TOKEN и AMO_REFRESH_TOKEN');
    }

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    // Закрываем соединение
    try {
      await client.close();
    } catch (e) {
      // Игнорируем ошибки при закрытии
    }
    console.log('\n👋 Тестирование завершено');
  }
}

testMcpServer().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});

