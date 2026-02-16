"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getAdmins() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admins")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: data ?? [] };
}

export async function createAdmin(adminId: string, name: string, password: string) {
  if (!adminId || !name || !password) {
    return { error: "모든 항목을 입력해주세요." };
  }

  if (password.length < 6) {
    return { error: "비밀번호는 6자리 이상이어야 합니다." };
  }

  const email = `${adminId}@admin.humend.hr`;
  const supabase = createAdminClient();

  // 1. Supabase Auth 사용자 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "admin" },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return { error: "이미 존재하는 관리자 아이디입니다." };
    }
    return { error: `계정 생성 실패: ${authError.message}` };
  }

  // 2. admins 테이블에 추가
  const { error: insertError } = await supabase.from("admins").insert({
    id: authData.user.id,
    email,
    name,
    role: "admin",
  });

  if (insertError) {
    // 롤백: Auth 사용자 삭제
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { error: `관리자 등록 실패: ${insertError.message}` };
  }

  return { success: true };
}

export async function deleteAdmin(id: string) {
  if (!id) {
    return { error: "관리자 ID가 필요합니다." };
  }

  const supabase = createAdminClient();

  // admins 테이블에서 삭제
  const { error: deleteError } = await supabase
    .from("admins")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { error: `삭제 실패: ${deleteError.message}` };
  }

  // Auth 사용자 삭제
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) {
    console.error("[deleteAdmin] auth delete error:", authError.message);
  }

  return { success: true };
}
