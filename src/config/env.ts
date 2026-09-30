import { Platform } from 'react-native';

declare const process: {
  env: Record<string, string | undefined>;
};

const defaultLocalBaseUrl = Platform.select({
  android: 'http://localhost:3000/api/v1',
  ios: 'http://localhost:3000/api/v1',
  default: 'http://localhost:3000/api/v1',
});

export const APP_CONFIG = {
  API_BASE_URL: process.env.ARTHA_API_BASE_URL || defaultLocalBaseUrl!,
  GOOGLE_WEB_CLIENT_ID: process.env.ARTHA_GOOGLE_WEB_CLIENT_ID || '',
  GOOGLE_IOS_CLIENT_ID: process.env.ARTHA_GOOGLE_IOS_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.ARTHA_GOOGLE_ANDROID_CLIENT_ID || '',
  APP_NAME: process.env.ARTHA_APP_NAME || 'Artha',
  SUPPORT_EMAIL: process.env.ARTHA_SUPPORT_EMAIL || 'aartha.app@gmail.com',
  APP_URL: process.env.ARTHA_APP_URL || 'https://artha.app',
};
