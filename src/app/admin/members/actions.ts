"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getWorkRecordsByMemberId } from "@/lib/supabase/queries";

export async function deleteMemberAction(memberId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("members")
    .update({ status: "inactive" })
    .eq("id", memberId);

  if (error) {
    return { error: `회원 삭제에 실패했습니다: ${error.message}` };
  }

  revalidatePath("/admin/members");
  return { success: true };
}

export async function restoreMemberAction(memberId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("members")
    .update({ status: "active" })
    .eq("id", memberId);

  if (error) {
    return { error: `회원 복구에 실패했습니다: ${error.message}` };
  }

  revalidatePath("/admin/members");
  return { success: true };
}

export async function getMemberWorkRecords(memberId: string) {
  return getWorkRecordsByMemberId(memberId);
}

export async function updateMemberMemo(memberId: string, memo: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("members")
    .update({ admin_memo: memo || null })
    .eq("id", memberId);

  if (error) {
    return { error: `메모 저장에 실패했습니다: ${error.message}` };
  }

  revalidatePath("/admin/members");
  return { success: true };
}
