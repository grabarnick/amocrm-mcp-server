#!/usr/bin/env node --loader ts-node/esm
/**
 * Тестовый скрипт для проверки AmoCRM API
 * Запуск: npm run test-api
 */

import { createAmoClient, OAuthTokens } from './src/amocrm/client.js';
import { loadConfig } from './src/config.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Загружаем переменные окружения
dotenv.config();

const TOKENS_FILE = '.amo-tokens.json';

// Функция для сохранения токенов
async function saveTokens(tokens: OAuthTokens) {
  console.log('💾 Сохраняем обновленные токены...');
  await fs.writeFile(
    TOKENS_FILE,
    JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      updated_at: new Date().toISOString()
    }, null, 2)
  );
}

// Функция для загрузки токенов
async function loadTokens(): Promise<{ accessToken?: string; refreshToken?: string }> {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf-8');
    const tokens = JSON.parse(data);
    console.log('✅ Загружены сохраненные токены');
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    };
  } catch (error) {
    console.log('⚠️  Нет сохраненных токенов');
    return {};
  }
}

async function main() {
  console.log('🚀 Тестирование AmoCRM API клиента\n');

  // Загружаем конфигурацию
  const config = loadConfig();
  const savedTokens = await loadTokens();

  // Создаем клиент
  const client = createAmoClient({
    baseUrl: config.AMO_BASE_URL,
    clientId: config.AMO_CLIENT_ID,
    clientSecret: config.AMO_CLIENT_SECRET,
    redirectUri: config.AMO_REDIRECT_URI,
    accessToken: savedTokens.accessToken || config.AMO_ACCESS_TOKEN,
    refreshToken: savedTokens.refreshToken || config.AMO_REFRESH_TOKEN,
    onTokensUpdated: saveTokens
  });

  // Проверяем аргументы командной строки
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'auth':
      await testAuth(client, args[1]);
      break;
    case 'account':
      await testGetAccount(client);
      break;
    case 'leads':
      await testGetLeads(client, args[1]);
      break;
    case 'lead':
      await testGetLead(client, args[1]);
      break;
    case 'create-lead':
      await testCreateLead(client, args[1]);
      break;
    case 'contacts':
      await testGetContacts(client, args[1]);
      break;
    case 'contact':
      await testGetContact(client, args[1]);
      break;
    default:
      printHelp();
  }
}

function printHelp() {
  console.log(`
📖 Использование:
  npm run test-api <команда> [параметры]

Команды:
  auth <code>           - Обменять код авторизации на токены
  account               - Получить информацию об аккаунте
  leads [limit]         - Получить список сделок (по умолчанию limit=10)
  lead <id>             - Получить сделку по ID
  create-lead <name>    - Создать новую сделку
  contacts [limit]      - Получить список контактов (по умолчанию limit=10)
  contact <id>          - Получить контакт по ID

Примеры:
  npm run test-api account
  npm run test-api leads 5
  npm run test-api lead 12345
  npm run test-api create-lead "Тестовая сделка"
  npm run test-api contacts
  npm run test-api contact 67890

Для первичной авторизации:
  1. Откройте в браузере:
     ${process.env.AMO_BASE_URL}/oauth?client_id=${process.env.AMO_CLIENT_ID}&mode=post_message
  2. Скопируйте код из URL после авторизации
  3. Запустите: npm run test-api auth <код>
`);
}

