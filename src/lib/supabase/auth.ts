"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// 전화번호 → Supabase Auth용 이메일 변환
function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `${cleaned}@member.humend.hr`;
}

// 관리자 ID → Supabase Auth용 이메일 변환
function adminIdToEmail(adminId: string): string {
  return `${adminId}@admin.humend.hr`;
}

// ========== 회원 ==========

export async function memberSignup(formData: FormData) {
  const phone = formData.get("phone") as string;
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;

  if (!phone || !name || !password) {
    return { error: "모든 항목을 입력해주세요." };
  }

  if (password.length < 6) {
    return { error: "비밀번호는 6자리 이상이어야 합니다." };
  }

  const supabase = await createClient();
  const email = phoneToEmail(phone);

  // Supabase Auth 회원가입 (트리거가 members 테이블 자동 생성)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        phone: phone.replace(/[^0-9]/g, ""),
        name,
        role: "member",
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      // 고아 계정 복구: Auth에는 있지만 members에 없는 경우
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // 비밀번호 불일치 = 진짜 기존 회원
        return { error: "이미 가입된 전화번호입니다." };
      }

      const { createAdminClient } = await import("@/lib/supabase/server");
      const admin = createAdminClient();

      const { data: existingMember } = await admin
        .from("members")
        .select("id")
        .eq("id", signInData.user.id)
        .maybeSingle();

      if (existingMember) {
        // members에도 있음 = 진짜 중복 가입
        await supabase.auth.signOut();
        return { error: "이미 가입된 전화번호입니다." };
      }

      // members에 없음 = 고아 계정 → 복구
      const { error: recoverError } = await admin.from("members").insert({
        id: signInData.user.id,
        phone: phone.replace(/[^0-9]/g, ""),
        name,
        password,
      });

      if (recoverError) {
        console.error("[memberSignup] orphan recovery insert error:", recoverError.message);
        await supabase.auth.signOut();
        return { error: "회원가입에 실패했습니다. 다시 시도해주세요." };
      }

      return { success: true };
    }
    return { error: "회원가입에 실패했습니다. 다시 시도해주세요." };
  }

  if (!data.user) {
    return { error: "회원가입에 실패했습니다." };
  }

  // members 테이블에 레코드 생성
  const { error: memberError } = await supabase.from("members").insert({
    id: data.user.id,
    phone: phone.replace(/[^0-9]/g, ""),
    name,
    password,
  });

  if (memberError) {
    console.error("[memberSignup] members insert error:", memberError.message);
  }

  return { success: true };
}

export async function memberLogin(formData: FormData) {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return { error: "전화번호와 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const email = phoneToEmail(phone);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 구글 가입 회원 폴백: Auth 이메일이 @member.humend.hr이 아닌 경우
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();

    const cleaned = phone.replace(/[^0-9]/g, "");
    const { data: member } = await admin
      .from("members")
      .select("id")
      .eq("phone", cleaned)
      .maybeSingle();

    if (member) {
      const { data: authUser } = await admin.auth.admin.getUserById(member.id);
      if (authUser?.user?.email && authUser.user.email !== email) {
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: authUser.user.email,
          password,
        });
        if (!retryError) {
          return { success: true };
        }
      }
    }

    return { error: "전화번호 또는 비밀번호가 올바르지 않습니다." };
  }

  return { success: true };
}

// ========== 구글 회원가입 ==========

