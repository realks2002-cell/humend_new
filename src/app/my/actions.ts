"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const admin = createAdminClient();
  const userId = user.id;

  // 1. payments 삭제 (work_records 참조)
  const { data: workRecords } = await admin
    .from("work_records")
    .select("id")
    .eq("member_id", userId);

  if (workRecords && workRecords.length > 0) {
    const wrIds = workRecords.map((r) => r.id);
    await admin.from("payments").delete().in("work_record_id", wrIds);
  }

  // 2. work_records 삭제
  await admin.from("work_records").delete().eq("member_id", userId);

  // 3. applications 삭제
  await admin.from("applications").delete().eq("member_id", userId);

  // 4. signatures 삭제
  await admin.from("signatures").delete().eq("member_id", userId);

  // 5. profile-photos 스토리지 삭제
  const { data: files } = await admin.storage
    .from("profile-photos")
    .list(userId);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    await admin.storage.from("profile-photos").remove(paths);
  }

  // 6. members 삭제
  await admin.from("members").delete().eq("id", userId);

  // 7. auth 유저 삭제
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    return { error: `탈퇴 처리 실패: ${error.message}` };
  }

  // 8. 세션 로그아웃
  await supabase.auth.signOut();

  revalidatePath("/");
  return { success: true };
}
