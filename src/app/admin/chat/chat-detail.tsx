"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getChatMessages, sendAdminMessage, markAsRead, switchChatMode } from "./actions";
import ChatMessageList, { type ChatMessage } from "@/components/chat/ChatMessageList";
import ChatInput from "@/components/chat/ChatInput";
import { Bot, Headset, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatRoom {
  id: string;
  member_id: string;
  mode: string;
  members: { name: string | null; phone: string } | null;
}

interface ChatDetailProps {
  room: ChatRoom;
  onMessageSent: () => void;
}

export default function ChatDetail({ room, onMessageSent }: ChatDetailProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [mode, setMode] = useState(room.mode);
  const [sending, setSending] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  // 관리자 ID 조회
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAdminId(data.user.id);
    });
  }, []);

  // 초기 메시지 로드
  const loadMessages = useCallback(async () => {
    const data = await getChatMessages(room.id);
    setMessages(data.messages as ChatMessage[]);
    setHasMore(data.hasMore);
    await markAsRead(room.id);
  }, [room.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // 이전 메시지 로드
  const loadMore = useCallback(async () => {
    if (messages.length === 0) return;
    const cursor = messages[0]?.created_at;
    const data = await getChatMessages(room.id, cursor);
    setMessages((prev) => [...(data.messages as ChatMessage[]), ...prev]);
    setHasMore(data.hasMore);
  }, [room.id, messages]);

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-chat-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          markAsRead(room.id);
          onMessageSent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, onMessageSent]);

  // 메시지 전송
  const handleSend = async (content: string) => {
    if (!adminId || sending) return;
    setSending(true);
    await sendAdminMessage(room.id, content, adminId);
    onMessageSent();
    setSending(false);
  };

  // 모드 전환
  const handleModeSwitch = async () => {
    const newMode = mode === "ai" ? "admin" : "ai";
    await switchChatMode(room.id, newMode);
    setMode(newMode);
  };

  const memberName = room.members?.name ?? room.members?.phone ?? "회원";

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{memberName}</p>
            <p className="text-[11px] text-muted-foreground">{room.members?.phone}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleModeSwitch}
          className={cn(
            "gap-1.5 text-xs",
            mode === "admin" && "border-green-200 bg-green-50 text-green-700"
          )}
        >
          {mode === "ai" ? (
            <>
              <Bot className="h-3.5 w-3.5" /> AI 응답 중
            </>
          ) : (
            <>
              <Headset className="h-3.5 w-3.5" /> 관리자 응답 중
            </>
          )}
        </Button>
      </div>

      {/* 메시지 목록 */}
      <ChatMessageList
        messages={messages}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />

      {/* 입력 */}
      <ChatInput
        onSend={handleSend}
        disabled={sending}
        placeholder={
          mode === "ai"
            ? "AI가 응답 중입니다. 직접 입력하려면 모드를 전환하세요."
            : "메시지를 입력하세요..."
        }
      />
    </div>
  );
}
