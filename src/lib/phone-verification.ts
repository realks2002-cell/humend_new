import "server-only";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const MAX_ATTEMPTS = 5;
export const VERIFIED_TTL_MS = 10 * 60 * 1000;
const SOLAPI_TIMEOUT_MS = 5_000;
const SOLAPI_SEND_URL = "https://api.solapi.com/messages/v4/send-many/detail";
const RECIPIENT_FAILURE_CODES = ["1061", "1065", "2061", "2065"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NATIVE_APP_ORIGINS = ["https://localhost", "capacitor://localhost"];

export type SmsResult =
  | { result: "sent" }
  | { result: "uncertain" | "undeliverable" | "unavailable"; detail: string };

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return /^(010\d{8}|01[16789]\d{7,8})$/.test(digits) ? digits : null;
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(phone: string, code: string): string {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!.trim())
    .update(`${phone}:${code}`)
    .digest("hex");
}

export function isCodeMatch(phone: string, code: string, storedHash: string): boolean {
  const actual = Buffer.from(hashCode(phone, code), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function getSolapiConfig() {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const from = process.env.SOLAPI_SENDER_NUMBER?.replace(/\D/g, "");
  if (!apiKey || !apiSecret || !from) return null;
  return { apiKey, apiSecret, from };
}

export function isSmsConfigured(): boolean {
  return getSolapiConfig() !== null;
}

function truncate(value: string | null | undefined): string | null | undefined {
  return value && value.length > 100 ? `${value.slice(0, 100)}...` : value;
}

export function rejectCrossOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (origin === null) return null;
  if (NATIVE_APP_ORIGINS.includes(origin)) return null;

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = req.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (originHost && (originHost === forwardedHost || originHost === host)) return null;
  } catch {}

  console.warn(
    "[phone-verification] forbidden origin",
    truncate(origin),
    truncate(forwardedHost),
    truncate(host),
  );
  return NextResponse.json(
    { error: "잘못된 요청입니다.", code: "forbidden_origin" },
    { status: 403 },
  );
}

function limitDetail(value: string): string {
  return value.length > 200 ? value.slice(0, 200) : value;
}

export async function sendVerificationSms(phone: string, code: string): Promise<SmsResult> {
  if (process.env.NODE_ENV !== "production" && !isSmsConfigured()) {
    console.log("[phone-verification] DEV 인증번호", phone, code);
    return { result: "sent" };
  }

  let init: RequestInit;
  try {
    const cfg = getSolapiConfig();
    if (!cfg) throw new Error("SOLAPI config missing");
    const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const salt = crypto.randomBytes(16).toString("hex");
    const signature = crypto.createHmac("sha256", cfg.apiSecret).update(date + salt).digest("hex");
    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `HMAC-SHA256 apiKey=${cfg.apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    });
    const body = JSON.stringify({
      messages: [
        {
          to: phone,
          from: cfg.from,
          text: `[휴멘드HR] 인증번호 [${code}]를 입력해 주세요. 타인에게 절대 알려주지 마세요.`,
          type: "SMS",
        },
      ],
    });
    init = { method: "POST", headers, body };
  } catch {
    return { result: "unavailable", detail: "request_build" };
  }

  let res: Response;
  let text: string;
  try {
    res = await fetch(SOLAPI_SEND_URL, { ...init, signal: AbortSignal.timeout(SOLAPI_TIMEOUT_MS) });
    text = await res.text();
  } catch (err) {
    return { result: "uncertain", detail: err instanceof Error ? err.name : "unknown" };
  }

  if (res.status >= 500) {
    return { result: "uncertain", detail: String(res.status) };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) return { result: "unavailable", detail: String(res.status) };
    return { result: "uncertain", detail: `${res.status} invalid_json` };
  }

  if (!res.ok) {
    const { errorCode, errorMessage } = (data ?? {}) as { errorCode?: unknown; errorMessage?: unknown };
    return {
      result: "unavailable",
      detail: limitDetail(`${String(errorCode ?? res.status)} ${String(errorMessage ?? "")}`.trim()),
    };
  }

  if (typeof data !== "object" || data === null) {
    return { result: "uncertain", detail: `${res.status} invalid_body` };
  }

  const failed = (data as { failedMessageList?: unknown }).failedMessageList;
  if (!Array.isArray(failed)) return { result: "uncertain", detail: `${res.status} no_failed_list` };
  if (failed.length === 0) return { result: "sent" };

  const { statusCode, statusMessage } = (failed[0] ?? {}) as {
    statusCode?: unknown;
    statusMessage?: unknown;
  };
  const detail = limitDetail(`${String(statusCode)} ${String(statusMessage ?? "")}`.trim());
  if (RECIPIENT_FAILURE_CODES.includes(String(statusCode))) {
    return { result: "undeliverable", detail };
  }
  return { result: "unavailable", detail };
}

export type VerificationPurpose = "signup" | "reset";

export async function isPhoneVerified(
  id: string,
  phone: string,
  purpose: VerificationPurpose = "signup",
): Promise<boolean> {
  if (!isUuid(id)) return false;

  const { data, error } = await createAdminClient()
    .from("phone_verifications")
    .select("id")
    .eq("id", id)
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gte("verified_at", new Date(Date.now() - VERIFIED_TTL_MS).toISOString())
    .maybeSingle();

  if (error) {
    console.error("[phone-verification] isPhoneVerified error:", error.message);
    return false;
  }
  return !!data;
}

export async function consumePhoneVerification(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("phone_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id)
    .is("consumed_at", null);

  if (error) {
    console.error("[phone-verification] consume error:", error.message);
  }
}
