import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone } = (await req.json()) as { phone?: string };
  if (!phone) {
    return NextResponse.json({ error: "전화번호를 입력해주세요." }, { status: 400 });
  }

  const cleanedPhone = phone.replace(/[^0-9]/g, "");

  // 전화번호로 기존 회원 검색
  const { data: member } = await admin
    .from("members")
    .select("id, google_uid")
    .eq("phone", cleanedPhone)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "가입된 전화번호가 아닙니다." }, { status: 404 });
  }

  // 이미 다른 구글 계정이 연결되어 있는 경우
  if (member.google_uid && member.google_uid !== user.id) {
    return NextResponse.json({ error: "이미 다른 구글 계정이 연결되어 있습니다." }, { status: 409 });
  }

  // google_uid 저장
  const { error: updateError } = await admin
    .from("members")
    .update({ google_uid: user.id })
    .eq("id", member.id);

  if (updateError) {
    return NextResponse.json({ error: "연결에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true, memberId: member.id });
}
