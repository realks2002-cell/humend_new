"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ChatMessageList, { type ChatMessage } from "@/components/chat/ChatMessageList";
import ChatInput from "@/components/chat/ChatInput";
import { Bot, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("로그인이 필요합니다.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export default function ChatClient() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 채팅방 조회/생성 + 메시지 로드
  useEffect(() => {
    const init = async () => {
      try {
        const headers = await getAuthHeaders();

        // 채팅방 조회/생성
        const roomRes = await fetch(`${API_BASE}/api/native/chat/rooms`, { headers });
        const { room } = await roomRes.json();
        if (!room) return;
        setRoomId(room.id);

        // 메시지 로드
        const msgRes = await fetch(
          `${API_BASE}/api/native/chat/messages?room_id=${room.id}`,
          { headers }
        );
        const { messages: msgs, hasMore: more } = await msgRes.json();
        setMessages(msgs ?? []);
        setHasMore(more ?? false);

        // 읽음 처리
        await fetch(`${API_BASE}/api/native/chat/read`, {
          method: "POST",
          headers,
          body: JSON.stringify({ room_id: room.id }),
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // 이전 메시지 로드
  const loadMore = useCallback(async () => {
    if (!roomId || messages.length === 0) return;
    const cursor = messages[0]?.created_at;
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE}/api/native/chat/messages?room_id=${roomId}&cursor=${cursor}`,
      { headers }
    );
    const { messages: older, hasMore: more } = await res.json();
    setMessages((prev) => [...(older ?? []), ...prev]);
    setHasMore(more ?? false);
  }, [roomId, messages]);

  // Supabase Realtime 구독
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`member-chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setSending(false);

          // 읽음 처리
          try {
            const headers = await getAuthHeaders();
            await fetch(`${API_BASE}/api/native/chat/read`, {
              method: "POST",
              headers,
              body: JSON.stringify({ room_id: roomId }),
            });
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 메시지 전송
  const handleSend = async (content: string) => {
    if (!roomId || sending) return;
    setSending(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/native/chat/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ room_id: roomId, content }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* 헤더 */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
          <Bot className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold">Humend HR 도우미</p>
          <p className="text-[11px] text-muted-foreground">
            근무, 급여, 지원 관련 문의를 도와드려요
          </p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <ChatMessageList
        messages={messages}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isTyping={sending}
      />

      {/* 입력 */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
