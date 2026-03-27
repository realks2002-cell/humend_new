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

  const { phone, name } = (await req.json()) as {
    phone?: string;
    name?: string;
  };

  if (!phone || !name) {
    return NextResponse.json({ error: "이름과 전화번호를 입력해주세요." }, { status: 400 });
  }

  const cleanedPhone = phone.replace(/[^0-9]/g, "");

  // 전화번호 중복 체크
  const { data: existingMember } = await admin
    .from("members")
    .select("id")
    .eq("phone", cleanedPhone)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: "이미 가입된 전화번호입니다." }, { status: 409 });
  }

  // 이미 members에 등록된 유저인지 체크
  const { data: alreadyMember } = await admin
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (alreadyMember) {
    return NextResponse.json({ error: "이미 가입된 회원입니다." }, { status: 409 });
  }

  // members 테이블에 등록
  const { error: memberError } = await admin.from("members").insert({
    id: user.id,
    phone: cleanedPhone,
    name,
  });

  if (memberError) {
    console.error("[create-google-member] insert error:", memberError.message);
    return NextResponse.json({ error: "회원 등록에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
