"use server";

import { createClient } from "@/lib/supabase/server";
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

  // 사진 저장
  const photoUrlsStr = formData.get("photo_urls") as string;
  if (photoUrlsStr) {
    try {
      const urls = JSON.parse(photoUrlsStr) as string[];
      if (urls.length > 0) {
        await saveClientPhotos(data.id, urls);
      }
    } catch {
      // 사진 저장 실패는 무시
    }
  }

  revalidatePath("/admin/clients");
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

  // 사진 업데이트
  const photoUrlsStr = formData.get("photo_urls") as string;
  if (photoUrlsStr) {
    try {
      const urls = JSON.parse(photoUrlsStr) as string[];
      await saveClientPhotos(clientId, urls);
    } catch {
      // 사진 저장 실패는 무시
    }
  }

  revalidatePath("/admin/clients");
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
