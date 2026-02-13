"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { saveClientPhotos } from "@/lib/supabase/queries";

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();

  const latStr = formData.get("latitude") as string | null;
  const lngStr = formData.get("longitude") as string | null;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      company_name: formData.get("company_name") as string,
      location: formData.get("location") as string,
      hourly_wage: Number(formData.get("hourly_wage")) || 0,
      contact_person: (formData.get("contact_person") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      dress_code: (formData.get("dress_code") as string) || null,
      work_guidelines: (formData.get("work_guidelines") as string) || null,
      description: (formData.get("description") as string) || null,
      latitude: latStr ? parseFloat(latStr) : null,
      longitude: lngStr ? parseFloat(lngStr) : null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "고객사 등록에 실패했습니다." };

  // 새 파일 업로드 + 기존 URL 합치기
  const photoUrlsStr = formData.get("photo_urls") as string;
  let existingUrls: string[] = [];
  try {
    existingUrls = JSON.parse(photoUrlsStr || "[]") as string[];
  } catch {}

  const newFiles = formData.getAll("new_photos") as File[];
  const uploadedUrls: string[] = [];
  if (newFiles.length > 0) {
    const admin = createAdminClient();
    for (const file of newFiles) {
      if (!file.size) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { error: upErr } = await admin.storage
        .from("client-images")
        .upload(filePath, buffer, { contentType: file.type || "image/jpeg" });
      if (!upErr) {
        const { data: urlData } = admin.storage.from("client-images").getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }
    }
  }

  const allUrls = [...existingUrls, ...uploadedUrls];
  if (allUrls.length > 0) {
    await saveClientPhotos(data.id, allUrls);
    const admin = createAdminClient();
    await admin.from("clients").update({ main_image_url: allUrls[0] }).eq("id", data.id);
  }

  revalidatePath("/admin/clients");
  revalidatePath("/");
  return { success: true };
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const supabase = await createClient();

  const latStr = formData.get("latitude") as string | null;
  const lngStr = formData.get("longitude") as string | null;

  const { error } = await supabase
    .from("clients")
    .update({
      company_name: formData.get("company_name") as string,
      location: formData.get("location") as string,
      hourly_wage: Number(formData.get("hourly_wage")) || 0,
      contact_person: (formData.get("contact_person") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      dress_code: (formData.get("dress_code") as string) || null,
      work_guidelines: (formData.get("work_guidelines") as string) || null,
      description: (formData.get("description") as string) || null,
      latitude: latStr ? parseFloat(latStr) : null,
      longitude: lngStr ? parseFloat(lngStr) : null,
    })
    .eq("id", clientId);

  if (error) return { error: "고객사 수정에 실패했습니다." };

  // 새 파일 업로드 + 기존 URL 합치기
  const photoUrlsStr = formData.get("photo_urls") as string;
  let existingUrls: string[] = [];
  try {
    existingUrls = JSON.parse(photoUrlsStr || "[]") as string[];
  } catch {}

  const newFiles = formData.getAll("new_photos") as File[];
  const uploadedUrls: string[] = [];
  if (newFiles.length > 0) {
    const admin = createAdminClient();
    for (const file of newFiles) {
      if (!file.size) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { error: upErr } = await admin.storage
        .from("client-images")
        .upload(filePath, buffer, { contentType: file.type || "image/jpeg" });
      if (!upErr) {
        const { data: urlData } = admin.storage.from("client-images").getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }
    }
  }

  const allUrls = [...existingUrls, ...uploadedUrls];
  await saveClientPhotos(clientId, allUrls);
  const adminForUpdate = createAdminClient();
  await adminForUpdate.from("clients").update({ main_image_url: allUrls[0] ?? null }).eq("id", clientId);

  revalidatePath("/admin/clients");
  revalidatePath("/");
  return { success: true };
}

export async function updateClientSortOrder(orderedIds: string[]) {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase.from("clients").update({ sort_order: index }).eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: "순서 저장에 실패했습니다." };

  revalidatePath("/admin/clients");
  revalidatePath("/jobs");
  return { success: true };
}

export async function deleteClientAction(clientId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (error) return { error: "고객사 삭제에 실패했습니다. 연결된 공고가 있을 수 있습니다." };
  revalidatePath("/admin/clients");
  return { success: true };
}
