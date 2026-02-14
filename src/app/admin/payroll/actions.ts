"use server";

import { bulkCreatePayments } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Member } from "@/lib/supabase/queries";

export async function bulkConfirm(workRecordIds: string[]) {
  // work_records 값을 복사하여 payments 생성 (이미 있으면 skip)
  const result = await bulkCreatePayments(workRecordIds);
  revalidatePath("/admin/payroll");
  return result;
}

export async function getMemberDetail(memberId: string): Promise<{ member: Member | null; profileImageUrl: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.from("members").select("*").eq("id", memberId).single();
  if (!data) return { member: null, profileImageUrl: null };

  const member = data as Member;
  let profileImageUrl: string | null = null;
  if (member.profile_image_url) {
    const { data: signed } = await admin.storage
      .from("profile-photos")
      .createSignedUrl(member.profile_image_url, 600);
    if (signed?.signedUrl) profileImageUrl = signed.signedUrl;
  }

  return { member, profileImageUrl };
}
