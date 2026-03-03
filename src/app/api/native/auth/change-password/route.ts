import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
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

  const body = await req.json();
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "새 비밀번호는 6자리 이상이어야 합니다." },
      { status: 400 },
    );
  }

  // members 테이블에서 phone 조회
  const { data: member } = await admin
    .from("members")
    .select("phone")
    .eq("id", user.id)
    .single();

  if (!member?.phone) {
    return NextResponse.json(
      { error: "회원 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // 현재 비밀번호 검증 (phone → email 변환 후 signInWithPassword)
  const email = `${member.phone.replace(/[^0-9]/g, "")}@member.humend.hr`;
  const { error: signInError } = await admin.auth.signInWithPassword({
    email,
    password: currentPassword || "",
  });

  if (signInError) {
    return NextResponse.json(
      { error: "현재 비밀번호가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  // 새 비밀번호 설정
  const { error: updateError } = await admin.auth.admin.updateUserById(
    user.id,
    { password: newPassword },
  );

  if (updateError) {
    return NextResponse.json(
      { error: "비밀번호 변경에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
