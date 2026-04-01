import { createAdminClient } from "@/lib/supabase/server";
import { sendPush } from "./fcm";

interface NotifyOptions {
  memberId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  triggerType?: "auto" | "manual";
  shiftId?: string;
}

async function notifyMember(opts: NotifyOptions) {
  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token")
    .eq("member_id", opts.memberId);

  if (!tokens || tokens.length === 0) return;

  let sentCount = 0;
  for (const t of tokens) {
    const result = await sendPush(t.fcm_token, {
      title: opts.title,
      body: opts.body,
      data: opts.data ?? {},
    });
    if (result.success) sentCount++;
  }

  await supabase.from("notification_logs").insert({
    title: opts.title,
    body: opts.body,
    target_type: "individual",
    target_member_id: opts.memberId,
    sent_count: sentCount,
    trigger_type: opts.triggerType ?? "auto",
    ...(opts.shiftId && { shift_id: opts.shiftId }),
  });
}

// ========== 회원 알림 ==========

export async function notifyShiftAssigned(
  memberId: string,
  companyName: string,
  workDate: string,
  startTime: string,
  customMessage?: string,
  shiftId?: string,
  latitude?: number | null,
  longitude?: number | null
) {
  await notifyMember({
    memberId,
    title: customMessage || "근무가 배정되었습니다",
    body: `${companyName} ${workDate} ${startTime} 출근 예정`,
    data: {
      url: "/my/attendance",
      ...(latitude != null && longitude != null && shiftId ? {
        type: "geofence_register",
        lat: String(latitude),
        lng: String(longitude),
        shiftId,
        radius: "2000",
      } : {}),
    },
    shiftId,
  });
}

export async function notifyShiftCancelled(
  memberId: string,
  companyName: string,
  workDate: string,
  startTime: string,
  shiftId?: string
) {
  await notifyMember({
    memberId,
    title: "근무 배정이 취소되었습니다",
    body: `${companyName} ${workDate} ${startTime}`,
    data: { url: "/my/attendance" },
    shiftId,
  });
}

export async function notifyAttendanceCheck(
  memberId: string,
  shiftId: string,
  companyName: string,
  startTime: string,
  customTitle?: string,
  customBody?: string
) {
  await notifyMember({
    memberId,
    title: customTitle || "출근 예정이신가요?",
    body: customBody || `${companyName} ${startTime} 출근 — 터치하여 출근 의사를 알려주세요.`,
    data: {
      action: "confirm_attendance",
      shiftId,
      url: "/my/attendance",
    },
    shiftId,
  });
}

export async function notifyNoshowToMember(memberId: string, shiftId?: string) {
  await notifyMember({
    memberId,
    title: "노쇼 처리되었습니다",
    body: "출근 알림에 응답하지 않아 노쇼로 처리되었습니다.",
    data: { url: "/my/attendance" },
    shiftId,
  });
}

// ========== 관리자 알림 ==========

export async function notifyNoshowToAdmin(
  adminId: string,
  memberName: string,
  companyName: string
) {
  await notifyMember({
    memberId: adminId,
    title: "노쇼 확정",
    body: `${memberName} — ${companyName} 출근 알림 미응답으로 노쇼 처리됨`,
    data: { url: "/admin/shifts" },
  });
}
