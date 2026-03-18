import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push/fcm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "phone 파라미터 필요" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("phone", phone)
    .single();

  if (!member) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다" }, { status: 404 });
  }

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token")
    .eq("member_id", member.id);

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({
      error: "등록된 FCM 토큰이 없습니다",
      member: { id: member.id, name: member.name },
    }, { status: 404 });
  }

  let sent = 0;
  let failed = 0;

  for (const { fcm_token } of tokens) {
    const result = await sendPush(fcm_token as string, {
      title: "[테스트] 푸시 알림 확인",
      body: `${member.name}님, 이 메시지가 보이면 푸시가 정상 작동 중입니다!`,
      data: { type: "test" },
    });
    if (result.success) sent++;
    else failed++;
  }

  return NextResponse.json({
    member: { id: member.id, name: member.name },
    tokens: tokens.length,
    sent,
    failed,
  });
}
