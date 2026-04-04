"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Bot, Headset, Loader2 } from "lucide-react";

interface ChatRoom {
  id: string;
  member_id: string;
  mode: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_admin: number;
  members: { name: string | null; phone: string } | null;
}

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoomId: string | null;
  onSelect: (roomId: string) => void;
  loading: boolean;
}

export default function ChatRoomList({
  rooms,
  selectedRoomId,
  onSelect,
  loading,
}: ChatRoomListProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">채팅 ({rooms.length})</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            채팅 내역이 없습니다
          </p>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onSelect(room.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50",
                selectedRoomId === room.id && "bg-accent"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-sm font-semibold">
                  {(room.members?.name ?? "?")[0]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {room.members?.name ?? room.members?.phone ?? "회원"}
                  </span>
                  <div className="flex items-center gap-1">
                    {room.mode === "ai" ? (
                      <Bot className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Headset className="h-3 w-3 text-green-500" />
                    )}
                    {room.last_message_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(room.last_message_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs text-muted-foreground">
                    {room.last_message ?? "새 대화"}
                  </p>
                  {room.unread_count_admin > 0 && (
                    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {room.unread_count_admin}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
