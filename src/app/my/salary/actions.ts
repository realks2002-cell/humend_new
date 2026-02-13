"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitSignature(
  workRecordId: string,
  signatureDataUrl: string,
  workInfo?: { work_date: string; start_time: string; end_time: string; wage_type?: string; daily_wage?: number },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();

  // data URL → Blob
  const base64 = signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const fileName = `${user.id}/${workRecordId}_${Date.now()}.png`;

  // Supabase Storage에 업로드 (admin 클라이언트)
  const { error: uploadError } = await admin.storage
    .from("signatures")
    .upload(fileName, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) return { error: `서명 저장 실패: ${uploadError.message}` };

  // work_record 업데이트 (admin 클라이언트)
  const updateData: Record<string, unknown> = {
    signature_url: fileName,
    signed_at: new Date().toISOString(),
  };

  // 회원이 입력한 근무일/시간 반영
  if (workInfo) {
    updateData.work_date = workInfo.work_date;
    updateData.start_time = workInfo.start_time;
    updateData.end_time = workInfo.end_time;
    updateData.wage_type = workInfo.wage_type ?? "시급";

    // 일급인 경우: hourly_wage = daily_wage / 8, base_pay = daily_wage
    if (workInfo.wage_type === "일급" && workInfo.daily_wage) {
      updateData.hourly_wage = Math.round(workInfo.daily_wage / 8);
      updateData.base_pay = workInfo.daily_wage;
    }
  }

  const { error: updateError } = await admin
    .from("work_records")
    .update(updateData)
    .eq("id", workRecordId)
    .eq("member_id", user.id);

  if (updateError) return { error: `업데이트 실패: ${updateError.message}` };

  revalidatePath("/my/salary");
  revalidatePath("/admin/contracts");
  return { success: true };
}
