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

  if (password.length !== 6 || !/^\d{6}$/.test(password)) {
    return { error: "비밀번호는 숫자 6자리여야 합니다." };
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
      return { error: "이미 가입된 전화번호입니다." };
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
    return { error: "전화번호 또는 비밀번호가 올바르지 않습니다." };
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

  // 이메일로 임시 비밀번호 전송
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Humend HR <noreply@humend.hr>",
      to: email,
      subject: "[Humend HR] 임시 비밀번호 안내",
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px 24px;">
          <h2 style="margin:0 0 8px;font-size:20px;">임시 비밀번호 안내</h2>
          <p style="color:#666;font-size:14px;margin:0 0 24px;">
            ${member.name ?? "회원"}님, 임시 비밀번호가 발급되었습니다.
          </p>
          <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;">
            <p style="color:#666;font-size:13px;margin:0 0 8px;">임시 비밀번호</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#15803d;margin:0;">
              ${tempPassword}
            </p>
          </div>
          <p style="color:#999;font-size:12px;margin:24px 0 0;line-height:1.6;">
            이 비밀번호로 로그인 후 반드시 비밀번호를 변경해주세요.<br/>
            본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.
          </p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("[resetPasswordByEmail] email send error:", emailError);
    // 이메일 전송 실패해도 비밀번호는 이미 변경됨 - 에러 반환
    return { error: "이메일 전송에 실패했습니다. 관리자에게 문의해주세요." };
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
