'use client';

import { useNativeApp } from '@/hooks/useNativeApp';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAutoTracking } from '@/hooks/useAutoTracking';

export default function NativeAppProvider({ children }: { children: React.ReactNode }) {
  useNativeApp();
  usePushNotifications();
  useAutoTracking();
  return <>{children}</>;
}
