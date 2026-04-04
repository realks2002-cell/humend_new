"use client";

import { cn } from "@/lib/utils";
import { Bot, Headset } from "lucide-react";

interface ChatMessageBubbleProps {
  senderType: "member" | "ai" | "admin";
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export default function ChatMessageBubble({
  senderType,
  content,
  createdAt,
  isRead,
}: ChatMessageBubbleProps) {
  const isMine = senderType === "member";
  const time = new Date(createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex gap-2 px-3", isMine ? "flex-row-reverse" : "flex-row")}>
      {!isMine && (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            senderType === "ai"
              ? "bg-blue-100 text-blue-600"
              : "bg-green-100 text-green-600"
          )}
        >
          {senderType === "ai" ? (
            <Bot className="h-4 w-4" />
          ) : (
            <Headset className="h-4 w-4" />
          )}
        </div>
      )}

      <div className={cn("flex max-w-[75%] flex-col", isMine ? "items-end" : "items-start")}>
        {!isMine && (
          <span className="mb-0.5 text-[11px] text-muted-foreground">
            {senderType === "ai" ? "AI 도우미" : "관리자"}
          </span>
        )}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isMine
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          {content}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {isMine && isRead && (
            <span className="text-[10px] text-blue-500">읽음</span>
          )}
        </div>
      </div>
    </div>
  );
}
