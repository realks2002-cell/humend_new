"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { notifyShiftAssigned } from "@/lib/push/attendance-notify";
import { sendPush } from "@/lib/push/fcm";

const SEED_MEMBERS = [
  { name: "이강석", phone: "01034061921" },
  { name: "이윤주", phone: "01023596976" },
];

export async function createTestClient(placeName: string, lat: number, lng: number) {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("company_name", placeName)
    .single();

  if (existing) {
    await supabase
      .from("clients")
      .update({ latitude: lat, longitude: lng, location: placeName, is_test: true })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: newClient, error } = await supabase
    .from("clients")
    .insert({ company_name: placeName, location: placeName, latitude: lat, longitude: lng, is_test: true })
    .select("id")
    .single();

  if (error) throw new Error(`근무지 등록 실패: ${error.message}`);
  return newClient.id as string;
}

export interface TestMember {
  id: string;
  name: string;
  phone: string;
}

export async function getTestMembers(): Promise<TestMember[]> {
  const supabase = createAdminClient();

  const seedPhones = SEED_MEMBERS.map((m) => m.phone);
  const bulkPhones = Array.from({ length: 30 }, (_, i) =>
    `010${String(i + 1).padStart(7, "0")}`
  );
  const allPhones = [...seedPhones, ...bulkPhones];

  const { data } = await supabase
    .from("members")
    .select("id, name, phone")
    .in("phone", allPhones);

  return (data ?? []) as TestMember[];
}

export async function addTestMember(name: string, phone: string): Promise<TestMember> {
  const supabase = createAdminClient();

  // 기존 멤버 확인
  const { data: existing } = await supabase
    .from("members")
    .select("id, name, phone")
    .eq("phone", phone)
    .single();

  if (existing) return existing as TestMember;

  // Auth 유저 생성 (E.164 형식 필요)
  const e164Phone = phone.startsWith("+") ? phone : `+82${phone.replace(/^0/, "")}`;
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      phone: e164Phone,
      phone_confirm: true,
    });

  if (authError) throw new Error(`Auth 유저 생성 실패: ${authError.message}`);

  const { error: memberError } = await supabase.from("members").insert({
    id: authUser.user.id,
    phone,
    name,
  });

  if (memberError) throw new Error(`멤버 생성 실패: ${memberError.message}`);

  return { id: authUser.user.id, name, phone };
}

export async function removeTestMember(memberId: string) {
  const supabase = createAdminClient();

  // 해당 멤버의 오늘 배정 삭제
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  await supabase
    .from("daily_shifts")
    .delete()
    .eq("member_id", memberId)
    .eq("work_date", today);
}

async function ensureTestMember(phone: string, name: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("phone", phone)
    .single();

  if (existing) return existing.id as string;

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
    });

  if (authError) throw new Error(`Auth 유저 생성 실패: ${authError.message}`);

  const { error: memberError } = await supabase.from("members").insert({
    id: authUser.user.id,
    phone,
    name,
  });

  if (memberError) throw new Error(`멤버 생성 실패: ${memberError.message}`);

  return authUser.user.id;
}

