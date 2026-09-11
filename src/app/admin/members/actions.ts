"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getWorkRecordsByMemberId } from "@/lib/supabase/queries";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getFamilyCertSignedUrl } from "@/lib/family-cert";
import { purgeMember } from "@/lib/member-purge";

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

export async function purgeMemberAction(memberId: string) {
  await requireAdmin();
  try {
    const { fileErrors } = await purgeMember(memberId);
    if (fileErrors.length > 0) console.error("[purgeMember] 파일 삭제 일부 실패:", memberId, fileErrors);
    revalidatePath("/admin/members");
    return { success: true, fileErrorCount: fileErrors.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getMemberHasConsent(memberId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("parental_consents")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("status", "active");
  if (error) throw new Error(`동의서 조회 실패: ${error.message}`);
  return (count ?? 0) > 0;
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
