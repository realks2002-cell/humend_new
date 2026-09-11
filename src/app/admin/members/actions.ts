"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getWorkRecordsByMemberId } from "@/lib/supabase/queries";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getFamilyCertSignedUrl } from "@/lib/family-cert";

export async function deleteMemberAction(memberId: string) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  return getWorkRecordsByMemberId(memberId);
}

export async function getMemberFamilyCert(memberId: string) {
  await requireAdmin();
  return getFamilyCertSignedUrl(memberId);
}

export async function updateMemberMemo(memberId: string, memo: string) {
  await requireAdmin();
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
