import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  consumePhoneVerification,
  isPhoneVerified,
  normalizePhone,
  rejectCrossOrigin,
} from "@/lib/phone-verification";

const BAD_REQUEST = { error: "잘못된 요청입니다.", code: "bad_request" };
const SERVER_ERROR = {
  error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  code: "server_error",
};

export async function POST(req: NextRequest) {
  const forbidden = rejectCrossOrigin(req);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(BAD_REQUEST, { status: 400 });
  }
  const { phone: rawPhone, verificationId, newPassword } = (body ?? {}) as {
    phone?: unknown;
    verificationId?: unknown;
    newPassword?: unknown;
  };
  if (typeof rawPhone !== "string" || typeof verificationId !== "string" || typeof newPassword !== "string") {
    return NextResponse.json(BAD_REQUEST, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "올바른 휴대폰 번호를 입력해 주세요.", code: "invalid_phone" },
      { status: 400 },
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "비밀번호는 6자리 이상이어야 합니다.", code: "weak_password" },
      { status: 400 },
    );
  }

  if (!(await isPhoneVerified(verificationId, phone, "reset"))) {
    return NextResponse.json(
      { error: "전화번호 인증이 필요합니다. 인증을 다시 진행해 주세요.", code: "verification_required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from("members")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (memberError) {
    console.error("[password-reset] members lookup error:", memberError.message);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }
  if (!member) {
    return NextResponse.json(
      { error: "가입되지 않은 번호예요.", code: "not_registered" },
      { status: 404 },
    );
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(member.id, { password: newPassword });
  if (updateError) {
    console.error("[password-reset] auth update error:", updateError.message);
    return NextResponse.json(
      { error: "비밀번호 변경에 실패했어요. 잠시 후 다시 시도해 주세요.", code: "server_error" },
      { status: 500 },
    );
  }

  await admin.from("members").update({ password: newPassword }).eq("id", member.id);

  await consumePhoneVerification(verificationId);
  return NextResponse.json({ success: true });
}
