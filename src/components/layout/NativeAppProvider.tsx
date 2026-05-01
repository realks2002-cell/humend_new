'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNativeApp } from '@/hooks/useNativeApp';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAttendance } from '@/hooks/useAttendance';
import AttendanceConfirmModal from './AttendanceConfirmModal';
import { subscribeAttendanceModal, closeAttendanceModal } from '@/lib/attendance-modal-store';

export default function NativeAppProvider({ children }: { children: React.ReactNode }) {
  useNativeApp();
  usePushNotifications();
  useAttendance();

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
