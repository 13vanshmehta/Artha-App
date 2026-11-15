declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Application environment configuration.
 * All values are resolved strictly from environment variables (process.env).
 */
export const APP_CONFIG = {
  API_BASE_URL: process.env.ARTHA_API_BASE_URL || 'http://localhost:3000/api/v1',
  APP_NAME: process.env.ARTHA_APP_NAME || 'Artha',
  SUPPORT_EMAIL: process.env.ARTHA_SUPPORT_EMAIL || 'aartha.app@gmail.com',
  APP_URL: process.env.ARTHA_APP_URL || 'https://artha.app',
  GOOGLE_WEB_CLIENT_ID: process.env.ARTHA_GOOGLE_WEB_CLIENT_ID || '',
  GOOGLE_IOS_CLIENT_ID: process.env.ARTHA_GOOGLE_IOS_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.ARTHA_GOOGLE_ANDROID_CLIENT_ID || '',
  IOS_REVERSED_CLIENT_ID: process.env.ARTHA_IOS_REVERSED_CLIENT_ID || '',
  APPLE_SERVICE_ID: process.env.ARTHA_APPLE_SERVICE_ID || 'com.artha.app',
};
