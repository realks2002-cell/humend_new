"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateInquiryStatus(id: string, status: string) {
  if (!["pending", "contacted", "closed"].includes(status)) {
    return { error: "유효하지 않은 상태입니다." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("partner_inquiries")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/partners");
  return { success: true };
}
