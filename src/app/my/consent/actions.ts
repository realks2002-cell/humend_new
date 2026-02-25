"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

interface SubmitConsentInput {
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
  signatureDataUrl: string;
}

export async function submitConsent(input: SubmitConsentInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 1. 서명 이미지 Vercel Blob 업로드
  const base64 = input.signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const fileName = `consent-signatures/${user.id}/signature_${Date.now()}.png`;

  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const admin = createAdminClient();

  // 2. 기존 active 동의서 revoked 처리
  await admin
    .from("parental_consents")
    .update({ status: "revoked" })
    .eq("member_id", user.id)
    .eq("status", "active");

  // 3. 새 동의서 저장
  const { error: insertError } = await admin
    .from("parental_consents")
    .insert({
      member_id: user.id,
      guardian_name: input.guardianName,
      guardian_phone: input.guardianPhone,
      guardian_relationship: input.guardianRelationship,
      signature_url: blob.url,
      status: "active",
      consented_at: new Date().toISOString(),
    });

  if (insertError) return { error: `저장 실패: ${insertError.message}` };

  revalidatePath("/my/consent");
  revalidatePath("/my");
  return { success: true };
}

export async function revokeConsent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();
  await admin
    .from("parental_consents")
    .update({ status: "revoked" })
    .eq("member_id", user.id)
    .eq("status", "active");

  revalidatePath("/my/consent");
  revalidatePath("/my");
  return { success: true };
}
