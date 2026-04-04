import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room_id } = await req.json();

  if (!room_id) {
    return NextResponse.json({ error: "room_id 필수" }, { status: 400 });
  }

  // 본인 채팅방인지 확인
  const { data: room } = await admin
    .from("chat_rooms")
    .select("id")
    .eq("id", room_id)
    .eq("member_id", user.id)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  // AI/관리자 메시지 읽음 처리
  await admin
    .from("chat_messages")
    .update({ is_read: true })
    .eq("room_id", room_id)
    .in("sender_type", ["ai", "admin"])
    .eq("is_read", false);

  // 회원 미읽음 카운트 초기화
  await admin
    .from("chat_rooms")
    .update({ unread_count_member: 0 })
    .eq("id", room_id);

  return NextResponse.json({ success: true });
}
