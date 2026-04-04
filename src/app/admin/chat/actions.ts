"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { notifyChatMessage } from "@/lib/push/notify";

export async function getChatRooms() {
  const admin = createAdminClient();

  const { data: rooms } = await admin
    .from("chat_rooms")
    .select(`
      *,
      members (name, phone)
    `)
    .eq("status", "active")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  return rooms ?? [];
}

export async function getChatMessages(roomId: string, cursor?: string) {
  const admin = createAdminClient();
  const limit = 30;

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

  return {
    messages: messages?.reverse() ?? [],
    hasMore: (messages?.length ?? 0) === limit,
  };
}

export async function sendAdminMessage(roomId: string, content: string, adminId: string) {
  const admin = createAdminClient();

  const { data: message, error } = await admin
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_type: "admin",
      sender_id: adminId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return { success: false, error: "메시지 전송 실패" };

  // 채팅방 업데이트
  const { data: currentRoom } = await admin
    .from("chat_rooms")
    .select("unread_count_member, member_id")
    .eq("id", roomId)
    .single();

  if (currentRoom) {
    await admin
      .from("chat_rooms")
      .update({
        last_message: content.trim().slice(0, 100),
        last_message_at: message.created_at,
        unread_count_member: (currentRoom.unread_count_member ?? 0) + 1,
      })
      .eq("id", roomId);

    // FCM 푸시 (반드시 await)
    await notifyChatMessage(
      currentRoom.member_id,
      "Humend HR 관리자",
      content.trim()
    );
  }

  return { success: true, message };
}

export async function markAsRead(roomId: string) {
  const admin = createAdminClient();

  // 회원 메시지 읽음 처리
  await admin
    .from("chat_messages")
    .update({ is_read: true })
    .eq("room_id", roomId)
    .eq("sender_type", "member")
    .eq("is_read", false);

  // 관리자 미읽음 카운트 초기화
  await admin
    .from("chat_rooms")
    .update({ unread_count_admin: 0 })
    .eq("id", roomId);
}

export async function switchChatMode(roomId: string, mode: "ai" | "admin") {
  const admin = createAdminClient();

  await admin
    .from("chat_rooms")
    .update({ mode })
    .eq("id", roomId);

  return { success: true };
}