export async function triggerCron() {
  const supabase = createAdminClient();
  const now = new Date();
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: shifts } = await supabase
    .from("daily_shifts")
    .select(`
      id, member_id, start_time, arrival_status,
      alert_minutes_before, alert_interval_minutes, alert_max_count,
      notification_sent_count, last_notification_at,
      custom_notify_message, custom_repeat_message,
      clients (company_name)
    `)
    .eq("work_date", today)
    .in("arrival_status", ["pending", "notified"]);

  if (!shifts || shifts.length === 0) return { checked: 0, notified: 0 };

  const { notifyAttendanceCheck } = await import("@/lib/push/attendance-notify");

  let notified = 0;
  for (const shift of shifts) {
    const shiftStart = new Date(`${today}T${shift.start_time}+09:00`);
    const minutesUntil = (shiftStart.getTime() - now.getTime()) / 60000;
    const companyName =
      (shift.clients as unknown as { company_name: string })?.company_name ?? "근무지";
    const timeStr = shift.start_time.slice(0, 5);
    const customNotify = (shift as any).custom_notify_message as string | null;
    const customRepeat = (shift as any).custom_repeat_message as string | null;

    if (shift.arrival_status === "pending") {
      if (minutesUntil <= shift.alert_minutes_before && minutesUntil > 0) {
        await notifyAttendanceCheck(shift.member_id, shift.id, companyName, timeStr, customNotify || undefined);
        await supabase
          .from("daily_shifts")
          .update({ arrival_status: "notified", notification_sent_count: 1, last_notification_at: now.toISOString() })
          .eq("id", shift.id);
        notified++;
      }
    } else if (shift.arrival_status === "notified") {
      const lastNotif = shift.last_notification_at ? new Date(shift.last_notification_at) : null;
      const minutesSinceLast = lastNotif ? (now.getTime() - lastNotif.getTime()) / 60000 : Infinity;

      if (minutesSinceLast >= shift.alert_interval_minutes - 1 && shift.notification_sent_count < shift.alert_max_count) {
        await notifyAttendanceCheck(shift.member_id, shift.id, companyName, timeStr, customRepeat || customNotify || undefined);
        await supabase
          .from("daily_shifts")
          .update({ notification_sent_count: shift.notification_sent_count + 1, last_notification_at: now.toISOString() })
          .eq("id", shift.id);
        notified++;
      }
    }
  }

  return { checked: shifts.length, notified };
}

