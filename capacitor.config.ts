import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.humend.hr',
  appName: 'Humend HR',
  webDir: 'out',
  server: {
    url: 'http://10.0.2.2:3000/jobs', // 개발용 — 배포 시 제거
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
    webContentsDebuggingEnabled: false,
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
