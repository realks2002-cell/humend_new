"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitSignature(workRecordId: string, signatureDataUrl: string) {
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
  const { error: updateError } = await admin
    .from("work_records")
    .update({
      signature_url: fileName,
      signed_at: new Date().toISOString(),
    })
    .eq("id", workRecordId)
    .eq("member_id", user.id);

  if (updateError) return { error: `업데이트 실패: ${updateError.message}` };

  revalidatePath("/my/salary");
  revalidatePath("/admin/contracts");
  return { success: true };
}
