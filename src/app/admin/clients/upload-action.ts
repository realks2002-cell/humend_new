"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function uploadClientImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { error: "파일이 없습니다." };

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("client-images")
    .upload(filePath, file);

  if (error) {
    console.error("uploadClientImage error:", error);
    return { error: error.message };
  }

  const { data: urlData } = admin.storage
    .from("client-images")
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl };
}