export async function createTestShift(
  placeName: string,
  lat: number,
  lng: number,
  startTime: string,
  memberId: string,
  alertOptions?: {
    alertMinutesBefore?: number;
    alertIntervalMinutes?: number;
    alertMaxCount?: number;
  }
) {
  const supabase = createAdminClient();

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
      .update({ latitude: lat, longitude: lng, location: placeName, is_test: true })
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
        is_test: true,
      })
      .select("id")
      .single();
    if (clientError) throw new Error(`고객사 생성 실패: ${clientError.message}`);
    clientId = newClient.id;
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [h, m] = startTime.split(":").map(Number);
  const endTime = `${String(Math.min(h + 9, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  const { data: existingShift } = await supabase
    .from("daily_shifts")
    .select("id")
    .eq("member_id", memberId)
    .eq("work_date", today)
    .single();

  const alertData = {
    ...(alertOptions?.alertMinutesBefore != null && { alert_minutes_before: alertOptions.alertMinutesBefore }),
    ...(alertOptions?.alertIntervalMinutes != null && { alert_interval_minutes: alertOptions.alertIntervalMinutes }),
    ...(alertOptions?.alertMaxCount != null && { alert_max_count: alertOptions.alertMaxCount }),
  };

  if (existingShift) {
    const { error } = await supabase
      .from("daily_shifts")
      .update({
        client_id: clientId,
        start_time: startTime,
        end_time: endTime,
        arrival_status: "pending",
        arrived_at: null,
        confirmed_at: null,
        nearby_at: null,
        notification_sent_count: 0,
        last_notification_at: null,
        ...alertData,
      })
      .eq("id", existingShift.id);

    if (error) throw new Error(`배정 업데이트 실패: ${error.message}`);
    await notifyShiftAssigned(memberId, placeName, today, startTime);
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
      ...alertData,
    })
    .select("id")
    .single();

  if (shiftError) throw new Error(`배정 생성 실패: ${shiftError.message}`);
  await notifyShiftAssigned(memberId, placeName, today, startTime);
  return shift.id as string;
}

export async function cleanupTestClients() {
  const supabase = createAdminClient();

  const { data: testClients } = await supabase
    .from("clients")
    .select("id")
    .eq("is_test", true);

  if (!testClients || testClients.length === 0) return { deleted: 0 };

  const clientIds = testClients.map((c) => c.id);

  await supabase
    .from("daily_shifts")
    .delete()
    .in("client_id", clientIds);

  await supabase
    .from("job_postings")
    .delete()
    .in("client_id", clientIds);

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("is_test", true);

  if (error) throw new Error(`테스트 고객사 삭제 실패: ${error.message}`);

  return { deleted: clientIds.length };
}

export async function updateClientLocation(clientId: string, lat: number, lng: number) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("clients")
    .update({ latitude: lat, longitude: lng })
    .eq("id", clientId);

  if (error) throw new Error(`고객사 위치 업데이트 실패: ${error.message}`);
}

export async function deleteTestShift(shiftId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("daily_shifts")
    .delete()
    .eq("id", shiftId);

  if (error) throw new Error(`배정 삭제 실패: ${error.message}`);
}

export async function bulkCreateTestMembers(count: number): Promise<string[]> {
  const supabase = createAdminClient();
  const memberIds: string[] = [];

  for (let i = 1; i <= count; i++) {
    const name = `테스트${String(i).padStart(2, "0")}`;
    const phone = `010${String(i).padStart(7, "0")}`;

    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("phone", phone)
      .single();

    if (existing) {
      memberIds.push(existing.id as string);
      continue;
    }

    const e164Phone = `+82${phone.replace(/^0/, "")}`;
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        phone: e164Phone,
        phone_confirm: true,
      });

    if (authError) {
      console.error(`멤버 ${name} 생성 실패:`, authError.message);
      continue;
    }

    const { error: memberError } = await supabase.from("members").insert({
      id: authUser.user.id,
      phone,
      name,
    });

    if (memberError) {
      console.error(`멤버 ${name} DB 삽입 실패:`, memberError.message);
      continue;
    }

    memberIds.push(authUser.user.id);
  }

  return memberIds;
}

export async function bulkCreateTestShifts(
  memberIds: string[],
  placeName: string,
  lat: number,
  lng: number,
  startTime: string
): Promise<string[]> {
  const supabase = createAdminClient();

  // 고객사 upsert
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("company_name", placeName)
    .single();

  let clientId: string;

  if (existingClient) {
    await supabase
      .from("clients")
      .update({ latitude: lat, longitude: lng, location: placeName, is_test: true })
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
        is_test: true,
      })
      .select("id")
      .single();
    if (clientError) throw new Error(`고객사 생성 실패: ${clientError.message}`);
    clientId = newClient.id;
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [h, m] = startTime.split(":").map(Number);
  const endTime = `${String(Math.min(h + 9, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  // 기존 배정 확인
  const { data: existingShifts } = await supabase
    .from("daily_shifts")
    .select("id, member_id")
    .in("member_id", memberIds)
    .eq("work_date", today);

  const existingMap = new Map(
    (existingShifts ?? []).map((s) => [s.member_id, s.id as string])
  );

  const toInsert: { client_id: string; member_id: string; work_date: string; start_time: string; end_time: string; arrival_status: string }[] = [];
  const toUpdate: string[] = [];
  const shiftIds: string[] = [];

  for (const memberId of memberIds) {
    const existingId = existingMap.get(memberId);
    if (existingId) {
      toUpdate.push(existingId);
      shiftIds.push(existingId);
    } else {
      toInsert.push({
        client_id: clientId,
        member_id: memberId,
        work_date: today,
        start_time: startTime,
        end_time: endTime,
        arrival_status: "pending",
      });
    }
  }

  // 기존 배정 업데이트
  if (toUpdate.length > 0) {
    await supabase
      .from("daily_shifts")
      .update({
        client_id: clientId,
        start_time: startTime,
        end_time: endTime,
        arrival_status: "pending",
        arrived_at: null,
        confirmed_at: null,
        nearby_at: null,
        notification_sent_count: 0,
        last_notification_at: null,
      })
      .in("id", toUpdate);
  }

  // 신규 배정 일괄 생성
  if (toInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("daily_shifts")
      .insert(toInsert)
      .select("id");

    if (insertError) throw new Error(`일괄 배정 생성 실패: ${insertError.message}`);
    shiftIds.push(...(inserted ?? []).map((s) => s.id as string));
  }

  // 푸시알림 병렬 발송
  await Promise.allSettled(
    memberIds.map((memberId) =>
      notifyShiftAssigned(memberId, placeName, today, startTime).catch(console.error)
    )
  );

  return shiftIds;
}

export async function markShiftsNoshow(shiftIds: string[]) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("daily_shifts")
    .update({ arrival_status: "noshow" })
    .in("id", shiftIds);
  if (error) throw new Error(`노쇼 마킹 실패: ${error.message}`);
}

export async function resetTestShifts() {
  const supabase = createAdminClient();

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const members = await getTestMembers();
  if (members.length === 0) return { reset: 0 };

  const memberIds = members.map((m) => m.id);

  const { data: shifts } = await supabase
    .from("daily_shifts")
    .select("id")
    .in("member_id", memberIds)
    .eq("work_date", today);

  if (!shifts || shifts.length === 0) return { reset: 0 };

  const shiftIds = shifts.map((s) => s.id as string);

  const { error } = await supabase
    .from("daily_shifts")
    .update({
      arrival_status: "pending",
      arrived_at: null,
      confirmed_at: null,
      nearby_at: null,
      notification_sent_count: 0,
      last_notification_at: null,
    })
    .in("id", shiftIds);

  if (error) throw new Error(`초기화 실패: ${error.message}`);

  return { reset: shiftIds.length };
}

export interface PushDiagnosis {
  memberId: string;
  memberName: string;
  tokenCount: number;
  tokens: { fcm_token: string; platform: string; updated_at: string }[];
  recentNotifications: { title: string; sent_at: string; success: boolean }[];
  todayShiftAlertAt: string | null;
}

export async function diagnosePushStatus(memberId: string): Promise<PushDiagnosis> {
  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from("members")
    .select("name")
    .eq("id", memberId)
    .single();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token, platform, updated_at")
    .eq("member_id", memberId)
    .order("updated_at", { ascending: false });

  const { data: logs } = await supabase
    .from("notification_logs")
    .select("title, sent_at, success")
    .eq("member_id", memberId)
    .order("sent_at", { ascending: false })
    .limit(5);

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: todayShift } = await supabase
    .from("daily_shifts")
    .select("last_notification_at")
    .eq("member_id", memberId)
    .eq("work_date", today)
    .single();

  return {
    memberId,
    memberName: (member?.name as string) ?? "알 수 없음",
    tokenCount: tokens?.length ?? 0,
    tokens: (tokens ?? []) as PushDiagnosis["tokens"],
    recentNotifications: (logs ?? []) as PushDiagnosis["recentNotifications"],
    todayShiftAlertAt: (todayShift?.last_notification_at as string) ?? null,
  };
}

