import { createAdminClient } from "@/lib/supabase/server";
import { consumePhoneVerification, isPhoneVerified } from "@/lib/phone-verification";
import { NextRequest, NextResponse } from "next/server";

function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `${cleaned}@member.humend.hr`;
}

export async function POST(req: NextRequest) {
  const { phone, name, password, verificationId: rawVerificationId } = (await req.json()) as {
    phone?: string;
    name?: string;
    password?: string;
    verificationId?: unknown;
  };
  const verificationId = typeof rawVerificationId === "string" ? rawVerificationId : "";

  if (!phone || !name || !password) {
    return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자리 이상이어야 합니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const email = phoneToEmail(phone);
  const cleanedPhone = phone.replace(/[^0-9]/g, "");

  // 전화번호 중복 체크
  const { data: existingMember } = await admin
    .from("members")
    .select("id")
    .eq("phone", cleanedPhone)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: "이미 가입된 전화번호입니다.", code: "already_registered" }, { status: 409 });
  }

  if (verificationId) {
    if (!(await isPhoneVerified(verificationId, cleanedPhone))) {
      return NextResponse.json(
        { error: "전화번호 인증이 필요합니다. 인증을 다시 진행해 주세요.", code: "verification_required" },
        { status: 400 },
      );
    }
  } else if (process.env.REQUIRE_APP_PHONE_VERIFICATION?.trim() === "true") {
    return NextResponse.json(
      { error: "앱을 최신 버전으로 업데이트한 뒤 다시 가입해 주세요.", code: "app_update_required" },
      { status: 400 },
    );
  } else {
    console.warn("[native-signup] unverified app signup");
  }

  // Supabase Auth 회원가입
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      phone: cleanedPhone,
      name,
      role: "member",
    },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      const { data: { users } } = await admin.auth.admin.listUsers();
      const existingUser = users.find((u) => u.email === email);

      if (existingUser) {
        const { data: memberCheck } = await admin
          .from("members")
          .select("id")
          .eq("id", existingUser.id)
          .maybeSingle();

        if (memberCheck) {
          return NextResponse.json({ error: "이미 가입된 전화번호입니다.", code: "already_registered" }, { status: 409 });
        }

        const { error: recoverError } = await admin.from("members").insert({
          id: existingUser.id,
          phone: cleanedPhone,
          name,
          password,
        });

        if (recoverError) {
          console.error("[signup API] members recover insert error:", recoverError.message);
          return NextResponse.json({ error: "회원가입에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
        }

        if (verificationId) await consumePhoneVerification(verificationId);
        return NextResponse.json({ success: true });
      }
    }
    return NextResponse.json({ error: "회원가입에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "회원가입에 실패했습니다." }, { status: 500 });
  }

  const { error: memberError } = await admin.from("members").insert({
    id: data.user.id,
    phone: cleanedPhone,
    name,
    password,
  });

  if (memberError) {
    console.error("[signup API] members insert error:", memberError.message);
  }

  if (verificationId) await consumePhoneVerification(verificationId);
  return NextResponse.json({ success: true });
}
