"use server";

import { createAdminClient } from "@/lib/supabase/server";

const TEST_PHONE = "01034061921";
const TEST_NAME = "이강석";

export async function ensureTestMember() {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("phone", TEST_PHONE)
    .single();

  if (existing) return existing.id as string;

  // Supabase Auth에 유저 생성 후 members에 추가
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      phone: TEST_PHONE,
      phone_confirm: true,
    });

  if (authError) throw new Error(`Auth 유저 생성 실패: ${authError.message}`);

  const { error: memberError } = await supabase.from("members").insert({
    id: authUser.user.id,
    phone: TEST_PHONE,
    name: TEST_NAME,
  });

  if (memberError)
    throw new Error(`멤버 생성 실패: ${memberError.message}`);

  return authUser.user.id;
}


export async function createTestShift(
  placeName: string,
  lat: number,
  lng: number,
  startTime: string
) {
  const supabase = createAdminClient();

  const memberId = await ensureTestMember();

  // 고객사 upsert (placeName 기준)
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("company_name", placeName)
    .single();

  let clientId: string;

  if (existingClient) {
    await supabase
      .from("clients")
      .update({ latitude: lat, longitude: lng, location: placeName })
      .eq("id", existingClient.id);
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        company_name: placeName,
        location: placeName,
        latitude: lat,
        longitude: lng,
      })
      .select("id")
      .single();
    if (clientError) throw new Error(`고객사 생성 실패: ${clientError.message}`);
    clientId = newClient.id;
  }

  // 오늘 날짜 (KST)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 종료시간: 시작시간 + 9시간 (기본값)
  const [h, m] = startTime.split(":").map(Number);
  const endTime = `${String(Math.min(h + 9, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  const { data: existingShift } = await supabase
    .from("daily_shifts")
    .select("id")
    .eq("member_id", memberId)
    .eq("work_date", today)
    .single();

  if (existingShift) {
    const { error } = await supabase
      .from("daily_shifts")
      .update({
        client_id: clientId,
        start_time: startTime,
        end_time: endTime,
        arrival_status: "pending",
        risk_level: 0,
        arrived_at: null,
        last_known_lat: null,
        last_known_lng: null,
        last_seen_at: null,
        location_consent: false,
        tracking_started_at: null,
      })
      .eq("id", existingShift.id);

    if (error) throw new Error(`배정 업데이트 실패: ${error.message}`);
    return existingShift.id as string;
  }

  const { data: shift, error: shiftError } = await supabase
    .from("daily_shifts")
    .insert({
      client_id: clientId,
      member_id: memberId,
      work_date: today,
      start_time: startTime,
      end_time: endTime,
      arrival_status: "pending",
    })
    .select("id")
    .single();

  if (shiftError) throw new Error(`배정 생성 실패: ${shiftError.message}`);
  return shift.id as string;
}

export async function sendTestLocation(
  shiftId: string,
  lat: number,
  lng: number
) {
  const supabase = createAdminClient();

  // shift 정보 확인
  const { data: shift, error: shiftError } = await supabase
    .from("daily_shifts")
    .select("id, member_id, client_id, arrival_status, start_time, work_date")
    .eq("id", shiftId)
    .single();

  if (shiftError || !shift) throw new Error("배정을 찾을 수 없습니다");

  // 이미 도착/노쇼 확정이면 스킵
  if (["arrived", "late", "noshow"].includes(shift.arrival_status)) {
    return { arrived: true, status: shift.arrival_status, distance: null };
  }

  // 위치 로그 INSERT
  await supabase.from("location_logs").insert({
    shift_id: shiftId,
    member_id: shift.member_id,
    lat,
    lng,
    speed: null,
    accuracy: null,
  });

  // shift 최신 위치 업데이트
  const updateData: Record<string, unknown> = {
    last_known_lat: lat,
    last_known_lng: lng,
    last_seen_at: new Date().toISOString(),
  };

  if (shift.arrival_status === "pending") {
    updateData.arrival_status = "tracking";
    updateData.tracking_started_at = new Date().toISOString();
  }

  // 도착 판별 (10m 지오펜스)
  const { data: distResult } = await supabase
    .rpc("check_arrival_distance", {
      p_shift_id: shiftId,
      p_lat: lat,
      p_lng: lng,
      p_radius: 10,
    })
    .maybeSingle() as { data: { is_arrived: boolean; distance_meters: number } | null };

  let arrived = false;

  if (distResult?.is_arrived) {
    const now = new Date();
    const shiftStart = new Date(`${shift.work_date}T${shift.start_time}+09:00`);
    const isLate = now > shiftStart;

    updateData.arrival_status = isLate ? "late" : "arrived";
    updateData.arrived_at = now.toISOString();
    arrived = true;
  } else if (shift.arrival_status === "pending" || shift.arrival_status === "tracking") {
    updateData.arrival_status = "moving";
  }

  await supabase
    .from("daily_shifts")
    .update(updateData)
    .eq("id", shiftId);

  return {
    arrived,
    status: updateData.arrival_status as string,
    distance: distResult?.distance_meters ?? null,
  };
}

export async function deleteTestShift(shiftId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("daily_shifts")
    .delete()
    .eq("id", shiftId);

  if (error) throw new Error(`배정 삭제 실패: ${error.message}`);
}

export async function getTestShifts() {
  const supabase = createAdminClient();

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 이강석 member id 찾기
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("phone", TEST_PHONE)
    .single();

  if (!member) return [];

  const { data: shifts } = await supabase
    .from("daily_shifts")
    .select(
      `
      id, client_id, member_id, work_date, start_time, end_time,
      arrival_status, risk_level, arrived_at,
      last_known_lat, last_known_lng, last_seen_at,
      location_consent, tracking_started_at,
      created_at, updated_at,
      clients (company_name, location, latitude, longitude, contact_phone),
      members (name, phone)
    `
    )
    .eq("member_id", member.id)
    .eq("work_date", today)
    .order("start_time", { ascending: true });

  return (shifts ?? []) as unknown as import("@/types/location").DailyShiftWithDetails[];
}
