"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Phone,
} from "lucide-react";
import { AuthGuard } from "@/lib/native-api/auth-guard";
import { getTodayShift } from "@/lib/native-api/location-queries";
import {
  sendLocationLog,
  confirmArrival,
} from "@/lib/native-api/location-actions";
import {
  requestLocationPermission,
  getCurrentPosition,
  calcDistanceMeters,
} from "@/lib/capacitor/geolocation";
import {
  startTracking,
  stopTracking,
  isTracking as checkIsTracking,
} from "@/lib/capacitor/location-tracking";
import type { DailyShiftWithDetails, ArrivalStatus } from "@/types/location";

const statusConfig: Record<
  ArrivalStatus,
  { label: string; color: string; icon: typeof MapPin }
> = {
  pending: { label: "대기", color: "bg-slate-100 text-slate-700", icon: Clock },
  tracking: {
    label: "추적 중",
    color: "bg-blue-100 text-blue-700",
    icon: Navigation,
  },
  moving: {
    label: "이동 중",
    color: "bg-blue-100 text-blue-700",
    icon: Navigation,
  },
  offline: {
    label: "오프라인",
    color: "bg-gray-100 text-gray-500",
    icon: AlertTriangle,
  },
  no_signal: {
    label: "미수신",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertTriangle,
  },
  late_risk: {
    label: "지각 위험",
    color: "bg-orange-100 text-orange-700",
    icon: AlertTriangle,
  },
  noshow_risk: {
    label: "노쇼 위험",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  arrived: {
    label: "도착 완료",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  late: {
    label: "지각 도착",
    color: "bg-amber-100 text-amber-700",
    icon: CheckCircle2,
  },
  noshow: {
    label: "노쇼",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
};

function TrackingContent() {
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<DailyShiftWithDetails | null>(null);
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadShift = useCallback(async () => {
    setLoading(true);
    const data = await getTodayShift();
    setShift(data);
    setTracking(checkIsTracking());
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadShift();
  }, [loadShift]);

  // 위치추적 시작
  const handleStartTracking = async () => {
    if (!shift) return;
    setSubmitting(true);

    const permitted = await requestLocationPermission();
    if (!permitted) {
      alert("위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.");
      setSubmitting(false);
      return;
    }

    const clientLat = shift.clients?.latitude;
    const clientLng = shift.clients?.longitude;

    if (!clientLat || !clientLng) {
      alert("근무지 위치 정보가 없습니다.");
      setSubmitting(false);
      return;
    }

    const started = await startTracking(clientLat, clientLng, {
      onLocation: async (lat, lng, speed, accuracy) => {
        // 서버에 위치 전송
        const result = await sendLocationLog({
          shiftId: shift.id,
          lat,
          lng,
          speed: speed ?? undefined,
          accuracy: accuracy ?? undefined,
          recordedAt: new Date().toISOString(),
        });

        // 거리 업데이트
        const d = calcDistanceMeters(lat, lng, clientLat, clientLng);
        setDistance(Math.round(d));

        // 자동 도착 처리됨 → shift 새로고침 (추적은 계속)
        if (result.arrived) {
          loadShift();
        }
      },
      onArrival: () => {
        // 도착 후에도 추적 계속 (15분 간격으로 전환됨)
        loadShift();
      },
    }, 200, shift.end_time, shift.work_date, shift.id);

    if (started) {
      setTracking(true);
      // 즉시 현재 위치 전송
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
        const d = calcDistanceMeters(pos.lat, pos.lng, clientLat, clientLng);
        setDistance(Math.round(d));
      }
    }

    setSubmitting(false);
  };

  // 추적 중지
  const handleStopTracking = async () => {
    await stopTracking();
    setTracking(false);
  };

  // 수동 도착
  const handleManualArrival = async () => {
    if (!shift) return;
    setSubmitting(true);

    const pos = await getCurrentPosition();
    const result = await confirmArrival({
      shiftId: shift.id,
      lat: pos?.lat,
      lng: pos?.lng,
    });

    if (result.success) {
      await stopTracking();
      setTracking(false);
      loadShift();
    } else {
      alert(result.error || "도착 확인에 실패했습니다.");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">출근 추적</h1>
        <Card className="py-0">
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              오늘 배정된 근무가 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[shift.arrival_status] ?? statusConfig.pending;
  const StatusIcon = status.icon;
  const isArrived = ["arrived", "late"].includes(shift.arrival_status);
  const isFinished = isArrived || shift.arrival_status === "noshow";

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">출근 추적</h1>

      {/* 근무 정보 카드 */}
      <Card className="overflow-hidden py-0">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-lg">
                {shift.clients?.company_name}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {shift.clients?.location}
              </p>
            </div>
            <Badge className={`${status.color} border-0 font-semibold`}>
              <StatusIcon className="h-3.5 w-3.5 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {shift.start_time.slice(0, 5)} ~ {shift.end_time.slice(0, 5)}
            </span>
            {distance != null && (
              <span className="flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5" />
                {distance >= 1000
                  ? `${(distance / 1000).toFixed(1)}km`
                  : `${distance}m`}
              </span>
            )}
          </div>

          {/* 연락처 */}
          {shift.clients?.contact_phone && (
            <a
              href={`tel:${shift.clients.contact_phone}`}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600"
            >
              <Phone className="h-3.5 w-3.5" />
              {shift.clients.contact_phone}
            </a>
          )}
        </CardContent>
      </Card>

      {/* 도착 완료 */}
      {isFinished && (
        <Card className="overflow-hidden py-0">
          <div
            className={`h-1 ${
              shift.arrival_status === "arrived"
                ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                : shift.arrival_status === "late"
                  ? "bg-gradient-to-r from-amber-400 to-orange-400"
                  : "bg-gradient-to-r from-red-400 to-rose-400"
            }`}
          />
          <CardContent className="py-6 text-center">
            <CheckCircle2
              className={`mx-auto mb-2 h-12 w-12 ${
                shift.arrival_status === "arrived"
                  ? "text-emerald-500"
                  : shift.arrival_status === "late"
                    ? "text-amber-500"
                    : "text-red-500"
              }`}
            />
            <p className="font-semibold text-lg">
              {shift.arrival_status === "arrived"
                ? "출근 완료"
                : shift.arrival_status === "late"
                  ? "지각 도착"
                  : "노쇼 처리됨"}
            </p>
            {shift.arrived_at && (
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(shift.arrived_at).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 근무 중 추적 안내 */}
      {isArrived && tracking && (
        <Card className="overflow-hidden py-0">
          <div className="h-1 bg-gradient-to-r from-blue-400 to-cyan-400" />
          <CardContent className="py-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              근무 중 위치를 확인하고 있습니다
            </div>
            <p className="text-xs text-muted-foreground">
              15분 간격으로 위치가 기록됩니다 · 퇴근 시간 후 자동 종료
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopTracking}
            >
              추적 중지
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 액션 버튼 */}
      {!isFinished && (
        <div className="space-y-3">
          {!tracking ? (
            <Button
              onClick={handleStartTracking}
              disabled={submitting}
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Navigation className="h-5 w-5 mr-2" />
              )}
              위치 추적 시작
            </Button>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                위치를 추적하고 있습니다
              </div>

              <Button
                onClick={handleManualArrival}
                disabled={submitting}
                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                수동 도착 확인
              </Button>

              <Button
                variant="outline"
                onClick={handleStopTracking}
                className="w-full"
              >
                추적 중지
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  return (
    <AuthGuard>
      <TrackingContent />
    </AuthGuard>
  );
}
