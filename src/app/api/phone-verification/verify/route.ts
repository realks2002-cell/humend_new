import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  MAX_ATTEMPTS,
  VERIFIED_TTL_MS,
  isCodeMatch,
  isUuid,
  normalizePhone,
  rejectCrossOrigin,
} from "@/lib/phone-verification";

const BAD_REQUEST = { error: "잘못된 요청입니다.", code: "bad_request" };
const SERVER_ERROR = {
  error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  code: "server_error",
};
const NOT_REQUESTED = { error: "인증번호를 먼저 요청해 주세요.", code: "not_requested" };
const EXPIRED = { error: "인증 시간이 지났어요. 인증번호를 다시 받아 주세요.", code: "expired" };
const TOO_MANY_ATTEMPTS = {
  error: "시도 횟수를 초과했어요. 인증번호를 다시 받아 주세요.",
  code: "too_many_attempts",
  remainingAttempts: 0,
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
  const { requestId, phone: rawPhone, code } = (body ?? {}) as {
    requestId?: unknown;
    phone?: unknown;
    code?: unknown;
  };
  if (typeof requestId !== "string" || typeof rawPhone !== "string" || typeof code !== "string") {
    return NextResponse.json(BAD_REQUEST, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "올바른 휴대폰 번호를 입력해 주세요.", code: "invalid_phone" },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "인증번호 6자리를 입력해 주세요.", code: "invalid_code_format" },
      { status: 400 },
    );
  }
  if (!isUuid(requestId)) {
    return NextResponse.json(NOT_REQUESTED, { status: 400 });
  }

  const now = Date.now();
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("phone_verifications")
    .select("id, attempts, code_hash, expires_at, verified_at, consumed_at")
    .eq("id", requestId)
    .eq("phone", phone)
    .maybeSingle();
  if (error) {
    console.error("[phone-verification] verify lookup error:", error.message);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }
  if (!row || row.consumed_at) {
    return NextResponse.json(NOT_REQUESTED, { status: 400 });
  }

  if (row.verified_at) {
    const validFor = Math.floor((Date.parse(row.verified_at) + VERIFIED_TTL_MS - now) / 1000) - 5;
    if (validFor > 0) {
      return NextResponse.json({ success: true, verificationId: row.id, validFor });
    }
    return NextResponse.json(EXPIRED, { status: 410 });
  }

  if (Date.parse(row.expires_at) <= now) {
    return NextResponse.json(EXPIRED, { status: 410 });
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(TOO_MANY_ATTEMPTS, { status: 429 });
  }

  const { data: bumped, error: bumpError } = await admin
    .from("phone_verifications")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id)
    .eq("attempts", row.attempts)
    .select("id");
  if (bumpError) {
    console.error("[phone-verification] attempts update error:", bumpError.message);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }
  if (bumped?.length !== 1) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요.", code: "conflict" }, { status: 409 });
  }

  if (!isCodeMatch(phone, code, row.code_hash)) {
    const remainingAttempts = MAX_ATTEMPTS - (row.attempts + 1);
    if (remainingAttempts > 0) {
      return NextResponse.json(
        {
          error: `인증번호가 일치하지 않아요. (남은 시도 ${remainingAttempts}회)`,
          code: "mismatch",
          remainingAttempts,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(TOO_MANY_ATTEMPTS, { status: 429 });
  }

  const { error: verifyError } = await admin
    .from("phone_verifications")
    .update({ verified_at: new Date(now).toISOString() })
    .eq("id", row.id)
    .is("verified_at", null)
    .select("id");
  if (verifyError) {
    console.error("[phone-verification] verified_at update error:", verifyError.message);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }

  return NextResponse.json({ success: true, verificationId: row.id, validFor: 595 });
}
