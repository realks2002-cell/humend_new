"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getWorkRecordsByMemberId } from "@/lib/supabase/queries";

export async function deleteMemberAction(memberId: string) {
  const admin = createAdminClient();

  const { error } = await admin.from("members").delete().eq("id", memberId);

  if (error) {
    return { error: `회원 삭제에 실패했습니다: ${error.message}` };
  }

  // auth.users에서도 삭제
  const { error: authError } = await admin.auth.admin.deleteUser(memberId);
  if (authError) {
    console.error("[deleteMemberAction] auth delete error:", authError.message);
  }

  revalidatePath("/admin/members");
  return { success: true };
}

export async function getMemberWorkRecords(memberId: string) {
  return getWorkRecordsByMemberId(memberId);
}
