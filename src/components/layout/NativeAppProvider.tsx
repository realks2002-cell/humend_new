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

  // 앱 실행/포그라운드 복귀 시마다 ping + 진단 자동 보고
  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    async function doReport() {
      const headers: Record<string, string> = {};
      let apiKey: string | null = null;
      try { apiKey = window.localStorage.getItem('humend_api_key'); } catch {}
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const { data: { session } } = await createClient().auth.getSession();
          if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        } catch {}
      }
      if (cancelled) return;

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
        await fetch(`${API_BASE}/api/native/active/ping`, { method: 'POST', headers });
      } catch {}

      if (cancelled) return;
      try {
        const { collectAndReportDiagnostics } = await import('@/lib/capacitor/diagnostics');
        collectAndReportDiagnostics().catch(() => {});
      } catch {}
    }

    // 1. 마운트 시 즉시 1회
    doReport();

    // 2. 포그라운드 복귀 시마다 (배경→전경 전환 모두 잡음)
    let appStateRemove: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive && !cancelled) doReport();
        });
        appStateRemove = () => handle.remove();
      } catch {}
    })();

    return () => {
      cancelled = true;
      appStateRemove?.();
    };
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
