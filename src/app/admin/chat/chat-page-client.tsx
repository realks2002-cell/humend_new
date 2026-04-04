"use client";

import { useState, useEffect } from "react";
import { getChatRooms } from "./actions";
import ChatRoomList from "./chat-room-list";
import ChatDetail from "./chat-detail";
import { MessageCircle } from "lucide-react";

interface ChatRoom {
  id: string;
  member_id: string;
  status: string;
  mode: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_admin: number;
  created_at: string;
  members: { name: string | null; phone: string } | null;
}

export default function ChatPageClient() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRooms = async () => {
    const data = await getChatRooms();
    setRooms(data as ChatRoom[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* 채팅방 목록 */}
      <div className="w-80 shrink-0 border-r">
        <ChatRoomList
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelect={setSelectedRoomId}
          loading={loading}
        />
      </div>

      {/* 채팅 상세 */}
      <div className="flex flex-1 flex-col">
        {selectedRoom ? (
          <ChatDetail
            key={selectedRoom.id}
            room={selectedRoom}
            onMessageSent={loadRooms}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="mb-3 h-12 w-12 opacity-20" />
            <p className="text-sm">채팅방을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
