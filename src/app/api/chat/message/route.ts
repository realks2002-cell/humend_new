import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { chatModel } from "@/lib/ai/config";
import { getMemberTools } from "@/lib/ai/tools";
import { getMemberSystemPrompt } from "@/lib/ai/system-prompt";
import { notifyChatMessage } from "@/lib/push/notify";

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

  const { room_id, content } = await req.json();

  if (!room_id || !content?.trim()) {
    return NextResponse.json({ error: "room_id, content 필수" }, { status: 400 });
  }

  // 채팅방 확인
  const { data: room } = await admin
    .from("chat_rooms")
    .select("id, mode, member_id")
    .eq("id", room_id)
    .eq("member_id", user.id)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  // 회원 메시지 저장
  const { data: memberMsg } = await admin
    .from("chat_messages")
    .insert({
      room_id,
      sender_type: "member",
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  // 채팅방 업데이트
  const { data: currentRoom } = await admin
    .from("chat_rooms")
    .select("unread_count_admin")
    .eq("id", room_id)
    .single();

  await admin
    .from("chat_rooms")
    .update({
      last_message: content.trim().slice(0, 100),
      last_message_at: memberMsg?.created_at,
      unread_count_admin: ((currentRoom?.unread_count_admin ?? 0) + 1),
    })
    .eq("id", room_id);

  // admin 모드면 AI 응답 생략
  if (room.mode === "admin") {
    return NextResponse.json({ success: true, message: memberMsg, aiResponse: null });
  }

  // AI 응답 생성
  try {
    // 회원 정보 조회
    const { data: member } = await admin
      .from("members")
      .select("name, phone")
      .eq("id", user.id)
      .single();

    const memberName = member?.name ?? member?.phone ?? "회원";

    // 최근 메시지 컨텍스트
    const { data: recentMessages } = await admin
      .from("chat_messages")
      .select("sender_type, content, created_at")
      .eq("room_id", room_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const chatHistory = (recentMessages ?? []).reverse().map((m) => ({
      role: m.sender_type === "member" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    // AI SDK generateText + Tool Calling
    const tools = getMemberTools(user.id, room_id, memberName);

    const result = await generateText({
      model: chatModel,
      system: getMemberSystemPrompt(memberName),
      messages: chatHistory,
      tools,
      stopWhen: stepCountIs(5),
    });

    const aiContent = result.text || "죄송합니다, 응답을 생성하지 못했습니다. 관리자에게 연결해드릴까요?";

    // AI 응답 저장
    const { data: aiMsg } = await admin
      .from("chat_messages")
      .insert({
        room_id,
        sender_type: "ai",
        sender_id: null,
        content: aiContent,
        metadata: result.steps?.length > 0
          ? { toolCalls: result.steps.map((s) => s.toolCalls).flat() }
          : null,
      })
      .select()
      .single();

    // 채팅방 업데이트 (AI 응답)
    const { data: roomAfterAi } = await admin
      .from("chat_rooms")
      .select("unread_count_member")
      .eq("id", room_id)
      .single();

    await admin
      .from("chat_rooms")
      .update({
        last_message: aiContent.slice(0, 100),
        last_message_at: aiMsg?.created_at,
        unread_count_member: ((roomAfterAi?.unread_count_member ?? 0) + 1),
      })
      .eq("id", room_id);

    // FCM 푸시 (AI 응답 알림)
    await notifyChatMessage(user.id, "Humend HR 도우미", aiContent);

    return NextResponse.json({ success: true, message: memberMsg, aiResponse: aiMsg });
  } catch (error) {
    console.error("AI 응답 생성 실패:", error);

    // AI 실패 시 에러 메시지 저장
    const { data: errorMsg } = await admin
      .from("chat_messages")
      .insert({
        room_id,
        sender_type: "ai",
        sender_id: null,
        content: "죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      })
      .select()
      .single();

    return NextResponse.json({ success: true, message: memberMsg, aiResponse: errorMsg });
  }
}
