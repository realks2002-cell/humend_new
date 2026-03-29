import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  // 1) 빌드 환경변수
  if (process.env.NEXT_PUBLIC_IS_NATIVE_APP === "true") return true;
  // 2) Capacitor 런타임
  try { if (Capacitor.isNativePlatform()) return true; } catch {}
  // 3) Origin 기반 감지 (iOS 정적 빌드)
  if (typeof window !== "undefined") {
    try {
      const origin = window.location.origin;
      if (origin.startsWith("capacitor://") || origin.startsWith("file://") || origin === "null") return true;
    } catch {}
  }
  return false;
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
}
