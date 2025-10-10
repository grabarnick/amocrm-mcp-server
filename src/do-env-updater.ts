import axios from 'axios';
import { OAuthTokens } from './amocrm/client.js';

interface DoEnvUpdaterOptions {
  apiToken?: string;
  appId?: string;
}

/**
 * Обновляет переменные окружения в DigitalOcean App Platform через API
 */
export class DoEnvUpdater {
  private apiToken: string | undefined;
  private appId: string | undefined;
  private baseUrl = 'https://api.digitalocean.com/v2';

  constructor(options: DoEnvUpdaterOptions) {
    this.apiToken = options.apiToken || process.env.DO_API_TOKEN;
    this.appId = options.appId || process.env.DO_APP_ID;
  }

  /**
   * Проверяет, доступно ли обновление через DO API
   */
  isAvailable(): boolean {
    return !!(this.apiToken && this.appId);
  }

  /**
   * Обновляет токены amoCRM в переменных окружения DO App Platform
   */
  async updateTokens(tokens: OAuthTokens): Promise<void> {
    if (!this.isAvailable()) {
      console.log('⚠️  DO API не настроен, пропускаем обновление переменных окружения');
      return;
    }

    try {
      console.log('🔄 Обновляем токены в DigitalOcean App Platform...');

      // Получаем текущую спецификацию приложения
      const appSpec = await this.getAppSpec();

      // Обновляем переменные окружения
      const updatedSpec = this.updateEnvVars(appSpec, tokens);

      // Применяем обновленную спецификацию
      await this.updateAppSpec(updatedSpec);

      console.log('✅ Токены успешно обновлены в DO App Platform');
    } catch (error) {
      console.error('❌ Ошибка обновления токенов в DO:', error instanceof Error ? error.message : error);
      // Не бросаем ошибку, чтобы не прервать работу приложения
    }
  }

  /**
   * Получает текущую спецификацию приложения
   */
  private async getAppSpec(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/apps/${this.appId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.app.spec;
  }

  /**
   * Обновляет переменные окружения в спецификации
   */
  private updateEnvVars(spec: any, tokens: OAuthTokens): any {
    const updatedSpec = JSON.parse(JSON.stringify(spec)); // Deep clone

    // Находим сервис (обычно первый)
    const service = updatedSpec.services?.[0];
    if (!service) {
      throw new Error('Сервис не найден в спецификации приложения');
    }

    // Обновляем или добавляем переменные окружения
    if (!service.envs) {
      service.envs = [];
    }

    // Обновляем AMO_ACCESS_TOKEN
    const accessTokenEnv = service.envs.find((env: any) => env.key === 'AMO_ACCESS_TOKEN');
    if (accessTokenEnv) {
      accessTokenEnv.value = tokens.access_token;
    } else {
      service.envs.push({ key: 'AMO_ACCESS_TOKEN', value: tokens.access_token });
    }

    // Обновляем AMO_REFRESH_TOKEN
    const refreshTokenEnv = service.envs.find((env: any) => env.key === 'AMO_REFRESH_TOKEN');
    if (refreshTokenEnv) {
      refreshTokenEnv.value = tokens.refresh_token;
    } else {
      service.envs.push({ key: 'AMO_REFRESH_TOKEN', value: tokens.refresh_token });
    }

    return updatedSpec;
  }

  /**
   * Применяет обновленную спецификацию
   */
  private async updateAppSpec(spec: any): Promise<void> {
    await axios.put(
      `${this.baseUrl}/apps/${this.appId}`,
      { spec },
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

/**
 * Фабричная функция для создания обновлятора токенов
 */
export function createTokenUpdater(tokens: OAuthTokens): Promise<void> {
  const updater = new DoEnvUpdater({
    apiToken: process.env.DO_API_TOKEN,
    appId: process.env.DO_APP_ID
  });

  return updater.updateTokens(tokens);
}

