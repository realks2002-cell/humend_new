"use server";

import { bulkCreatePayments } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Member } from "@/lib/supabase/queries";
import { notifyPaymentConfirmed } from "@/lib/push/notify";

export async function bulkConfirm(workRecordIds: string[]) {
  // work_records 값을 복사하여 payments 생성 (이미 있으면 skip)
  const result = await bulkCreatePayments(workRecordIds);

  // 급여 확정 푸시 알림 (실패해도 확정 처리에 영향 없음)
  sendPaymentNotifications(workRecordIds).catch(console.error);

  revalidatePath("/admin/payroll");
  return result;
}

async function sendPaymentNotifications(workRecordIds: string[]) {
  const admin = createAdminClient();
  const { data: records } = await admin
    .from("work_records")
    .select("member_id, net_pay")
    .in("id", workRecordIds);

  if (!records) return;

  // member_id별 합산
  const memberPayMap = new Map<string, number>();
  for (const r of records) {
    const prev = memberPayMap.get(r.member_id) ?? 0;
    memberPayMap.set(r.member_id, prev + (r.net_pay ?? 0));
  }

  for (const [memberId, netPay] of memberPayMap) {
    notifyPaymentConfirmed(memberId, netPay).catch(console.error);
  }
}

export async function deleteWorkRecord(workRecordId: string) {
  const admin = createAdminClient();

  // payments 먼저 삭제
  await admin.from("payments").delete().eq("work_record_id", workRecordId);

  const { error } = await admin.from("work_records").delete().eq("id", workRecordId);
  if (error) return { error: `삭제 실패: ${error.message}` };

  revalidatePath("/admin/payroll");
  return { success: true };
}

export async function getMemberDetail(memberId: string): Promise<{ member: Member | null; profileImageUrl: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.from("members").select("*").eq("id", memberId).single();
  if (!data) return { member: null, profileImageUrl: null };

  const member = data as Member;
  let profileImageUrl: string | null = null;
  if (member.profile_image_url) {
    if (member.profile_image_url.startsWith("http")) {
      profileImageUrl = member.profile_image_url;
    } else {
      const { data: signed } = await admin.storage
        .from("profile-photos")
        .createSignedUrl(member.profile_image_url, 600);
      if (signed?.signedUrl) profileImageUrl = signed.signedUrl;
    }
  }

  return { member, profileImageUrl };
}
