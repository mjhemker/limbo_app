/**
 * Environment configuration and utilities
 * Provides type-safe access to environment variables
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: Environment;
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
  enableDebug: boolean;
  enableErrorReporting: boolean;
}

/**
 * Get current environment from process.env
 */
export function getCurrentEnvironment(): Environment {
  const env = process.env.EXPO_PUBLIC_ENV as Environment;
  if (env === 'development' || env === 'staging' || env === 'production') {
    return env;
  }
  return 'development'; // Default to development
}

/**
 * Environment configurations
 */
const environments: Record<Environment, Partial<EnvironmentConfig>> = {
  development: {
    name: 'development',
    enableDebug: true,
    enableErrorReporting: false,
  },
  staging: {
    name: 'staging',
    enableDebug: true,
    enableErrorReporting: true,
  },
  production: {
    name: 'production',
    enableDebug: false,
    enableErrorReporting: true,
  },
};

/**
 * Get environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const currentEnv = getCurrentEnvironment();
  const envConfig = environments[currentEnv];

  return {
    name: currentEnv,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
    enableDebug: envConfig.enableDebug ?? false,
    enableErrorReporting: envConfig.enableErrorReporting ?? false,
  };
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * Get environment display name
 */
export function getEnvironmentDisplayName(env: Environment): string {
  const names = {
    development: 'Development',
    staging: 'Staging',
    production: 'Production',
  };
  return names[env];
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const config = getEnvironmentConfig();
  const errors: string[] = [];

  if (!config.supabaseUrl) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is not set');
  }

  if (!config.supabaseAnonKey) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
  }

  if (!config.apiUrl) {
    errors.push('EXPO_PUBLIC_API_URL is not set');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Export current configuration
export const env = getEnvironmentConfig();
