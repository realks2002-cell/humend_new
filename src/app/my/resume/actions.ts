"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveResume(formData: {
  birthDate: string;
  gender: string;
  region: string;
  hasExperience: string;
  experience: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  rrnFront: string;
  rrnBack: string;
  height: string;
  privacyAgreed: boolean;
  email: string;
  name?: string;
  phone?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const updateData: Record<string, unknown> = {
    birth_date: formData.birthDate || null,
    gender: formData.gender || null,
    region: formData.region || null,
    has_experience: formData.hasExperience === "yes",
    experience_detail: formData.experience || null,
    bank_name: formData.bankName || null,
    account_holder: formData.accountHolder || null,
    account_number: formData.accountNumber || null,
    rrn_front: formData.rrnFront || null,
    rrn_back: formData.rrnBack || null,
    height: formData.height ? parseInt(formData.height) : null,
    privacy_agreed: formData.privacyAgreed,
    email: formData.email || null,
  };
  if (formData.phone) updateData.phone = formData.phone;

  // 본인인증 완료 회원은 이름 변경 불가 (실명 고정, 가명 전환 방지)
  const { data: cur } = await supabase
    .from("members")
    .select("identity_verified")
    .eq("id", user.id)
    .single();
  if (formData.name && !cur?.identity_verified) {
    updateData.name = formData.name;
  }

  const { data: updated, error } = await supabase
    .from("members")
    .update(updateData)
    .eq("id", user.id)
    .select();

  if (error) {
    if (error.code === "23505" && error.message.includes("members_rrn_unique")) {
      return { error: "이미 가입된 주민등록번호입니다." };
    }
    return { error: `저장 실패: ${error.message}` };
  }

  if (!updated || updated.length === 0) {
    // members에 row가 없으면 insert 시도
    const { error: insertError } = await supabase
      .from("members")
      .insert({
        id: user.id,
        phone: formData.phone || (user.user_metadata?.phone as string) || user.email?.split("@")[0]?.slice(0, 20) || "",
        name: formData.name || (user.user_metadata?.name as string) || "",
        birth_date: formData.birthDate || null,
        gender: formData.gender || null,
        region: formData.region || null,
        has_experience: formData.hasExperience === "yes",
        experience_detail: formData.experience || null,
        bank_name: formData.bankName || null,
        account_holder: formData.accountHolder || null,
        account_number: formData.accountNumber || null,
        rrn_front: formData.rrnFront || null,
        rrn_back: formData.rrnBack || null,
        height: formData.height ? parseInt(formData.height) : null,
        privacy_agreed: formData.privacyAgreed,
        email: formData.email || null,
      });

    if (insertError) {
      if (insertError.code === "23505" && insertError.message.includes("members_rrn_unique")) {
        return { error: "이미 가입된 주민등록번호입니다." };
      }
      return { error: `저장 실패: ${insertError.message}` };
    }
  }

  return { success: true };
}

export async function getResume() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다.", data: null };
  }

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("id", user.id)
    .single();

  return { data };
}
