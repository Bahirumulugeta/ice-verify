import { loadConfig, type AppConfig } from '@ice/config';

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}

export function resetConfigForTests(): void {
  cached = null;
}
