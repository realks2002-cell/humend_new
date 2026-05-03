'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNativeApp } from '@/hooks/useNativeApp';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAttendance } from '@/hooks/useAttendance';
import AttendanceConfirmModal from './AttendanceConfirmModal';
import { subscribeAttendanceModal, closeAttendanceModal } from '@/lib/attendance-modal-store';
import { isNative } from '@/lib/capacitor/native';

export default function NativeAppProvider({ children }: { children: React.ReactNode }) {
  useNativeApp();
  usePushNotifications();
  useAttendance();

  // 앱 실행 시 last_active_at 갱신 (활성 회원 추적)
  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    (async () => {
      // 인증 폴백: localStorage API Key 우선 → Supabase 세션 (push.ts와 동일)
      const headers: Record<string, string> = {};
      let apiKey: string | null = null;
      try { apiKey = window.localStorage.getItem('humend_api_key'); } catch {}
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const { data: { session } } = await createClient().auth.getSession();
          if (cancelled || !session?.access_token) return;
          headers.Authorization = `Bearer ${session.access_token}`;
        } catch { return; }
      }
      if (cancelled) return;
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
        await fetch(`${API_BASE}/api/native/active/ping`, { method: 'POST', headers });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  useEffect(() => subscribeAttendanceModal(setModalOpen), []);

  const handleOpenChange = useCallback((o: boolean) => {
    if (!o) closeAttendanceModal();
  }, []);

  return (
    <>
      {children}
      <AttendanceConfirmModal open={modalOpen} onOpenChange={handleOpenChange} />
    </>
  );
}
