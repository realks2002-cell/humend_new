import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  generateCode,
  hashCode,
  isSmsConfigured,
  normalizePhone,
  rejectCrossOrigin,
  sendVerificationSms,
} from "@/lib/phone-verification";

const BAD_REQUEST = { error: "잘못된 요청입니다.", code: "bad_request" };
const SERVER_ERROR = {
  error: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  code: "server_error",
};

function getClientIp(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim();
  if (ip) return ip;
  console.warn("[phone-verification] client ip unknown");
  return "unknown";
}

export async function POST(req: NextRequest) {
  const forbidden = rejectCrossOrigin(req);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(BAD_REQUEST, { status: 400 });
  }
  const rawPhone = (body as { phone?: unknown } | null)?.phone;
  if (typeof rawPhone !== "string") {
    return NextResponse.json(BAD_REQUEST, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "올바른 휴대폰 번호를 입력해 주세요.", code: "invalid_phone" },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production" && !isSmsConfigured()) {
    console.error("[phone-verification][ALERT] SMS env missing");
    return NextResponse.json(
      { error: "문자 발송 설정이 되어있지 않습니다. 관리자에게 문의해 주세요.", code: "sms_not_configured" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const { data: members, error: memberError } = await admin
    .from("members")
    .select("id")
    .eq("phone", phone)
    .limit(1);
  if (memberError || !Array.isArray(members)) {
    console.error("[phone-verification] members lookup error:", memberError?.message);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }
  if (members.length > 0) {
    return NextResponse.json(
      { error: "이미 가입된 번호예요.", code: "already_registered" },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();
  const code = generateCode();
  const { data, error } = await admin.rpc("reserve_phone_verification", {
    p_phone: phone,
    p_ip: getClientIp(req),
    p_code_hash: hashCode(phone, code),
    p_now: nowIso,
  });
  if (error || typeof data?.status !== "string") {
    console.error("[phone-verification] reserve error:", error?.message);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }

  switch (data.status) {
    case "ok":
      break;
    case "cooldown":
      return NextResponse.json(
        {
          error: "방금 인증번호를 보냈어요. 잠시 후 다시 요청해 주세요.",
          code: "cooldown",
          retryAfter: data.retry_after,
        },
        { status: 429 },
      );
    case "daily_limit":
      return NextResponse.json(
        { error: "하루 인증 요청 횟수(5회)를 초과했어요. 내일 다시 시도해 주세요.", code: "daily_limit" },
        { status: 429 },
      );
    case "ip_limit":
      return NextResponse.json(
        {
          error: "요청이 너무 많아요. 잠시 후 다시 시도하거나 카카오톡 상담으로 문의해 주세요.",
          code: "ip_limit",
        },
        { status: 429 },
      );
    case "global_limit":
      console.warn("[phone-verification] global daily limit — rejected");
      return NextResponse.json(
        { error: "현재 문자 인증을 이용할 수 없어요. 카카오톡 상담으로 문의해 주세요.", code: "global_limit" },
        { status: 503 },
      );
    default:
      console.error("[phone-verification] unexpected reserve status:", data.status);
      return NextResponse.json(SERVER_ERROR, { status: 500 });
  }

  const { id, expires_at: expiresAt, resend_after: resendAfter, alert } = data;
  if (typeof id !== "string" || typeof expiresAt !== "string" || typeof resendAfter !== "number") {
    console.error("[phone-verification] unexpected reserve result shape");
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }
  if (alert === "global_half" || alert === "global_full") {
    console.error("[phone-verification][ALERT] global daily usage", alert);
  }

  const sms = await sendVerificationSms(phone, code);
  const expiresIn = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));

  switch (sms.result) {
    case "sent":
      return NextResponse.json({ success: true, requestId: id, expiresIn, resendAfter });
    case "uncertain":
      console.error("[phone-verification][ALERT] solapi uncertain", sms.detail);
      return NextResponse.json(
        { success: true, pending: true, requestId: id, expiresIn, resendAfter },
        { status: 202 },
      );
    case "undeliverable":
      console.warn("[phone-verification] solapi recipient failure", sms.detail);
      return NextResponse.json(
        {
          error: "이 번호로는 문자를 보낼 수 없어요. 번호를 확인하거나 카카오톡 상담으로 문의해 주세요.",
          code: "sms_undeliverable",
          resendAfter,
        },
        { status: 400 },
      );
    case "unavailable":
      console.error("[phone-verification][ALERT] solapi rejected", sms.detail);
      return NextResponse.json(
        {
          error: "현재 문자 인증을 이용할 수 없어요. 카카오톡 상담으로 문의해 주세요.",
          code: "sms_unavailable",
          resendAfter,
        },
        { status: 503 },
      );
  }
}
