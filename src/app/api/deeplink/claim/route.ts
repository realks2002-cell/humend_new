// 디퍼드 딥링크: 앱 설치 후 첫 실행 시 호출 → 같은 IP의 1시간 이내 미사용 딥링크 클릭이 있으면 그 화면 경로를 돌려줌 (1회 소비)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEEPLINK_TARGETS } from "@/lib/deeplink";

export const dynamic = "force-dynamic";

const MATCH_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  if (!ip) return NextResponse.json({ path: null });

  const admin = createAdminClient();
  const now = Date.now();

  // 하루 지난 클릭 기록 정리
  await admin.from("deeplink_clicks").delete().lt("created_at", new Date(now - 24 * 60 * 60 * 1000).toISOString());

  const { data: click } = await admin
    .from("deeplink_clicks")
    .select("id, target")
    .eq("ip", ip)
    .is("claimed_at", null)
    .gte("created_at", new Date(now - MATCH_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!click) return NextResponse.json({ path: null });

  // 동시에 두 번 호출돼도 한 번만 소비
  const { data: claimed } = await admin
    .from("deeplink_clicks")
    .update({ claimed_at: new Date(now).toISOString() })
    .eq("id", click.id)
    .is("claimed_at", null)
    .select("id")
    .maybeSingle();

  return NextResponse.json({ path: claimed ? DEEPLINK_TARGETS[click.target] ?? null : null });
}
