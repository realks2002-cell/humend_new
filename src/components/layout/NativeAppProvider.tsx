'use client';

import { useNativeApp } from '@/hooks/useNativeApp';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function NativeAppProvider({ children }: { children: React.ReactNode }) {
  useNativeApp();
  usePushNotifications();
  return <>{children}</>;
}
