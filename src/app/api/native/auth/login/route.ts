import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `${cleaned}@member.humend.hr`;
}

export async function POST(req: NextRequest) {
  const { phone, password } = (await req.json()) as {
    phone?: string;
    password?: string;
  };

  if (!phone || !password) {
    return NextResponse.json(
      { error: "전화번호와 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const email = phoneToEmail(phone);

  const admin = createAdminClient();

  // 1차 시도: phone 이메일로 로그인
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session && data.user) {
    const { data: m } = await admin
      .from("members")
      .select("status")
      .eq("id", data.user.id)
      .maybeSingle();
    if (m && m.status !== "active") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "삭제된 계정입니다. 관리자에게 문의해주세요." },
        { status: 403 }
      );
    }
    return NextResponse.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  // 2차 시도: members 테이블에서 실제 auth 이메일로 폴백
  const cleaned = phone.replace(/[^0-9]/g, "");
  const { data: member } = await admin
    .from("members")
    .select("id, status")
    .eq("phone", cleaned)
    .maybeSingle();

  if (!member) {
    return NextResponse.json(
      { error: "가입되지 않은 전화번호입니다. 회원가입을 진행해주세요." },
      { status: 400 }
    );
  }

  if (member.status !== "active") {
    return NextResponse.json(
      { error: "삭제된 계정입니다. 관리자에게 문의해주세요." },
      { status: 403 }
    );
  }

  const { data: authUser } = await admin.auth.admin.getUserById(member.id);
  if (authUser?.user?.email && authUser.user.email !== email) {
    const { data: retryData, error: retryError } =
      await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password,
      });

    if (!retryError && retryData.session) {
      return NextResponse.json({
        success: true,
        access_token: retryData.session.access_token,
        refresh_token: retryData.session.refresh_token,
      });
    }
  }

  return NextResponse.json(
    { error: "전화번호 또는 비밀번호가 올바르지 않습니다." },
    { status: 400 }
  );
}
