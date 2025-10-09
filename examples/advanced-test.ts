#!/usr/bin/env node --loader ts-node/esm
/**
 * Продвинутые примеры тестирования AmoCRM API
 * Этот файл показывает, как создавать собственные тесты для специфических сценариев
 */

import { createAmoClient, OAuthTokens } from '../src/amocrm/client.js';
import { loadConfig } from '../src/config.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔬 Продвинутое тестирование AmoCRM API\n');

  const config = loadConfig();
  
  const client = createAmoClient({
    baseUrl: config.AMO_BASE_URL,
    clientId: config.AMO_CLIENT_ID,
    clientSecret: config.AMO_CLIENT_SECRET,
    redirectUri: config.AMO_REDIRECT_URI,
    accessToken: config.AMO_ACCESS_TOKEN,
    refreshToken: config.AMO_REFRESH_TOKEN,
    onTokensUpdated: (tokens: OAuthTokens) => {
      console.log('🔄 Токены обновлены!');
    }
  });

  // Пример 1: Создание сделки с контактом
  await example1_CreateLeadWithContact(client);

  // Пример 2: Поиск сделок по фильтру
  await example2_SearchLeads(client);

  // Пример 3: Обновление сделки
  await example3_UpdateLead(client);

  // Пример 4: Добавление примечания к сделке
  await example4_AddNoteToLead(client);

  // Пример 5: Получение пользователей
  await example5_GetUsers(client);
}

// Пример 1: Создание сделки с контактом
async function example1_CreateLeadWithContact(client: any) {
  console.log('📝 Пример 1: Создание сделки с контактом\n');
  
  try {
    // Создаем контакт
    const contactResponse = await client.post('/api/v4/contacts', [
      {
        name: 'Тестовый контакт',
        custom_fields_values: [
          {
            field_id: 0, // замените на реальный ID поля телефона
            values: [
              {
                value: '+79991234567'
              }
            ]
          }
        ]
      }
    ]);
    
    const contactId = contactResponse._embedded?.contacts[0]?.id;
    console.log(`✅ Создан контакт ID: ${contactId}`);

    // Создаем сделку, привязанную к контакту
    const leadResponse = await client.post('/api/v4/leads', [
      {
        name: 'Сделка с контактом',
        price: 50000,
        _embedded: {
          contacts: [
            {
              id: contactId
            }
          ]
        }
      }
    ]);

    const leadId = leadResponse._embedded?.leads[0]?.id;
    console.log(`✅ Создана сделка ID: ${leadId}`);
    console.log();

  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    console.log();
  }
}

// Пример 2: Поиск сделок по фильтру
async function example2_SearchLeads(client: any) {
  console.log('🔍 Пример 2: Поиск сделок по фильтру\n');
  
  try {
    // Поиск сделок с ценой больше 10000
    const response = await client.get('/api/v4/leads', {
      params: {
        'filter[price][from]': 10000,
        limit: 5
      }
    });

    if (response._embedded?.leads) {
      console.log(`Найдено сделок: ${response._embedded.leads.length}`);
      response._embedded.leads.forEach((lead: any) => {
        console.log(`  - ${lead.name} (${lead.price} руб.)`);
      });
    } else {
      console.log('Сделки не найдены');
    }
    console.log();

  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    console.log();
  }
}

// Пример 3: Обновление сделки
async function example3_UpdateLead(client: any) {
  console.log('✏️  Пример 3: Обновление сделки\n');
  
  try {
    // Сначала получаем первую сделку
    const getResponse = await client.get('/api/v4/leads?limit=1');
    
    if (!getResponse._embedded?.leads?.[0]) {
      console.log('⚠️  Нет сделок для обновления');
      console.log();
      return;
    }

    const lead = getResponse._embedded.leads[0];
    console.log(`Обновляем сделку ID: ${lead.id}`);

    // Обновляем цену сделки
    const updateResponse = await client.patch('/api/v4/leads', [
      {
        id: lead.id,
        price: (lead.price || 0) + 5000,
        name: `${lead.name} (обновлено)`
      }
    ]);

    console.log('✅ Сделка обновлена');
    console.log();

  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    console.log();
  }
}

// Пример 4: Добавление примечания к сделке
async function example4_AddNoteToLead(client: any) {
  console.log('📌 Пример 4: Добавление примечания к сделке\n');
  
  try {
    // Получаем первую сделку
    const getResponse = await client.get('/api/v4/leads?limit=1');
    
    if (!getResponse._embedded?.leads?.[0]) {
      console.log('⚠️  Нет сделок для добавления примечания');
      console.log();
      return;
    }

    const leadId = getResponse._embedded.leads[0].id;

    // Добавляем примечание
    const noteResponse = await client.post(`/api/v4/leads/${leadId}/notes`, [
      {
        note_type: 'common',
        params: {
          text: 'Тестовое примечание, добавленное через API'
        }
      }
    ]);

    console.log('✅ Примечание добавлено к сделке ID:', leadId);
    console.log();

  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    console.log();
  }
}

// Пример 5: Получение пользователей
async function example5_GetUsers(client: any) {
  console.log('👥 Пример 5: Получение списка пользователей\n');
  
  try {
    const response = await client.get('/api/v4/users');

    if (response._embedded?.users) {
      console.log(`Пользователей в системе: ${response._embedded.users.length}`);
      response._embedded.users.forEach((user: any) => {
        console.log(`  - ${user.name} (${user.email})`);
      });
    }
    console.log();

  } catch (error: any) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    console.log();
  }
}

// Запускаем
main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});