export async function sendTestPushToMember(memberId: string): Promise<{ sent: number; failed: number; noTokens: boolean }> {
  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token")
    .eq("member_id", memberId);

  if (!tokens || tokens.length === 0) {
    return { sent: 0, failed: 0, noTokens: true };
  }

  let sent = 0;
  let failed = 0;

  for (const { fcm_token } of tokens) {
    const result = await sendPush(fcm_token as string, {
      title: "[테스트] 푸시 알림 확인",
      body: "이 메시지가 보이면 푸시 알림이 정상 작동 중입니다.",
      data: { type: "test" },
    });
    if (result.success) sent++;
    else failed++;
  }

  return { sent, failed, noTokens: false };
}

export async function getTestShifts() {
  const supabase = createAdminClient();

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 테스트 멤버 목록 가져오기
  const members = await getTestMembers();
  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.id);

  const { data: shifts } = await supabase
    .from("daily_shifts")
    .select(
      `
      id, client_id, member_id, work_date, start_time, end_time,
      arrival_status, arrived_at, confirmed_at, nearby_at,
      alert_minutes_before, notification_sent_count,
      created_at, updated_at,
      clients (company_name, location, latitude, longitude, contact_phone),
      members (name, phone)
    `
    )
    .in("member_id", memberIds)
    .eq("work_date", today)
    .order("start_time", { ascending: true });

  return (shifts ?? []) as unknown as import("@/types/location").DailyShiftWithDetails[];
}
