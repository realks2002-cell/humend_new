"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { saveClientPhotos } from "@/lib/supabase/queries";

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();

  const latStr = formData.get("latitude") as string | null;
  const lngStr = formData.get("longitude") as string | null;

  const insertData = {
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
    total_headcount: formData.get("total_headcount") ? Number(formData.get("total_headcount")) : null,
    work_type: (formData.get("work_type") as string) || null,
    gender_requirement: (formData.get("gender_requirement") as string) || null,
    application_method: (formData.get("application_method") as string) || null,
    work_category: (formData.get("work_category") as string) || null,
  };

  const { data, error } = await supabase
    .from("clients")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) return { error: "고객사 등록에 실패했습니다." };

  // base64 이미지 업로드 + 기존 URL 합치기
  const photoUrlsStr = formData.get("photo_urls") as string;
  let existingUrls: string[] = [];
  try {
    existingUrls = JSON.parse(photoUrlsStr || "[]") as string[];
  } catch {}

  const uploadedUrls = await uploadBase64Images(formData.get("new_photo_data") as string);

  const allUrls = [...existingUrls, ...uploadedUrls];
  if (allUrls.length > 0) {
    await saveClientPhotos(data.id, allUrls);
    const admin = createAdminClient();
    await admin.from("clients").update({ main_image_url: allUrls[0] }).eq("id", data.id);
  }

  revalidatePath("/admin/clients");
  revalidatePath("/jobs", "layout");
  revalidatePath("/");
  return { success: true };
}

async function uploadBase64Images(jsonStr: string | null): Promise<string[]> {
  if (!jsonStr) return [];
  let dataUrls: string[];
  try {
    dataUrls = JSON.parse(jsonStr) as string[];
  } catch {
    return [];
  }
  if (dataUrls.length === 0) return [];

  const admin = createAdminClient();
  const urls: string[] = [];

  for (const dataUrl of dataUrls) {
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) continue;

    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await admin.storage
      .from("client-images")
      .upload(filePath, buffer, { contentType: `image/${match[1]}` });

    if (!error) {
      const { data: urlData } = admin.storage.from("client-images").getPublicUrl(filePath);
      urls.push(urlData.publicUrl);
    }
  }

  return urls;
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const admin = createAdminClient();

  const latStr = formData.get("latitude") as string | null;
  const lngStr = formData.get("longitude") as string | null;

  const updateData = {
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
    total_headcount: formData.get("total_headcount") ? Number(formData.get("total_headcount")) : null,
    work_type: (formData.get("work_type") as string) || null,
    gender_requirement: (formData.get("gender_requirement") as string) || null,
    application_method: (formData.get("application_method") as string) || null,
    work_category: (formData.get("work_category") as string) || null,
  };

  const { error } = await admin
    .from("clients")
    .update(updateData)
    .eq("id", clientId);

  if (error) return { error: "고객사 수정에 실패했습니다." };

  // base64 이미지 업로드 + 기존 URL 합치기
  const photoUrlsStr = formData.get("photo_urls") as string;
  let existingUrls: string[] = [];
  try {
    existingUrls = JSON.parse(photoUrlsStr || "[]") as string[];
  } catch {}

  const uploadedUrls = await uploadBase64Images(formData.get("new_photo_data") as string);

  const allUrls = [...existingUrls, ...uploadedUrls];
  await saveClientPhotos(clientId, allUrls);
  const adminForUpdate = createAdminClient();
  await adminForUpdate.from("clients").update({ main_image_url: allUrls[0] ?? null }).eq("id", clientId);

  revalidatePath("/admin/clients");
  revalidatePath("/jobs", "layout");
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
