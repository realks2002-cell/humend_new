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

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room_id");
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  if (!roomId) {
    return NextResponse.json({ error: "room_id 필수" }, { status: 400 });
  }

  // 본인 채팅방인지 확인
  const { data: room } = await admin
    .from("chat_rooms")
    .select("id")
    .eq("id", roomId)
    .eq("member_id", user.id)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  let query = admin
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messages } = await query;

  return NextResponse.json({
    messages: messages?.reverse() ?? [],
    hasMore: (messages?.length ?? 0) === limit,
  });
}
