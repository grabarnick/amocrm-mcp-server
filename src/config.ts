import { z } from 'zod';

const EnvSchema = z.object({
  AMO_BASE_URL: z.string().url(),
  AMO_CLIENT_ID: z.string(),
  AMO_CLIENT_SECRET: z.string(),
  AMO_REDIRECT_URI: z.string().url().optional(),
  AMO_ACCESS_TOKEN: z.string().optional(),
  AMO_REFRESH_TOKEN: z.string().optional(),
  // Поддержка долгосрочных токенов
  AMO_LONG_TERM_TOKEN: z.string().optional(),
  // DigitalOcean App Platform API (опционально, для автообновления токенов)
  DO_API_TOKEN: z.string().optional(),
  DO_APP_ID: z.string().optional(),
  // MCP Authorization Token (опционально, для защиты HTTP эндпоинтов)
  MCP_AUTH_TOKEN: z.string().optional(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    throw new Error(`Некорректные переменные окружения: ${JSON.stringify(errors)}`);
  }
  return parsed.data;
}


