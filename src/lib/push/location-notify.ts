/**
 * 위치추적 관련 FCM 알림 함수
 * 기존 notify.ts 패턴 준수
 */
import { createAdminClient } from "@/lib/supabase/server";
import { sendPush } from "./fcm";

interface NotifyOptions {
  memberId: string;
  title: string;
  body: string;
  url?: string;
  triggerType?: "auto" | "manual";
}

async function notifyMemberLocation(opts: NotifyOptions) {
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
      data: opts.url ? { url: opts.url } : {},
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
  });
}

// ========== 회원 알림 ==========

/** 근무 배정 알림 */
export async function notifyShiftAssigned(
  memberId: string,
  companyName: string,
  workDate: string,
  startTime: string
) {
  await notifyMemberLocation({
    memberId,
    title: "근무가 배정되었습니다",
    body: `${companyName} ${workDate} ${startTime} 출근 예정`,
    url: "/my/tracking",
  });
}

/** 출근 2.5시간 전 사전 알림 */
export async function notifyPreShiftReminder(
  memberId: string,
  companyName: string,
  startTime: string
) {
  await notifyMemberLocation({
    memberId,
    title: "출근 준비 알림",
    body: `${companyName} ${startTime} 출근까지 2시간 30분 남았습니다.`,
    url: "/my/tracking",
  });
}

/** 출근 2시간 전 추적 시작 알림 */
export async function notifyTrackingStart(
  memberId: string,
  companyName: string
) {
  await notifyMemberLocation({
    memberId,
    title: "위치 추적이 시작됩니다",
    body: `${companyName} 출근 확인을 위해 위치 수집이 시작됩니다.`,
    url: "/my/tracking",
  });
}

/** 도착 확인 알림 */
export async function notifyArrivalConfirmed(
  memberId: string,
  companyName: string
) {
  await notifyMemberLocation({
    memberId,
    title: "출근이 확인되었습니다 ✓",
    body: `${companyName} 근무지 도착이 확인되었습니다.`,
    url: "/my/tracking",
  });
}

// ========== 관리자 알림 ==========

/** 관리자에게 노쇼 위험 경고 */
export async function notifyAdminNoshowRisk(
  adminId: string,
  memberName: string,
  companyName: string,
  riskLevel: number
) {
  const levelText = riskLevel === 1 ? "🟡 1단계" : riskLevel === 2 ? "🟠 2단계" : "🔴 3단계";

  await notifyMemberLocation({
    memberId: adminId,
    title: `노쇼 위험 ${levelText}`,
    body: `${memberName} - ${companyName} 출근 위험 감지`,
    url: "/admin/tracking",
  });
}

/** 관리자에게 노쇼 확정 알림 */
export async function notifyAdminNoshowConfirmed(
  adminId: string,
  memberName: string,
  companyName: string
) {
  await notifyMemberLocation({
    memberId: adminId,
    title: "⛔ 노쇼 확정",
    body: `${memberName} - ${companyName} 출근시간 +30분 경과, 노쇼 확정`,
    url: "/admin/tracking",
  });
}

/** 배정 취소 알림 */
export async function notifyShiftCancelled(
  memberId: string,
  companyName: string,
  workDate: string,
  startTime: string
) {
  await notifyMemberLocation({
    memberId,
    title: "근무 배정이 취소되었습니다",
    body: `${companyName} ${workDate} ${startTime} 배정이 취소되었습니다.`,
    url: "/my/tracking",
  });
}

/** 관리자에게 지각 예측 알림 */
export async function notifyAdminLatePrediction(
  adminId: string,
  memberName: string,
  companyName: string,
  etaMinutes: number
) {
  await notifyMemberLocation({
    memberId: adminId,
    title: "지각 예측",
    body: `${memberName} - ${companyName} 도착 예상 ${etaMinutes}분 후`,
    url: "/admin/tracking",
  });
}
