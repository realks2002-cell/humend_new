import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.humend.hr',
  appName: 'Humend HR',
  webDir: 'out',
  server: {
    url: 'https://humendhr.com',
    allowNavigation: ['https://humendhr.com/*', 'https://*.supabase.co/*', 'https://accounts.google.com/*'],
  },
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '133410524921-94i1t8skrfkfggmrpdhnfkclh9h8o4bv.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#FFFFFF',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
