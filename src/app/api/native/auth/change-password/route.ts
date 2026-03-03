import { createAdminClient } from "@/lib/supabase/server";
import { createClient as createBareClient } from "@supabase/supabase-js";
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

  if (authError || !user || !user.email) {
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

  // 현재 비밀번호 검증 (별도 클라이언트로 세션 충돌 방지)
  const verifyClient = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
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
