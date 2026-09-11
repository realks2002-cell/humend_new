"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseFamilyCertFile, saveFamilyCert, type FamilyCertResult } from "@/lib/family-cert";

export async function uploadFamilyCert(formData: FormData): Promise<FamilyCertResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const file = await parseFamilyCertFile(formData.get("file"));
  if ("error" in file) return { error: file.error };

  const result = await saveFamilyCert(user.id, file);
  if (!result.error) revalidatePath("/my");
  return result;
}
