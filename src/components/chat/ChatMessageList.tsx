"use client";

import { useEffect, useRef, useCallback } from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatTypingIndicator from "./ChatTypingIndicator";

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_type: "member" | "ai" | "admin";
  sender_id: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isTyping?: boolean;
  currentUserId?: string;
}

export default function ChatMessageList({
  messages,
  onLoadMore,
  hasMore,
  isTyping,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef(0);

  // 새 메시지 시 하단 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  // 이전 메시지 로드 시 스크롤 위치 유지
  const handleLoadMore = useCallback(() => {
    if (!containerRef.current || !onLoadMore) return;
    prevHeightRef.current = containerRef.current.scrollHeight;
    onLoadMore();
  }, [onLoadMore]);

  useEffect(() => {
    if (prevHeightRef.current && containerRef.current) {
      const diff = containerRef.current.scrollHeight - prevHeightRef.current;
      containerRef.current.scrollTop += diff;
      prevHeightRef.current = 0;
    }
  });

  // IntersectionObserver로 상단 감지
  useEffect(() => {
    if (!topRef.current || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(topRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, handleLoadMore]);

  // 날짜 구분선
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "오늘";
    if (d.toDateString() === yesterday.toDateString()) return "어제";
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  let lastDate = "";

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3 py-4">
        {hasMore && <div ref={topRef} className="h-1" />}

        {messages.map((msg) => {
          const msgDate = new Date(msg.created_at).toDateString();
          const showDate = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center py-2">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">
                    {getDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <ChatMessageBubble
                senderType={msg.sender_type}
                content={msg.content}
                createdAt={msg.created_at}
                isRead={msg.is_read}
              />
            </div>
          );
        })}

        {isTyping && <ChatTypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
