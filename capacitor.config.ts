import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.humend.hr',
  appName: 'Humend HR',
  webDir: 'out',
  server: {
    // url 제거 — 로컬 번들에서 로드 (Google Play 심사 대응)
    allowNavigation: ['https://humendhr.com/*', 'https://*.supabase.co/*', 'https://accounts.google.com/*'],
  },
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: false,
  },
  plugins: {
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
