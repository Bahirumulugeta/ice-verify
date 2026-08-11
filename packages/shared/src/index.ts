export * from './errors.js';
export * from './result.js';
export * from './ids.js';
export * from './time.js';

export type Environment = 'development' | 'test' | 'staging' | 'production';

export type ApiKeyEnvironment = 'test' | 'live';

export type DashboardRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
