import { createAdminClient } from "@/lib/supabase/server";
import { sendPush, sendPushToTokens } from "./fcm";

interface NotifyOptions {
  memberId: string;
  title: string;
  body: string;
  url?: string;
  triggerType?: "auto" | "manual";
}

/** 특정 회원에게 푸시 발송 + 로그 기록 */
async function notifyMember(opts: NotifyOptions) {
  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token")
    .eq("member_id", opts.memberId);

  if (!tokens || tokens.length === 0) return;

  const data: Record<string, string> = opts.url ? { url: opts.url } : {};
  let sentCount = 0;

  for (const t of tokens) {
    const result = await sendPush(t.fcm_token, {
      title: opts.title,
      body: opts.body,
      data,
    });
    if (result.success) sentCount++;
  }

  // 로그 기록
  await supabase.from("notification_logs").insert({
    title: opts.title,
    body: opts.body,
    target_type: "individual",
    target_member_id: opts.memberId,
    sent_count: sentCount,
    trigger_type: opts.triggerType ?? "auto",
  });
}

/** 전체 활성 회원에게 푸시 발송 */
async function notifyAll(opts: {
  title: string;
  body: string;
  url?: string;
  triggerType?: "auto" | "manual";
  sentBy?: string;
}) {
  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token");

  if (!tokens || tokens.length === 0) return 0;

  const data: Record<string, string> = opts.url ? { url: opts.url } : {};
  const result = await sendPushToTokens(
    tokens.map((t) => t.fcm_token),
    { title: opts.title, body: opts.body, data }
  );

  await supabase.from("notification_logs").insert({
    title: opts.title,
    body: opts.body,
    target_type: "all",
    target_member_id: null,
    sent_by: opts.sentBy ?? null,
    sent_count: result.sent,
    trigger_type: opts.triggerType ?? "auto",
  });

  return result.sent;
}

// ========== 이벤트별 알림 함수 ==========

/** 지원 승인 알림 */
export async function notifyApplicationApproved(
  memberId: string,
  companyName: string,
  workDate: string
) {
  await notifyMember({
    memberId,
    title: "지원이 승인되었습니다",
    body: `${companyName} ${workDate} 근무가 확정되었습니다.`,
    url: "/my/applications",
  });
}

/** 지원 거절 알림 */
export async function notifyApplicationRejected(
  memberId: string,
  companyName: string,
  workDate: string
) {
  await notifyMember({
    memberId,
    title: "지원 결과 안내",
    body: `${companyName} ${workDate} 지원이 반영되지 않았습니다.`,
    url: "/my/applications",
  });
}

/** 근무내역 등록 알림 */
export async function notifyWorkRecordCreated(
  memberId: string,
  companyName: string,
  workDate: string
) {
  await notifyMember({
    memberId,
    title: "근무내역이 등록되었습니다",
    body: `${companyName} ${workDate} 근무내역을 확인하세요.`,
    url: "/my/history",
  });
}

/** 급여 확정 알림 */
export async function notifyPaymentConfirmed(
  memberId: string,
  netPay: number
) {
  const formatted = netPay.toLocaleString("ko-KR");
  await notifyMember({
    memberId,
    title: "급여가 확정되었습니다",
    body: `실수령액 ${formatted}원이 확정되었습니다.`,
    url: "/my/salary",
  });
}

/** 새 공고 등록 알림 (전체) */
export async function notifyNewJobPosting(
  companyName: string,
  workDate: string
) {
  await notifyAll({
    title: "새로운 일자리가 등록되었습니다",
    body: `${companyName} ${workDate} - 지금 확인하세요!`,
    url: "/jobs",
  });
}

/** 관리자 수동 푸시 발송 */
export async function sendManualPush(opts: {
  title: string;
  body: string;
  targetMemberId?: string;
  sentBy: string;
}): Promise<number> {
  if (opts.targetMemberId) {
    await notifyMember({
      memberId: opts.targetMemberId,
      title: opts.title,
      body: opts.body,
      url: "/my",
      triggerType: "manual",
    });
    return 1;
  }

  const sent = await notifyAll({
    title: opts.title,
    body: opts.body,
    url: "/my",
    triggerType: "manual",
    sentBy: opts.sentBy,
  });

  return sent ?? 0;
}
