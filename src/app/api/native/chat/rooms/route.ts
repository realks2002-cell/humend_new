import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

  // 기존 채팅방 조회
  let { data: room } = await admin
    .from("chat_rooms")
    .select("*")
    .eq("member_id", user.id)
    .maybeSingle();

  // 없으면 자동 생성
  if (!room) {
    const { data: newRoom, error } = await admin
      .from("chat_rooms")
      .insert({ member_id: user.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "채팅방 생성 실패" }, { status: 500 });
    }
    room = newRoom;
  }

  return NextResponse.json({ room });
}