// Тест обмена кода авторизации на токены
async function testAuth(client: any, code?: string) {
  if (!code) {
    console.error('❌ Необходимо указать код авторизации');
    console.log('\n📋 Инструкция по получению кода:\n');
    console.log('1. Откройте в браузере:');
    console.log(`   ${process.env.AMO_BASE_URL}/oauth?client_id=${process.env.AMO_CLIENT_ID}&mode=post_message`);
    console.log('\n2. После авторизации скопируйте ВЕСЬ URL из адресной строки');
    console.log('   Пример: https://example.com/?code=def50200abc...&client_id=...');
    console.log('\n3. Запустите команду с кодом:');
    console.log('   npm run test-api auth def50200abc...');
    console.log('\n💡 Если у вас ошибка "Redirect URI is not associated":');
    console.log('   - Укажите redirect_uri из настроек интеграции в .env');
    console.log('   - Или используйте: npm run test-api auth <код> <redirect_uri>');
    return;
  }

  try {
    console.log('🔄 Обмениваем код на токены...');
    const tokens = await client.exchangeAuthCode(code);
    console.log('✅ Токены получены и сохранены');
    console.log('   Access Token:', tokens.access_token.substring(0, 20) + '...');
    console.log('   Refresh Token:', tokens.refresh_token.substring(0, 20) + '...');
    console.log('   Expires In:', tokens.expires_in, 'секунд');
    console.log('\n💡 Скопируйте эти токены в .env файл:');
    console.log(`AMO_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`AMO_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (error: any) {
    console.error('❌ Ошибка при обмене кода:', error.response?.data || error.message);
    if (error.response?.data?.hint?.includes('Redirect URI')) {
      console.log('\n💡 Возможные решения:');
      console.log('1. Проверьте AMO_REDIRECT_URI в .env - он должен совпадать с настройками интеграции');
      console.log('2. Узнайте правильный redirect_uri в настройках вашей интеграции AmoCRM');
      console.log('3. Если используете mode=post_message, попробуйте без redirect_uri:');
      console.log('   - Временно закомментируйте AMO_REDIRECT_URI в .env');
      console.log('   - Или используйте пустую строку');
    }
  }
}

// Тест получения информации об аккаунте
async function testGetAccount(client: any) {
  try {
    console.log('📊 Получаем информацию об аккаунте...\n');
    const account = await client.get('/api/v4/account');
    console.log('✅ Успешно!');
    console.log(JSON.stringify(account, null, 2));
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Тест получения списка сделок
async function testGetLeads(client: any, limitStr?: string) {
  const limit = limitStr ? parseInt(limitStr) : 10;
  
  try {
    console.log(`📋 Получаем список сделок (limit=${limit})...\n`);
    const response = await client.get(`/api/v4/leads?limit=${limit}`);
    console.log('✅ Успешно!');
    
    if (response._embedded?.leads) {
      console.log(`\nНайдено сделок: ${response._embedded.leads.length}`);
      response._embedded.leads.forEach((lead: any) => {
        console.log(`\n  ID: ${lead.id}`);
        console.log(`  Название: ${lead.name}`);
        console.log(`  Бюджет: ${lead.price || 0}`);
        console.log(`  Статус: ${lead.status_id}`);
      });
    } else {
      console.log('Сделки не найдены');
    }
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Тест получения одной сделки
async function testGetLead(client: any, id?: string) {
  if (!id) {
    console.error('❌ Необходимо указать ID сделки');
    return;
  }

  try {
    console.log(`🔍 Получаем сделку ID=${id}...\n`);
    const response = await client.get(`/api/v4/leads/${id}`);
    console.log('✅ Успешно!');
    console.log(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Тест создания сделки
async function testCreateLead(client: any, name?: string) {
  if (!name) {
    console.error('❌ Необходимо указать название сделки');
    return;
  }

  try {
    console.log(`➕ Создаем сделку "${name}"...\n`);
    const response = await client.post('/api/v4/leads', [
      {
        name: name,
        price: 10000,
        custom_fields_values: []
      }
    ]);
    console.log('✅ Успешно!');
    console.log(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Тест получения списка контактов
async function testGetContacts(client: any, limitStr?: string) {
  const limit = limitStr ? parseInt(limitStr) : 10;
  
  try {
    console.log(`👥 Получаем список контактов (limit=${limit})...\n`);
    const response = await client.get(`/api/v4/contacts?limit=${limit}`);
    console.log('✅ Успешно!');
    
    if (response._embedded?.contacts) {
      console.log(`\nНайдено контактов: ${response._embedded.contacts.length}`);
      response._embedded.contacts.forEach((contact: any) => {
        console.log(`\n  ID: ${contact.id}`);
        console.log(`  Название: ${contact.name}`);
      });
    } else {
      console.log('Контакты не найдены');
    }
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Тест получения одного контакта
async function testGetContact(client: any, id?: string) {
  if (!id) {
    console.error('❌ Необходимо указать ID контакта');
    return;
  }

  try {
    console.log(`🔍 Получаем контакт ID=${id}...\n`);
    const response = await client.get(`/api/v4/contacts/${id}`);
    console.log('✅ Успешно!');
    console.log(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

// Запускаем main
main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});

