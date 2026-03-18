import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.humend.hr',
  appName: 'Humend HR',
  webDir: 'out',
  server: {
    url: 'https://humendhr.com/jobs',
    cleartext: true,
    allowNavigation: [
      'https://humendhr.com/*',
      'https://*.supabase.co/*',
      'https://accounts.google.com/*',
      'https://*.googleapis.com/*',
      'https://*.gstatic.com/*',
      'https://*.google.com/*',
    ],
  },
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: true,
    useLegacyBridge: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
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
    BackgroundGeolocation: {
      // Android Foreground Service 설정
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3B82F6',
    },
  },
};

export default config;
