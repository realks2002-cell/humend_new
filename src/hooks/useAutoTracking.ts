'use client';

import { useEffect, useRef } from 'react';
import { isNative } from '@/lib/capacitor/native';
import {
  startTracking,
  stopTracking,
  isTracking,
} from '@/lib/capacitor/location-tracking';
import { getTodayShift } from '@/lib/native-api/location-queries';
import {
  sendLocationLog,
  getMemberLocationConsent,
} from '@/lib/native-api/location-actions';
import { getCurrentPosition } from '@/lib/capacitor/geolocation';

export function useAutoTracking() {
  const attempted = useRef(false);

  useEffect(() => {
    if (!isNative()) return;
    if (attempted.current) return;
    attempted.current = true;

    if (isTracking()) return;

    (async () => {
      try {
        // 회원 동의 여부 확인 (미동의 시 자동 추적 안 함)
        const hasConsent = await getMemberLocationConsent();
        if (!hasConsent) return;

        const shift = await getTodayShift();
        if (!shift) return;
        if (['arrived', 'late', 'noshow'].includes(shift.arrival_status)) return;

        // 출근 2시간 전 ~ 출근시간+30분 범위 체크
        const now = new Date();
        const shiftStart = new Date(`${shift.work_date}T${shift.start_time}+09:00`);
        const windowStart = new Date(shiftStart.getTime() - 2 * 60 * 60 * 1000);
        const windowEnd = new Date(shiftStart.getTime() + 30 * 60 * 1000);
        if (now < windowStart || now > windowEnd) return;

        // 위치 권한 확인 (팝업 없이 현재 상태만)
        const { Geolocation } = await import('@capacitor/geolocation');
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted') return;

        const clientLat = shift.clients?.latitude;
        const clientLng = shift.clients?.longitude;
        if (!clientLat || !clientLng) return;

        // 추적 시작
        await startTracking(clientLat, clientLng, {
          onLocation: async (lat, lng, speed, accuracy) => {
            const result = await sendLocationLog({
              shiftId: shift.id,
              lat,
              lng,
              speed: speed ?? undefined,
              accuracy: accuracy ?? undefined,
              recordedAt: new Date().toISOString(),
            });
            if (result.arrived) {
              stopTracking();
            }
          },
          onArrival: () => {
            stopTracking();
          },
        });

        // 즉시 현재 위치 1회 전송
        const pos = await getCurrentPosition();
        if (pos) {
          await sendLocationLog({
            shiftId: shift.id,
            lat: pos.lat,
            lng: pos.lng,
            speed: pos.speed,
            accuracy: pos.accuracy,
            recordedAt: new Date().toISOString(),
          });
        }
      } catch {
        // 자동 시작 실패 시 무시 — 수동 방식 fallback
      }
    })();
  }, []);
}
