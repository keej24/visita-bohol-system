// Environment validation and type safety
interface EnvironmentConfig {
  VITE_FIREBASE_API_KEY: string;
  VITE_FIREBASE_AUTH_DOMAIN: string;
  VITE_FIREBASE_PROJECT_ID: string;
  VITE_FIREBASE_STORAGE_BUCKET: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  VITE_FIREBASE_APP_ID: string;
  VITE_APP_ENV?: string;
  VITE_DEBUG_MODE?: string;
}

const requiredEnvVars: (keyof EnvironmentConfig)[] = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

function validateEnvironment(): EnvironmentConfig {
  const missingVars: string[] = [];
  
  for (const varName of requiredEnvVars) {
    if (!import.meta.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.\n' +
      'Refer to .env.example for the required format.'
    );
  }
  
  return {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
    VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE || 'false',
  };
}

export const env = validateEnvironment();

export const isDevelopment = env.VITE_APP_ENV === 'development';
export const isProduction = env.VITE_APP_ENV === 'production';
export const isDebugMode = env.VITE_DEBUG_MODE === 'true';
