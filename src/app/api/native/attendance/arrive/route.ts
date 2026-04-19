import { createAdminClient } from "@/lib/supabase/server";
import { authenticateMember } from "@/lib/supabase/member-auth";
import { NextRequest, NextResponse } from "next/server";

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ARRIVAL_RADIUS_METERS = 300;
const MIN_INTERVAL_MS = 5000;        // 샘플 간 최소 5초
const MAX_INTERVAL_MS = 10 * 60_000; // 10분 초과 시 카운터 리셋
const REQUIRED_ATTEMPTS = 3;         // 연속 3회 확인 필요
const MAX_DRIFT_METERS = 500;        // 직전 샘플과 500m 이상 튐 감지

/**
 * POST /api/native/attendance/arrive
 * 300m 반경 진입 시 호출. GPS 튐 방어를 위해 3회 연속 확인 후 arrived 처리.
 */
export async function POST(req: NextRequest) {
  const memberId = await authenticateMember(req);
  if (!memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { shiftId, lat, lng } = (await req.json()) as {
    shiftId?: string;
    lat?: number;
    lng?: number;
  };

  if (!shiftId || lat == null || lng == null) {
    return NextResponse.json(
      { error: "shiftId, lat, lng are required" },
      { status: 400 }
    );
  }

  const { data: shift } = await admin
    .from("daily_shifts")
    .select(`
      id, member_id, arrival_status,
      arrive_attempts, last_arrive_attempt_at, last_arrive_lat, last_arrive_lng,
      clients(latitude, longitude)
    `)
    .eq("id", shiftId)
    .single();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.member_id !== memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (shift.arrival_status === "arrived") {
    return NextResponse.json({ success: true, status: "already_arrived" });
  }

  const client = shift.clients as unknown as {
    latitude: number | null;
    longitude: number | null;
  };

  if (!client?.latitude || !client?.longitude) {
    return NextResponse.json(
      { error: "Client location not set" },
      { status: 422 }
    );
  }

  const distance = haversineMeters(lat, lng, client.latitude, client.longitude);
  const now = new Date();
  const nowMs = now.getTime();

  // 거리 초과 → 카운터 리셋
  if (distance > ARRIVAL_RADIUS_METERS) {
    if ((shift.arrive_attempts ?? 0) > 0) {
      await admin
        .from("daily_shifts")
        .update({ arrive_attempts: 0 })
        .eq("id", shiftId);
    }
    return NextResponse.json({
      success: false,
      distance: Math.round(distance),
      message: `근무지에서 ${Math.round(distance)}m 거리에 있습니다. ${ARRIVAL_RADIUS_METERS}m 이내로 접근해주세요.`,
    });
  }

  // 거리 범위 내 — 시간/위치 검증
  const lastAttemptMs = shift.last_arrive_attempt_at
    ? new Date(shift.last_arrive_attempt_at).getTime()
    : 0;
  const intervalMs = lastAttemptMs > 0 ? nowMs - lastAttemptMs : Infinity;
  let currentAttempts = shift.arrive_attempts ?? 0;

  // 너무 빠른 연속 호출 — 카운트 안 올리고 대기
  if (intervalMs < MIN_INTERVAL_MS) {
    return NextResponse.json({
      success: true,
      status: "debounce",
      count: currentAttempts,
      remaining: Math.max(0, REQUIRED_ATTEMPTS - currentAttempts),
      message: `샘플 간격 ${Math.round(MIN_INTERVAL_MS / 1000)}초 대기 중`,
    });
  }

  // 너무 오래전 샘플 → 카운터 리셋 후 첫 시도로 처리
  if (intervalMs > MAX_INTERVAL_MS) {
    currentAttempts = 0;
  }

  // GPS 튐 체크 — 직전 샘플과 500m 이상 차이나면 의심
  if (
    currentAttempts > 0 &&
    shift.last_arrive_lat != null &&
    shift.last_arrive_lng != null
  ) {
    const drift = haversineMeters(lat, lng, shift.last_arrive_lat, shift.last_arrive_lng);
    if (drift > MAX_DRIFT_METERS) {
      // 튐으로 간주 — 카운터 리셋하고 이번을 첫 시도로
      currentAttempts = 0;
    }
  }

  const newCount = currentAttempts + 1;

  // 3회 확정 → arrived
  if (newCount >= REQUIRED_ATTEMPTS) {
    await admin
      .from("daily_shifts")
      .update({
        arrival_status: "arrived",
        arrived_at: now.toISOString(),
        arrive_attempts: newCount,
        last_arrive_attempt_at: now.toISOString(),
        last_arrive_lat: lat,
        last_arrive_lng: lng,
      })
      .eq("id", shiftId);

    return NextResponse.json({
      success: true,
      status: "arrived",
      distance: Math.round(distance),
    });
  }

  // 아직 확정 전 — 카운터만 업데이트
  await admin
    .from("daily_shifts")
    .update({
      arrive_attempts: newCount,
      last_arrive_attempt_at: now.toISOString(),
      last_arrive_lat: lat,
      last_arrive_lng: lng,
    })
    .eq("id", shiftId);

  return NextResponse.json({
    success: true,
    status: "confirming",
    count: newCount,
    remaining: REQUIRED_ATTEMPTS - newCount,
    distance: Math.round(distance),
  });
}
