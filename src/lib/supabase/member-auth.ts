import { createAdminClient } from "./server";
import { NextRequest } from "next/server";

/**
 * API 요청에서 회원 인증
 * 1순위: X-API-Key 헤더 (네이티브 백그라운드용, 영구)
 * 2순위: Authorization Bearer 토큰 (Supabase access token, 1시간)
 *
 * @returns memberId 또는 null
 */
export async function authenticateMember(req: NextRequest): Promise<string | null> {
  const admin = createAdminClient();

  // 1순위: API Key
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const { data } = await admin
      .from("members")
      .select("id")
      .eq("api_key", apiKey)
      .single();
    if (data) return data.id;
  }

  // 2순위: Supabase access token
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  if (bearer) {
    const { data: { user } } = await admin.auth.getUser(bearer);
    if (user) return user.id;
  }

  return null;
}
