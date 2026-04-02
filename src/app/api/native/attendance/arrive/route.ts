import { createAdminClient } from "@/lib/supabase/server";
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

const ARRIVAL_RADIUS_METERS = 200;

/**
 * POST /api/native/attendance/arrive
 * 지오펜싱 도착 확인 — 200m 반경 진입 시 호출
 * lat/lng가 없으면 거리 검증 생략 (네이티브 지오펜스 진입으로 간주)
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // shift + client 좌표 조회
  const { data: shift } = await admin
    .from("daily_shifts")
    .select("id, member_id, arrival_status, clients(latitude, longitude)")
    .eq("id", shiftId)
    .single();

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.member_id !== user.id) {
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

  // 서버 측 거리 검증
  const distance = haversineMeters(lat, lng, client.latitude, client.longitude);

  if (distance > ARRIVAL_RADIUS_METERS) {
    return NextResponse.json({
      success: false,
      distance: Math.round(distance),
      message: `근무지에서 ${Math.round(distance)}m 거리에 있습니다. ${ARRIVAL_RADIUS_METERS}m 이내로 접근해주세요.`,
    });
  }

  await admin
    .from("daily_shifts")
    .update({
      arrival_status: "arrived",
      arrived_at: new Date().toISOString(),
    })
    .eq("id", shiftId);

  return NextResponse.json({ success: true, distance: Math.round(distance) });
}
