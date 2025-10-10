import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export type AmoClientOptions = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  onTokensUpdated?: (tokens: OAuthTokens) => void;
  // Поддержка долгосрочных токенов
  isLongTermToken?: boolean;
};

export type OAuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export interface AmoClient {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) => Promise<T>;
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<T>;
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<T>;
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) => Promise<T>;
  ensureAuth: () => Promise<void>;
  exchangeAuthCode: (code: string, redirectUri?: string) => Promise<OAuthTokens>;
}

export function createAmoClient(options: AmoClientOptions): AmoClient {
  const http: AxiosInstance = axios.create({
    baseURL: options.baseUrl.replace(/\/$/, ''),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  let accessToken: string | undefined = options.accessToken;
  let refreshToken: string | undefined = options.refreshToken;
  let tokenExpiresAt = 0;

  async function refreshTokensIfNeeded(): Promise<void> {
    // Для долгосрочных токенов обновление не требуется
    if (options.isLongTermToken) {
      if (!accessToken) {
        throw new Error('Долгосрочный токен не установлен. Проверьте AMO_ACCESS_TOKEN.');
      }
      return;
    }

    // Логика для обычных токенов с refresh_token
    const now = Date.now() / 1000;
    if (accessToken && now < tokenExpiresAt - 30) return;
    if (!refreshToken) throw new Error('Нет refresh_token. Выполните OAuth2 обмен кодов и сохраните токены.');

    const res = await axios.post<OAuthTokens>(`${options.baseUrl.replace(/\/$/, '')}/oauth2/access_token`, {
      client_id: options.clientId,
      client_secret: options.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: options.redirectUri,
    });

    accessToken = res.data.access_token;
    refreshToken = res.data.refresh_token;
    tokenExpiresAt = Math.floor(Date.now() / 1000) + res.data.expires_in;
    options.onTokensUpdated?.(res.data);
  }

  http.interceptors.request.use(async (config: any) => {
    await refreshTokensIfNeeded();
    if (accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  async function request<T>(method: 'get' | 'post' | 'patch' | 'delete', url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await http.request<T>({ method, url, data, ...config });
    return res.data as T;
  }

  return {
    async ensureAuth() {
      await refreshTokensIfNeeded();
    },
    get: (url, config) => request('get', url, undefined, config),
    post: (url, data, config) => request('post', url, data, config),
    patch: (url, data, config) => request('patch', url, data, config),
    delete: (url, config) => request('delete', url, undefined, config),
    async exchangeAuthCode(code: string, redirectUri?: string) {
      const res = await axios.post<OAuthTokens>(`${options.baseUrl.replace(/\/$/, '')}/oauth2/access_token`, {
        client_id: options.clientId,
        client_secret: options.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri ?? options.redirectUri,
      });
      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;
      tokenExpiresAt = Math.floor(Date.now() / 1000) + res.data.expires_in;
      options.onTokensUpdated?.(res.data);
      return res.data;
    },
  };
}


