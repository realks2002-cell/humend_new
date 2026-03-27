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

  // 이미 members에 등록된 유저인지 체크
  const { data: alreadyMember } = await admin
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (alreadyMember) {
    return NextResponse.json({ success: true });
  }

  // 같은 전화번호로 가입된 기존 회원 확인
  const { data: phoneExists } = await admin
    .from("members")
    .select("*")
    .eq("phone", cleanedPhone)
    .maybeSingle();

  if (phoneExists) {
    // 계정 이전: 기존 member 데이터를 구글 auth id로 이전
    const oldId = phoneExists.id;
    const newId = user.id;
    const { id: _, created_at: __, updated_at: ___, ...rest } = phoneExists;

    // 1. 기존 회원 phone 임시 변경 (UNIQUE 충돌 방지)
    const { error: tempError } = await admin
      .from("members")
      .update({ phone: `_mig_${oldId.slice(0, 8)}` })
      .eq("id", oldId);

    if (tempError) {
      console.error("[create-google-member] temp phone update error:", tempError.message);
      return NextResponse.json({ error: "계정 전환에 실패했습니다." }, { status: 500 });
    }

    // 2. 새 member 생성 (구글 auth id로)
    const { error: insertError } = await admin.from("members").insert({
      ...rest,
      id: newId,
      phone: cleanedPhone,
      name: name || phoneExists.name,
    });

    if (insertError) {
      console.error("[create-google-member] new member insert error:", insertError.message);
      await admin.from("members").update({ phone: cleanedPhone }).eq("id", oldId);
      return NextResponse.json({ error: "계정 전환에 실패했습니다." }, { status: 500 });
    }

    // 3. FK 테이블 마이그레이션
    await Promise.all([
      admin.from("applications").update({ member_id: newId }).eq("member_id", oldId),
      admin.from("work_records").update({ member_id: newId }).eq("member_id", oldId),
      admin.from("device_tokens").update({ member_id: newId }).eq("member_id", oldId),
      admin.from("parental_consents").update({ member_id: newId }).eq("member_id", oldId),
      admin.from("notification_logs").update({ target_member_id: newId }).eq("target_member_id", oldId),
      admin.from("daily_shifts").update({ member_id: newId }).eq("member_id", oldId),
    ]);

    // 4. 기존 member 삭제 + auth user 삭제
    await admin.from("members").delete().eq("id", oldId);
    await admin.auth.admin.deleteUser(oldId);

    return NextResponse.json({ success: true });
  }

  // 기존에 가입된 전화번호가 없으면 에러 (구글은 기존 회원 연동 전용)
  return NextResponse.json(
    { error: "등록되지 않은 전화번호입니다. 먼저 전화번호로 가입해주세요." },
    { status: 404 }
  );
}