export async function createGoogleMember(formData: FormData) {
  const phone = formData.get("phone") as string;
  const name = formData.get("name") as string;

  if (!phone || !name) {
    return { error: "전화번호와 이름을 입력해주세요." };
  }

  const supabase = await createClient();

  // 현재 로그인된 구글 유저 확인
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "인증 정보가 없습니다. 다시 로그인해주세요." };
  }

  // RLS 우회를 위해 admin 클라이언트 사용
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();

  // 이미 members에 등록된 경우
  const { data: existing } = await admin
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: true };
  }

  // 같은 전화번호로 가입된 회원이 있는지 확인
  const cleanedPhone = phone.replace(/[^0-9]/g, "");
  const { data: phoneExists } = await admin
    .from("members")
    .select("*")
    .eq("phone", cleanedPhone)
    .maybeSingle();

  if (phoneExists) {
    const oldId = phoneExists.id;
    const newId = user.id;

    // 1. 새 member 먼저 생성 (FK 참조 대상 확보)
    const { id: _, created_at: __, updated_at: ___, ...rest } = phoneExists;
    await admin.from("members").insert({
      ...rest,
      id: newId,
      name: name || phoneExists.name,
    });

    // 2. FK 테이블 마이그레이션 (member_id를 구글 user ID로 이전)
    // payments는 work_records.member_id를 통해 자동 연결되므로 제외
    await Promise.all([
      admin.from("applications").update({ member_id: newId }).eq("member_id", oldId),
      admin.from("work_records").update({ member_id: newId }).eq("member_id", oldId),
      admin.from("device_tokens").update({ member_id: newId }).eq("member_id", oldId),
      admin.from("parental_consents").update({ member_id: newId }).eq("member_id", oldId),
    ]);

    // 3. 기존 member 삭제 + auth user 삭제
    await admin.from("members").delete().eq("id", oldId);
    await admin.auth.admin.deleteUser(oldId);

    return { success: true };
  }

  // members 테이블에 레코드 생성
  const { error: memberError } = await admin.from("members").insert({
    id: user.id,
    phone: cleanedPhone,
    name,
  });

  if (memberError) {
    console.error("[createGoogleMember] members insert error:", memberError.message);
    return { error: "회원 정보 저장에 실패했습니다." };
  }

  return { success: true };
}

// ========== 관리자 ==========

export async function adminLogin(formData: FormData) {
  const adminId = formData.get("adminId") as string;
  const password = formData.get("password") as string;

  if (!adminId || !password) {
    return { error: "아이디와 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const email = adminIdToEmail(adminId);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[adminLogin] email:", email, "error:", error.message, error.status);
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  // admins 테이블에 존재하는지 확인
  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("id", data.user.id)
    .single();

  if (!admin) {
    await supabase.auth.signOut();
    return { error: "관리자 권한이 없습니다." };
  }

  return { success: true };
}

// ========== 비밀번호 찾기 ==========

export async function resetPasswordByEmail(email: string) {
  if (!email || !email.includes("@")) {
    return { error: "올바른 이메일을 입력해주세요." };
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();

  // members 테이블에서 이메일로 회원 찾기
  const { data: member } = await admin
    .from("members")
    .select("id, phone, name")
    .eq("email", email)
    .maybeSingle();

  if (!member) {
    return { error: "해당 이메일로 등록된 회원이 없습니다." };
  }

  // 임시 비밀번호 생성 (숫자 6자리)
  const tempPassword = String(Math.floor(100000 + Math.random() * 900000));

  // Supabase Auth 비밀번호 업데이트
  const { error } = await admin.auth.admin.updateUserById(member.id, {
    password: tempPassword,
  });

  if (error) {
    console.error("[resetPasswordByEmail] error:", error.message);
    return { error: "비밀번호 재설정에 실패했습니다." };
  }

  // members 테이블에도 임시 비밀번호 저장 (관리자 조회용)
  await admin.from("members").update({ password: tempPassword }).eq("id", member.id);

  // 이메일로 임시 비밀번호 발송
  try {
    const { sendTempPasswordEmail } = await import("@/lib/email");
    await sendTempPasswordEmail({
      to: email,
      memberName: member.name,
      tempPassword,
    });
  } catch (e) {
    console.error("[resetPasswordByEmail] email send error:", e);
    return { error: "임시 비밀번호 이메일 발송에 실패했습니다." };
  }

  return { success: true };
}

// ========== 공통 ==========

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .single();

  return !!admin;
}
