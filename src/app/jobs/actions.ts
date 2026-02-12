"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function applyToJob(postingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // members 존재 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!member) {
    return { error: "회원정보를 먼저 등록해주세요." };
  }

  // 중복 지원 체크
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("posting_id", postingId)
    .eq("member_id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "이미 지원한 공고입니다." };
  }

  const { error } = await supabase.from("applications").insert({
    posting_id: postingId,
    member_id: user.id,
    status: "대기",
  });

  if (error) {
    console.error("[applyToJob] error:", error.message, error.code, error.details);
    return { error: `지원 실패: ${error.message}` };
  }

  revalidatePath("/jobs");
  revalidatePath("/my/applications");
  return { success: true };
}
