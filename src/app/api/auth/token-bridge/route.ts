import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST: 시스템 브라우저에서 토큰 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bridge_id, access_token, refresh_token } = body;

    if (!bridge_id || !access_token) {
      return NextResponse.json(
        { error: "bridge_id, access_token 필수" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 5분 이상 된 레코드 자동 삭제
    await supabase
      .from("token_bridge")
      .delete()
      .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    // 토큰 저장
    const { error } = await supabase.from("token_bridge").upsert({
      bridge_id,
      access_token,
      refresh_token: refresh_token || '',
    });

    if (error) {
      console.error("token_bridge insert error:", error);
      return NextResponse.json({ error: "저장 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("token-bridge POST error:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// GET: WebView에서 폴링으로 토큰 조회 (일회용 - 조회 후 즉시 삭제)
export async function GET(request: NextRequest) {
  const bridgeId = request.nextUrl.searchParams.get("id");

  if (!bridgeId) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 토큰 조회
  const { data, error } = await supabase
    .from("token_bridge")
    .select("access_token, refresh_token")
    .eq("bridge_id", bridgeId)
    .single();

  if (error || !data) {
    // 아직 토큰이 저장되지 않음 (폴링 중 정상)
    return NextResponse.json({ pending: true }, { status: 404 });
  }

  // 조회 후 즉시 삭제 (일회용)
  await supabase.from("token_bridge").delete().eq("bridge_id", bridgeId);

  return NextResponse.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
}
