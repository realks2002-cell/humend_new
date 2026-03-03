"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createClient as createBareClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function changePassword(currentPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    return { error: "새 비밀번호는 6자리 이상이어야 합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "로그인이 필요합니다." };
  }

  // 현재 비밀번호 검증 (별도 클라이언트로 세션 쿠키 충돌 방지)
  const verifyClient = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  // 새 비밀번호 설정
  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    return { error: "비밀번호 변경에 실패했습니다." };
  }

  return { success: true };
}

export async function cancelApplication(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const admin = createAdminClient();

  // 본인의 지원인지 + 상태 확인
  const { data: app, error: fetchError } = await admin
    .from("applications")
    .select("id, member_id, status")
    .eq("id", applicationId)
    .single();

  if (fetchError || !app) {
    return { error: "지원 내역을 찾을 수 없습니다." };
  }

  if (app.member_id !== user.id) {
    return { error: "본인의 지원만 취소할 수 있습니다." };
  }

  if (app.status !== "대기" && app.status !== "승인") {
    return { error: "대기 또는 승인 상태의 지원만 취소할 수 있습니다." };
  }

  // 승인 상태인 경우 연관된 work_records 삭제
  if (app.status === "승인") {
    const { data: workRecords } = await admin
      .from("work_records")
      .select("id")
      .eq("application_id", applicationId);

    if (workRecords && workRecords.length > 0) {
      const wrIds = workRecords.map((r) => r.id);
      await admin.from("payments").delete().in("work_record_id", wrIds);
    }

    await admin.from("work_records").delete().eq("application_id", applicationId);
  }

  // 상태를 취소로 변경
  const { error: updateError } = await admin
    .from("applications")
    .update({ status: "취소" })
    .eq("id", applicationId);

  if (updateError) {
    return { error: "취소 처리에 실패했습니다." };
  }

  revalidatePath("/my/applications");
  return { success: true };
}

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
