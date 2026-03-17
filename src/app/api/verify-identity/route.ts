import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as iconv from "iconv-lite";

const NICE_PROXY_BASE =
  process.env.NICE_PROXY_BASE_URL || "https://nice-proxy.humendhr.com";
const NICE_TOKEN_PATH = "/nice/digital/niceid/oauth/oauth/token";
const NICE_CRYPTO_PATH = "/nice/digital/niceid/api/v1.0/common/crypto/token";
const NICE_VERIFY_PATH = "/nice/digital/niceid/api/v1.0/name/national/check";
const PRODUCT_ID = "2101290037";

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getNiceAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.NICE_CLIENT_ID;
  const clientSecret = process.env.NICE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("NICE API credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  console.log("[NICE] ENV check:", {
    proxy: process.env.NICE_PROXY_BASE_URL?.slice(0, 20),
    clientId: process.env.NICE_CLIENT_ID?.slice(0, 8),
    clientIdLength: process.env.NICE_CLIENT_ID?.length,
    secretLength: process.env.NICE_CLIENT_SECRET?.length,
    hasNewline: process.env.NICE_CLIENT_ID?.includes('\n'),
    hasSpace: process.env.NICE_CLIENT_ID?.includes(' '),
    hasQuote: process.env.NICE_CLIENT_ID?.includes('"'),
  });
  console.log("[NICE] token request to:", `${NICE_PROXY_BASE}${NICE_TOKEN_PATH}`);
  let res: Response;
  try {
    res = await fetch(`${NICE_PROXY_BASE}${NICE_TOKEN_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=default",
    });
  } catch (fetchErr) {
    console.error("[NICE] token fetch failed:", fetchErr instanceof Error ? { message: fetchErr.message, cause: fetchErr.cause } : fetchErr);
    throw fetchErr;
  }

  console.log("[NICE] token response status:", res.status);
  if (!res.ok) {
    const text = await res.text();
    console.error("[NICE] token error:", res.status, text);
    throw new Error(`NICE token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log("[NICE] token response:", JSON.stringify(data, null, 2));

  const gwCode = data.dataHeader?.GW_RSLT_CD;
  const gwMsg = data.dataHeader?.GW_RSLT_MSG;
  console.error("[NICE] token GW_RSLT_CD:", gwCode, "GW_RSLT_MSG:", gwMsg, "dataBody type:", typeof data.dataBody);
  if (gwCode !== "1200") {
    throw new Error(`본인인증 서비스 연결에 실패했습니다. (GW: ${gwCode}, ${gwMsg})`);
  }

  if (!data.dataBody || !data.dataBody.access_token) {
    console.error("[NICE] token response missing dataBody:", JSON.stringify(data));
    throw new Error("본인인증 서비스 응답이 올바르지 않습니다.");
  }

  cachedToken = {
    access_token: data.dataBody.access_token,
    expires_at: Date.now() + data.dataBody.expires_in * 1000,
  };
  return cachedToken.access_token;
}

function buildNiceAuthHeader(accessToken: string) {
  const clientId = process.env.NICE_CLIENT_ID!;
  const timestamp = Math.floor(Date.now() / 1000);
  const authorization = Buffer.from(
    `${accessToken}:${timestamp}:${clientId}`,
  ).toString("base64");

  return {
    Authorization: `bearer ${authorization}`,
    "Content-Type": "application/json",
    ProductID: PRODUCT_ID,
  };
}

async function getCryptoToken(accessToken: string): Promise<{
  token_version_id: string;
  site_code: string;
  token_val: string;
  req_dtim: string;
  req_no: string;
}> {
  const reqDtim = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const reqNo = crypto.randomUUID().replace(/-/g, "").slice(0, 30);

  console.log("[NICE] crypto/token request to:", `${NICE_PROXY_BASE}${NICE_CRYPTO_PATH}`);
  let res: Response;
  try {
    res = await fetch(`${NICE_PROXY_BASE}${NICE_CRYPTO_PATH}`, {
      method: "POST",
      headers: buildNiceAuthHeader(accessToken),
      body: JSON.stringify({
        dataHeader: { CNTY_CD: "ko" },
        dataBody: {
          req_dtim: reqDtim,
          req_no: reqNo,
          enc_mode: "1",
        },
      }),
    });
  } catch (fetchErr) {
    console.error("[NICE] crypto/token fetch failed:", fetchErr instanceof Error ? { message: fetchErr.message, cause: fetchErr.cause } : fetchErr);
    throw fetchErr;
  }

  console.log("[NICE] crypto/token response status:", res.status);
  const data = await res.json();
  console.log(
    "[NICE] crypto/token response:",
    JSON.stringify(data, null, 2),
  );

  const gwCode = data.dataHeader?.GW_RSLT_CD;
  if (gwCode !== "1200") {
    console.error(
      "[NICE] crypto/token GW error:",
      gwCode,
      data.dataHeader?.GW_RSLT_MSG,
    );
    throw new Error("본인인증 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  const rspCd = data.dataBody?.rsp_cd;
  if (rspCd !== "P000") {
    console.error("[NICE] crypto/token rsp_cd:", rspCd, data.dataBody?.res_msg);
    throw new Error("본인인증 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  return {
    token_version_id: data.dataBody.token_version_id,
    site_code: data.dataBody.site_code,
    token_val: data.dataBody.token_val,
    req_dtim: reqDtim,
    req_no: reqNo,
  };
}

function deriveKeys(
  reqDtim: string,
  reqNo: string,
  tokenVal: string,
): { key: Buffer; iv: Buffer; hmacKey: Buffer } {
  const combined = reqDtim.trim() + reqNo.trim() + tokenVal.trim();
  const hash = crypto.createHash("sha256").update(combined).digest("base64");

  const key = Buffer.from(hash.slice(0, 16), "utf-8");
  const iv = Buffer.from(hash.slice(hash.length - 16), "utf-8");
  const hmacKey = Buffer.from(hash.slice(hash.length - 32), "utf-8");

  return { key, iv, hmacKey };
}

function encryptAES128CBC(
  input: string | Buffer,
  key: Buffer,
  iv: Buffer,
): string {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  if (Buffer.isBuffer(input)) {
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    return encrypted.toString("base64");
  }
  let encrypted = cipher.update(input, "utf-8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

function generateIntegrity(hmacKey: Buffer, data: string): string {
  return crypto.createHmac("sha256", hmacKey).update(data).digest("base64");
}

async function verifyIdentity(
  name: string,
  juminId: string,
): Promise<{ verified: boolean; error?: string }> {
  const accessToken = await getNiceAccessToken();

  // Step 1: crypto/token
  const cryptoResult = await getCryptoToken(accessToken);

  // Step 2: 대칭키 유도 (crypto/token 호출 시 사용한 동일한 req_dtim/req_no 사용)
  const { key, iv, hmacKey } = deriveKeys(
    cryptoResult.req_dtim,
    cryptoResult.req_no,
    cryptoResult.token_val,
  );

  // Step 3: 암호화 (성명은 EUC-KR 인코딩 필요 — NICE 가이드 요구사항)
  const encJuminId = encryptAES128CBC(juminId, key, iv);
  let nameEucKr: Buffer;
  try {
    nameEucKr = iconv.encode(name, "euc-kr");
    console.log("[NICE] EUC-KR encode OK, bytes:", nameEucKr.length);
  } catch (encErr) {
    console.error("[NICE] iconv encode failed:", encErr);
    throw encErr;
  }
  const encName = encryptAES128CBC(nameEucKr, key, iv);
  const integrityValue = generateIntegrity(
    hmacKey,
    `${cryptoResult.token_version_id.trim()}${encJuminId.trim()}${encName.trim()}`,
  );

  // Step 4: 실명확인 호출
  console.log("[NICE] verify request to:", `${NICE_PROXY_BASE}${NICE_VERIFY_PATH}`);
  let res: Response;
  try {
    res = await fetch(`${NICE_PROXY_BASE}${NICE_VERIFY_PATH}`, {
      method: "POST",
      headers: buildNiceAuthHeader(accessToken),
      body: JSON.stringify({
        dataHeader: { CNTY_CD: "ko" },
        dataBody: {
          token_version_id: cryptoResult.token_version_id,
          enc_jumin_id: encJuminId,
          enc_name: encName,
          integrity_value: integrityValue,
        },
      }),
    });
  } catch (fetchErr) {
    console.error("[NICE] verify fetch failed:", fetchErr instanceof Error ? { message: fetchErr.message, cause: fetchErr.cause } : fetchErr);
    throw fetchErr;
  }

  console.log("[NICE] verify response status:", res.status);
  if (!res.ok) {
    const text = await res.text();
    console.error("[NICE] verify error:", res.status, text);
    throw new Error(`실명확인 서비스에 오류가 발생했습니다. (${res.status})`);
  }

  const niceData = await res.json();
  console.log(
    "[NICE] verify response:",
    JSON.stringify(niceData, null, 2),
  );

  const gwCode = niceData.dataHeader?.GW_RSLT_CD;
  if (gwCode !== "1200") {
    console.error(
      "[NICE] GW error:",
      gwCode,
      niceData.dataHeader?.GW_RSLT_MSG,
    );
    throw new Error("실명확인 서비스에 오류가 발생했습니다.");
  }

  const resultCode = niceData.dataBody?.result_cd;

  return resultCode === "1"
    ? { verified: true }
    : { verified: false, error: "이름과 주민등록번호가 일치하지 않습니다." };
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const admin = createAdminClient();
      const {
        data: { user },
      } = await admin.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { name, rrnFront, rrnBack } = body as {
      name?: string;
      rrnFront?: string;
      rrnBack?: string;
    };

    if (!name?.trim() || !rrnFront || !rrnBack) {
      return NextResponse.json(
        { error: "이름과 주민등록번호를 모두 입력해주세요." },
        { status: 400 },
      );
    }

    if (rrnFront.length !== 6 || rrnBack.length !== 7) {
      return NextResponse.json(
        { error: "주민등록번호 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const juminId = rrnFront + rrnBack;

    const result = await verifyIdentity(name.trim(), juminId);

    if (!result.verified) {
      return NextResponse.json({
        error: result.error,
        verified: false,
      });
    }

    const admin = createAdminClient();
    const { error: dbError } = await admin
      .from("members")
      .update({ identity_verified: true })
      .eq("id", userId);

    if (dbError) {
      console.error("[verify-identity] DB update error:", dbError.message);
      return NextResponse.json(
        { error: "인증 결과 저장에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[verify-identity] error:", errMsg, errStack);
    return NextResponse.json(
      {
        error: errMsg || "실명확인 처리 중 오류가 발생했습니다.",
        _debug: errMsg,
      },
      { status: 500 },
    );
  }
}
