"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

interface SubmitHealthCertInput {
  date: string; // YYYY-MM-DD
  imageDataUrl: string; // base64 data URL
}

export async function submitHealthCert(input: SubmitHealthCertInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 1. 이미지 Vercel Blob 업로드
  const base64 = input.imageDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const ext = input.imageDataUrl.startsWith("data:image/png") ? "png" : "jpg";
  const fileName = `health-certs/${user.id}/health_cert_${Date.now()}.${ext}`;

  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: ext === "png" ? "image/png" : "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // 2. members 테이블 업데이트
  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({
      health_cert_date: input.date,
      health_cert_image_url: blob.url,
    })
    .eq("id", user.id);

  if (error) return { error: `저장 실패: ${error.message}` };

  revalidatePath("/my/health-cert");
  revalidatePath("/my");
  return { success: true };
}

export async function deleteHealthCert() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({
      health_cert_date: null,
      health_cert_image_url: null,
    })
    .eq("id", user.id);

  if (error) return { error: `삭제 실패: ${error.message}` };

  revalidatePath("/my/health-cert");
  revalidatePath("/my");
  return { success: true };
}
